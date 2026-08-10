<script setup>
defineProps({
  titulo: { type: String, default: '' },
  descricao: { type: String, default: '' },
})
</script>

<template>
  <section class="rounded-xl border bg-card">
    <div v-if="titulo" class="flex items-center justify-between border-b px-4 py-3 md:px-5">
      <div>
        <h2 class="text-sm font-semibold">{{ titulo }}</h2>
        <p v-if="descricao" class="text-xs text-muted-foreground">{{ descricao }}</p>
      </div>
      <slot name="acoes" />
    </div>
    <slot />
  </section>
</template>