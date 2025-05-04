import type { CoreMessage } from '../utils/message'
import type { PromiseResult } from '../utils/result'

import { useLogger } from '@tg-search/common'

export interface MessageResolverOpts {
  messages: CoreMessage[]
}

export interface MessageResolver {
  run: (opts: MessageResolverOpts) => PromiseResult<CoreMessage[] | null>
}

export function useMessageResolverRegistry() {
  const logger = useLogger()

  const registry = new Map<string, MessageResolver>()

  return {
    register: (name: string, resolver: MessageResolver) => {
      logger.withFields({ name }).debug('Register resolver')
      registry.set(name, resolver)
    },

    get: (name: string) => {
      return registry.get(name) as MessageResolver
    },
  }
}
