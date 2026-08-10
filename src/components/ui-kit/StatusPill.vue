<script setup>
defineProps({
  tom: { type: String, default: 'neutral' }, // success | info | warning | danger | neutral
})

const tons = {
  success: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  info: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  warning: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  danger: 'bg-red-500/15 text-red-700 dark:text-red-400',
  neutral: 'bg-muted text-muted-foreground',
}
</script>

<template>
  <span
    class="inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium"
    :class="tons[tom]"
  >
    <slot />
  </span>
</template>