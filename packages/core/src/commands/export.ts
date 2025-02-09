import type { ClientAdapter } from '../adapter/client'

import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as input from '@inquirer/prompts'
import { useLogger } from '@tg-search/common'
import { eq, asc } from 'drizzle-orm'

import { getConfig } from '../composable/config'
import { createAdapter } from '../adapter/factory'
import { createMessage, updateChat, db, messages } from '../db'

const logger = useLogger()

/**
 * Get last message ID from database
 */
async function getLastMessageId(chatId: number): Promise<number> {
  const result = await db.select({ id: messages.id })
    .from(messages)
    .where(eq(messages.chatId, chatId))
    .orderBy(asc(messages.id))
    .limit(1)

  return result[0]?.id || 0
}

/**
 * Sync all chats to database
 */
async function syncChats(adapter: ClientAdapter) {
  logger.log('正在同步所有会话信息...')
  const chats = await adapter.getChats()
  logger.debug(`获取到 ${chats.length} 个会话`)

  for (const chat of chats) {
    try {
      await updateChat(chat)
      logger.debug(`已同步会话: [${chat.type}] ${chat.name} (ID: ${chat.id})`)
    }
    catch (error) {
      logger.withError(error).error(`同步会话失败: ${chat.name}`)
    }
  }
  logger.log(`会话同步完成，共同步 ${chats.length} 个会话`)
}

/**
 * Export messages from Telegram
 */
async function exportMessages(adapter: ClientAdapter) {
  // Get all folders
  const folders = await adapter.getFolders()
  logger.debug(`获取到 ${folders.length} 个文件夹`)
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
  logger.debug(`获取到 ${dialogs.dialogs.length} 个会话`)
  const chatChoices = dialogs.dialogs.map(dialog => ({
    name: `[${dialog.type}] ${dialog.name} (${dialog.unreadCount} 条未读)`,
    value: dialog.id,
  }))

  // Let user select chat
  const chatId = await input.select({
    message: '请选择要导出的会话：',
    choices: chatChoices,
  })
  const selectedChat = dialogs.dialogs.find(d => d.id === chatId)
  if (!selectedChat) {
    throw new Error(`找不到会话: ${chatId}`)
  }
  logger.debug(`已选择会话: ${selectedChat.name} (ID: ${chatId})`)

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
  let skippedCount = 0

  if (exportType === 'db') {
    // Get time range
    const startDate = await input.input({
      message: '请输入开始时间（YYYY-MM-DD）：',
      default: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      validate: (value: string) => {
        const date = new Date(value)
        if (isNaN(date.getTime()))
          return '请输入有效的日期格式（YYYY-MM-DD）'
        return true
      },
    })
    const endDate = await input.input({
      message: '请输入结束时间（YYYY-MM-DD）：',
      default: new Date().toISOString().split('T')[0],
      validate: (value: string) => {
        const date = new Date(value)
        if (isNaN(date.getTime()))
          return '请输入有效的日期格式（YYYY-MM-DD）'
        return true
      },
    })
    const limit = await input.number({
      message: '请输入导出消息数量（0 表示不限制）：',
      default: 0,
      validate: (value: number | undefined) => {
        if (value === undefined || value < 0)
          return '请输入有效的数字（>= 0）'
        return true
      },
    })

    // Get last message ID for incremental update
    const lastMessageId = await getLastMessageId(chatId)
    logger.debug(`上次同步的最后消息 ID: ${lastMessageId}`)

    logger.debug(`开始导出消息，时间范围: ${startDate} - ${endDate}，数量限制: ${limit}`)

    // Export to database
    const messages = []
    for await (const message of adapter.getMessages(Number(chatId), limit || undefined)) {
      // 只处理文本消息
      if (message.type !== 'text') {
        logger.debug(`跳过非文本消息 ${message.id}，类型: ${message.type}`)
        continue
      }

      // 增量更新：跳过已存在的消息
      if (message.id <= lastMessageId) {
        logger.debug(`跳过已存在的消息 ${message.id}`)
        skippedCount++
        continue
      }

      const date = new Date(message.createdAt)
      const start = new Date(startDate)
      start.setHours(0, 0, 0, 0)
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)

      if (date.getTime() < start.getTime() || date.getTime() > end.getTime()) {
        logger.debug(`跳过消息 ${message.id}，不在时间范围内 (${date.toISOString()})`)
        continue
      }

      logger.debug(`处理消息 ${message.id}: ${message.content?.slice(0, 50)}`)
      messages.push(message)
      count++
    }

    // Insert messages in batches
    const batchSize = 100
    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize)
      try {
        const result = await createMessage(batch)
        for (const msg of result) {
          logger.debug(`已导入消息 ${msg.id}: ${msg.content?.slice(0, 50)}`)
        }
        logger.debug(`已导入 ${i + batch.length}/${messages.length} 条消息`)
      }
      catch (error) {
        failedCount += batch.length
        logger.withError(error).error('导入消息批次失败')
      }
    }

    // Update chat message count
    try {
      await updateChat({
        ...selectedChat,
        messageCount: count,
        lastSyncTime: new Date(),
      })
      logger.debug('已更新会话消息计数')
    }
    catch (error) {
      logger.withError(error).error('更新会话消息计数失败')
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
    logger.debug(`已创建导出目录: ${exportPath}`)

    // Export to file
    const messages = []
    for await (const message of adapter.getMessages(Number(chatId))) {
      messages.push(message)
      count++
      if (count % 100 === 0) {
        logger.debug(`已处理 ${count} 条消息`)
      }
    }

    // Save to file
    const fileName = `${chatId}_${new Date().toISOString().split('T')[0]}`
    const filePath = path.join(exportPath, `${fileName}.${format}`)

    try {
      if (format === 'json') {
        await fs.writeFile(filePath, JSON.stringify(messages, null, 2))
        logger.debug(`已保存 JSON 文件: ${filePath}`)
      }
      else {
        // TODO: 实现 HTML 导出
        logger.warn('HTML 导出暂未实现')
        failedCount = count
      }
    }
    catch (error) {
      failedCount = count
      logger.withError(error).error(`保存文件失败: ${filePath}`)
    }

    if (failedCount === 0) {
      logger.log(`已导出到文件: ${filePath}`)
    }
  }

  const summary = failedCount > 0
    ? `导出完成，共导出 ${count} 条消息，${failedCount} 条消息失败，${skippedCount} 条消息已存在`
    : `导出完成，共导出 ${count} 条消息，${skippedCount} 条消息已存在`
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

    // Sync all chats
    logger.log('正在同步所有会话信息...')
    const chats = await adapter.getChats()
    logger.debug(`获取到 ${chats.length} 个会话`)

    for (const chat of chats) {
      try {
        await updateChat(chat)
        logger.debug(`已同步会话: [${chat.type}] ${chat.name} (ID: ${chat.id})`)
      }
      catch (error) {
        logger.withError(error).error(`同步会话失败: ${chat.name}`)
      }
    }
    logger.log(`会话同步完成，共同步 ${chats.length} 个会话`)

    await exportMessages(adapter)

    await adapter.disconnect()
  }
  catch (error) {
    await adapter.disconnect()
    throw error
  }
}
