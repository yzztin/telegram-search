import { useLogger } from '@tg-search/common'
import OpenAI from 'openai'

/**
 * Service for generating embeddings from text using OpenAI
 */
export class EmbeddingService {
  private client: OpenAI
  private logger = useLogger()

  constructor(apiKey: string, baseURL?: string) {
    this.client = new OpenAI({ 
      apiKey,
      baseURL: baseURL || process.env.OPENAI_API_BASE || 'https://api.openai.com/v1',
      defaultHeaders: baseURL ? {
        'HTTP-Referer': 'https://github.com/luoling8192/telegram-search',
        'X-Title': 'telegram-search',
      } : undefined,
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
      this.logger.withFields({ error: String(error) }).log('生成向量嵌入失败')
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
      this.logger.withFields({ error: String(error) }).log('批量生成向量嵌入失败')
      throw error
    }
  }
} 
