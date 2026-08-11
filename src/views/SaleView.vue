<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ArrowUpRight,
  Plus,
} from 'lucide-vue-next'

import PageHeader from '@/components/page-shell/PageHeader.vue'
import Section from '@/components/page-shell/Section.vue'
import EmptyState from '@/components/page-shell/EmptyState.vue'
import TableSkeleton from '@/components/page-shell/TableSkeleton.vue'
import SearchField from '@/components/ui-kit/SearchField.vue'
import StatusPill from '@/components/ui-kit/StatusPill.vue'
import MetricCard from '@/components/ui-kit/MetricCard.vue'
import NewSale from '@/components/modal/sale/NewSale.vue'

import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import { brl, dataBR, totalDoc, vendas } from '@/lib/mockData'

onMounted(() => {
  document.title = 'Vendas — Estoque Pro'
})

const PORPAGINA = 8
const BUSCA_MAX = 60

const tom = { concluida: 'success', pendente: 'warning', cancelada: 'danger' }
const rotulo = { concluida: 'Concluída', pendente: 'Aguardando', cancelada: 'Cancelada' }

const buscaBruta = ref('')
const busca = computed({
  get: () => buscaBruta.value,
  set: (valor) => {
    buscaBruta.value = (valor ?? '').slice(0, BUSCA_MAX)
  },
})

const status = ref('todos')
const pagina = ref(1)
const carregando = ref(false)
const modalAberto = ref(false)

const sortCampo = ref(null)
const sortDirecao = ref('asc')

function ordenarPor(campo) {
  if (sortCampo.value === campo) {
    sortDirecao.value = sortDirecao.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortCampo.value = campo
    sortDirecao.value = 'asc'
  }
}

watch([busca, status, sortCampo, sortDirecao], () => {
  pagina.value = 1
})

const filtradas = computed(() => {
  const termo = busca.value.trim().toLowerCase()

  return vendas.filter((v) => {
    if (status.value !== 'todos' && v.status !== status.value) return false
    if (termo === '') return true
    return [v.numero, v.cliente].some((t) => t.toLowerCase().includes(termo))
  })
})

const ordenadas = computed(() => {
  if (!sortCampo.value) return filtradas.value

  const lista = [...filtradas.value]
  const mult = sortDirecao.value === 'asc' ? 1 : -1

  lista.sort((a, b) => {
    if (sortCampo.value === 'data') {
      return a.data.localeCompare(b.data) * mult
    }
    // valor
    return (totalDoc(a.itens, a.desconto) - totalDoc(b.itens, b.desconto)) * mult
  })

  return lista
})

const totalPaginas = computed(() => Math.max(1, Math.ceil(ordenadas.value.length / PORPAGINA)))
const paginaAtual = computed(() => Math.min(pagina.value, totalPaginas.value))
const visiveis = computed(() =>
  ordenadas.value.slice((paginaAtual.value - 1) * PORPAGINA, paginaAtual.value * PORPAGINA)
)

const totalVendido = computed(() =>
  filtradas.value
    .filter((v) => v.status !== 'cancelada')
    .reduce((s, v) => s + totalDoc(v.itens, v.desconto), 0)
)

const aguardandoPagamento = computed(() => vendas.filter((v) => v.status === 'pendente').length)

const ticketMedio = computed(() => {
  const concluidas = filtradas.value.filter((v) => v.status !== 'cancelada').length
  return concluidas ? totalVendido.value / concluidas : 0
})

function limpar() {
  busca.value = ''
  status.value = 'todos'
  sortCampo.value = null
  pagina.value = 1
}

function abrirModal() {
  modalAberto.value = true
}

function vendaCriada(venda) {
  // mock: insere no topo da lista local; troque por refetch quando integrar a API
  vendas.unshift({
    id: Date.now(),
    numero: `V-${String(Date.now()).slice(-6)}`,
    cliente: venda.cliente,
    data: new Date().toISOString().slice(0, 10),
    itens: venda.itens,
    desconto: venda.desconto,
    pagamento: venda.pagamento,
    status: 'concluida',
  })
  pagina.value = 1
}
</script>

<template>
  <PageHeader
    titulo="Vendas"
    descricao="Cada venda concluída reduz o estoque dos produtos vendidos."
    :trilha="[{ titulo: 'Movimentações' }, { titulo: 'Vendas' }]"
  >
    <template #acoes>
      <Button
        class="cursor-pointer bg-emerald-500 text-black hover:bg-emerald-600"
        @click="abrirModal"
      >
        <Plus class="size-4" /> Nova venda
      </Button>
    </template>
  </PageHeader>

  <div class="space-y-4 p-4 md:space-y-5 md:p-6">
    <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <MetricCard rotulo="Vendas listadas" :valor="String(filtradas.length)" />
      <MetricCard rotulo="Total vendido" :valor="brl(totalVendido)" tom="success" apoio="Saídas de estoque">
        <template #icone><ArrowUpRight class="size-4" /></template>
      </MetricCard>
      <MetricCard rotulo="Aguardando pagamento" :valor="String(aguardandoPagamento)" tom="warning" />
      <MetricCard rotulo="Ticket médio" :valor="brl(ticketMedio)" />
    </div>

    <Section>
      <div class="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-center md:p-5">
        <div class="relative w-full md:max-w-sm">
          <SearchField
            v-model="busca"
            label="Buscar venda por número ou cliente"
            placeholder="Buscar por número ou cliente…"
            class="w-full"
            :maxlength="BUSCA_MAX"
          />
        </div>
        <Select v-model="status">
          <SelectTrigger class="h-10 cursor-pointer bg-surface md:ml-auto md:w-44" aria-label="Filtrar por situação">
            <SelectValue placeholder="Situação" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos" class="cursor-pointer">Todas</SelectItem>
            <SelectItem value="concluida" class="cursor-pointer">Concluídas</SelectItem>
            <SelectItem value="pendente" class="cursor-pointer">Aguardando</SelectItem>
            <SelectItem value="cancelada" class="cursor-pointer">Canceladas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <TableSkeleton v-if="carregando" :colunas="7" />

      <EmptyState
        v-else-if="visiveis.length === 0"
        titulo="Nenhuma venda encontrada"
        descricao="Não encontramos resultados com esses filtros. Tente outra busca ou registre uma nova venda."
      >
        <template #acao>
          <div class="flex gap-2">
            <Button variant="outline" class="cursor-pointer" @click="limpar">Limpar filtros</Button>
            <Button
              class="cursor-pointer bg-emerald-500 text-black hover:bg-emerald-600"
              @click="abrirModal"
            >
              Registrar venda
            </Button>
          </div>
        </template>
      </EmptyState>

      <template v-else>
        <!-- Mobile: cartões -->
        <ul class="divide-y divide-border md:hidden">
          <li v-for="v in visiveis" :key="v.id" class="space-y-2 px-4 py-3.5">
            <div class="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
              <div class="min-w-0">
                <p class="truncate text-sm font-medium">{{ v.numero }}</p>
                <p class="truncate text-xs text-muted-foreground">{{ v.cliente }}</p>
              </div>
              <span class="text-sm font-semibold">{{ brl(totalDoc(v.itens, v.desconto)) }}</span>
            </div>
            <div class="flex items-center justify-between">
              <StatusPill :tom="tom[v.status]">{{ rotulo[v.status] }}</StatusPill>
              <span class="text-xs text-muted-foreground">{{ dataBR(v.data) }} · {{ v.pagamento }}</span>
            </div>
          </li>
        </ul>

        <!-- Desktop: tabela -->
        <div class="hidden md:block">
          <table class="w-full text-sm">
            <thead class="text-xs text-muted-foreground">
              <tr class="border-b border-border text-left">
                <th class="px-5 py-3 font-medium">Venda</th>
                <th class="px-4 py-3 font-medium">Cliente</th>
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
                <th class="px-4 py-3 font-medium">Pagamento</th>
                <th class="px-4 py-3 text-right font-medium">
                  <button
                    type="button"
                    class="ml-auto inline-flex cursor-pointer items-center gap-1 transition-colors hover:text-foreground"
                    @click="ordenarPor('valor')"
                  >
                    Valor
                    <ArrowUp v-if="sortCampo === 'valor' && sortDirecao === 'asc'" class="size-3.5" />
                    <ArrowDown v-else-if="sortCampo === 'valor' && sortDirecao === 'desc'" class="size-3.5" />
                    <ArrowUpDown v-else class="size-3.5 opacity-40" />
                  </button>
                </th>
                <th class="px-4 py-3 font-medium">Situação</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr v-for="v in visiveis" :key="v.id" class="transition-colors hover:bg-muted/60">
                <td class="px-5 py-3 font-medium">{{ v.numero }}</td>
                <td class="px-4 py-3 text-muted-foreground">{{ v.cliente }}</td>
                <td class="px-4 py-3 text-muted-foreground">{{ dataBR(v.data) }}</td>
                <td class="px-4 py-3 text-right">{{ v.itens.length }}</td>
                <td class="px-4 py-3 text-muted-foreground">{{ v.pagamento }}</td>
                <td class="px-4 py-3 text-right font-semibold">{{ brl(totalDoc(v.itens, v.desconto)) }}</td>
                <td class="px-4 py-3">
                  <StatusPill :tom="tom[v.status]">{{ rotulo[v.status] }}</StatusPill>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-border px-4 py-3 md:px-5">
          <p class="text-xs text-muted-foreground">
            {{ filtradas.length }} venda(s) · página {{ paginaAtual }} de {{ totalPaginas }}
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

  <NewSale v-model:open="modalAberto" @created="vendaCriada" />
</template>