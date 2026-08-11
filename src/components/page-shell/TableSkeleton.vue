<script setup>
defineProps({
  colunas: { type: Number, default: 5 },
  linhas: { type: Number, default: 5 },
})
</script>

<template>
  <div class="divide-y divide-border">
    <div
      v-for="linha in linhas"
      :key="linha"
      class="grid items-center gap-3 px-5 py-3"
      :style="{ gridTemplateColumns: `repeat(${colunas}, minmax(0, 1fr))` }"
    >
      <div v-for="col in colunas" :key="col" class="h-4 animate-pulse rounded bg-muted" />
    </div>
  </div>
</template>