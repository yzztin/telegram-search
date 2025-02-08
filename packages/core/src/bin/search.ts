import type { ClientAdapter } from '../adapter/client'
import type { SearchOptions } from '../db'

import * as input from '@inquirer/prompts'
import { initLogger, useLogger } from '@tg-search/common'
import { config } from 'dotenv'

import { createAdapter } from '../adapter/factory'
import { EmbeddingService } from '../services/embedding'
import { findSimilarMessages } from '../db'

// Load environment variables
config()

// Initialize logger
initLogger()

const logger = useLogger()

process.on('unhandledRejection', (error) => {
  logger.log('Unhandled promise rejection:', String(error))
})

/**
 * Format message for display
 */
function formatMessage(message: any) {
  const time = new Date(message.createdAt).toLocaleString()
  const content = message.content?.slice(0, 100) + (message.content?.length > 100 ? '...' : '')
  const similarity = message.similarity ? ` (相似度: ${(message.similarity * 100).toFixed(2)}%)` : ''
  return `[${time}]${similarity}\n${content}`
}

/**
 * Get search options from user
 */
async function getSearchOptions(): Promise<SearchOptions> {
  const options: SearchOptions = {}

  // Get message type
  const includeType = await input.confirm({
    message: '是否按消息类型过滤？',
    default: false,
  })

  if (includeType) {
    const type = await input.select({
      message: '请选择消息类型：',
      choices: [
        { name: '文本', value: 'text' },
        { name: '图片', value: 'photo' },
        { name: '视频', value: 'video' },
        { name: '文件', value: 'document' },
        { name: '贴纸', value: 'sticker' },
        { name: '其他', value: 'other' },
      ],
    })
    options.type = type
  }

  // Get time range
  const includeTimeRange = await input.confirm({
    message: '是否按时间范围过滤？',
    default: false,
  })

  if (includeTimeRange) {
    const startTime = await input.input({
      message: '请输入开始时间（YYYY-MM-DD）：',
      default: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    })
    options.startTime = new Date(startTime)

    const endTime = await input.input({
      message: '请输入结束时间（YYYY-MM-DD）：',
      default: new Date().toISOString().split('T')[0],
    })
    options.endTime = new Date(endTime)
  }

  // Get limit
  const limit = await input.input({
    message: '请输入返回结果数量：',
    default: '10',
  })
  options.limit = Number(limit)

  return options
}

async function searchMessages(adapter: ClientAdapter) {
  // First, get all folders
  const folders = await adapter.getAllFolders()
  const folderChoices = folders.map(folder => ({
    name: folder.title,
    value: folder.id,
  }))

  // Let user select a folder
  const folderId = await input.select({
    message: '请选择要搜索的文件夹：',
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
    message: '请选择要搜索的对话：',
    choices,
  })

  // Get search query
  const query = await input.input({
    message: '请输入搜索关键词：',
  })

  // Get search options
  const options = await getSearchOptions()
  options.chatId = chatId

  // Generate embedding for query
  const embeddingService = new EmbeddingService(
    process.env.OPENAI_API_KEY ?? '',
    process.env.OPENAI_API_BASE,
  )
  const embedding = await embeddingService.generateEmbedding(query)

  // Search messages
  logger.log('正在搜索...')
  const messages = await findSimilarMessages(embedding, options)

  // Display results
  logger.log('\n搜索结果：')
  logger.log('----------------------------------------')
  for (const message of messages) {
    logger.withFields({
      id: message.id,
      chatId: message.chatId,
      type: message.type,
      similarity: message.similarity,
    }).log(formatMessage(message))
    logger.log('----------------------------------------')
  }

  // Ask if continue
  const shouldContinue = await input.confirm({
    message: '是否继续搜索？',
    default: true,
  })

  if (shouldContinue)
    return searchMessages(adapter)
}

async function main() {
  // Check required environment variables
  const apiId = Number(process.env.API_ID)
  const apiHash = process.env.API_HASH
  const phoneNumber = process.env.PHONE_NUMBER
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiId || !apiHash || !phoneNumber) {
    logger.log('API_ID, API_HASH and PHONE_NUMBER are required')
    process.exit(1)
  }

  if (!apiKey) {
    logger.log('OPENAI_API_KEY is required')
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

    await searchMessages(adapter)

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
