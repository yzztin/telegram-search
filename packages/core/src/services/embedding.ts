import { useLogger } from '@tg-search/common'
import OpenAI from 'openai'

import { getConfig } from '../composable/config'

/**
 * Service for generating embeddings from text using OpenAI
 */
export class EmbeddingService {
  private client: OpenAI
  private logger = useLogger()
  private config = getConfig()

  constructor() {
    this.client = new OpenAI({
      apiKey: this.config.openaiApiKey,
      baseURL: this.config.openaiApiBase || 'https://api.openai.com/v1',
    })
  }

  /**
   * Generate embedding for a text
   * Using text-embedding-3-small model (1536 dimensions)
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.client.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
        encoding_format: 'float',
      })

      return response.data[0].embedding
    }
    catch (error) {
      this.logger.withError(error).error('生成向量嵌入失败')
      throw error
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const response = await this.client.embeddings.create({
        model: 'text-embedding-3-small',
        input: texts,
        encoding_format: 'float',
      })

      return response.data.map(d => d.embedding)
    }
    catch (error) {
      this.logger.withError(error).error('批量生成向量嵌入失败')
      throw error
    }
  }
}
