import type { Config } from '@tg-search/common'

import { getConfig, updateConfig, useLogger } from '@tg-search/common'
import { Elysia, t } from 'elysia'

import { createResponse } from '../utils/response'

const logger = useLogger()

// Config validation schema
const configSchema = t.Object({
  database: t.Object({
    host: t.String(),
    port: t.Number(),
    user: t.String(),
    password: t.String(),
    database: t.String(),
    url: t.Optional(t.String()),
  }),
  message: t.Object({
    export: t.Object({
      batchSize: t.Number(),
      concurrent: t.Number(),
      retryTimes: t.Number(),
      maxTakeoutRetries: t.Number(),
    }),
    batch: t.Object({
      size: t.Number(),
    }),
  }),
  path: t.Object({
    session: t.String(),
    media: t.String(),
  }),
  api: t.Object({
    telegram: t.Object({
      apiId: t.String(),
      apiHash: t.String(),
      phoneNumber: t.String(),
    }),
    openai: t.Object({
      apiKey: t.String(),
      apiBase: t.Optional(t.String()),
    }),
  }),
})

/**
 * Mask sensitive information in config
 */
function maskConfig(config: Config): Config {
  return {
    ...config,
    database: {
      ...config.database,
      password: '******',
    },
    api: {
      ...config.api,
      telegram: {
        ...config.api.telegram,
        apiHash: '******',
      },
      openai: {
        ...config.api.openai,
        apiKey: '******',
      },
    },
  }
}

/**
 * Config routes
 */
export const configRoutes = new Elysia({ prefix: '/config' })
  // Error handling
  .onError(({ code, error }) => {
    logger.withError(error).error(`Error handling request: ${code}`)
    return createResponse(undefined, error)
  })
  // Get current config
  .get('/', () => {
    const config = getConfig()
    return createResponse(maskConfig(config))
  })
  // Update config
  .put('/', async ({ body }) => {
    try {
      const updatedConfig = updateConfig(body)
      return createResponse(maskConfig(updatedConfig))
    }
    catch (err) {
      logger.withError(err).error('Failed to update config')
      throw err
    }
  }, {
    body: configSchema,
  })
