<script setup lang="ts">
import { onMounted } from 'vue'
import { Toaster } from 'vue-sonner'
import { createWebsocketV2Context } from './composables/v2/useWebsocketV2'
import DefaultLayout from './layouts/default.vue'

onMounted(() => {
  createWebsocketV2Context()
})
</script>

<template>
  <div class="min-h-screen bg-white transition-all duration-300 ease-in-out dark:bg-gray-900">
    <Toaster position="top-right" :expand="true" :rich-colors="true" />
    <DefaultLayout>
      <router-view />
    </DefaultLayout>
  </div>
</template>
