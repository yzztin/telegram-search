import type { MessageResolver, MessageResolverOpts } from '.'
import type { CoreMessage } from '../utils/message'

import { EmbeddingDimension, useLogger } from '@tg-search/common'
import { useConfig } from '@tg-search/common/composable'
import { embedMany } from '@xsai/embed'

import { Err, Ok } from '../utils/monad'

export function createEmbeddingResolver(): MessageResolver {
  const logger = useLogger('core:resolver:embedding')

  const config = useConfig()
  const embedding = config.api.embedding

  return {
    run: async (opts: MessageResolverOpts) => {
      logger.verbose('Executing embedding resolver')

      if (opts.messages.length === 0)
        return Err('No messages')

      const messages: CoreMessage[] = opts.messages.filter(
        message => message.content
          && (message.vectors.vector1024?.length === 0
            || message.vectors.vector1536?.length === 0
            || message.vectors.vector768?.length === 0),
      )

      if (messages.length === 0)
        return Err('No messages to embed')

      logger.withFields({ messages: messages.length }).verbose('Embedding messages')

      const { embeddings, usage } = await embedMany({
        apiKey: embedding.apiKey,
        baseURL: embedding.apiBase || '',
        input: messages.map(message => message.content),
        model: embedding.model,
      })

      // if (message.sticker != null) {
      //   text = `A sticker sent by user ${await findStickerDescription(message.sticker.file_id)}, sticker set named ${message.sticker.set_name}`
      // }
      // else if (message.photo != null) {
      //   text = `A set of photo, descriptions are: ${(await Promise.all(message.photo.map(photo => findPhotoDescription(photo.file_id)))).join('\n')}`
      // }
      // else if (message.text) {
      //   text = message.text || message.caption || ''
      // }

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

      return Ok(messages)
    },
  }
}
