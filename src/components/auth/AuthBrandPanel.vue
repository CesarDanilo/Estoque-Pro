<script setup>
import { Package, ShieldCheck } from 'lucide-vue-next'

defineProps({
  titulo: { type: String, required: true }, // aceita <br /> para quebra de linha
  descricao: { type: String, required: true },
})

const barras = [30, 50, 38, 65, 45, 72, 55, 80, 60]
</script>

<template>
  <aside class="relative hidden flex-col justify-between overflow-hidden bg-[#06120d] p-12 lg:flex">
    <div
      class="pointer-events-none absolute inset-0"
      style="background-image: radial-gradient(circle at 15% 10%, rgba(0,188,125,0.18), transparent 45%), radial-gradient(circle at 85% 90%, rgba(0,188,125,0.12), transparent 40%);"
    />
    <div class="pointer-events-none absolute inset-x-0 bottom-0 flex h-40 items-end gap-3 px-12 opacity-[0.08]">
      <div
        v-for="(altura, i) in barras"
        :key="i"
        class="flex-1 rounded-t-sm bg-emerald-400"
        :style="{ height: altura + '%' }"
      />
    </div>

    <div class="relative flex items-center gap-2.5">
      <span class="grid size-9 place-items-center rounded-lg bg-emerald-500/15 text-emerald-400">
        <Package class="size-5" aria-hidden="true" />
      </span>
      <span class="text-lg font-semibold tracking-tight text-white">Estoque Pro</span>
    </div>

    <div class="relative max-w-md space-y-5">
      <!-- eslint-disable-next-line vue/no-v-html -->
      <h1 class="text-3xl font-semibold leading-tight text-white" v-html="titulo" />
      <p class="text-sm leading-relaxed text-white/60">{{ descricao }}</p>

      <div class="flex items-center gap-2.5 pt-2 text-xs text-white/50">
        <ShieldCheck class="size-4 shrink-0 text-emerald-400" aria-hidden="true" />
        Acesso individual por usuário, com seus dados protegidos.
      </div>
    </div>

    <p class="relative text-xs text-white/30">© {{ new Date().getFullYear() }} Estoque Pro. Todos os direitos reservados.</p>
  </aside>
</template>