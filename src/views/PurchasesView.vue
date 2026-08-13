<script setup>
import { RouterLink } from 'vue-router'
import { computed, onMounted, ref, watch } from 'vue'
import { useQuery } from '@tanstack/vue-query'
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
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

import { useFeedback } from '@/composables/useFeedBack'
import { usePurchases } from '@/composables/usePurchases'
import { supplierService } from '@/services/supplierService'

onMounted(() => {
  document.title = 'Compras — Estoque Pro'
})

const tomStatus = { received: 'success', pending: 'warning', cancelled: 'danger' }
const rotuloStatus = { received: 'Recebida', pending: 'Aguardando', cancelled: 'Cancelada' }

const PORPAGINA = 8
const BUSCA_MAX = 100

const { sucesso, erro } = useFeedback()

// ---- Filtros ----
const buscaBruta = ref('')
const busca = computed({
  get: () => buscaBruta.value,
  set: (v) => {
    buscaBruta.value = (v ?? '').slice(0, BUSCA_MAX)
  },
})

const fornecedorFiltro = ref('todos') // supplier_id
const status = ref('todos')
const pagina = ref(1)

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

watch([busca, fornecedorFiltro, status], () => {
  pagina.value = 1
})

// ---- Fornecedores (para o filtro) ----
const { data: fornecedoresData } = useQuery({
  queryKey: ['suppliers'],
  queryFn: () => supplierService.getAll({ per_page: 100 }),
  staleTime: 1000 * 60 * 5,
})

// supplierService.getAll() devolve o objeto de paginação inteiro
// ({ data: [...], current_page, last_page, total, ... }), não um array direto.
// Antes o computed fazia `fornecedoresData.value || []`, e como o objeto de
// paginação é sempre "truthy", o fallback `[]` nunca era usado — o resultado
// virava o objeto inteiro, sem `.length`, e o card "Fornecedores cadastrados"
// exibia "undefined". Aqui extraímos o array de dentro de `.data` corretamente,
// com fallback pra array vazio só quando realmente não há nada.
const listaFornecedores = computed(() => {
  const dados = fornecedoresData.value
  if (Array.isArray(dados)) return dados
  return dados?.data || []
})

// ---- Compras (API) ----
const filtros = computed(() => ({
  page: pagina.value,
  per_page: PORPAGINA,
  search: busca.value,
  status: status.value,
  supplier_id: fornecedorFiltro.value !== 'todos' ? fornecedorFiltro.value : undefined,
}))

const {
  compras,
  totalPaginas,
  totalRegistros,
  totalComprado,
  aguardandoRecebimento,
  isLoading,
  refetch,
  updatePurchase,
} = usePurchases(filtros)

// ---- Ordenação local (aplicada só sobre a página atual) ----
const comprasOrdenadas = computed(() => {
  const lista = [...(compras.value || [])]
  if (!sortCampo.value) return lista

  const mult = sortDirecao.value === 'asc' ? 1 : -1
  return lista.sort((a, b) => {
    if (sortCampo.value === 'numero') {
      return (a.code || '').localeCompare(b.code || '', 'pt-BR') * mult
    }
    return (new Date(a.created_at || 0) - new Date(b.created_at || 0)) * mult
  })
})

function formatBrl(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    Number(valor) || 0,
  )
}

function formatDate(dateString) {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('pt-BR')
}

function rotuloItens(compra) {
  const qtd = typeof compra.items_count === 'number' ? compra.items_count : compra.items?.length
  if (qtd === undefined || qtd === null) return '-'
  return qtd === 1 ? '1 item' : `${qtd} itens`
}

function limpar() {
  busca.value = ''
  fornecedorFiltro.value = 'todos'
  status.value = 'todos'
  sortCampo.value = null
  pagina.value = 1
}

// ---- Cancelamento (via API) ----
const cancelando = ref(null)
const executandoCancelamento = ref(false)

async function confirmarCancelamento() {
  if (!cancelando.value || executandoCancelamento.value) return

  executandoCancelamento.value = true
  try {
    await updatePurchase(cancelando.value.id, { status: 'cancelled' })
    sucesso('Compra cancelada', 'A compra foi marcada como cancelada.')
    cancelando.value = null
    refetch()
  } catch (err) {
    erro('Erro ao cancelar', err?.response?.data?.message || 'Tente novamente.')
  } finally {
    executandoCancelamento.value = false
  }
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
        <RouterLink to="/compras/nova"> <Plus class="size-4" /> Nova compra </RouterLink>
      </Button>
    </template>
  </PageHeader>

  <div class="space-y-4 p-4 md:space-y-5 md:p-6">
    <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <MetricCard rotulo="Compras listadas" :valor="String(totalRegistros)" />
      <MetricCard
        rotulo="Total comprado"
        :valor="formatBrl(totalComprado)"
        tom="info"
        apoio="Entradas de estoque"
      >
        <template #icone>
          <ArrowDownRight class="size-4" />
        </template>
      </MetricCard>
      <MetricCard
        rotulo="Aguardando recebimento"
        :valor="String(aguardandoRecebimento)"
        tom="warning"
      />
      <MetricCard rotulo="Fornecedores cadastrados" :valor="String(listaFornecedores.length)" />
    </div>

    <Section>
      <div
        class="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-center md:p-5"
      >
        <div class="relative w-full md:max-w-sm">
          <Search
            class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60"
          />
          <Input
            v-model="busca"
            type="text"
            placeholder="Buscar por número ou fornecedor…"
            :maxlength="BUSCA_MAX"
            class="h-10 cursor-text pl-9 pr-12 text-xs"
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
          <Select v-model="fornecedorFiltro">
            <SelectTrigger class="h-10 cursor-pointer md:w-52" aria-label="Filtrar por fornecedor">
              <SelectValue placeholder="Fornecedor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos" class="cursor-pointer">Todos os fornecedores</SelectItem>
              <SelectItem
                v-for="f in listaFornecedores"
                :key="f.id"
                :value="String(f.id)"
                class="cursor-pointer"
              >
                {{ f.name }}
              </SelectItem>
            </SelectContent>
          </Select>
          <Select v-model="status">
            <SelectTrigger class="h-10 cursor-pointer md:w-40" aria-label="Filtrar por situação">
              <SelectValue placeholder="Situação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos" class="cursor-pointer">Todas</SelectItem>
              <SelectItem value="received" class="cursor-pointer">Recebidas</SelectItem>
              <SelectItem value="pending" class="cursor-pointer">Aguardando</SelectItem>
              <SelectItem value="cancelled" class="cursor-pointer">Canceladas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <TableSkeleton v-if="isLoading" :colunas="6" />

      <EmptyState
        v-else-if="comprasOrdenadas.length === 0"
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
        <!-- Mobile -->
        <ul class="divide-y divide-border md:hidden">
          <li v-for="c in comprasOrdenadas" :key="c.id" class="space-y-2 px-4 py-3.5">
            <div class="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
              <div class="min-w-0">
                <p class="truncate text-sm font-medium">{{ c.code }}</p>
                <p class="truncate text-xs text-muted-foreground">
                  {{ c.supplier?.name || 'Sem fornecedor' }}
                </p>
              </div>
              <span class="text-sm font-semibold">{{ formatBrl(c.total) }}</span>
            </div>
            <div class="flex items-center justify-between">
              <StatusPill :tom="tomStatus[c.status]">{{ rotuloStatus[c.status] }}</StatusPill>
              <span class="text-xs text-muted-foreground">
                {{ formatDate(c.created_at) }} · {{ rotuloItens(c) }}
              </span>
            </div>
          </li>
        </ul>

        <!-- Desktop -->
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
                    <ArrowUp
                      v-if="sortCampo === 'numero' && sortDirecao === 'asc'"
                      class="size-3.5"
                    />
                    <ArrowDown
                      v-else-if="sortCampo === 'numero' && sortDirecao === 'desc'"
                      class="size-3.5"
                    />
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
                <th class="px-4 py-3 text-right font-medium">Itens</th>
                <th class="px-4 py-3 text-right font-medium">Valor total</th>
                <th class="px-4 py-3 font-medium">Situação</th>
                <th class="px-4 py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr
                v-for="c in comprasOrdenadas"
                :key="c.id"
                class="transition-colors hover:bg-muted/60"
              >
                <td class="px-5 py-3 font-medium">{{ c.code }}</td>
                <td class="px-4 py-3 text-muted-foreground">
                  {{ c.supplier?.name || 'Sem fornecedor' }}
                </td>
                <td class="px-4 py-3 text-muted-foreground">{{ formatDate(c.created_at) }}</td>
                <td class="px-4 py-3 text-right">{{ rotuloItens(c) }}</td>
                <td class="px-4 py-3 text-right font-semibold">{{ formatBrl(c.total) }}</td>
                <td class="px-4 py-3">
                  <StatusPill :tom="tomStatus[c.status]">{{ rotuloStatus[c.status] }}</StatusPill>
                </td>
                <td class="px-4 py-3 text-right">
                  <Button
                    v-if="c.status === 'pending'"
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

        <div
          class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-border px-4 py-3 md:px-5"
        >
          <p class="text-xs text-muted-foreground">
            {{ totalRegistros }} compra(s) · página {{ pagina }} de {{ totalPaginas }}
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

  <AlertDialog :open="!!cancelando" @update:open="(o) => !o && (cancelando = null)">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Cancelar a compra {{ cancelando?.code }}?</AlertDialogTitle>
        <AlertDialogDescription>
          Esta ação não pode ser desfeita. A compra ficará marcada como cancelada e não entra no
          total comprado.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel class="cursor-pointer" :disabled="executandoCancelamento">
          Voltar
        </AlertDialogCancel>
        <Button
          type="button"
          class="cursor-pointer bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
          :disabled="executandoCancelamento"
          @click="confirmarCancelamento"
        >
          {{ executandoCancelamento ? 'Cancelando…' : 'Cancelar compra' }}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
