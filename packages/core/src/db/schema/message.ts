import { bigint, integer, jsonb, pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

// Message type enum
export const messageTypeEnum = pgEnum('message_type', ['text', 'photo', 'video', 'document', 'sticker', 'other'])

// Media file info
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

// Messages table
export const messages = pgTable('messages', {
  // Message ID from Telegram
  id: bigint('id', { mode: 'number' }).primaryKey(),
  // Chat ID from Telegram
  chatId: bigint('chat_id', { mode: 'number' }).notNull(),
  // Message type
  type: messageTypeEnum('type').notNull().default('text'),
  // Message content
  content: text('content'),
  // Message vector embedding
  embedding: text('embedding').$type<`[${string}]`>(),
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
})
