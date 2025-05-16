import type { ClientRegisterEventHandler } from '.'

import { useSessionStore } from '../store/useSession'

export function registerAuthEventHandlers(
  registerEventHandler: ClientRegisterEventHandler,
) {
  registerEventHandler('auth:code:needed', () => {
    useSessionStore().auth.needCode = true
  })

  registerEventHandler('auth:password:needed', () => {
    useSessionStore().auth.needPassword = true
  })

  registerEventHandler('auth:connected', () => {
    useSessionStore().getActiveSession()!.isConnected = true
  })
}
