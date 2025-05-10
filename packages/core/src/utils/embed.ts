import { useConfig } from '@tg-search/common/composable'
import { embedMany } from '@xsai/embed'

import { Ok } from './monad'

export async function embedContents(contents: string[]) {
  const embeddingConfig = useConfig().api.embedding

  const embeddings = await embedMany({
    apiKey: embeddingConfig.apiKey,
    baseURL: embeddingConfig.apiBase || '',
    input: contents,
    model: embeddingConfig.model,
  })

  return Ok({
    ...embeddings,
    dimension: embeddingConfig.dimension,
  })
}
