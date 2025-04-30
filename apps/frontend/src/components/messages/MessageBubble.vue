<script setup lang="ts">
import type { CoreMessage } from '@tg-search/core'

defineProps<{
  message: CoreMessage
}>()
</script>

<template>
  <div class="flex items-start gap-4 rounded-lg p-3 transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800">
    <div class="mt-1 h-9 w-9 flex items-center justify-center overflow-hidden bg-muted">
      <img :src="`https://api.dicebear.com/6.x/bottts/svg?seed=${message.fromId}`" alt="User" class="h-full w-full object-cover">
    </div>
    <div class="flex-1">
      <div class="mb-1 flex items-center gap-2">
        <span class="text-gray-900 font-medium dark:text-gray-100">{{ message.fromName }}</span>
        <span class="text-xs text-gray-500 dark:text-gray-400">{{ message.createdAt }}</span>
      </div>
      <div class="text-gray-700 dark:text-gray-300">
        {{ message.content }}
      </div>
    </div>
  </div>
</template>
