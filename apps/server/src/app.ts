import type { CoreContext, CoreEventData, FromCoreEvent, ToCoreEvent } from '@tg-search/core'
import type { Peer } from 'crossws'
import type { App } from 'h3'
import type { WsMessageToServer } from './ws-event'

import { useLogger } from '@tg-search/common'
import { createCoreInstance } from '@tg-search/core'
import { defineWebSocketHandler } from 'h3'

import { sendWsEvent } from './ws-event'

export interface ClientState {
  ctx?: CoreContext
  peer: Peer

  isConnected: boolean
  phoneNumber?: string

  registedEvents?: Set<keyof FromCoreEvent>
}

type UUID = ReturnType<typeof crypto.randomUUID>

export function setupWsRoutes(app: App) {
  const logger = useLogger('server:ws')
  const clientStates = new Map<string, Omit<ClientState, 'peer'>>()

  function useSessionId(peer: Peer) {
    const url = new URL(peer.request.url)
    const urlSessionId = url.searchParams.get('sessionId') as UUID
    return urlSessionId || crypto.randomUUID()
  }

  function useSessionState(sessionId: UUID): Omit<ClientState, 'peer'> {
    if (!clientStates.has(sessionId)) {
      const ctx = createCoreInstance()
      const state = {
        ctx,
        isConnected: false,
        registedEvents: new Set<keyof FromCoreEvent>(),
      }
      clientStates.set(sessionId, state)

      logger.withFields({ sessionId }).debug('Session created')
      return state
    }

    return clientStates.get(sessionId)!
  }

  app.use('/ws', defineWebSocketHandler({
    async upgrade(req) {
      const url = new URL(req.url)
      const urlSessionId = url.searchParams.get('sessionId') as UUID

      if (!urlSessionId) {
        // FIXME: fix response type
        return new Response('Session ID is required', { status: 400 })
      }
    },

    async open(peer) {
      const sessionId = useSessionId(peer)
      if (!clientStates.has(sessionId)) {
        logger.withFields({ sessionId }).debug('Session restored')
      }
      const state = { ...useSessionState(sessionId), peer }

      logger.withFields({ peer: peer.id }).debug('Websocket connection opened')

      sendWsEvent(peer, 'server:connected', { sessionId, connected: state.isConnected })

      // TODO: is this necessary?
      clientStates.set(sessionId, state)
    },

    async message(peer, message) {
      const sessionId = useSessionId(peer)
      const state = { ...useSessionState(sessionId), peer }

      const event = message.json<WsMessageToServer>()

      logger.withFields({ type: event.type }).debug('Message received')

      try {
        if (event.type === 'server:event:register') {
          if (!event.data.event.startsWith('server:')) {
            const eventName = event.data.event as keyof FromCoreEvent

            if (!state.registedEvents?.has(eventName)) {
              state.registedEvents?.add(eventName)

              state.ctx?.emitter.on(eventName, (...args) => {
                try {
                  // ensure args[0] can be stringified
                  JSON.stringify(args[0])

                  sendWsEvent(peer, eventName, args[0])
                }
                catch {
                  logger.withFields({ eventName }).warn('Dropped event data')

                  sendWsEvent(peer, eventName, undefined)
                }
              })
            }
          }
        }
        else {
          state.ctx?.emitter.emit(event.type, event.data as CoreEventData<keyof ToCoreEvent>)
        }

        switch (event.type) {
          case 'auth:login':
            state.phoneNumber = event.data.phoneNumber
            state.ctx?.emitter.once('auth:connected', () => {
              state.isConnected = true
            })
            break
          case 'auth:logout':
            state.isConnected = false
            break
        }
      }
      catch (error) {
        logger.withError(error).error('Handle websocket message failed')
      }

      clientStates.set(sessionId, state)
    },

    close(peer) {
      logger.withFields({ peerId: peer.id }).debug('Websocket connection closed')
    },
  }))
}
