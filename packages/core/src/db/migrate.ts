import { useLogger } from '@tg-search/common'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import postgres from 'postgres'
import { config } from 'dotenv'
import { sql } from 'drizzle-orm'

import { createMessageRoutingTrigger } from './schema/message'

// Load environment variables
config()

const logger = useLogger()
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Database connection
const connectionString = process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/tg_search'
const client = postgres(connectionString, {
  max: 1,
  onnotice: () => {},
})

// Run migrations
async function main() {
  logger.log('正在运行数据库迁移...')

  try {
    const db = drizzle(client)
    
    // Run schema migrations
    await migrate(db, {
      migrationsFolder: join(__dirname, '../../drizzle'),
    })
    logger.log('数据库迁移完成')

    // Enable vector extension
    logger.log('正在启用 vector 扩展...')
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS vector`)
    logger.log('vector 扩展启用完成')

    // Create message routing trigger
    logger.log('正在创建消息路由触发器...')
    await db.execute(createMessageRoutingTrigger())
    logger.log('消息路由触发器创建完成')
  }
  catch (error) {
    logger.log('数据库迁移失败:', String(error))
    process.exit(1)
  }
  finally {
    await client.end()
  }
}

main() 
