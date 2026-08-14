<script setup>
import { computed, onMounted } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import {
  LayoutDashboard,
  Users,
  Package,
  FolderTree,
  Tags,
  Truck,
  ShoppingCart,
  Receipt,
  BarChart3,
  Settings,
  Layers,
  Boxes,
  LogOut,
  Trash2,
} from 'lucide-vue-next'

import { useUiStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'
import { useFeedback } from '@/composables/useFeedBack'
import { Trash } from '@lucide/vue'

// Estrutura de um item de navegação:
// { titulo, url, icone, exato? }

const secoes = [
  {
    label: 'Início',
    itens: [{ titulo: 'Dashboard', url: '/', icone: LayoutDashboard, exato: true }],
  },
  {
    label: 'Gestão',
    itens: [
      { titulo: 'Pessoas', url: '/pessoas', icone: Users },
      { titulo: 'Produtos', url: '/produtos', icone: Package },
      { titulo: 'Grupos', url: '/grupos', icone: FolderTree },
      //{ titulo: 'Subgrupos', url: '/subgrupos', icone: Layers },
      //{ titulo: 'Marcas', url: '/marcas', icone: Tags },
      { titulo: 'Fornecedores', url: '/fornecedores', icone: Truck },
    ],
  },
  {
    label: 'Movimentações',
    itens: [
      { titulo: 'Compras (entradas)', url: '/compras', icone: ShoppingCart },
      { titulo: 'Vendas (saídas)', url: '/vendas', icone: Receipt },
    ],
  },
  //{
  //  label: 'Admin',
  //  itens: [{ titulo: 'Usuários', url: '/usuarios', icone: Users }],
  //},
  {
    label: 'Análise',
    itens: [
      { titulo: 'Relatórios', url: '/relatorios', icone: BarChart3 },
      { titulo: 'Lixeira', url: '/lixeira', icone: Trash2 },
      //{ titulo: 'Configurações', url: '/configuracoes', icone: Settings },
    ],
  },
]

const ui = useUiStore()
const { sidebarCollapsed, sidebarMobileOpen } = storeToRefs(ui)

const auth = useAuthStore()
const { usuario, iniciais } = storeToRefs(auth)

const router = useRouter()
const { sucesso } = useFeedback()

const route = useRoute()
const pathname = computed(() => route.path)

function ativo(url, exato) {
  return exato
    ? pathname.value === url
    : pathname.value === url || pathname.value.startsWith(url + '/')
}

async function sair() {
  await auth.logout()
  sucesso('Até logo', 'Você saiu da sua conta.')
  router.push('/login')
}

onMounted(() => {
  if (!usuario.value) {
    auth.buscarUsuarioLogado()
  }
})
</script>

<template>
  <!-- overlay no mobile, fecha ao clicar fora -->
  <div
    v-if="sidebarMobileOpen"
    class="fixed inset-0 z-40 bg-black/40 md:hidden"
    @click="ui.closeMobileSidebar()"
  />

  <aside
    class="fixed inset-y-0 left-0 z-50 flex flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-200 md:sticky md:top-0 md:h-screen md:translate-x-0"
    :class="[
      sidebarCollapsed ? 'md:w-16' : 'md:w-64',
      sidebarMobileOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64 md:translate-x-0',
    ]"
  >
    <!-- Header -->
    <div class="flex min-w-0 items-center gap-2.5 border-b px-3 py-3 h-16">
      <span class="grid size-9 place-items-center rounded-lg bg-emerald-500/15 text-emerald-400">
        <Package class="size-5" aria-hidden="true" />
      </span>
      <div v-if="!sidebarCollapsed" class="min-w-0">
        <p class="truncate text-sm font-semibold">Estoque Pro</p>
        <p class="truncate text-xs text-muted-foreground">Comércio Modelo Ltda</p>
      </div>
    </div>

    <!-- Navegação -->
    <nav class="flex-1 space-y-4 overflow-y-auto px-4 py-3">
      <div v-for="secao in secoes" :key="secao.label">
        <p
          v-if="!sidebarCollapsed"
          class="px-2 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground"
        >
          {{ secao.label }}
        </p>
        <ul class="space-y-0.5">
          <li v-for="item in secao.itens" :key="item.url">
            <RouterLink
              :to="item.url"
              :title="item.titulo"
              @click="ui.closeMobileSidebar()"
              class="flex items-center gap-2.5 rounded-md px-2 py-2 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              :class="
                ativo(item.url, item.exato)
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                  : 'text-sidebar-foreground/80'
              "
            >
              <component :is="item.icone" class="size-4 shrink-0" aria-hidden="true" />
              <span v-if="!sidebarCollapsed" class="truncate">{{ item.titulo }}</span>
            </RouterLink>
          </li>
        </ul>
      </div>
    </nav>

    <!-- Footer -->
    <div class="flex min-w-0 items-center gap-2.5 border-t px-3 py-3">
      <div
        class="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold"
      >
        {{ iniciais }}
      </div>
      <div v-if="!sidebarCollapsed" class="min-w-0 flex-1">
        <p class="truncate text-sm">{{ usuario?.name || 'Carregando...' }}</p>
        <p class="truncate text-xs text-muted-foreground">{{ usuario?.email || '' }}</p>
      </div>
      <button
        type="button"
        title="Sair"
        aria-label="Sair da conta"
        class="grid size-8 shrink-0 cursor-pointer place-items-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        @click="sair"
      >
        <LogOut class="size-4" aria-hidden="true" />
      </button>
    </div>
  </aside>
</template>
