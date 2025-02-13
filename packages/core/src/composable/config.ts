import fs from 'node:fs'
import * as os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { useLogger } from '@tg-search/common'
import { config as dotenvConfig } from 'dotenv'

interface Config {
  botToken: string
  databaseUrl: string
  apiId: string
  apiHash: string
  phoneNumber: string
  openaiApiKey: string
  openaiApiBase?: string
  sessionPath: string
  mediaPath: string
}

let config: Config | null = null

/**
 * Find the project root directory by looking for pnpm-workspace.yaml
 */
function findProjectRoot(startPath: string): string | null {
  let currentPath = startPath
  while (currentPath !== path.dirname(currentPath)) {
    if (fs.existsSync(path.join(currentPath, 'pnpm-workspace.yaml'))) {
      return currentPath
    }
    currentPath = path.dirname(currentPath)
  }
  return null
}

/**
 * Construct database URL from separate fields
 */
function constructDatabaseUrl({
  host,
  port,
  user,
  password,
  database,
}: {
  host: string
  port: string | number
  user: string
  password: string
  database: string
}): string {
  return `postgres://${user}:${password}@${host}:${port}/${database}`
}

/**
 * Resolve home directory in path
 */
function resolveHomeDir(dir: string): string {
  if (dir.startsWith('~/')) {
    return path.join(os.homedir(), dir.slice(2))
  }
  return dir
}

export function initConfig() {
  const logger = useLogger()

  // Try to find .env path from command line arguments
  let envPath: string | undefined
  const envIndex = process.argv.indexOf('-e')
  if (envIndex !== -1 && envIndex + 1 < process.argv.length) {
    envPath = process.argv[envIndex + 1]
  }
  else {
    const envFlagIndex = process.argv.findIndex(arg => arg.startsWith('--env='))
    if (envFlagIndex !== -1) {
      envPath = process.argv[envFlagIndex].split('=')[1]
    }
  }

  // If no env path provided, try to find .env in project root
  if (!envPath) {
    const projectRoot = findProjectRoot(process.cwd())
    if (projectRoot) {
      envPath = path.join(projectRoot, '.env')
    }
  }

  if (envPath && fs.existsSync(envPath)) {
    logger.log(`Loading .env from ${envPath}`)
    dotenvConfig({ path: envPath })
  }
  else {
    logger.warn('No .env file found, falling back to process.env')
    dotenvConfig()
  }

  // Get database URL from separate fields if not provided
  let databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    databaseUrl = constructDatabaseUrl({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'tg_search',
    })
  }

  // Get session and media paths with home directory resolution
  const defaultDir = path.join(os.homedir(), '.telegram-search')
  const sessionPath = resolveHomeDir(process.env.SESSION_PATH || path.join(defaultDir, 'session'))
  const mediaPath = resolveHomeDir(process.env.MEDIA_PATH || path.join(defaultDir, 'media'))

  config = {
    botToken: process.env.BOT_TOKEN!,
    databaseUrl,
    apiId: process.env.API_ID!,
    apiHash: process.env.API_HASH!,
    phoneNumber: process.env.PHONE_NUMBER!,
    openaiApiKey: process.env.OPENAI_API_KEY!,
    openaiApiBase: process.env.OPENAI_API_BASE,
    sessionPath,
    mediaPath,
  }

  logger.withFields({ config }).log('Config initialized')
}

export function getConfig(): Config {
  if (!config) {
    throw new Error('Config not initialized')
  }
  return config
}
