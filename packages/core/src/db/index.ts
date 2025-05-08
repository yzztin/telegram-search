import { flags, useLogger } from '@tg-search/common'
import { getDatabaseDSN, useConfig } from '@tg-search/common/composable'
import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import { Err, Ok } from '../utils/monad'

export type CoreDB = ReturnType<typeof drizzle>
let dbInstance: CoreDB

export async function initDrizzle() {
  const logger = useLogger()
  logger.log('Initializing database...')

  // Database connection
  const config = useConfig()
  const connectionString = getDatabaseDSN(config)
  const client = postgres(connectionString, {
    max: 1,
    onnotice: (notice) => {
      logger.withFields({ notice }).verbose('Database connection notice')
    },
  })

  dbInstance = drizzle(client, { logger: flags.isDatabaseDebugMode })

  // Check the db connection
  try {
    await dbInstance.execute(sql`select 1`)
  }
  catch (error) {
    logger.withError(error).error('Failed to connect to database')
    throw error
  }
}

function useDrizzle() {
  if (!dbInstance) {
    throw new Error('Database not initialized')
  }

  return dbInstance
}

export async function withDb<T>(
  fn: (db: CoreDB) => Promise<T>,
) {
  try {
    return Ok(await fn(useDrizzle()))
  }
  catch (error) {
    return Err<T>(error)
  }
}

// export function withDb2<T>(
//   fn: (db: CoreDB) => Promise<T>,
// ): Future<T> {
//   return Async(async () => fn(useDrizzle()))
// }
