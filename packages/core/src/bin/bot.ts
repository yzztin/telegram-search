import type { TelegramMessage } from '../adapter/types'

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

async function main() {
  const token = process.env.BOT_TOKEN
  if (!token) {
    logger.log('BOT_TOKEN is required')
    process.exit(1)
  }

  // Create adapter
  const adapter = createAdapter({
    type: 'bot',
    token,
  })

  // Message handler
  const handleMessage = async (message: TelegramMessage) => {
    logger.log('收到消息:', message)

    try {
      // Save to database
      const result = await createMessage({
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
      logger.log('消息已保存到数据库:', result)
    }
    catch (error) {
      logger.log('保存消息失败:', String(error))
    }
  }

  // Connect and start listening
  try {
    logger.log('连接到 Telegram...')
    await adapter.connect()
    logger.log('已连接！')

    // Setup message handler
    adapter.onMessage(handleMessage)

    // Keep the process running
    process.on('SIGINT', async () => {
      logger.log('正在关闭...')
      await adapter.disconnect()
      process.exit(0)
    })

    await new Promise(() => {})
  }
  catch (error) {
    logger.log('错误:', String(error))
    await adapter.disconnect()
    process.exit(1)
  }
}

main()
