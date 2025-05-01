<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import { Toaster } from 'vue-sonner'

import { useChatStore } from './store/useChat'
import { useSessionStore } from './store/useSession'

onMounted(() => {
  // eslint-disable-next-line no-console
  console.log('[Main] init stores')

  useSessionStore().init()
  useChatStore().init()
})
</script>

<template>
  <KeepAlive>
    <div class="min-h-screen bg-white transition-all duration-300 ease-in-out dark:bg-gray-900">
      <Toaster position="top-right" :expand="true" :rich-colors="true" />

      <Transition>
        <RouterView :key="$route.fullPath" />
      </Transition>
    </div>
  </KeepAlive>
</template>
