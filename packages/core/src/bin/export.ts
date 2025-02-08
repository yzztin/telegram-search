import type { ClientAdapter } from '../adapter/client'

import * as input from '@inquirer/prompts'
import { initLogger, useLogger } from '@tg-search/common'
import { config } from 'dotenv'
import { eq } from 'drizzle-orm'

import { createAdapter } from '../adapter/factory'
import { createMessage, db, syncState } from '../db'

// Load environment variables
config()

// Initialize logger
initLogger()

const logger = useLogger()

process.on('unhandledRejection', (error) => {
  logger.log('Unhandled promise rejection:', String(error))
})

async function exportMessages(adapter: ClientAdapter, chatId: number) {
  // Get dialog info
  const result = await adapter.getDialogs(0, 100)
  const selectedDialog = result.dialogs.find(d => d.id === chatId)
  if (!selectedDialog) {
    logger.log('找不到该对话')
    return
  }

  // Get last sync state
  const lastSync = await db.select().from(syncState).where(eq(syncState.chatId, chatId)).limit(1)
  const lastMessageId = lastSync[0]?.lastMessageId ?? 0

  // Ask if incremental update
  const isIncremental = await input.confirm({
    message: '是否增量更新？',
    default: true,
  })

  logger.log(`\n开始${isIncremental ? '增量' : '全量'}导出 "${selectedDialog.name}" 的消息...`)
  if (isIncremental && lastMessageId > 0) {
    logger.log(`从消息 ID ${lastMessageId} 开始导出...`)
  }
  let count = 0
  let maxMessageId = lastMessageId

  // Get messages and save to database
  for await (const message of adapter.getMessages(chatId, 1000)) {
    // Skip old messages in incremental mode
    if (isIncremental && message.id <= lastMessageId) {
      continue
    }

    try {
      await createMessage({
        id: message.id,
        chatId: message.chatId,
        type: message.type,
        content: message.content,
        fromId: message.fromId,
        replyToId: message.replyToId,
        forwardFromChatId: message.forwardFromChatId,
        forwardFromMessageId: message.forwardFromMessageId,
        views: message.views,
        forwards: message.forwards,
        createdAt: message.createdAt,
      })
      count++
      if (count % 100 === 0)
        logger.log(`已保存 ${count} 条消息...`)
      if (message.mediaInfo?.localPath)
        logger.log(`已下载媒体文件: ${message.mediaInfo.localPath}`)

      // Update max message ID
      maxMessageId = Math.max(maxMessageId, message.id)
    }
    catch (error) {
      logger.log('保存消息失败:', String(error))
    }
  }

  // Update sync state
  if (count > 0) {
    await db.insert(syncState).values({
      chatId,
      lastMessageId: maxMessageId,
    }).onConflictDoUpdate({
      target: syncState.chatId,
      set: {
        lastMessageId: maxMessageId,
        lastSyncTime: new Date(),
      },
    })
  }

  logger.log(`\n完成！共保存了 ${count} 条消息。`)
}

async function main() {
  // Check required environment variables
  const apiId = Number(process.env.API_ID)
  const apiHash = process.env.API_HASH
  const phoneNumber = process.env.PHONE_NUMBER

  if (!apiId || !apiHash || !phoneNumber) {
    logger.log('API_ID, API_HASH and PHONE_NUMBER are required')
    process.exit(1)
  }

  // Create client adapter
  const adapter = createAdapter({
    type: 'client',
    apiId,
    apiHash,
    phoneNumber,
  }) as ClientAdapter

  try {
    logger.log('连接到 Telegram...')
    await adapter.connect()
    logger.log('已连接！')

    // First, get all folders
    const folders = await adapter.getAllFolders()
    const folderChoices = folders.map(folder => ({
      name: folder.title,
      value: folder.id,
    }))

    // Let user select a folder
    const folderId = await input.select({
      message: '请选择要导出的文件夹：',
      choices: folderChoices,
    })

    // Then, get dialogs in the selected folder
    const selectedFolder = folders.find(f => f.id === folderId)
    if (!selectedFolder) {
      logger.log('找不到该文件夹')
      process.exit(1)
    }

    const result = await adapter.getDialogsInFolder(folderId)
    const dialogs = result.dialogs

    // Let user select a dialog
    const choices = dialogs.map(dialog => ({
      name: `[${dialog.type}] ${dialog.name}${dialog.unreadCount > 0 ? ` (${dialog.unreadCount})` : ''}`,
      value: dialog.id,
    }))

    const chatId = await input.select({
      message: '请选择要导出的对话：',
      choices,
    })

    // Export messages
    await exportMessages(adapter, chatId)

    // Ask if continue
    const shouldContinue = await input.confirm({
      message: '是否继续导出其他对话？',
      default: true,
    })

    if (shouldContinue)
      return main()

    await adapter.disconnect()
    process.exit(0)
  }
  catch (error) {
    logger.log('错误:', String(error))
    await adapter.disconnect()
    process.exit(1)
  }
}

main() 
