<script lang="ts" setup>
import { onClickOutside } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import { computed, ref, useTemplateRef } from 'vue'
import { useRouter } from 'vue-router'

import { useAuthStore } from '../../store/useAuth'
import Avatar from '../ui/Avatar.vue'

const authStore = useAuthStore()
const { isLoggedIn, activeSessionComputed } = storeToRefs(authStore)

const isOpen = defineModel<boolean>('open')

const dropdownRef = useTemplateRef<HTMLElement>('dropdown')

onClickOutside(dropdownRef, () => {
  isOpen.value = false
})

function handleLoginLogout() {
  if (isLoggedIn.value)
    authStore.handleAuth().logout()
  else
    useRouter().push('/login')
}

const username = computed(() => activeSessionComputed.value?.me?.username)
const userId = computed(() => activeSessionComputed.value?.me?.id)
</script>

<template>
  <div
    v-if="isOpen"
    ref="dropdownRef"
    class="absolute top-full left-0 mt-2 p-2 bg-popover border rounded-md shadow-lg z-10 min-w-[200px]"
  >
    <div class="flex items-center gap-3 p-3 border-b">
      <Avatar
        :name="username"
        size="md"
      />
      <div class="flex flex-col">
        <span class="text-sm text-foreground font-medium">{{ username }}</span>
        <span class="text-xs text-secondary-foreground">ID: {{ userId }}</span>
      </div>
    </div>

    <div class="mt-2">
      <button
        class="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-md"
        @click="handleLoginLogout"
      >
        <div :class="isLoggedIn ? 'i-lucide-log-out' : 'i-lucide-log-in'" class="h-4 w-4" />
        {{ isLoggedIn ? '退出登录' : '登录' }}
      </button>
    </div>
  </div>
</template>
