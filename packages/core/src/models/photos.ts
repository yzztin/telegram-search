// https://github.com/moeru-ai/airi/blob/main/services/telegram-bot/src/models/photos.ts

import { eq, inArray } from 'drizzle-orm'

import { withDb } from '../db'
import { photosTable } from '../db/schema'

export async function findPhotoDescription(fileId: string) {
  const photo = await withDb(db => db
    .select()
    .from(photosTable)
    .where(eq(photosTable.file_id, fileId))
    .limit(1),
  )

  if (photo.length === 0) {
    return ''
  }

  return photo[0].description
}

export async function recordPhoto(photoBase64: string, fileId: string, filePath: string, description: string) {
  await withDb(db => db
    .insert(photosTable)
    .values({
      platform: 'telegram',
      file_id: fileId,
      image_base64: photoBase64,
      image_path: filePath,
      description,
    }),
  )
}

export async function findPhotosDescriptions(fileIds: string[]) {
  return await withDb(db => db
    .select()
    .from(photosTable)
    .where(inArray(photosTable.file_id, fileIds)),
  )
}
