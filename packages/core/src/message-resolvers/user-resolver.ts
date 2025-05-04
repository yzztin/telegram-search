import type { MessageResolver, MessageResolverOpts } from '.'
import type { CoreMessage } from '../utils/message'

import { useLogger } from '@tg-search/common'

import { Ok } from '../utils/monad'

export function createUserResolver(): MessageResolver {
  const logger = useLogger('core:resolver:user')

  return {
    run: async (_opts: MessageResolverOpts) => {
      logger.verbose('Executing user resolver')

      return Ok([] as CoreMessage[])
    },
  }
}
