import { useLogger } from '@tg-search/common'

import { createAdapter } from '../adapter/factory'
import { getConfig } from '../composable/config'
import { sync } from './sync'

const logger = useLogger()

/**
 * Connect to Telegram
 */
export async function connect() {
  const config = await getConfig()
  const adapter = await createAdapter(config)

  try {
    // Connect to Telegram
    logger.log('正在连接到 Telegram...')
    await adapter.connect()
    logger.log('连接成功')

    // Sync folders and chats
    await sync(adapter)

    return adapter
  }
  catch (error) {
    logger.withError(error).error('连接失败')
    throw error
  }
} 
