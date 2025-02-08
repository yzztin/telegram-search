import { pgTable, bigint, text, timestamp, integer, pgEnum } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

// Message type enum
export const messageTypeEnum = pgEnum('message_type', ['text', 'photo', 'video', 'document', 'other'])

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
