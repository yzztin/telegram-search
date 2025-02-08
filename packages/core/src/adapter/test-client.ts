import { config } from 'dotenv'
import { createAdapter } from './factory'
import { TelegramMessage } from './types'
import { createMessage } from '../db'
import * as input from '@inquirer/prompts'
import { ClientAdapter } from './client'

// Load environment variables
config()

process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error)
})

async function displayDialogs(adapter: ClientAdapter, page = 1, pageSize = 10) {
  const offset = (page - 1) * pageSize
  const result = await adapter.getDialogs(offset, pageSize)
  const dialogs = result.dialogs
  
  console.log('\n对话列表：')
  console.log('----------------------------------------')
  for (const dialog of dialogs) {
    console.log(`[${dialog.type}] ${dialog.name}`)
    console.log(`ID: ${dialog.id}`)
    console.log(`未读消息: ${dialog.unreadCount}`)
    if (dialog.lastMessage) {
      console.log(`最新消息: ${dialog.lastMessage.slice(0, 50)}${dialog.lastMessage.length > 50 ? '...' : ''}`)
      console.log(`时间: ${dialog.lastMessageDate?.toLocaleString()}`)
    }
    console.log('----------------------------------------')
  }

  const hasMore = result.total > offset + pageSize
  const hasPrev = page > 1

  if (hasPrev || hasMore) {
    console.log('\n导航：')
    if (hasPrev) console.log('p - 上一页')
    if (hasMore) console.log('n - 下一页')
    console.log('q - 选择对话')

    const action = await input.select({
      message: '请选择操作：',
      choices: [
        ...(hasPrev ? [{ name: '上一页', value: 'prev' }] : []),
        ...(hasMore ? [{ name: '下一页', value: 'next' }] : []),
        { name: '选择对话', value: 'select' },
      ],
    })

    if (action === 'prev') {
      return displayDialogs(adapter, page - 1, pageSize)
    } else if (action === 'next') {
      return displayDialogs(adapter, page + 1, pageSize)
    }
  }

  // Let user select a dialog
  const chatId = await input.input({
    message: '请输入要导出的对话 ID：',
    validate: (value) => {
      const id = Number(value)
      if (isNaN(id)) return '请输入有效的数字 ID'
      return true
    }
  })

  return Number(chatId)
}

async function main() {
  // Check required environment variables
  const apiId = Number(process.env.API_ID)
  const apiHash = process.env.API_HASH
  const phoneNumber = process.env.PHONE_NUMBER

  if (!apiId || !apiHash || !phoneNumber) {
    console.error('API_ID, API_HASH and PHONE_NUMBER are required')
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
    console.log('连接到 Telegram...')
    await adapter.connect()
    console.log('已连接！')

    // Display dialogs and get selected chat ID
    const chatId = await displayDialogs(adapter)

    // Get dialog info
    const result = await adapter.getDialogs(0, 100)
    const selectedDialog = result.dialogs.find(d => d.id === chatId)
    if (!selectedDialog) {
      console.error('找不到该对话')
      process.exit(1)
    }

    console.log(`\n开始导出 "${selectedDialog.name}" 的消息...`)
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
        if (count % 100 === 0) {
          console.log(`已保存 ${count} 条消息...`)
        }
      } catch (error) {
        console.error('保存消息失败:', error)
      }
    }

    console.log(`\n完成！共保存了 ${count} 条消息。`)
    await adapter.disconnect()
    process.exit(0)
  } catch (error) {
    console.error('错误:', error)
    await adapter.disconnect()
    process.exit(1)
  }
}

main() 
