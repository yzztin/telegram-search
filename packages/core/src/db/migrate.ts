import { dirname } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { initLogger, useLogger } from '@tg-search/common'
import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import { getConfig, initConfig } from '../composable/config'

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

    // Enable pgvector extension
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS vector`)
    logger.log('向量扩展创建完成')

    // Create enum types
    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE message_type AS ENUM ('text', 'photo', 'video', 'document', 'sticker', 'other');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE chat_type AS ENUM ('user', 'group', 'channel', 'saved');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `)
    logger.log('枚举类型创建完成')

    // Create tables
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS chats (
        uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        id BIGINT UNIQUE,
        name TEXT NOT NULL,
        type chat_type NOT NULL,
        last_message TEXT,
        last_message_date TIMESTAMP,
        last_sync_time TIMESTAMP NOT NULL DEFAULT NOW(),
        message_count INTEGER NOT NULL DEFAULT 0,
        folder_id INTEGER
      )
    `)
    logger.log('聊天表创建完成')

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS folders (
        uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        id INTEGER UNIQUE,
        title TEXT NOT NULL,
        emoji TEXT,
        last_sync_time TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `)
    logger.log('文件夹表创建完成')

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS messages (
        uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        id BIGINT NOT NULL,
        chat_id BIGINT NOT NULL,
        type message_type NOT NULL DEFAULT 'text',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        partition_table TEXT NOT NULL,
        UNIQUE (chat_id, id)
      )
    `)
    logger.log('消息表创建完成')

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS sync_state (
        uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        chat_id BIGINT UNIQUE,
        last_message_id BIGINT,
        last_sync_time TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `)
    logger.log('同步状态表创建完成')

    // Create indexes
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS messages_created_at_idx ON messages (created_at DESC);
      CREATE INDEX IF NOT EXISTS messages_type_idx ON messages (type);
      CREATE INDEX IF NOT EXISTS messages_chat_id_created_at_idx ON messages (chat_id, created_at DESC);
    `)
    logger.log('索引创建完成')

    // Create similarity search function
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
      DECLARE
        partition_table text;
        query text;
      BEGIN
        FOR partition_table IN
          SELECT DISTINCT partition_table
          FROM messages m
          WHERE
            (filter_chat_id IS NULL OR m.chat_id = filter_chat_id)
            AND (filter_type IS NULL OR m.type::text = filter_type)
            AND (filter_start_time IS NULL OR m.created_at >= filter_start_time)
            AND (filter_end_time IS NULL OR m.created_at <= filter_end_time)
        LOOP
          query := format('
            SELECT
              id,
              chat_id,
              type::text,
              content,
              created_at,
              1 - (embedding <=> %L::vector) as similarity
            FROM %I
            WHERE
              embedding IS NOT NULL
              AND 1 - (embedding <=> %L::vector) > %s
            ORDER BY embedding <=> %L::vector
            LIMIT %s
          ',
            query_embedding,
            partition_table,
            query_embedding,
            match_threshold,
            query_embedding,
            match_count
          );
          
          RETURN QUERY EXECUTE query;
        END LOOP;
      END;
      $$;
    `)
    logger.log('相似度搜索函数创建完成')
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
