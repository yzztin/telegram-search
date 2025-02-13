import process from 'node:process'
import { useLogger } from '@tg-search/common'
import { Command } from 'commander'
import { eq, isNull, sql } from 'drizzle-orm'

import { db } from '../db'
import { createMessageContentTable, messages } from '../db/schema/message'
import { EmbeddingService } from '../services/embedding'

interface EmbedOptions {
  batchSize?: number
  chatId?: number
  concurrency?: number
}

/**
 * Process messages in parallel batches
 */
async function processBatch(
  batch: { id: number, content: string | null, chatId: number }[],
  embedding: EmbeddingService,
  logger: ReturnType<typeof useLogger>,
) {
  // 过滤并准备文本
  const validBatch = batch.filter(msg => msg.content && msg.content.trim().length > 0)
  if (validBatch.length === 0) {
    logger.warn('批次中没有有效的消息内容，跳过')
    return { processed: batch.length, failed: batch.length }
  }

  try {
    // 生成向量嵌入
    const texts = validBatch.map(msg => msg.content!.trim())
    const embeddings = await embedding.generateEmbeddings(texts)

    // 批量更新
    await Promise.all(
      validBatch.map((msg, idx) => {
        const contentTable = createMessageContentTable(msg.chatId)
        return db
          .update(contentTable)
          .set({ embedding: embeddings[idx] })
          .where(eq(contentTable.id, msg.id))
      }),
    )

    const skipped = batch.length - validBatch.length
    return { processed: batch.length, failed: skipped }
  }
  catch (error) {
    logger.withError(error).warn(`处理消息批次时失败，跳过 ${batch.length} 条消息`)
    return { processed: batch.length, failed: batch.length }
  }
}

/**
 * Generate embeddings for messages that don't have them
 */
export default async function embed(options: Partial<EmbedOptions> = {}) {
  const logger = useLogger()
  const embedding = new EmbeddingService()

  // 如果没有直接传入参数，则从命令行获取
  if (!options.batchSize) {
    const program = new Command()
    program
      .option('-b, --batch-size <size>', 'Batch size for processing', '100')
      .option('-c, --chat-id <id>', 'Only process messages from this chat')
      .option('-n, --concurrency <number>', 'Number of concurrent batches', '5')
      .parse()

    const opts = program.opts()
    options.batchSize = Number(opts.batchSize)
    options.chatId = opts.chatId ? Number(opts.chatId) : undefined
    options.concurrency = Number(opts.concurrency)
  }

  const batchSize = options.batchSize || 100
  const concurrency = options.concurrency || 5

  try {
    // 获取需要处理的消息总数
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(messages)
      .where(options.chatId ? eq(messages.chatId, options.chatId) : undefined)

    if (count === 0) {
      logger.log('没有需要处理的消息')
      return
    }

    logger.log(`找到 ${count} 条消息需要生成向量嵌入`)
    let processed = 0
    let failed = 0

    // 获取所有分区表
    const partitionTables = await db
      .select({
        tableName: messages.partitionTable,
        chatId: messages.chatId,
      })
      .from(messages)
      .where(options.chatId ? eq(messages.chatId, options.chatId) : undefined)
      .groupBy(messages.partitionTable, messages.chatId)

    for (const { tableName, chatId } of partitionTables) {
      const contentTable = createMessageContentTable(chatId)

      while (true) {
        // 获取多个批次的消息
        const batches = await Promise.all(
          Array.from({ length: concurrency }, () =>
            db
              .select({
                id: contentTable.id,
                content: contentTable.content,
                chatId: contentTable.chatId,
              })
              .from(contentTable)
              .where(isNull(contentTable.embedding))
              .limit(batchSize)),
        )

        // 过滤掉空批次
        const validBatches = batches.filter(batch => batch.length > 0)
        if (validBatches.length === 0)
          break

        // 并行处理多个批次
        const results = await Promise.all(
          validBatches.map(batch => processBatch(batch, embedding, logger)),
        )

        // 统计处理结果
        for (const result of results) {
          processed += result.processed
          failed += result.failed
        }

        logger.debug(`已处理 ${processed}/${count} 条消息`)
      }
    }

    logger.log(`处理完成，共处理 ${processed} 条消息，${failed} 条消息失败或被跳过`)

    // 显示使用统计
    const usage = embedding.getUsage()
    logger.log(`Token 使用量：${usage.tokens.toLocaleString()} tokens`)
    logger.log(`预估成本：$${usage.cost.toFixed(4)} USD`)
  }
  catch (error) {
    logger.withError(error).error('生成向量嵌入失败')
    process.exit(1)
  }
  finally {
    // 清理资源
    embedding.destroy()
  }
}
