<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  label?: string
  disabled?: boolean
}>()

const value = defineModel<boolean>({ required: true })

const buttonClasses = computed(() => ({
  'bg-primary dark:bg-primary': value.value,
  'bg-muted dark:bg-muted': !value.value,
  'opacity-50 cursor-not-allowed': props.disabled,
  'cursor-pointer': !props.disabled,
}))

const toggleClasses = computed(() => ({
  'translate-x-5': value.value,
  'translate-x-0': !value.value,
}))
</script>

<template>
  <button
    type="button"
    :aria-checked="value"
    :aria-label="label"
    :disabled="disabled"
    class="relative h-6 w-11 inline-flex flex-shrink-0 border-2 border-transparent rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
    :class="buttonClasses"
    @click="value = !value"
  >
    <span
      class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
      :class="toggleClasses"
    />
  </button>
</template>
