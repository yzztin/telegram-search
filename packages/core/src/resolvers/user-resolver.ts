import type { MessageResolver, MessageResolverOpts } from './'

import { useLogger } from '@tg-search/common'

import { withResult } from '../utils/result'

export function createUserResolver(): MessageResolver {
  const logger = useLogger()

  return {
    run: async (opts: MessageResolverOpts) => {
      logger.debug('User resolver', opts)

      return withResult(null, 'Not implemented')
    },
  }
}
