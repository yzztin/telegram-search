<script lang="ts" setup>
import type { Action } from '../types/action'

import { useDark } from '@vueuse/core'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { RouterView, useRouter } from 'vue-router'

import ChatsCollapse from '../components/layout/ChatsCollapse.vue'
import SidebarSelector from '../components/layout/SidebarSelector.vue'
import Dialog from '../components/ui/Dialog.vue'
import Settings from '../components/ui/Settings.vue'
import { useChatStore } from '../store/useChat'
import { useSessionStore } from '../store/useSession'

const sessionStore = useSessionStore()

const { getWsContext } = sessionStore
const wsContext = getWsContext()

const settingsDialog = ref(false)

const searchParams = ref('')

const chatStore = useChatStore()

const chats = computed(() => chatStore.chats)
const chatsFiltered = computed(() => {
  return chats.value.filter(chat => chat.name.toLowerCase().includes(searchParams.value.toLowerCase()))
})

const router = useRouter()

const showActions = ref(false)

const isDark = useDark()

const currentTheme = ref('default')

function setTheme(theme: string) {
  currentTheme.value = theme
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem('theme', theme)
}

onMounted(() => {
  if (!sessionStore.getActiveSession()?.isConnected && router.currentRoute.value.path !== '/login') {
    router.push('/login')
  }
  wsContext.sendEvent('entity:me:fetch', undefined)
  wsContext.sendEvent('dialog:fetch', undefined)
  const savedTheme = localStorage.getItem('theme') || 'default'
  setTheme(savedTheme)
})

watch(currentTheme, (newTheme) => {
  localStorage.setItem('theme', newTheme)
})

function toggleSettingsDialog() {
  settingsDialog.value = !settingsDialog.value
}

function toggleActions() {
  showActions.value = !showActions.value
}

type ChatGroup = 'user' | 'group' | 'channel' | ''
const activeChatGroup = ref<ChatGroup>('user')

function toggleActiveChatGroup(group: ChatGroup) {
  if (activeChatGroup.value === group)
    activeChatGroup.value = ''
  else
    activeChatGroup.value = group
}
</script>

<template>
  <div
    class="h-screen w-full flex overflow-hidden bg-background text-sm font-medium"
    :class="{ dark: isDark }"
  >
    <div class="w-[25%] flex flex-col h-dvh border-r border-r-secondary">
      <div class="relative p-4">
        <div
          class="i-lucide-search absolute left-7 top-1/2 -translate-y-1/2 h-4 w-4"
        />
        <input
          v-model="searchParams"
          type="text"
          class="w-full border border-secondary rounded-md bg-muted px-3 py-2 pl-9  ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring dark:border-secondary dark:bg-muted"
          placeholder="Search"
        >
      </div>

      <div class="mb-4">
        <SidebarSelector
          path="/"
          icon="i-lucide-home"
          name="主页"
        />

        <SidebarSelector
          path="/embed"
          icon="i-lucide-message-circle"
          name="嵌入"
        />

        <SidebarSelector
          path="/sync"
          icon="i-lucide-message-circle"
          name="同步"
        />
      </div>

      <div class="pt-4 flex-1 overflow-y-auto flex flex-col justify-start h-full border-t border-t-secondary">
        <ChatsCollapse
          class="flex flex-col max-h-[85%]"
          :class="{ 'flex-1': activeChatGroup === 'user' }"
          name="用户"
          icon="i-lucide-user"
          type="user"
          :chats="chatsFiltered.filter(chat => chat.type === 'user')"
          :active="activeChatGroup === 'user'"
          @update:toggle-active="toggleActiveChatGroup('user')"
        />

        <ChatsCollapse
          class="flex flex-col max-h-[85%]"
          :class="{ 'flex-1': activeChatGroup === 'group' }"
          name="群组"
          icon="i-lucide-users"
          type="group"
          :chats="chatsFiltered.filter(chat => chat.type === 'group')"
          :active="activeChatGroup === 'group'"
          @update:toggle-active="toggleActiveChatGroup('group')"
        />

        <ChatsCollapse
          class="flex flex-col max-h-[85%]"
          :class="{ 'flex-1': activeChatGroup === 'channel' }"
          name="频道"
          icon="i-lucide-message-circle"
          type="channel"
          :chats="chatsFiltered.filter(chat => chat.type === 'channel')"
          :active="activeChatGroup === 'channel'"
          @update:toggle-active="toggleActiveChatGroup('channel')"
        />
      </div>

      <div class="flex items-center justify-between p-4">
        <div class="flex items-center gap-3">
          <div class="h-8 w-8 flex items-center justify-center overflow-hidden rounded-full bg-muted">
            <img
              alt="Me" src="https://api.dicebear.com/6.x/bottts/svg?seed=RainbowBird"
              class="h-full w-full object-cover"
            >
          </div>
          <div class="flex flex-col">
            <span class="text-sm text-foreground font-medium">{{ sessionStore.getActiveSession()?.me?.username }}</span>
            <span class="text-xs text-secondary-foreground">{{ sessionStore.getActiveSession()?.isConnected ? '已链接' : '未链接' }}</span>
          </div>
        </div>
        <div class="flex items-center">
          <button
            class="h-8 w-8 flex items-center justify-center rounded-md p-1 text-foreground hover:bg-muted"
            @click="toggleSettingsDialog"
          >
            <div class="i-lucide-settings h-4 w-4" />
          </button>
        </div>
      </div>
    </div>

    <div class="flex flex-1 flex-col overflow-auto">
      <RouterView />
    </div>

    <Dialog v-model="settingsDialog">
      <Settings
        @toggle-settings-dialog-emit="toggleSettingsDialog"
        @set-theme-emit="setTheme"
      />
    </Dialog>
  </div>
</template>
