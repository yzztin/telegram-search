import { db } from '.'
import { messages } from './schema/message'

async function main() {
  try {
    // Test database connection
    const result = await db.select().from(messages).limit(1)
    console.log('Database connection successful')
    console.log('Query result:', result)
  }
  catch (error) {
    console.error('Database connection failed:', error)
  }
}

main()
