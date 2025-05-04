import { and, eq } from 'drizzle-orm'

import { withDb } from '../db'
import { chatMessageStatsView } from '../db/schema'

export async function getChatMessagesStats() {
  return withDb(db => db
    .select()
    .from(chatMessageStatsView)
    .where(eq(chatMessageStatsView.platform, 'telegram')),
  )
}

export async function getChatMessageStatsByChatId(chatId: string) {
  return withDb(db => db
    .select()
    .from(chatMessageStatsView)
    .where(
      and(
        eq(chatMessageStatsView.platform, 'telegram'),
        eq(chatMessageStatsView.chat_id, chatId),
      ),
    )
    .limit(1),
  )
}
