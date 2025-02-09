import process from 'node:process'
import dotenv from 'dotenv'
import { defineConfig } from 'drizzle-kit'

dotenv.config()

// Ensure DATABASE_URL exists before using it
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required')
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema/*',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL as string, // Type assertion to handle undefined case
  },
})
