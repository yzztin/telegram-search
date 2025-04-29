<script setup lang="ts">
import type { CoreDialog } from '@tg-search/core'

import { useRoute, useRouter } from 'vue-router'

defineProps<{
  type: 'user' | 'group' | 'channel'
  icon: string
  name: string

  chats: CoreDialog[]
  active: boolean
}>()

const emit = defineEmits<{
  (e: 'update:toggle-active'): void
}>()

const router = useRouter()
const route = useRoute()

function isActiveChat(chatId: string) {
  return route.params.chatId === chatId
}

function toggleActive() {
  emit('update:toggle-active')
}
</script>

<template>
  <div>
    <div
      class="cursor-pointer flex items-center justify-between hover:bg-muted py-2 gap-4"
      @click="toggleActive"
    >
      <div
        class=" flex items-center rounded-md text-foreground gap-4 px-6"
      >
        <span :class="icon" class="h-5 w-5" />
        <span>{{ name }}</span>
      </div>

      <div
        :class="active ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
        class="h-4 w-4 cursor-pointer px-6"
      />
    </div>

    <div
      v-show="active"
      class="overflow-y-auto overflow-x-hidden"
    >
      <div
        v-for="chat in chats.filter(chat => chat.type === type)"
        :key="chat.id"
        :class="{ 'bg-muted': isActiveChat(chat.id.toString()) }"
        class="py-2 cursor-pointer hover:bg-muted flex flex-row justify-start items-center gap-2 px-6"
        @click="router.push(`/chat/${chat.id}`)"
      >
        <img
          :alt="`User ${chat.id}`"
          :src="`https://api.dicebear.com/6.x/bottts/svg?seed=${chat.name}`"
          class="h-6 w-6 rounded-full"
        >
        <div class="flex flex-col overflow-hidden">
          <span class="truncate">
            {{ chat.name }}
          </span>

          <span class="text-xs text-secondary-foreground">
            {{ chat.id }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
