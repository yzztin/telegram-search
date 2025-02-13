import process from 'node:process'
import path from 'node:path'
import fs from 'node:fs'
import dotenv from 'dotenv'
import { defineConfig } from 'drizzle-kit'
import pg from 'pg'

// Try to load .env file from command line arguments
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
  // Try to find .env in project root by looking for pnpm-workspace.yaml
  let currentPath = process.cwd()
  while (currentPath !== path.dirname(currentPath)) {
    if (fs.existsSync(path.join(currentPath, 'pnpm-workspace.yaml'))) {
      envPath = path.join(currentPath, '.env')
      break
    }
    currentPath = path.dirname(currentPath)
  }
}

if (envPath && fs.existsSync(envPath)) {
  console.log(`Loading .env from ${envPath}`)
  dotenv.config({ path: envPath })
}
else {
  console.warn('No .env file found, falling back to process.env')
  dotenv.config()
}

// Ensure DATABASE_URL exists before using it
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required')
}

// Try to create database if it doesn't exist
async function ensureDatabase() {
  const url = new URL(process.env.DATABASE_URL!)
  const dbName = url.pathname.slice(1)
  
  // Connect to postgres database to create new database
  const client = new pg.Client({
    host: url.hostname,
    port: Number(url.port) || 5432,
    user: url.username,
    password: url.password,
    database: 'postgres',
  })

  try {
    await client.connect()
    
    // Check if database exists
    const result = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [dbName]
    )
    
    if (result.rows.length === 0) {
      console.log(`Creating database ${dbName}...`)
      // Need to escape database name to prevent SQL injection
      await client.query(`CREATE DATABASE ${dbName.replace(/[^a-zA-Z0-9_]/g, '_')}`)
      console.log('Database created successfully')
    }
  }
  catch (error) {
    console.error('Failed to create database:', error)
  }
  finally {
    await client.end()
  }
}

// Create database if needed
await ensureDatabase()

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema/*',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
})
