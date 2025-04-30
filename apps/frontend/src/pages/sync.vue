<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { ref, watch } from 'vue'
import { toast } from 'vue-sonner'

import ChatSelector from '../components/ChatSelector.vue'
import IconButton from '../components/ui/IconButton.vue'
import { useChatStore } from '../store/useChat'
import { useSessionStore } from '../store/useSession'
import { useSyncTaskStore } from '../store/useSyncTask'

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
</script>

<template>
  <header class="flex items-center border-b border-b-secondary px-4 dark:border-b-secondary p-4">
    <div class="flex items-center gap-2">
      <span class="text-lg font-medium">Sync</span>
    </div>

    <div class="ml-auto flex items-center gap-2">
      <IconButton
        icon="i-lucide-refresh-cw"
        :disabled="selectedChats.length === 0 || !isLoggedIn"
        @click="handleSync"
      >
        Sync
      </IconButton>
    </div>
  </header>

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
