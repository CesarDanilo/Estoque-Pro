<script setup>
import { RouterView } from 'vue-router'
import { Menu } from 'lucide-vue-next'

import AppSidebar from '@/components/AppSidebar.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'
import { Button } from '@/components/ui/button'
import { useUiStore } from '@/stores/ui'

const ui = useUiStore()
</script>

<template>
  <div class="flex min-h-screen">
    <AppSidebar />

    <div class="flex min-w-0 flex-1 flex-col">
      <header class="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background px-4">
        <Button
          variant="ghost"
          size="icon"
          class="md:hidden"
          @click="ui.toggleMobileSidebar()"
        >
          <Menu class="size-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          class="hidden md:inline-flex"
          @click="ui.toggleSidebar()"
        >
          <Menu class="size-5" />
        </Button>

        <div class="ml-auto">
          <ThemeToggle />
        </div>
      </header>

      <main class="flex-1 p-4 md:p-6">
        <RouterView />
      </main>
    </div>
  </div>
</template>