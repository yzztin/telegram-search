<script setup lang="ts">
import type { Action } from '../types/action'

import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, watch } from 'vue'
import { toast } from 'vue-sonner'

import IconButton from '../components/ui/IconButton.vue'
import { useChatStore } from '../store/useChat'
import { useSessionStore } from '../store/useSession'
import { useSyncTaskStore } from '../store/useSyncTask'

const props = defineProps<{
  changeTitle?: (title: string) => void
  setActions?: (actions: Action[]) => void
  setCollapsed?: (collapsed: boolean) => void
}>()

const selectedChats = ref<string[]>([])

const sessionStore = useSessionStore()
const { getWsContext } = sessionStore
const { isLoggedIn } = storeToRefs(sessionStore)

const chatsStore = useChatStore()
const { chats } = storeToRefs(chatsStore)

// const currentTask = ref<Task<'takeout'> | null>(null)
const loadingToast = ref<string | number>()

function handleSync() {
  const wsContext = getWsContext()
  wsContext.sendEvent('takeout:run', {
    chatIds: selectedChats.value,
  })

  loadingToast.value = toast.loading('开始同步...')
}

const { currentTask, currentTaskProgress } = storeToRefs(useSyncTaskStore())
watch(currentTaskProgress, (progress) => {
  toast.dismiss(loadingToast?.value)

  if (progress === 100) {
    toast.dismiss(loadingToast.value)
    toast.success('同步完成')
  }
  else if (progress < 0 && currentTask.value?.lastError) {
    toast.dismiss(loadingToast.value)
    toast.error(currentTask.value.lastError)
  }
  else {
    loadingToast.value = toast.loading(`同步中... ${progress}%`)
  }
})

onMounted(() => {
  props.changeTitle?.('同步')
  props.setActions?.([{
    icon: 'i-lucide-refresh-cw',
    name: '开始同步',
    disabled: computed(() => selectedChats.value.length === 0 || !isLoggedIn.value),
    onClick: handleSync,
  }])
  props.setCollapsed?.(true)
})
</script>

<template>
  <header class="flex items-center border-b border-b-secondary px-4 dark:border-b-secondary p-4">
    <div class="flex items-center gap-2">
      <span class="text-lg font-medium">同步</span>
    </div>
    <div class="ml-auto flex items-center gap-2">
      <IconButton
        icon="i-lucide-refresh-cw"
        :disabled="selectedChats.length === 0 || !isLoggedIn"
        @click="handleSync"
      >
        开始同步
      </IconButton>
    </div>
  </header>

  <!--
  <header v-show="!headerState.hidden" class="h-14 flex items-center border-b border-b-secondary px-4 dark:border-b-secondary">
        <div class="flex items-center gap-2">
          <span class="text-foreground font-medium">{{ headerState.title }}</span>
        </div>
        <div class="ml-auto flex items-center gap-2">
          <TransitionGroup name="action">
            <template v-if="showActions || headerState.collapsed">
              <button
                v-for="(action, index) in headerState.actions" :key="index"
                class="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-foreground transition-colors hover:bg-muted"
                :class="{ 'opacity-50': action.disabled, 'cursor-not-allowed': action.disabled }"
                :disabled="action.disabled"
                @click="action.onClick"
              >
                <div :class="action.icon" class="h-5 w-5" />
                <span v-if="action.name" class="text-sm">{{ action.name }}</span>
              </button>
            </template>
          </TransitionGroup>
          <button v-if="!headerState.collapsed" class="rounded-md p-2 text-foreground transition-colors hover:bg-muted" @click="toggleActions">
            <div
              class="i-lucide-ellipsis h-5 w-5 transition-transform duration-300"
              :class="{ 'rotate-90': showActions }"
            />
          </button>
        </div>
      </header>
      -->
  <div class="p-6">
    <div class="flex items-center justify-between">
      <h3 class="text-lg text-foreground font-medium">
        选择要同步的聊天
      </h3>
      <div class="flex items-center gap-2">
        <span class="text-sm text-secondary-foreground">
          已选择 {{ selectedChats.length }} 个聊天
        </span>
      </div>
    </div>

    <ChatSelector
      v-model:selected-chats="selectedChats"
      :chats="chats"
    />
  </div>
</template>
