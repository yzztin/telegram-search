import type { MessageResolver, MessageResolverOpts } from '.'
import type { CoreMessage } from '../utils/message'

import { EmbeddingDimension, useLogger } from '@tg-search/common'
import { useConfig } from '@tg-search/common/composable'
import { embedMany } from '@xsai/embed'

import { withResult } from '../utils/result'

export function createEmbeddingResolver(): MessageResolver {
  const logger = useLogger('core:message-resolver:embedding')

  const config = useConfig()
  const embedding = config.api.embedding

  return {
    run: async (opts: MessageResolverOpts) => {
      logger.withFields({ opts }).verbose('Embedding resolver')

      if (opts.messages.length === 0)
        return withResult(null, 'No messages')

      const messages: CoreMessage[] = opts.messages.filter(message => message.content)

      logger.withFields({ messages: messages.length }).verbose('Embedding messages')

      const { embeddings, usage } = await embedMany({
        apiKey: embedding.apiKey,
        baseURL: embedding.apiBase || '',
        input: messages.map(message => message.content),
        model: embedding.model,
      })

      logger.withFields({ embeddings: embeddings.length, usage }).verbose('Embedding messages done')

      for (const [index, message] of messages.entries()) {
        switch (embedding.dimension) {
          case EmbeddingDimension.DIMENSION_1536:
            message.vectors.vector1536 = embeddings[index]
            break
          case EmbeddingDimension.DIMENSION_1024:
            message.vectors.vector1024 = embeddings[index]
            break
          case EmbeddingDimension.DIMENSION_768:
            message.vectors.vector768 = embeddings[index]
            break
          default:
            throw new Error(`Unsupported embedding dimension: ${embedding.dimension}`)
        }
      }

      return withResult(messages, null)
    },
  }
}
