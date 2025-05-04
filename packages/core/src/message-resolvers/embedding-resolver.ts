import type { MessageResolver, MessageResolverOpts } from '.'
import type { CoreMessage } from '../utils/message'

import { EmbeddingDimension, useLogger } from '@tg-search/common'
import { useConfig } from '@tg-search/common/composable'
import { embedMany } from '@xsai/embed'

import { withResult } from '../utils/result'

export function createEmbeddingResolver(): MessageResolver {
  const logger = useLogger()

  const config = useConfig()
  const embedding = config.api.embedding

  return {
    run: async (opts: MessageResolverOpts) => {
      logger.debug('Embedding resolver', opts)

      if (opts.messages.length === 0)
        return withResult(null, 'No messages')

      const messages: CoreMessage[] = opts.messages.filter(message => message.content)

      const { embeddings } = await embedMany({
        apiKey: embedding.apiKey,
        baseURL: embedding.apiBase || '',
        input: messages.map(message => message.content),
        model: embedding.model,
      })

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
