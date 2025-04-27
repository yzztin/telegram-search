import type { CoreUserInfo } from '@tg-search/core'

import { useLocalStorage } from '@vueuse/core'
import { defu } from 'defu'
import { acceptHMRUpdate, defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

import { useWebsocketV2 } from '../composables/useWebsocket'

export interface SessionContext {
  phoneNumber?: string
  isConnected?: boolean
  me?: CoreUserInfo
}

export const useSessionStore = defineStore('session', () => {
  let wsContext: ReturnType<typeof useWebsocketV2>

  const storageSessions = useLocalStorage('session/sessions', new Map<string, SessionContext>())
  const storageActiveSessionId = useLocalStorage('session/active-session-id', crypto.randomUUID())

  const authStatus = ref({
    needCode: false,
    needPassword: false,
  })

  const activeSessionComputed = computed(() => storageSessions.value.get(storageActiveSessionId.value))

  const getWsContext = () => {
    if (!wsContext)
      wsContext = useWebsocketV2(storageActiveSessionId.value)

    return wsContext
  }

  const getActiveSession = () => {
    return storageSessions.value.get(storageActiveSessionId.value)
  }

  const updateActiveSession = (sessionId: string, partialSession: Partial<SessionContext>) => {
    const mergedSession = defu({}, partialSession, storageSessions.value.get(sessionId))

    storageSessions.value.set(sessionId, mergedSession)
    storageActiveSessionId.value = sessionId
  }

  const attemptLogin = async () => {
    const activeSession = getActiveSession()
    if (!activeSession?.isConnected && activeSession?.phoneNumber) {
      handleAuth().login(activeSession.phoneNumber)
    }

    if (activeSession?.isConnected) {
      wsContext.sendEvent('entity:me:fetch', undefined)
    }
  }

  const init = async () => {
    wsContext = useWebsocketV2(storageActiveSessionId.value)

    await attemptLogin()
  }

  watch(() => activeSessionComputed.value?.isConnected, (isConnected) => {
    if (!isConnected) {
      attemptLogin()
    }
  })

  function handleAuth() {
    function login(phoneNumber: string) {
      storageSessions.value.get(storageActiveSessionId.value)!.phoneNumber = phoneNumber

      wsContext.sendEvent('auth:login', {
        phoneNumber,
      })
    }

    function submitCode(code: string) {
      wsContext.sendEvent('auth:code', {
        code,
      })
    }

    function submitPassword(password: string) {
      wsContext.sendEvent('auth:password', {
        password,
      })
    }

    function logout() {
      getActiveSession()!.isConnected = false
      wsContext.sendEvent('auth:logout', undefined)
    }

    return { login, submitCode, submitPassword, logout }
  }

  return {
    init,
    sessions: storageSessions,
    activeSessionId: storageActiveSessionId,
    activeSessionComputed,
    auth: authStatus,
    getWsContext,
    handleAuth,
    getActiveSession,
    updateActiveSession,
    attemptLogin,
    isLoggedIn: computed(() => activeSessionComputed.value?.isConnected),
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useSessionStore, import.meta.hot))
}
