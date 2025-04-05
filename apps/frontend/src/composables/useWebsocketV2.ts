import type { WsEvent, WsEventData } from '@tg-search/server'

import { useWebSocket } from '@vueuse/core'
import { watch } from 'vue'

import { WS_API_BASE } from '../constants'

export function createWebsocketV2Context() {
  const { send, data } = useWebSocket<{
    type: keyof WsEvent
    data: WsEventData<keyof WsEvent>
  }>(WS_API_BASE)

  // https://github.com/moeru-ai/airi/blob/b55a76407d6eb725d74c5cd4bcb17ef7d995f305/apps/realtime-audio/src/pages/index.vue#L29-L37
  function sendEvent<T extends WsEvent>(payload: T) {
    send(JSON.stringify(payload))
  }

  // https://github.com/moeru-ai/airi/blob/b55a76407d6eb725d74c5cd4bcb17ef7d995f305/apps/realtime-audio/src/pages/index.vue#L95-L123
  watch(data, (data) => {
    if (!data)
      return

    switch (data.type) {
      case 'server:connected':
        // eslint-disable-next-line no-console
        console.log('[WebSocket] Connected', data.data)
        break
      default:
        // eslint-disable-next-line no-console
        console.log('[WebSocket] Message received', data)
    }
  })

  return {
    sendEvent,
  }
}
