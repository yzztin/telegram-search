import type { ClientRegisterEventHandler } from '.'

import { useSessionStore } from '../store/useSession'

export function registerEntityEventHandlers(
  registerEventHandler: ClientRegisterEventHandler,
) {
  registerEventHandler('entity:me:data', (data) => {
    useSessionStore().getActiveSession()!.me = data
  })
}
