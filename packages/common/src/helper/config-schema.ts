import type { InferOutput } from 'valibot'

import { boolean, enum as enumType, number, object, optional, string } from 'valibot'

export enum SocksType {
  SOCKS4 = 4,
  SOCKS5 = 5,
}

export enum EmbeddingProvider {
  OPENAI = 'openai',
  OLLAMA = 'ollama',
}

export enum EmbeddingDimension {
  DIMENSION_1536 = 1536,
  DIMENSION_1024 = 1024,
  DIMENSION_768 = 768,
}

export const proxyConfigSchema = object({
  ip: string(),
  port: number(),
  MTProxy: optional(boolean()),
  secret: optional(string()),
  socksType: optional(enumType(SocksType)),
  timeout: optional(number()),
  username: optional(string()),
  password: optional(string()),
})

export const databaseConfigSchema = object({
  host: string(),
  port: number(),
  user: string(),
  password: string(),
  database: string(),

  url: optional(string()),
})

export const messageConfigSchema = object({
  export: object({
    batchSize: number(),
    concurrent: number(),
    retryTimes: number(),
    maxTakeoutRetries: number(),
  }),
  batch: object({
    size: number(),
  }),
})

export const pathConfigSchema = object({
  storage: string(),
  dict: string(),
})

export const telegramConfigSchema = object({
  apiId: string(),
  apiHash: string(),
  phoneNumber: string(),
  proxy: optional(proxyConfigSchema),
})

export const embeddingConfigSchema = object({
  provider: enumType(EmbeddingProvider),
  model: string(),
  dimension: optional(enumType(EmbeddingDimension)),
  apiKey: optional(string()),
  apiBase: optional(string()),
})

export const apiConfigSchema = object({
  telegram: telegramConfigSchema,
  embedding: embeddingConfigSchema,
})

export const configSchema = object({
  database: databaseConfigSchema,
  message: messageConfigSchema,
  path: pathConfigSchema,
  api: apiConfigSchema,
})

export type Config = InferOutput<typeof configSchema>
export type ProxyConfig = InferOutput<typeof proxyConfigSchema>
