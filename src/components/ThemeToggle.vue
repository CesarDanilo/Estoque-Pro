<script setup>
import { Sun, Moon } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { useThemeStore } from '@/stores/theme'

const theme = useThemeStore()
</script>

<template>
  <Button variant="ghost" size="icon" @click="theme.alternar()" :title="theme.dark ? 'Tema claro' : 'Tema escuro'">
    <Sun v-if="theme.dark" class="size-5" />
    <Moon v-else class="size-5" />
  </Button>
</template>