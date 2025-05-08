// https://github.com/moeru-ai/airi/blob/main/services/telegram-bot/src/models/chats.ts

import type { CoreDialog } from '../services/dialog'

import { eq, sql } from 'drizzle-orm'

import { withDb } from '../db'
import { joinedChatsTable } from '../db/schema'

export async function listJoinedChats() {
  return (await withDb(db => db
    .select()
    .from(joinedChatsTable)
    .where(eq(joinedChatsTable.platform, 'telegram')),
  )).expect('Failed to list joined chats')
}

export async function recordJoinedChats(chats: CoreDialog[]) {
  // TODO: better way to do this?
  return (await withDb(db => db
    .insert(joinedChatsTable)
    .values(chats.map(chat => ({
      platform: 'telegram',
      chat_id: chat.id.toString(),
      chat_name: chat.name,
      chat_type: chat.type,
      // created_at: chat.lastMessageDate,
      // updated_at: Date.now(),
    })))
    .onConflictDoUpdate({
      target: joinedChatsTable.chat_id,
      set: {
        chat_name: sql`excluded.chat_name`,
        chat_type: sql`excluded.chat_type`,
        updated_at: Date.now(), // TODO: is it correct?
      },
    }),
  )).expect('Failed to record joined chats')
}
