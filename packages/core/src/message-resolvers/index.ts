import type { CoreMessage } from '../utils/message'
import type { PromiseResult } from '../utils/result'

import { useLogger } from '@tg-search/common'

export interface MessageResolverOpts {
  messages: CoreMessage[]
}

export interface MessageResolver {
  run: (opts: MessageResolverOpts) => PromiseResult<CoreMessage[] | null>
}

export type MessageResolverRegistryFn = ReturnType<typeof useMessageResolverRegistry>

export function useMessageResolverRegistry() {
  const logger = useLogger('core:message-resolver:registry')

  const registry = new Map<string, MessageResolver>()

  return {
    register: (name: string, resolver: MessageResolver) => {
      logger.withFields({ name }).verbose('Register resolver')
      registry.set(name, resolver)
    },

    registry,
  }
}
