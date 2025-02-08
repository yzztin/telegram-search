import type { ClientAdapter } from '../adapter/client'

import * as input from '@inquirer/prompts'
import { initLogger, useLogger } from '@tg-search/common'
import { config } from 'dotenv'

import { createAdapter } from '../adapter/factory'
import { createMessage } from '../db'

// Load environment variables
config()

// Initialize logger
initLogger()

const logger = useLogger()

process.on('unhandledRejection', (error) => {
  logger.log('Unhandled promise rejection:', String(error))
})

async function displayDialogs(adapter: ClientAdapter, page = 1, pageSize = 10) {
  const result = await adapter.getDialogs((page - 1) * pageSize, pageSize)
  const dialogs = result.dialogs

  logger.log('\n对话列表：')
  logger.log('----------------------------------------')
  for (const dialog of dialogs) {
    logger.log(`[${dialog.type}] ${dialog.name}`)
    logger.log(`ID: ${dialog.id}`)
    logger.log(`未读消息: ${dialog.unreadCount}`)
    if (dialog.lastMessage) {
      logger.log(`最新消息: ${dialog.lastMessage.slice(0, 50)}${dialog.lastMessage.length > 50 ? '...' : ''}`)
      logger.log(`时间: ${dialog.lastMessageDate?.toLocaleString()}`)
    }
    logger.log('----------------------------------------')
  }

  const hasMore = result.total > (page - 1) * pageSize + pageSize
  const hasPrev = page > 1

  const action = await input.select({
    message: '请选择操作：',
    choices: [
      ...(hasPrev ? [{ name: '上一页', value: 'prev' }] : []),
      ...(hasMore ? [{ name: '下一页', value: 'next' }] : []),
      { name: '选择对话', value: 'select' },
      { name: '退出', value: 'exit' },
    ],
  })

  if (action === 'prev') {
    return displayDialogs(adapter, page - 1, pageSize)
  }
  else if (action === 'next') {
    return displayDialogs(adapter, page + 1, pageSize)
  }
  else if (action === 'exit') {
    return 0
  }

  // Let user select a dialog
  const chatId = await input.input({
    message: '请输入要导出的对话 ID：',
    validate: (value) => {
      const id = Number(value)
      if (Number.isNaN(id))
        return '请输入有效的数字 ID'
      return true
    },
  })

  return Number(chatId)
}

async function exportMessages(adapter: ClientAdapter, chatId: number) {
  // Get dialog info
  const result = await adapter.getDialogs(0, 100)
  const selectedDialog = result.dialogs.find(d => d.id === chatId)
  if (!selectedDialog) {
    logger.log('找不到该对话')
    return
  }

  logger.log(`\n开始导出 "${selectedDialog.name}" 的消息...`)
  let count = 0

  // Get messages and save to database
  for await (const message of adapter.getMessages(chatId, 1000)) {
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
    }
    catch (error) {
      logger.log('保存消息失败:', String(error))
    }
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

    while (true) {
      // Display dialogs and get selected chat ID
      const chatId = await displayDialogs(adapter)
      if (chatId === 0) {
        logger.log('再见！')
        break
      }

      // Export messages
      await exportMessages(adapter, chatId)

      // Ask if continue
      const shouldContinue = await input.confirm({
        message: '是否继续导出其他对话？',
        default: true,
      })

      if (!shouldContinue) {
        logger.log('再见！')
        break
      }
    }

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
