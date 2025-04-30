<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()
const id = route.params.id
</script>

<template>
  <div class="h-full flex flex-col p-2">
    <div class="overflow-auto space-y-0">
      {{ id }}
    </div>
  </div>
</template>
