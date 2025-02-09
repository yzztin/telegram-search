import type { ClientAdapter } from '../adapter/client'

import { useLogger } from '@tg-search/common'
import { updateChat, updateFolder } from '../db'

const logger = useLogger()

/**
 * Sync folders and chats from Telegram
 */
export async function sync(adapter: ClientAdapter) {
  logger.log('正在同步文件夹和会话信息...')

  try {
    // Sync folders
    logger.log('正在同步文件夹...')
    const folders = await adapter.getFolders()
    logger.debug(`获取到 ${folders.length} 个文件夹`)

    for (const folder of folders) {
      try {
        await updateFolder(folder)
        logger.debug(`已同步文件夹: ${folder.emoji || ''} ${folder.title}`)
      }
      catch (error) {
        logger.withError(error).warn(`同步文件夹失败: ${folder.title}`)
      }
    }
    logger.log(`共同步了 ${folders.length} 个文件夹`)

    // Sync chats
    logger.log('正在同步会话...')
    const chats = await adapter.getChats()
    logger.debug(`获取到 ${chats.length} 个会话`)

    for (const chat of chats) {
      try {
        await updateChat(chat)
        logger.debug(`已同步会话: [${chat.type}] ${chat.name}`)
      }
      catch (error) {
        logger.withError(error).warn(`同步会话失败: ${chat.name}`)
      }
    }
    logger.log(`共同步了 ${chats.length} 个会话`)

    logger.log('同步完成')
  }
  catch (error) {
    logger.withError(error).error('同步失败')
    throw error
  }
} 
