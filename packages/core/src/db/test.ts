import { useLogger } from '@tg-search/common'
import { and, count, eq, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { config } from 'dotenv'

import { messages, messageTypeEnum } from './schema/message'

// Load environment variables
config()

const logger = useLogger()

async function main() {
  // Database connection
  const connectionString = process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/tg_search'
  const client = postgres(connectionString, {
    max: 1,
    onnotice: () => {},
  })
  const db = drizzle(client)

  try {
    // Test 1: 测试数据库连接
    logger.log('测试数据库连接...')
    const result = await db.select({ count: count() }).from(messages)
    logger.log('数据库连接成功，当前消息数量:', result[0].count)

    // Test 2: 测试插入带向量的消息
    logger.log('\n测试插入带向量的消息...')
    const testMessage = {
      id: 1,
      chatId: 1,
      type: messageTypeEnum.enumValues[0], // 使用枚举值 'text'
      content: '这是一条测试消息',
      embedding: Array(1536).fill(0).map(() => Math.random()), // 生成 1536 维的随机向量
      createdAt: new Date(),
    }

    await db.insert(messages).values({
      ...testMessage,
      embedding: `[${testMessage.embedding.join(',')}]`,
    })
    logger.log('消息插入成功')

    // Test 3: 测试向量相似度查询
    logger.log('\n测试向量相似度查询...')
    const searchResult = await db.select({
      id: messages.id,
      content: messages.content,
      similarity: sql<number>`1 - (${messages.embedding}::vector <=> ${sql.raw(`'[${testMessage.embedding.join(',')}]'`)}::vector)`.as('similarity'),
    })
      .from(messages)
      .where(and(
        eq(messages.id, 1),
        sql`${messages.embedding} IS NOT NULL`,
      ))
      .orderBy(sql`similarity DESC`)
      .limit(1)

    logger.log('查询结果:', searchResult)

    // Test 4: 清理测试数据
    logger.log('\n清理测试数据...')
    await db.delete(messages).where(eq(messages.id, 1))
    logger.log('测试数据已清理')

    logger.log('\n所有测试完成！')
  }
  catch (error) {
    logger.log('测试失败:', String(error))
  }
  finally {
    await client.end()
  }
}

main()
