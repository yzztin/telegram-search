import type { CoreContext } from '../context'
import type { EntityService } from '../services/entity'

import { useLogger } from '@tg-search/common'

export function registerEntityEventHandlers(ctx: CoreContext) {
  const { emitter } = ctx
  const logger = useLogger('core:entity:event')

  return (entityService: EntityService) => {
    emitter.on('entity:me:fetch', async () => {
      logger.log('Getting me info')
      await entityService.getMeInfo()
    })
  }
}
