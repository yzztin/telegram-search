import { basename, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { useLogger } from '@tg-search/common'
import { glob } from 'glob'

/**
 * Run all migrations in order
 */
export async function runMigrations() {
  const logger = useLogger()
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = dirname(__filename)

  // Find all migration files
  const migrationFiles = await glob('*.ts', {
    cwd: __dirname,
    ignore: ['index.ts'],
  })

  // Sort files to ensure order
  migrationFiles.sort()

  for (const file of migrationFiles) {
    try {
      const name = basename(file, '.ts')
      logger.log(`正在运行迁移: ${name}...`)

      // Dynamically import and run migration
      const migration = await import(`./${name}`)
      const run = Object.values(migration)[0] as () => Promise<void>
      await run()

      logger.log(`迁移 ${name} 完成`)
    }
    catch (error) {
      logger.withError(error).error(`迁移失败: ${file}`)
      throw error
    }
  }
}
