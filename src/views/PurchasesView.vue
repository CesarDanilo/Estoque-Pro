<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { computed, onMounted, ref, watch } from 'vue'
import { ArrowDown, ArrowDownRight, ArrowUp, ArrowUpDown, Plus, Search } from 'lucide-vue-next'

import PageHeader from '@/components/page-shell/PageHeader.vue'
import Section from '@/components/page-shell/Section.vue'
import EmptyState from '@/components/page-shell/EmptyState.vue'
import TableSkeleton from '@/components/page-shell/TableSkeleton.vue'
import MetricCard from '@/components/ui-kit/MetricCard.vue'
import StatusPill from '@/components/ui-kit/StatusPill.vue'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

import { useFeedback } from '@/composables/useFeedBack'
import { brl, compras, dataBR, totalDoc } from '@/lib/mockData'
import { fornecedores } from '@/lib/mockDataProdutos'

onMounted(() => {
  document.title = 'Compras — Estoque Pro'
})

const tomStatus = { recebida: 'success', pendente: 'warning', cancelada: 'danger' } as const
const rotuloStatus = { recebida: 'Recebida', pendente: 'Aguardando', cancelada: 'Cancelada' }

const PORPAGINA = 8
const BUSCA_MAX = 100

const busca = ref('')
const forn = ref('todos')
const status = ref('todos')
const pagina = ref(1)
const carregando = ref(false)
const cancelando = ref(null)

const sortCampo = ref(null)
const sortDirecao = ref('asc')

// Computed para tratar o limite e binding do input de busca
const buscaModel = computed({
  get: () => busca.value,
  set: (v) => {
    busca.value = (v ?? '').slice(0, BUSCA_MAX)
  },
})

function ordenarPor(campo) {
  if (sortCampo.value === campo) {
    sortDirecao.value = sortDirecao.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortCampo.value = campo
    sortDirecao.value = 'asc'
  }
}

watch([busca, forn, status, sortCampo, sortDirecao], () => {
  pagina.value = 1
})

const filtradas = computed(() =>
  compras.filter(
    (c) =>
      (forn.value === 'todos' || c.fornecedor === forn.value) &&
      (status.value === 'todos' || c.status === status.value) &&
      [c.numero, c.fornecedor].some((t) => t.toLowerCase().includes(busca.value.toLowerCase())),
  ),
)

const ordenadas = computed(() => {
  if (!sortCampo.value) return filtradas.value

  const lista = [...filtradas.value]
  const mult = sortDirecao.value === 'asc' ? 1 : -1

  lista.sort((a, b) => {
    if (sortCampo.value === 'numero') {
      return a.numero.localeCompare(b.numero, 'pt-BR') * mult
    }
    return a.data.localeCompare(b.data) * mult
  })

  return lista
})

const totalPaginas = computed(() => Math.max(1, Math.ceil(ordenadas.value.length / PORPAGINA)))
const paginaAtual = computed(() => Math.min(pagina.value, totalPaginas.value))
const visiveis = computed(() =>
  ordenadas.value.slice((paginaAtual.value - 1) * PORPAGINA, paginaAtual.value * PORPAGINA),
)

const total = computed(() =>
  filtradas.value.filter((c) => c.status !== 'cancelada').reduce((s, c) => s + totalDoc(c.itens), 0),
)

const aguardandoRecebimento = computed(() => compras.filter((c) => c.status === 'pendente').length)
const fornecedoresAtivos = computed(() => fornecedores.filter((f) => f.status === 'ativo').length)

const { sucesso } = useFeedback()

function limpar() {
  busca.value = ''
  forn.value = 'todos'
  status.value = 'todos'
  sortCampo.value = null
  pagina.value = 1
}

function confirmarCancelamento() {
  if (!cancelando.value) return
  const item = compras.find((c) => c.id === cancelando.value.id)
  if (item) item.status = 'cancelada'
  sucesso('Compra cancelada', 'A compra foi marcada como cancelada.')
  cancelando.value = null
}
</script>

<template>
  <PageHeader
    titulo="Compras"
    descricao="Cada compra recebida aumenta o estoque dos produtos."
    :trilha="[{ titulo: 'Movimentações' }, { titulo: 'Compras' }]"
  >
    <template #acoes>
      <Button as-child class="cursor-pointer bg-emerald-500 text-black hover:bg-emerald-600">
        <RouterLink to="/compras/nova">
          <Plus class="size-4" /> Nova compra
        </RouterLink>
      </Button>
    </template>
  </PageHeader>

  <div class="space-y-4 p-4 md:space-y-5 md:p-6">
    <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <MetricCard rotulo="Compras listadas" :valor="String(filtradas.length)" />
      <MetricCard rotulo="Total comprado" :valor="brl(total)" tom="info" apoio="Entradas de estoque">
        <template #icone>
          <ArrowDownRight class="size-4" />
        </template>
      </MetricCard>
      <MetricCard
        rotulo="Aguardando recebimento"
        :valor="String(aguardandoRecebimento)"
        tom="warning"
      />
      <MetricCard rotulo="Fornecedores ativos" :valor="String(fornecedoresAtivos)" />
    </div>

    <Section>
      <div class="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-center md:p-5">
        <div class="relative w-full md:max-w-sm">
          <Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
          <Input
            v-model="buscaModel"
            type="text"
            placeholder="Buscar por número ou fornecedor…"
            :maxlength="BUSCA_MAX"
            class="h-10 pr-12 pl-9 text-xs cursor-text"
            aria-label="Buscar compra por número ou fornecedor"
          />
          <span
            class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 select-none text-[10px] font-medium tabular-nums transition-colors"
            :class="busca.length >= BUSCA_MAX ? 'text-red-500' : 'text-muted-foreground/40'"
          >
            {{ busca.length }}/{{ BUSCA_MAX }}
          </span>
        </div>

        <div class="grid grid-cols-2 gap-2 md:ml-auto md:flex md:shrink-0">
          <Select v-model="forn">
            <SelectTrigger class="h-10 cursor-pointer md:w-52" aria-label="Filtrar por fornecedor">
              <SelectValue placeholder="Fornecedor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos" class="cursor-pointer">Todos os fornecedores</SelectItem>
              <SelectItem v-for="f in fornecedores" :key="f.id" :value="f.nome" class="cursor-pointer">
                {{ f.nome }}
              </SelectItem>
            </SelectContent>
          </Select>
          <Select v-model="status">
            <SelectTrigger class="h-10 cursor-pointer md:w-40" aria-label="Filtrar por situação">
              <SelectValue placeholder="Situação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos" class="cursor-pointer">Todas</SelectItem>
              <SelectItem value="recebida" class="cursor-pointer">Recebidas</SelectItem>
              <SelectItem value="pendente" class="cursor-pointer">Aguardando</SelectItem>
              <SelectItem value="cancelada" class="cursor-pointer">Canceladas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <TableSkeleton v-if="carregando" :colunas="6" />

      <EmptyState
        v-else-if="visiveis.length === 0"
        titulo="Nenhuma compra encontrada"
        descricao="Não encontramos resultados com esses filtros. Tente outra busca ou registre uma nova compra."
      >
        <template #acao>
          <div class="flex gap-2">
            <Button variant="outline" class="cursor-pointer" @click="limpar">Limpar filtros</Button>
            <Button as-child class="cursor-pointer bg-emerald-500 text-black hover:bg-emerald-600">
              <RouterLink to="/compras/nova">Registrar compra</RouterLink>
            </Button>
          </div>
        </template>
      </EmptyState>

      <template v-else>
        <ul class="divide-y divide-border md:hidden">
          <li v-for="c in visiveis" :key="c.id" class="space-y-2 px-4 py-3.5">
            <div class="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
              <div class="min-w-0">
                <p class="truncate text-sm font-medium">{{ c.numero }}</p>
                <p class="text-meta truncate">{{ c.fornecedor }}</p>
              </div>
              <span class="text-sm font-semibold">{{ brl(totalDoc(c.itens)) }}</span>
            </div>
            <div class="flex items-center justify-between">
              <StatusPill :tom="tomStatus[c.status]">{{ rotuloStatus[c.status] }}</StatusPill>
              <span class="text-meta">
                {{ dataBR(c.data) }} · {{ c.itens.length }} itens
              </span>
            </div>
          </li>
        </ul>

        <div class="hidden md:block">
          <table class="w-full text-sm">
            <thead class="text-xs text-muted-foreground">
              <tr class="border-b border-border text-left">
                <th class="px-5 py-3 font-medium">
                  <button
                    type="button"
                    class="inline-flex cursor-pointer items-center gap-1 transition-colors hover:text-foreground"
                    @click="ordenarPor('numero')"
                  >
                    Compra
                    <ArrowUp v-if="sortCampo === 'numero' && sortDirecao === 'asc'" class="size-3.5" />
                    <ArrowDown v-else-if="sortCampo === 'numero' && sortDirecao === 'desc'" class="size-3.5" />
                    <ArrowUpDown v-else class="size-3.5 opacity-40" />
                  </button>
                </th>
                <th class="px-4 py-3 font-medium">Fornecedor</th>
                <th class="px-4 py-3 font-medium">
                  <button
                    type="button"
                    class="inline-flex cursor-pointer items-center gap-1 transition-colors hover:text-foreground"
                    @click="ordenarPor('data')"
                  >
                    Data
                    <ArrowUp v-if="sortCampo === 'data' && sortDirecao === 'asc'" class="size-3.5" />
                    <ArrowDown v-else-if="sortCampo === 'data' && sortDirecao === 'desc'" class="size-3.5" />
                    <ArrowUpDown v-else class="size-3.5 opacity-40" />
                  </button>
                </th>
                <th class="px-4 py-3 text-right font-medium">Itens</th>
                <th class="px-4 py-3 text-right font-medium">Valor total</th>
                <th class="px-4 py-3 font-medium">Situação</th>
                <th class="px-4 py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr v-for="c in visiveis" :key="c.id" class="transition-colors hover:bg-muted/60">
                <td class="px-5 py-3 font-medium">{{ c.numero }}</td>
                <td class="px-4 py-3 text-muted-foreground">{{ c.fornecedor }}</td>
                <td class="px-4 py-3 text-muted-foreground">{{ dataBR(c.data) }}</td>
                <td class="px-4 py-3 text-right">{{ c.itens.length }}</td>
                <td class="px-4 py-3 text-right font-semibold">{{ brl(totalDoc(c.itens)) }}</td>
                <td class="px-4 py-3">
                  <StatusPill :tom="tomStatus[c.status]">{{ rotuloStatus[c.status] }}</StatusPill>
                </td>
                <td class="px-4 py-3 text-right">
                  <Button
                    v-if="c.status === 'pendente'"
                    variant="ghost"
                    size="sm"
                    class="cursor-pointer text-destructive"
                    @click="cancelando = c"
                  >
                    Cancelar
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-border px-4 py-3 md:px-5">
          <p class="text-xs text-muted-foreground">
            {{ filtradas.length }} compra(s) · página {{ paginaAtual }} de {{ totalPaginas }}
          </p>
          <div class="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              class="cursor-pointer disabled:cursor-not-allowed"
              :disabled="paginaAtual === 1"
              @click="pagina = paginaAtual - 1"
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              class="cursor-pointer disabled:cursor-not-allowed"
              :disabled="paginaAtual === totalPaginas"
              @click="pagina = paginaAtual + 1"
            >
              Próxima
            </Button>
          </div>
        </div>
      </template>
    </Section>
  </div>

  <AlertDialog :open="!!cancelando" @update:open="(o) => !o && (cancelando = null)">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Cancelar a compra {{ cancelando?.numero }}?</AlertDialogTitle>
        <AlertDialogDescription>
          Esta ação não pode ser desfeita. A compra ficará marcada como cancelada e não entra no total comprado.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel class="cursor-pointer">Voltar</AlertDialogCancel>
        <AlertDialogAction class="cursor-pointer bg-red-500 text-white hover:bg-red-600" @click="confirmarCancelamento">
          Cancelar compra
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>