<script setup>
import { HelpCircle } from 'lucide-vue-next'

defineProps({
  for: { type: String, required: true },
  obrigatorio: { type: Boolean, default: false },
  dica: { type: String, default: undefined },
})
</script>

<template>
  <label :for="for" class="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-foreground">
    <span>
      <slot />
      <span v-if="obrigatorio" class="text-destructive"> *</span>
    </span>
    <span v-if="dica" :title="dica" class="inline-flex cursor-help">
      <HelpCircle class="size-3.5 text-muted-foreground" />
    </span>
  </label>
</template>