<script setup>
defineProps({
  titulo: { type: String, required: true },
  descricao: { type: String, default: '' },
  trilha: { type: Array, default: () => [] }, // [{ titulo }]
})
</script>

<template>
  <div class="border-b px-4 py-4 md:px-6">
    <nav v-if="trilha.length" class="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
      <template v-for="(item, i) in trilha" :key="i">
        <span>{{ item.titulo }}</span>
        <span v-if="i < trilha.length - 1">/</span>
      </template>
    </nav>
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold">{{ titulo }}</h1>
        <p v-if="descricao" class="text-sm text-muted-foreground">{{ descricao }}</p>
      </div>
      <div class="flex items-center gap-2">
        <slot name="acoes" />
      </div>
    </div>
  </div>
</template>