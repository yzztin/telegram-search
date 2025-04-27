import type { ClientRegisterEventHandler } from '.'

import { useSessionStore } from '../store/useSessionV2'

export function registerServerEventHandlers(
  registerEventHandler: ClientRegisterEventHandler,
) {
  const connectionStore = useSessionStore()

  registerEventHandler('server:connected', (data) => {
    connectionStore.updateActiveSession(data.sessionId, { isConnected: data.connected })
  })
}
