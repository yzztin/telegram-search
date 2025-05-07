<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { ref, watch } from 'vue'
import { toast } from 'vue-sonner'

import ChatSelector from '../components/ChatSelector.vue'
import { useChatStore } from '../store/useChat'
import { useSessionStore } from '../store/useSession'
import { useSyncTaskStore } from '../store/useSyncTask'

const selectedChats = ref<number[]>([])

const sessionStore = useSessionStore()
const { getWsContext } = sessionStore
const { isLoggedIn } = storeToRefs(sessionStore)

const chatsStore = useChatStore()
const { chats } = storeToRefs(chatsStore)

// const currentTask = ref<Task<'takeout'> | null>(null)
const loadingToast = ref<string | number>()

function handleEmbed() {
  const wsContext = getWsContext()
  wsContext.sendEvent('embed:run', {
    chatIds: selectedChats.value.map(id => id.toString()),
  })

  loadingToast.value = toast.loading('开始嵌入...')
}

const { currentTask, currentTaskProgress } = storeToRefs(useSyncTaskStore())
watch(currentTaskProgress, (progress) => {
  toast.dismiss(loadingToast?.value)

  if (progress === 100) {
    toast.dismiss(loadingToast.value)
    toast.success('嵌入完成')
  }
  else if (progress < 0 && currentTask.value?.lastError) {
    toast.dismiss(loadingToast.value)
    toast.error(currentTask.value.lastError)
  }
  else {
    loadingToast.value = toast.loading(`嵌入中... ${progress}%`)
  }
})
</script>

<template>
  <header class="flex items-center border-b border-b-secondary px-4 dark:border-b-secondary p-4">
    <div class="flex items-center gap-2">
      <span class="text-lg font-medium">Embed</span>
    </div>

    <div class="ml-auto flex items-center gap-2">
      <IconButton
        icon="i-lucide-download"
        :disabled="selectedChats.length === 0 || !isLoggedIn"
        @click="handleEmbed"
      >
        Embed
      </IconButton>
    </div>
  </header>

  <div class="p-6">
    <div class="flex items-center justify-between">
      <h3 class="text-lg text-foreground font-medium">
        选择要嵌入的聊天
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
