<script setup>
import { Search } from 'lucide-vue-next'
import { Input } from '@/components/ui/input'

defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, required: true },
  placeholder: { type: String, default: 'Buscar…' },
})
defineEmits(['update:modelValue'])
</script>

<template>
  <div class="relative">
    <Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    <label class="sr-only">{{ label }}</label>
    <Input
      :model-value="modelValue"
      @update:model-value="$emit('update:modelValue', $event)"
      :placeholder="placeholder"
      class="pl-9"
    />
  </div>
</template>