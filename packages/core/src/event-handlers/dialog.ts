import type { CoreContext } from '../context'
import type { DialogService } from '../services'

import { useLogger } from '@tg-search/common'

export function registerDialogEventHandlers(ctx: CoreContext) {
  const { emitter } = ctx
  const logger = useLogger('core:dialog:event')

  return (dialogService: DialogService) => {
    emitter.on('dialog:fetch', async () => {
      logger.log('Fetching dialogs')

      const { data: dialogs, error } = await dialogService.fetchDialogs()
      if (!dialogs || error) {
        return
      }

      emitter.emit('storage:record:dialogs', { dialogs })
    })
  }
}
