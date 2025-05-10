// https://github.com/moeru-ai/airi/blob/main/services/telegram-bot/src/models/sticker-packs.ts

import { desc } from 'drizzle-orm'

import { withDb } from '../db'
import { stickerPacksTable } from '../db/schema'

export async function recordStickerPack(platformId: string, name: string, platform = 'telegram') {
  (await withDb(db => db
    .insert(stickerPacksTable)
    .values({
      platform,
      platform_id: platformId,
      name,
      description: '',
    }),
  )).expect('Failed to record sticker pack')
}

export async function listStickerPacks() {
  return (await withDb(db => db
    .select()
    .from(stickerPacksTable)
    .orderBy(desc(stickerPacksTable.created_at)),
  )).expect('Failed to list sticker packs')
}
