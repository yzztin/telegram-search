import type { MessageResolver, MessageResolverOpts } from '.'

import { useLogger } from '@tg-search/common'

import { withResult } from '../utils/result'

export function createUserResolver(): MessageResolver {
  const logger = useLogger('core:message-resolver:user')

  return {
    run: async (opts: MessageResolverOpts) => {
      logger.withFields({ opts }).verbose('User resolver')

      return withResult(null, null)
    },
  }
}
