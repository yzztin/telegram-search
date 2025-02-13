import { initLogger, useLogger } from '@tg-search/common'
import { and, count, eq, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import { getConfig, initConfig } from '../composable/config'
import { messages, messageTypeEnum } from './schema/message'

initLogger()
initConfig()
const logger = useLogger()
const config = getConfig()

async function main() {
  // Database connection
  const connectionString = config.databaseUrl
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
    logger.log('测试插入带向量的消息...')
    const testMessage = {
      id: 1,
      chatId: 1,
      type: messageTypeEnum.enumValues[0], // 使用枚举值 'text'
      content: '这是一条测试消息',
      embedding: Array.from({ length: 1536 }).fill(0).map(() => Math.random()), // 生成 1536 维的随机向量
      createdAt: new Date(),
    }

    await db.insert(messages).values({
      ...testMessage,
      embedding: testMessage.embedding,
    })
    logger.log('消息插入成功')

    // Test 3: 测试向量相似度查询
    logger.log('测试向量相似度查询...')
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

    logger.withFields({ searchResult }).log('查询结果:')

    // Test 4: 清理测试数据
    logger.log('清理测试数据...')
    await db.delete(messages).where(eq(messages.id, 1))
    logger.log('测试数据已清理')

    logger.log('所有测试完成！')
  }
  catch (error) {
    logger.withError(error).error('测试失败:')
  }
  finally {
    await client.end()
  }
}

main()
