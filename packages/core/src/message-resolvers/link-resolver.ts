import type { MessageResolver, MessageResolverOpts } from '.'

import { useLogger } from '@tg-search/common'

import { withResult } from '../utils/result'

export function createLinkResolver(): MessageResolver {
  const logger = useLogger()

  return {
    run: async (opts: MessageResolverOpts) => {
      logger.debug('Link resolver', opts)

      return withResult(null, null)
    },
  }
}
