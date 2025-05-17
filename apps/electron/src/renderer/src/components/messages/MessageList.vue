<script setup lang="ts">
import type { CoreMessage } from '@tg-search/core'

import { useClipboard } from '@vueuse/core'
import { ref } from 'vue'

const props = defineProps<{
  messages: CoreMessage[]
  keyword: string
}>()

const hoveredMessage = ref<CoreMessage | null>(null)
const { copy, copied } = useClipboard()

function highlightKeyword(text: string, keyword: string) {
  if (!keyword)
    return text
  const regex = new RegExp(`(${keyword})`, 'gi')
  return text.replace(regex, '<span class="bg-yellow-200 dark:bg-yellow-800">$1</span>')
}

function copyMessageLink(message: CoreMessage) {
  copy(`https://t.me/c/${message.chatId}/${message.platformMessageId}`)
}
</script>

<template>
  <ul class="flex flex-col max-h-[540px] overflow-y-auto scrollbar-thin scrollbar-thumb-secondary scrollbar-track-transparent animate-fade-in">
    <li
      v-for="item in props.messages"
      :key="item.uuid"
      class="flex items-center gap-2 p-2 border-b last:border-b-0 hover:bg-muted/50 transition-all duration-200 ease-in-out animate-slide-in relative group cursor-pointer"
      tabindex="0"
      @mouseenter="hoveredMessage = item"
      @mouseleave="hoveredMessage = null"
      @keydown.enter="copyMessageLink(item)"
    >
      <Avatar
        :name="item.fromName"
        size="sm"
      />
      <div class="flex-1 min-w-0">
        <div class="text-sm font-semibold text-foreground truncate">
          {{ item.fromName }}
        </div>
        <div class="text-sm text-muted-foreground break-words" v-html="highlightKeyword(item.content, props.keyword)" />
      </div>
      <div
        v-if="hoveredMessage === item"
        class="absolute bottom-0.5 right-0.5 text-[10px] text-muted-foreground flex items-center gap-0.5 opacity-50 bg-background/50 px-1 py-0.5 rounded"
      >
        <span>{{ copied ? '已复制' : '按下复制消息链接' }}</span>
        <span v-if="!copied" class="i-lucide-corner-down-left h-2.5 w-2.5" />
        <span v-else class="i-lucide-check h-2.5 w-2.5" />
      </div>
    </li>
  </ul>
</template>
