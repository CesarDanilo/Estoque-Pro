<script setup>
defineProps({
  rotulo: { type: String, required: true },
  valor: { type: String, required: true },
  apoio: { type: String, default: '' },
  tom: { type: String, default: 'neutral' }, // success | info | warning | danger | neutral
  icone: { type: [Object, Function], default: null },
})

const tons = {
  success: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  info: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  warning: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  danger: 'bg-red-500/15 text-red-600 dark:text-red-400',
  neutral: 'bg-muted text-muted-foreground',
}
</script>

<template>
  <div class="rounded-xl border bg-card p-4">
    <div class="flex items-center justify-between">
      <p class="text-xs font-medium text-muted-foreground">{{ rotulo }}</p>
      <span v-if="icone" class="grid size-8 shrink-0 place-items-center rounded-lg" :class="tons[tom]">
        <component :is="icone" class="size-4" />
      </span>
    </div>
    <p class="mt-2 text-2xl font-semibold">{{ valor }}</p>
    <p v-if="apoio" class="mt-1 text-xs text-muted-foreground">{{ apoio }}</p>
  </div>
</template>