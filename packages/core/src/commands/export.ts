import type { ClientAdapter } from '../adapter/client'
import type { TelegramMessage } from '../adapter/types'

import * as input from '@inquirer/prompts'
import { useLogger } from '@tg-search/common'

import { createAdapter } from '../adapter/factory'
import { createMessage } from '../db'
import { getConfig } from '../composable/config'

const logger = useLogger()

async function exportMessages(adapter: ClientAdapter) {
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
    throw new Error('Folder not found')
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

  // Get time range
  const startTime = await input.input({
    message: '请输入开始时间（YYYY-MM-DD）：',
    default: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  })

  const endTime = await input.input({
    message: '请输入结束时间（YYYY-MM-DD）：',
    default: new Date().toISOString().split('T')[0],
  })

  // Get limit
  const limit = await input.input({
    message: '请输入导出消息数量（0 表示不限制）：',
    default: '0',
  })

  // Start exporting
  logger.log('开始导出消息...')
  let count = 0

  // Get messages and save to database
  for await (const message of adapter.getMessages(chatId, Number(limit))) {
    // Check time range
    if (message.createdAt < new Date(startTime) || message.createdAt > new Date(endTime))
      continue

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
      logger.log(`已导出 ${count} 条消息`)

      if (message.mediaInfo?.localPath)
        logger.log(`已下载媒体文件: ${message.mediaInfo.localPath}`)

      if (Number(limit) > 0 && count >= Number(limit))
        break
    }
    catch (error) {
      logger.log('保存消息失败:', String(error))
    }
  }

  logger.log(`\n导出完成，共导出 ${count} 条消息。`)

  // Ask if continue
  const shouldContinue = await input.confirm({
    message: '是否继续导出？',
    default: true,
  })

  if (shouldContinue)
    return exportMessages(adapter)
}

export default async function exportCmd() {
  const config = getConfig()
  const apiId = Number(config.apiId)
  const apiHash = config.apiHash
  const phoneNumber = config.phoneNumber

  if (!apiId || !apiHash || !phoneNumber) {
    logger.log('API_ID, API_HASH and PHONE_NUMBER are required')
    throw new Error('Missing required configuration')
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

    await exportMessages(adapter)

    await adapter.disconnect()
  }
  catch (error) {
    await adapter.disconnect()
    throw error
  }
}
