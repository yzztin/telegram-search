import type { MessageResolver, MessageResolverOpts } from '.'
import type { CoreMessage } from '../utils/message'

import { useLogger } from '@tg-search/common'
import { cut, load } from 'nodejieba'

import { Err, Ok } from '../utils/monad'

export function createJiebaResolver(): MessageResolver {
  const logger = useLogger('core:resolver:jieba')

  load()

  return {
    run: async (opts: MessageResolverOpts) => {
      logger.verbose('Executing jieba resolver')

      if (opts.messages.length === 0)
        return Err('No messages')

      const messages: CoreMessage[] = opts.messages.filter(
        message => message.content && message.jiebaTokens.length === 0,
      )

      if (messages.length === 0)
        return Err('No messages to parse')

      const jiebaMessages = messages.map((message) => {
        const tokens = cut(message.content)
        logger.withFields({ message: message.content, tokens }).debug('Jieba tokens')

        return {
          ...message,
          jiebaTokens: tokens,
        }
      })

      logger.withFields({ messages: jiebaMessages.length }).verbose('Processed jieba messages')

      return Ok(jiebaMessages)
    },
  }
}
