<script setup lang="ts">
import type { CoreMessage } from '@tg-search/core/types'

// eslint-disable-next-line unicorn/prefer-node-protocol
import { Buffer } from 'buffer'

import Avatar from '../ui/Avatar.vue'

defineProps<{
  message: CoreMessage
}>()

/**
 * Convert ArrayBuffer to base64 string using browser-native APIs
 */
function arrayBufferToBase64(arrayBuffer: ArrayBuffer): string {
  return Buffer.from(arrayBuffer).toString('base64')
}

/**
 * Convert Uint8Array to base64 string (more efficient for large arrays)
 */
function uint8ArrayToBase64(uint8Array: Uint8Array): string {
  try {
    // For smaller arrays, use the simple approach
    if (uint8Array.length < 10000) {
      let binaryString = ''
      for (let i = 0; i < uint8Array.length; i++) {
        binaryString += String.fromCharCode(uint8Array[i])
      }
      return btoa(binaryString)
    }

    // For larger arrays, process in chunks to avoid call stack limits
    const chunkSize = 8192
    let binaryString = ''
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, i + chunkSize)
      binaryString += String.fromCharCode(...Array.from(chunk))
    }
    return btoa(binaryString)
  }
  catch (error) {
    console.warn('Failed to convert Uint8Array to base64:', error)
    return ''
  }
}

/**
 * Convert various media data formats to base64 data URL
 * Browser-compatible version that doesn't rely on Node.js Buffer
 */
function getMediaBase64(media: string | { type: 'Buffer', data: number[] } | ArrayBuffer | null | undefined): string | null {
  if (!media)
    return null

  if (typeof media === 'string') {
    return media.startsWith('data:') ? media : `data:image/jpeg;base64,${media}`
  }

  if (media && typeof media === 'object' && 'type' in media && media.type === 'Buffer' && 'data' in media) {
    const buffer = Buffer.from(media.data)
    return `data:image/jpeg;base64,${buffer.toString('base64')}`
  }

  if (media instanceof ArrayBuffer) {
    const base64 = arrayBufferToBase64(media)
    return base64 ? `data:image/jpeg;base64,${base64}` : null
  }

  return null
}

// Computed property to safely get media src
function getMediaSrc(message: CoreMessage): string | null {
  if (!message.media || message.media.length === 0 || !message.media[0]?.data) {
    return null
  }

  return getMediaBase64(message.media[0].data)
}
</script>

<template>
  <div class="hover:bg-muted flex items-start gap-4 rounded-lg p-3 transition-all duration-200">
    <div class="mt-1">
      <Avatar
        :name="message.fromName"
        size="md"
      />
    </div>
    <div class="flex-1">
      <div class="mb-1 flex items-center gap-2">
        <span class="whitespace-nowrap text-primary font-medium">{{ message.fromName }}</span>
        <span class="text-secondary-foreground whitespace-nowrap text-xs">{{ message.createdAt }}</span>
      </div>

      <div class="text-foreground">
        <!-- Text content when no media -->
        <template v-if="!message.media || message.media?.length === 0">
          {{ message.content }}
        </template>

        <!-- Media content -->
        <template v-else>
          <!-- Loading state -->
          <template v-if="!message.media[0]?.data">
            <div class="flex items-center gap-2">
              <div class="i-lucide-loader-circle h-4 w-4 animate-spin" />
              <span class="text-secondary-foreground whitespace-nowrap text-xs">
                加载中...
              </span>
            </div>
          </template>

          <!-- Media loaded -->
          <template v-else>
            <div>
              <!-- Show text content if available -->
              <div v-if="message.content" class="mb-2">
                {{ message.content }}
              </div>

              <!-- Try to render image -->
              <template v-if="getMediaSrc(message)">
                <img
                  :src="getMediaSrc(message)!"
                  class="h-auto max-w-full rounded-lg"
                  alt="Media content"
                  @error="(e) => {
                    console.error('Image load error:', e);
                    (e.target as HTMLImageElement).style.display = 'none';
                  }"
                >
              </template>

              <!-- Fallback when media processing fails -->
              <template v-else>
                <div class="flex items-center gap-2 rounded bg-gray-100 p-2 dark:bg-gray-800">
                  <div class="i-lucide-file-image h-4 w-4" />
                  <span class="text-secondary-foreground text-sm">
                    媒体文件无法显示
                  </span>
                </div>
              </template>
            </div>
          </template>
        </template>
      </div>
    </div>
  </div>
</template>
