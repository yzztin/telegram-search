import type { ClientAdapter } from '../adapter/client'

import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as input from '@inquirer/prompts'
import { useLogger } from '@tg-search/common'

import { getConfig } from '../composable/config'
import { createAdapter } from '../adapter/factory'
import { createMessage } from '../db'

const logger = useLogger()

/**
 * Export messages from Telegram
 */
async function exportMessages(adapter: ClientAdapter) {
  // Get all folders
  const folders = await adapter.getFolders()
  const folderChoices = folders.map(folder => ({
    name: `${folder.emoji || ''} ${folder.title}`,
    value: folder.id,
  }))

  // Let user select folder
  const folderId = await input.select({
    message: '请选择要导出的文件夹：',
    choices: folderChoices,
  })

  // Get all chats in folder
  const dialogs = await adapter.getDialogs()
  const chatChoices = dialogs.dialogs.map(dialog => ({
    name: `[${dialog.type}] ${dialog.name} (${dialog.unreadCount} 条未读)`,
    value: dialog.id,
  }))

  // Let user select chat
  const chatId = await input.select({
    message: '请选择要导出的会话：',
    choices: chatChoices,
  })

  // Get export type
  const exportType = await input.select({
    message: '请选择导出类型：',
    choices: [
      { name: '导出到数据库', value: 'db' },
      { name: '导出到文件', value: 'file' },
    ],
  })

  // Export messages
  logger.log('正在导出消息...')
  let count = 0
  let failedCount = 0

  if (exportType === 'db') {
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

    // Export to database
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
        if (count % 100 === 0) {
          logger.debug(`已导出 ${count} 条消息`)
        }

        if (message.mediaInfo?.localPath) {
          logger.debug(`已下载媒体文件: ${message.mediaInfo.localPath}`)
        }

        if (Number(limit) > 0 && count >= Number(limit))
          break
      }
      catch (error) {
        failedCount++
        logger.withError(error).warn('保存消息失败')
      }
    }
  }
  else {
    // Get export format
    const format = await input.select({
      message: '请选择导出格式：',
      choices: [
        { name: 'HTML', value: 'html' },
        { name: 'JSON', value: 'json' },
      ],
    })

    // Get export path
    const exportPath = await input.input({
      message: '请输入导出路径：',
      default: './export',
    })

    // Create export directory
    await fs.mkdir(exportPath, { recursive: true })

    // Export to file
    const messages = []
    for await (const message of adapter.getMessages(chatId)) {
      messages.push(message)
      count++
      if (count % 100 === 0) {
        logger.debug(`已处理 ${count} 条消息`)
      }
    }

    // Save to file
    const fileName = `${chatId}_${new Date().toISOString().split('T')[0]}`
    const filePath = path.join(exportPath, `${fileName}.${format}`)

    if (format === 'json') {
      await fs.writeFile(filePath, JSON.stringify(messages, null, 2))
    }
    else {
      // TODO: 实现 HTML 导出
      logger.warn('HTML 导出暂未实现')
    }

    logger.log(`已导出到文件: ${filePath}`)
  }

  const summary = failedCount > 0
    ? `导出完成，共导出 ${count} 条消息，${failedCount} 条消息失败`
    : `导出完成，共导出 ${count} 条消息`
  logger.log(summary)

  // Ask if continue
  const shouldContinue = await input.confirm({
    message: '是否继续导出？',
    default: false,
  })

  if (shouldContinue) {
    return exportMessages(adapter)
  }
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
