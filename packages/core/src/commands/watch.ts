import type { ClientAdapter } from '../adapter/client'
import type { TelegramMessage } from '../adapter/types'

import * as input from '@inquirer/prompts'
import { useLogger } from '@tg-search/common'

import { createAdapter } from '../adapter/factory'
import { getConfig } from '../composable/config'
import { createMessage } from '../db'

const logger = useLogger()

async function watchChat(adapter: ClientAdapter, chatId: number, folderTitle: string) {
  // Get dialog info
  const result = await adapter.getDialogs(0, 100)
  const selectedDialog = result.dialogs.find(d => d.id === chatId)
  if (!selectedDialog) {
    logger.log('找不到该对话')
    return
  }

  logger.log(`开始监听 "${selectedDialog.name}" 的 "${folderTitle}" 文件夹...`)
  let count = 0

  // Setup message handler
  adapter.onMessage(async (message: TelegramMessage) => {
    // Only handle messages from selected chat
    if (message.chatId !== chatId)
      return

    // Only handle text messages
    if (message.type !== 'text') {
      logger.log(`[${new Date().toLocaleString()}] 跳过非文本消息: ${message.type}`)
      return
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
      logger.log(`[${new Date().toLocaleString()}] 已保存 ${count} 条新消息`)
    }
    catch (error) {
      logger.withError(error).error('保存消息失败:')
    }
  })

  // Keep the process running
  logger.log('按 Ctrl+C 停止监听')
  return count
}

export default async function watch() {
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

    // First, get all folders
    const folders = await adapter.getFolders()
    const folderChoices = folders.map(folder => ({
      name: folder.title,
      value: folder.id,
    }))

    // Let user select a folder
    const folderId = await input.select({
      message: '请选择要监听的文件夹：',
      choices: folderChoices,
    })

    // Then, get dialogs in the selected folder
    const selectedFolder = folders.find(f => f.id === folderId)
    if (!selectedFolder) {
      logger.log('找不到该文件夹')
      throw new Error('Folder not found')
    }

    // Get dialogs for the selected folder
    const result = await adapter.getDialogs()
    const dialogs = result.dialogs.filter((dialog) => {
      // Get folders for this dialog
      const dialogFolders = adapter.getFoldersForChat(dialog.id)
      return dialogFolders.then(folders => folders.some(f => f.id === folderId))
    })

    // Let user select a dialog
    const choices = dialogs.map(dialog => ({
      name: `[${dialog.type}] ${dialog.name}${dialog.unreadCount > 0 ? ` (${dialog.unreadCount})` : ''}`,
      value: dialog.id,
    }))

    const chatId = await input.select({
      message: '请选择要监听的对话：',
      choices,
    })

    // Start watching
    const count = await watchChat(adapter, chatId, selectedFolder.title)

    // Keep the process running
    await new Promise(() => {})
    return count
  }
  catch (error) {
    await adapter.disconnect()
    throw error
  }
}
