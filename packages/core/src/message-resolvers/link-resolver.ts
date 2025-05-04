import type { MessageResolver, MessageResolverOpts } from '.'

import { useLogger } from '@tg-search/common'

import { withResult } from '../utils/result'

export function createLinkResolver(): MessageResolver {
  const logger = useLogger('core:message-resolver:link')

  return {
    run: async (opts: MessageResolverOpts) => {
      logger.withFields({ opts }).log('Link resolver')

      return withResult(null, null)
    },
  }
}
