<script setup>
defineProps({
  titulo: { type: String, required: true },
  descricao: { type: String, default: '' },
})
</script>

<template>
  <div class="flex flex-col items-center gap-3 px-4 py-16 text-center">
    <p class="text-sm font-medium">{{ titulo }}</p>
    <p v-if="descricao" class="max-w-sm text-sm text-muted-foreground">{{ descricao }}</p>
    <div class="mt-2">
      <slot name="acao" />
    </div>
  </div>
</template>