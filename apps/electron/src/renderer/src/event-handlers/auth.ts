import type { ClientRegisterEventHandler } from '.'

import { useAuthStore } from '../store/useAuth'
import { useWebsocketStore } from '../store/useWebsocket'

export function registerAuthEventHandlers(
  registerEventHandler: ClientRegisterEventHandler,
) {
  registerEventHandler('auth:code:needed', () => {
    useAuthStore().auth.needCode = true
  })

  registerEventHandler('auth:password:needed', () => {
    useAuthStore().auth.needPassword = true
  })

  registerEventHandler('auth:connected', () => {
    useWebsocketStore().getActiveSession()!.isConnected = true
  })
}
