import { config } from 'dotenv'
import { createAdapter } from './factory'
import { TelegramMessage } from './types'
import { createMessage } from '../db'

// Load environment variables
config()

process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error)
})

async function main() {
  const token = process.env.BOT_TOKEN
  if (!token) {
    console.error('BOT_TOKEN is required')
    process.exit(1)
  }

  // Create adapter (you can change this to 'client' type if needed)
  const adapter = createAdapter({
    type: 'bot',
    token,
  })

  // Message handler
  const handleMessage = async (message: TelegramMessage) => {
    console.log('Received message:', message)
    
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
      console.log('Message saved to database:', result)
    } catch (error) {
      console.error('Failed to save message:', error)
    }
  }

  // Connect and start listening
  try {
    console.log('Connecting to Telegram...')
    await adapter.connect()
    console.log('Connected!')

    // Setup message handler
    adapter.onMessage(handleMessage)

    // Keep the process running
    process.on('SIGINT', async () => {
      console.log('Shutting down...')
      await adapter.disconnect()
      process.exit(0)
    })

    await new Promise(() => {})
  } catch (error) {
    console.error('Error:', error)
    await adapter.disconnect()
    process.exit(1)
  }
}

main()
