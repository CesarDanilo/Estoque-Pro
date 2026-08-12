<script setup>
import { computed, ref, watch } from 'vue'
import { ArrowDown, ArrowUp, ArrowUpDown, ArrowUpRight, Plus } from 'lucide-vue-next'

import PageHeader from '@/components/page-shell/PageHeader.vue'
import Section from '@/components/page-shell/Section.vue'
import EmptyState from '@/components/page-shell/EmptyState.vue'
import TableSkeleton from '@/components/page-shell/TableSkeleton.vue'
import SearchField from '@/components/ui-kit/SearchField.vue'
import StatusPill from '@/components/ui-kit/StatusPill.vue'
import MetricCard from '@/components/ui-kit/MetricCard.vue'
import NewSale from '@/components/modal/sale/NewSale.vue'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { useSales } from '@/composables/useSales'

const PORPAGINA = 8
const BUSCA_MAX = 60

const tom = { completed: 'success', pending: 'warning', cancelled: 'danger' }
const rotulo = { completed: 'Concluída', pending: 'Aguardando', cancelled: 'Cancelada' }

const buscaBruta = ref('')
const busca = computed({
  get: () => buscaBruta.value,
  set: (valor) => {
    buscaBruta.value = (valor ?? '').slice(0, BUSCA_MAX)
  },
})

const status = ref('todos')
const pagina = ref(1)
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

// --- USO DO COMPOSABLE DE VENDAS ---
const filtros = computed(() => ({
  page: pagina.value,
  per_page: PORPAGINA,
  search: busca.value,
  status: status.value,
}))

const {
  vendas,
  totalPaginas,
  totalRegistros,
  totalVendido,
  aguardandoPagamento,
  ticketMedio,
  isLoading,
  refetch,
} = useSales(filtros)

function formatBrl(val) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0)
}

function formatDate(dateString) {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('pt-BR')
}

function limpar() {
  busca.value = ''
  status.value = 'todos'
  sortCampo.value = null
  pagina.value = 1
}

function abrirModal() {
  modalAberto.value = true
}

function vendaCriada() {
  modalAberto.value = false
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
      <MetricCard rotulo="Vendas listadas" :valor="String(totalRegistros)" />
      <MetricCard
        rotulo="Total vendido"
        :valor="formatBrl(totalVendido)"
        tom="success"
        apoio="Saídas de estoque"
      >
        <template #icone><ArrowUpRight class="size-4" /></template>
      </MetricCard>
      <MetricCard
        rotulo="Aguardando pagamento"
        :valor="String(aguardandoPagamento)"
        tom="warning"
      />
      <MetricCard rotulo="Ticket médio" :valor="formatBrl(ticketMedio)" />
    </div>

    <Section>
      <div
        class="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-center md:p-5"
      >
        <div class="relative w-full md:max-w-sm">
          <SearchField
            v-model="busca"
            label="Buscar venda por número ou cliente"
            placeholder="Buscar por código…"
            class="w-full"
            :maxlength="BUSCA_MAX"
          />
        </div>
        <Select v-model="status">
          <SelectTrigger
            class="h-10 cursor-pointer bg-surface md:ml-auto md:w-44"
            aria-label="Filtrar por situação"
          >
            <SelectValue placeholder="Situação" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos" class="cursor-pointer">Todas</SelectItem>
            <SelectItem value="completed" class="cursor-pointer">Concluídas</SelectItem>
            <SelectItem value="pending" class="cursor-pointer">Aguardando</SelectItem>
            <SelectItem value="cancelled" class="cursor-pointer">Canceladas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <TableSkeleton v-if="isLoading" :colunas="7" />

      <EmptyState
        v-else-if="vendas.length === 0"
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
        <ul class="divide-y divide-border md:hidden">
          <li v-for="v in vendas" :key="v.id" class="space-y-2 px-4 py-3.5">
            <div class="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
              <div class="min-w-0">
                <p class="truncate text-sm font-medium">{{ v.code }}</p>
                <p class="truncate text-xs text-muted-foreground">
                  {{ v.customer?.name || 'Cliente não informado' }}
                </p>
              </div>
              <span class="text-sm font-semibold">{{ formatBrl(v.total) }}</span>
            </div>
            <div class="flex items-center justify-between">
              <StatusPill :tom="tom[v.status] || 'neutral'">{{
                rotulo[v.status] || v.status
              }}</StatusPill>
              <span class="text-xs text-muted-foreground"
                >{{ formatDate(v.created_at) }} · {{ v.payment_method }}</span
              >
            </div>
          </li>
        </ul>

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
                    <ArrowUp
                      v-if="sortCampo === 'data' && sortDirecao === 'asc'"
                      class="size-3.5"
                    />
                    <ArrowDown
                      v-else-if="sortCampo === 'data' && sortDirecao === 'desc'"
                      class="size-3.5"
                    />
                    <ArrowUpDown v-else class="size-3.5 opacity-40" />
                  </button>
                </th>
                <th class="px-4 py-3 font-medium">Pagamento</th>
                <th class="px-4 py-3 text-right font-medium">
                  <button
                    type="button"
                    class="ml-auto inline-flex cursor-pointer items-center gap-1 transition-colors hover:text-foreground"
                    @click="ordenarPor('valor')"
                  >
                    Valor
                    <ArrowUp
                      v-if="sortCampo === 'valor' && sortDirecao === 'asc'"
                      class="size-3.5"
                    />
                    <ArrowDown
                      v-else-if="sortCampo === 'valor' && sortDirecao === 'desc'"
                      class="size-3.5"
                    />
                    <ArrowUpDown v-else class="size-3.5 opacity-40" />
                  </button>
                </th>
                <th class="px-4 py-3 font-medium">Situação</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr v-for="v in vendas" :key="v.id" class="transition-colors hover:bg-muted/60">
                <td class="px-5 py-3 font-medium">{{ v.code }}</td>
                <td class="px-4 py-3 text-muted-foreground">
                  {{ v.customer?.name || 'Cliente Geral' }}
                </td>
                <td class="px-4 py-3 text-muted-foreground">{{ formatDate(v.created_at) }}</td>
                <td class="px-4 py-3 text-muted-foreground uppercase">{{ v.payment_method }}</td>
                <td class="px-4 py-3 text-right font-semibold">{{ formatBrl(v.total) }}</td>
                <td class="px-4 py-3">
                  <StatusPill :tom="tom[v.status] || 'neutral'">{{
                    rotulo[v.status] || v.status
                  }}</StatusPill>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div
          class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-border px-4 py-3 md:px-5"
        >
          <p class="text-xs text-muted-foreground">
            {{ totalRegistros }} venda(s) · página {{ pagina }} de {{ totalPaginas }}
          </p>
          <div class="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              class="cursor-pointer disabled:cursor-not-allowed"
              :disabled="pagina === 1"
              @click="pagina--"
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              class="cursor-pointer disabled:cursor-not-allowed"
              :disabled="pagina >= totalPaginas"
              @click="pagina++"
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
