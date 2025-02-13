import { sql } from 'drizzle-orm'
import { bigint, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid, vector } from 'drizzle-orm/pg-core'

// Message type enum
export const messageTypeEnum = pgEnum('message_type', [
  'text',
  'photo',
  'video',
  'document',
  'sticker',
  'other',
])
export type MessageType = (typeof messageTypeEnum.enumValues)[number]

// Chat type enum
export const chatTypeEnum = pgEnum('chat_type', [
  'user',
  'group',
  'channel',
  'saved',
])

// Media file info type
export interface MediaInfo {
  fileId: string
  type: string
  mimeType?: string
  fileName?: string
  fileSize?: number
  width?: number
  height?: number
  duration?: number
  thumbnail?: {
    fileId: string
    width: number
    height: number
  }
  localPath?: string
}

// Chats table
export const chats = pgTable('chats', {
  // UUID for external reference
  uuid: uuid('uuid').defaultRandom().primaryKey(),
  // Chat ID from Telegram
  id: bigint('id', { mode: 'number' }).unique(),
  // Chat name
  name: text('name').notNull(),
  // Chat type
  type: chatTypeEnum('type').notNull(),
  // Last message
  lastMessage: text('last_message'),
  // Last message date
  lastMessageDate: timestamp('last_message_date'),
  // Last sync time
  lastSyncTime: timestamp('last_sync_time').notNull().defaultNow(),
  // Message count
  messageCount: integer('message_count').notNull().default(0),
  // Folder ID
  folderId: integer('folder_id'),
})

// Folders table
export const folders = pgTable('folders', {
  // UUID for external reference
  uuid: uuid('uuid').defaultRandom().primaryKey(),
  // Folder ID from Telegram
  id: integer('id').unique(),
  // Folder title
  title: text('title').notNull(),
  // Folder emoji
  emoji: text('emoji'),
  // Last sync time
  lastSyncTime: timestamp('last_sync_time').notNull().defaultNow(),
})

// Base messages table (metadata only)
export const messages = pgTable('messages', {
  // UUID for external reference
  uuid: uuid('uuid').defaultRandom().primaryKey(),
  // Message ID from Telegram
  id: bigint('id', { mode: 'number' }).notNull(),
  // Chat ID from Telegram
  chatId: bigint('chat_id', { mode: 'number' }).notNull(),
  // Message type
  type: messageTypeEnum('type').notNull().default('text'),
  // Creation time
  createdAt: timestamp('created_at').notNull().defaultNow(),
  // Partition table name
  partitionTable: text('partition_table').notNull(),
}, table => ({
  // Unique constraint for chat_id and id
  chatMessageUnique: sql`UNIQUE (chat_id, id)`,
  // Index for created_at
  createdAtIdx: sql`CREATE INDEX IF NOT EXISTS messages_created_at_idx ON ${table} (created_at DESC)`,
  // Index for type
  typeIdx: sql`CREATE INDEX IF NOT EXISTS messages_type_idx ON ${table} (type)`,
  // Index for chat_id and created_at
  chatCreatedAtIdx: sql`CREATE INDEX IF NOT EXISTS messages_chat_id_created_at_idx ON ${table} (chat_id, created_at DESC)`,
}))

// Message content table template
export function createMessageContentTable(chatId: number | bigint) {
  // 使用 n 前缀表示负数，处理 BigInt
  const absId = chatId < 0 ? -chatId : chatId
  const tableName = `messages_${chatId < 0 ? 'n' : ''}${absId}`
  return pgTable(tableName, {
    // UUID for external reference
    uuid: uuid('uuid').defaultRandom().primaryKey(),
    // Message ID from Telegram
    id: bigint('id', { mode: 'number' }).notNull(),
    // Chat ID from Telegram
    chatId: bigint('chat_id', { mode: 'number' }).notNull(),
    // Message type
    type: messageTypeEnum('type').notNull().default('text'),
    // Message content
    content: text('content'),
    // Message vector embedding (1536 dimensions)
    embedding: vector('embedding', { dimensions: 1536 }),
    // Media file info
    mediaInfo: jsonb('media_info').$type<MediaInfo>(),
    // Creation time
    createdAt: timestamp('created_at').notNull().defaultNow(),
    // From user ID
    fromId: bigint('from_id', { mode: 'number' }),
    // Reply to message ID
    replyToId: bigint('reply_to_id', { mode: 'number' }),
    // Forward from chat ID
    forwardFromChatId: bigint('forward_from_chat_id', { mode: 'number' }),
    // Forward from message ID
    forwardFromMessageId: bigint('forward_from_message_id', { mode: 'number' }),
    // Views count
    views: integer('views'),
    // Forwards count
    forwards: integer('forwards'),
  }, table => ({
    // Unique constraint for chat_id and id
    chatMessageUnique: sql`UNIQUE (chat_id, id)`,
    // Index for vector similarity search
    embeddingIdx: sql`CREATE INDEX IF NOT EXISTS messages_${sql.raw(chatId < 0 ? 'n' : '')}${sql.raw(String(absId))}_embedding_idx ON ${table} USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)`,
    // Index for created_at
    createdAtIdx: sql`CREATE INDEX IF NOT EXISTS messages_${sql.raw(chatId < 0 ? 'n' : '')}${sql.raw(String(absId))}_created_at_idx ON ${table} (created_at DESC)`,
    // Index for type
    typeIdx: sql`CREATE INDEX IF NOT EXISTS messages_${sql.raw(chatId < 0 ? 'n' : '')}${sql.raw(String(absId))}_type_idx ON ${table} (type)`,
  }))
}

// Function to create partition table for a chat
export function createChatPartition(chatId: number | bigint) {
  // 使用 n 前缀表示负数，处理 BigInt
  const absId = chatId < 0 ? -chatId : chatId
  const tableName = `messages_${chatId < 0 ? 'n' : ''}${absId}`
  return sql`
    CREATE TABLE IF NOT EXISTS ${sql.raw(tableName)} (
      uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      id BIGINT NOT NULL,
      chat_id BIGINT NOT NULL,
      type message_type NOT NULL DEFAULT 'text',
      content TEXT,
      embedding vector(1536),
      media_info JSONB,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      from_id BIGINT,
      reply_to_id BIGINT,
      forward_from_chat_id BIGINT,
      forward_from_message_id BIGINT,
      views INTEGER,
      forwards INTEGER,
      UNIQUE (chat_id, id)
    );

    CREATE INDEX IF NOT EXISTS messages_${sql.raw(chatId < 0 ? 'n' : '')}${sql.raw(String(absId))}_embedding_idx
    ON ${sql.raw(tableName)}
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

    CREATE INDEX IF NOT EXISTS messages_${sql.raw(chatId < 0 ? 'n' : '')}${sql.raw(String(absId))}_created_at_idx
    ON ${sql.raw(tableName)} (created_at DESC);

    CREATE INDEX IF NOT EXISTS messages_${sql.raw(chatId < 0 ? 'n' : '')}${sql.raw(String(absId))}_type_idx
    ON ${sql.raw(tableName)} (type);
  `
}

// Sync state table
export const syncState = pgTable('sync_state', {
  // UUID for external reference
  uuid: uuid('uuid').defaultRandom().primaryKey(),
  // Chat ID from Telegram
  chatId: bigint('chat_id', { mode: 'number' }).unique(),
  // Last synced message ID
  lastMessageId: bigint('last_message_id', { mode: 'number' }),
  // Last sync time
  lastSyncTime: timestamp('last_sync_time').notNull().defaultNow(),
})
