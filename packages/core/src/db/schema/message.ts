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
  // Chat ID from Telegram
  id: bigint('id', { mode: 'number' }).primaryKey(),
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
  // Folder ID from Telegram
  id: integer('id').primaryKey(),
  // Folder title
  title: text('title').notNull(),
  // Folder emoji
  emoji: text('emoji'),
  // Last sync time
  lastSyncTime: timestamp('last_sync_time').notNull().defaultNow(),
})

// Base messages table
export const messages = pgTable('messages', {
  // Message ID from Telegram
  id: bigint('id', { mode: 'number' }).notNull(),
  // UUID for external reference
  uuid: uuid('uuid').defaultRandom(),
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
  // Composite primary key
  pk: sql`PRIMARY KEY (chat_id, id)`,
  // Index for vector similarity search
  embeddingIdx: sql`CREATE INDEX IF NOT EXISTS messages_embedding_idx ON ${table} USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)`,
  // Index for created_at
  createdAtIdx: sql`CREATE INDEX IF NOT EXISTS messages_created_at_idx ON ${table} (created_at DESC)`,
  // Index for type
  typeIdx: sql`CREATE INDEX IF NOT EXISTS messages_type_idx ON ${table} (type)`,
  // Index for chat_id and created_at
  chatCreatedAtIdx: sql`CREATE INDEX IF NOT EXISTS messages_chat_id_created_at_idx ON ${table} (chat_id, created_at DESC)`,
}))

// Function to create partition table for a chat
export function createChatPartition(chatId: number) {
  return sql`
    CREATE TABLE IF NOT EXISTS messages_${sql.raw(chatId.toString())} (
      CHECK (chat_id = ${chatId})
    ) INHERITS (messages)
  `
}

// Function to create indexes for partition table
export function createChatPartitionIndexes(chatId: number) {
  return sql`
    CREATE INDEX IF NOT EXISTS messages_${sql.raw(chatId.toString())}_embedding_idx 
    ON messages_${sql.raw(chatId.toString())} 
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

    CREATE INDEX IF NOT EXISTS messages_${sql.raw(chatId.toString())}_created_at_idx 
    ON messages_${sql.raw(chatId.toString())} (created_at DESC);

    CREATE INDEX IF NOT EXISTS messages_${sql.raw(chatId.toString())}_type_idx 
    ON messages_${sql.raw(chatId.toString())} (type);
  `
}

// Function to create trigger for message routing
export function createMessageRoutingTrigger() {
  return sql`
    CREATE OR REPLACE FUNCTION message_insert_trigger()
    RETURNS TRIGGER AS $$
    DECLARE
      partition_name text;
    BEGIN
      partition_name := 'messages_' || NEW.chat_id;
      
      -- Create partition if not exists
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I (
          CHECK (chat_id = %s)
        ) INHERITS (messages)
      ', partition_name, NEW.chat_id);
      
      -- Create indexes if not exists
      EXECUTE format('
        CREATE INDEX IF NOT EXISTS %I_embedding_idx 
        ON %I 
        USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)
      ', partition_name, partition_name);
      
      EXECUTE format('
        CREATE INDEX IF NOT EXISTS %I_created_at_idx 
        ON %I (created_at DESC)
      ', partition_name, partition_name);
      
      EXECUTE format('
        CREATE INDEX IF NOT EXISTS %I_type_idx 
        ON %I (type)
      ', partition_name, partition_name);
      
      -- Insert into partition
      EXECUTE format('
        INSERT INTO %I VALUES ($1.*)', partition_name)
      USING NEW;
      
      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS message_insert_trigger ON messages;
    CREATE TRIGGER message_insert_trigger
    BEFORE INSERT ON messages
    FOR EACH ROW EXECUTE FUNCTION message_insert_trigger();
  `
}

// Sync state table
export const syncState = pgTable('sync_state', {
  // Chat ID from Telegram
  chatId: bigint('chat_id', { mode: 'number' }).primaryKey(),
  // Last synced message ID
  lastMessageId: bigint('last_message_id', { mode: 'number' }),
  // Last sync time
  lastSyncTime: timestamp('last_sync_time').notNull().defaultNow(),
})
