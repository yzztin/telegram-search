import type { ClientAdapter } from '../adapter/client'

import { useLogger } from '@tg-search/common'
import { sql } from 'drizzle-orm'

import { db, updateChat, updateFolder } from '../db'
import { chats, folders } from '../db/schema/message'

const logger = useLogger()

/**
 * Sync folders and chats from Telegram
 */
export async function sync(adapter: ClientAdapter) {
  logger.log('正在同步文件夹和会话信息...')

  try {
    // Clear existing data
    logger.debug('清理现有数据...')
    await db.delete(folders)
    await db.delete(chats)
    logger.debug('数据清理完成')

    // Sync folders
    logger.log('正在同步文件夹...')
    const newFolders = await adapter.getFolders()
    logger.debug(`获取到 ${newFolders.length} 个文件夹`)

    for (const folder of newFolders) {
      try {
        const result = await updateFolder(folder)
        logger.debug(`已同步文件夹: ${folder.emoji || ''} ${folder.title} (ID: ${folder.id})`)
        if (!result || result.length === 0) {
          logger.warn(`文件夹 ${folder.title} 同步失败`)
        }
      }
      catch (error) {
        logger.withError(error).warn(`同步文件夹失败: ${folder.title}`)
      }
    }
    logger.log(`共同步了 ${newFolders.length} 个文件夹`)

    // Sync chats
    logger.log('正在同步会话...')
    const newChats = await adapter.getChats()
    logger.debug(`获取到 ${newChats.length} 个会话`)

    for (const chat of newChats) {
      try {
        const result = await updateChat(chat)
        logger.debug(`已同步会话: [${chat.type}] ${chat.name} (ID: ${chat.id})`)
        if (!result || result.length === 0) {
          logger.warn(`会话 ${chat.name} 同步失败`)
        }
      }
      catch (error) {
        logger.withError(error).warn(`同步会话失败: ${chat.name}`)
      }
    }
    logger.log(`共同步了 ${newChats.length} 个会话`)

    // Verify sync results
    const [folderCountResult, chatCountResult] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(folders),
      db.select({ count: sql<number>`count(*)` }).from(chats),
    ])

    const folderCount = Number(folderCountResult[0].count)
    const chatCount = Number(chatCountResult[0].count)

    if (folderCount !== newFolders.length) {
      logger.warn(`文件夹同步数量不匹配：预期 ${newFolders.length}，实际 ${folderCount}`)
    }
    if (chatCount !== newChats.length) {
      logger.warn(`会话同步数量不匹配：预期 ${newChats.length}，实际 ${chatCount}`)
    }

    logger.log('同步完成')
  }
  catch (error) {
    logger.withError(error).error('同步失败')
    throw error
  }
}
