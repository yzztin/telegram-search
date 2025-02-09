import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { initLogger, useLogger } from '@tg-search/common'
import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

import { getConfig, initConfig } from '../composable/config'
import { createMessageRoutingTrigger } from './schema/message'

initLogger()
const logger = useLogger()
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Initialize config
initConfig()
const config = getConfig()

// Database connection
const client = postgres(config.databaseUrl, {
  max: 1,
  onnotice: () => {},
})

// Run migrations
async function main() {
  logger.log('正在运行数据库迁移...')

  try {
    const db = drizzle(client)

    // Enable vector extension first
    logger.log('正在启用 vector 扩展...')
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS vector`)
    logger.log('vector 扩展启用完成')

    // Run schema migrations
    await migrate(db, {
      migrationsFolder: join(__dirname, '../../drizzle'),
    })
    logger.log('数据库迁移完成')

    // Create message routing trigger
    logger.log('正在创建消息路由触发器...')
    await db.execute(createMessageRoutingTrigger())
    logger.log('消息路由触发器创建完成')

    // Create vector similarity search function
    logger.log('正在创建向量相似度搜索函数...')
    await db.execute(sql`
      CREATE OR REPLACE FUNCTION similarity_search(
        query_embedding vector(1536),
        match_threshold float,
        match_count int,
        filter_chat_id bigint DEFAULT NULL,
        filter_type text DEFAULT NULL,
        filter_start_time timestamp DEFAULT NULL,
        filter_end_time timestamp DEFAULT NULL
      )
      RETURNS TABLE (
        id bigint,
        chat_id bigint,
        type text,
        content text,
        created_at timestamp,
        similarity float
      )
      LANGUAGE plpgsql
      AS $$
      BEGIN
        RETURN QUERY
        SELECT
          m.id,
          m.chat_id,
          m.type::text,
          m.content,
          m.created_at,
          1 - (m.embedding <=> query_embedding) as similarity
        FROM messages m
        WHERE
          m.embedding IS NOT NULL
          AND (filter_chat_id IS NULL OR m.chat_id = filter_chat_id)
          AND (filter_type IS NULL OR m.type::text = filter_type)
          AND (filter_start_time IS NULL OR m.created_at >= filter_start_time)
          AND (filter_end_time IS NULL OR m.created_at <= filter_end_time)
          AND 1 - (m.embedding <=> query_embedding) > match_threshold
        ORDER BY m.embedding <=> query_embedding
        LIMIT match_count;
      END;
      $$;
    `)
    logger.log('向量相似度搜索函数创建完成')
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
