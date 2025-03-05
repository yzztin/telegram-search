<script setup lang="ts">
import type { UserInfoResponse } from '@tg-search/server'
import { onClickOutside } from '@vueuse/core'
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { useAuth } from '../apis/useAuth'
import { useDarkStore } from '../composables/dark'
import { useLanguage } from '../composables/useLanguage'
import { useSession } from '../composables/useSession'

const router = useRouter()
const { logout, getMeInfo } = useAuth()
const { isDark } = useDarkStore()
const { checkConnection, isConnected } = useSession()
const { supportedLanguages, setLanguage, locale } = useLanguage()
const { t } = useI18n()
const showUserMenu = ref(false)
const showLanguageMenu = ref(false)
const userMenuRef = ref<HTMLElement | null>(null)
const languageMenuRef = ref<HTMLElement | null>(null)
const userInfo = ref<UserInfoResponse | null>(null)

// Use VueUse's onClickOutside to handle closing the menus
onClickOutside(userMenuRef, () => {
  showUserMenu.value = false
})

onClickOutside(languageMenuRef, () => {
  showLanguageMenu.value = false
})

// Check if user is logged in and get user info
onMounted(async () => {
  await checkConnection(false)
  if (isConnected.value) {
    try {
      userInfo.value = await getMeInfo()
    }
    catch (err) {
      console.error('Failed to get user info:', err)
    }
  }
})

// Handle logout
async function handleLogout() {
  showUserMenu.value = false
  const success = await logout()
  if (success) {
    userInfo.value = null
    toast.success(t('header.logout_success'))
    router.push('/login')
  }
  else {
    toast.error(t('header.logout_failed'))
  }
}

// Handle login
async function handleLogin() {
  showUserMenu.value = false
  router.push('/login')
}

// Handle language change
function handleLanguageChange(langCode: string) {
  setLanguage(langCode)
  showLanguageMenu.value = false
  toast.success(t('header.language_changed'))
}
</script>

<template>
  <div class="min-h-screen" :class="{ dark: isDark }">
    <!-- Header -->
    <header class="sticky top-0 z-50 border-b bg-white transition-colors duration-300 dark:border-gray-800 dark:bg-gray-900">
      <div class="mx-auto h-14 flex items-center justify-between px-4 container">
        <router-link to="/" class="text-lg font-semibold transition-colors duration-300 dark:text-white">
          {{ $t('header.title') }}
        </router-link>

        <div class="flex items-center gap-4">
          <ThemeToggle />

          <!-- Language switcher -->
          <div ref="languageMenuRef" class="relative">
            <IconButton
              icon="i-carbon-language"
              aria-label="Language"
              @click="showLanguageMenu = !showLanguageMenu"
            />

            <!-- Language menu -->
            <div
              v-if="showLanguageMenu"
              class="absolute right-0 z-50 mt-2 w-48 border border-gray-200 rounded-md bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800"
            >
              <button
                v-for="lang in supportedLanguages"
                :key="lang.code"
                class="w-full flex items-center justify-between px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                @click="handleLanguageChange(lang.code)"
              >
                <span>{{ lang.name }}</span>
                <span v-if="locale === lang.code" class="i-carbon-checkmark h-4 w-4" />
              </button>
            </div>
          </div>

          <IconButton
            icon="i-carbon-mac-command"
            aria-label="{{$t('header.commands')}}"
            @click="router.push('/commands')"
          />

          <IconButton
            icon="i-carbon-settings"
            with-transition
            aria-label="{{$t('header.setting')}}"
            @click="router.push('/settings')"
          />

          <!-- User avatar and dropdown menu -->
          <div ref="userMenuRef" class="relative">
            <IconButton
              icon="i-carbon-user"
              size="md"
              custom-class="rounded-full"
              aria-label="{{ $t('header.usermenu') }}"
              @click="showUserMenu = !showUserMenu"
            />

            <!-- User menu -->
            <div
              v-if="showUserMenu"
              class="absolute right-0 z-50 mt-2 w-48 border border-gray-200 rounded-md bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800"
            >
              <div v-if="userInfo" class="px-4 py-2 text-sm text-gray-700 dark:text-gray-200">
                <div>{{ userInfo.firstName }} {{ userInfo.lastName }}</div>
                <div class="text-xs text-gray-500">
                  @{{ userInfo.username }}
                </div>
              </div>

              <div class="border-b border-gray-200 dark:border-gray-700 my-2" />

              <button
                v-if="!isConnected"
                class="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                @click="handleLogin"
              >
                <div class="flex items-center">
                  <div class="i-carbon-login mr-2 h-4 w-4" />
                  <span>{{ $t('header.login') }}</span>
                </div>
              </button>

              <button
                v-if="isConnected"
                class="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                @click="handleLogout"
              >
                <div class="flex items-center">
                  <div class="i-carbon-logout mr-2 h-4 w-4" />
                  <span>{{ $t('header.logout') }}</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Main content -->
    <main class="mx-auto bg-white transition-colors duration-300 container dark:bg-gray-900">
      <slot />
    </main>
  </div>
</template>
