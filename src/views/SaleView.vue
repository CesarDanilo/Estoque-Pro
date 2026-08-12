<script setup>
import { computed, ref, watch } from 'vue'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Eye,
  MoreHorizontal,
  Plus,
  Trash2,
  XCircle,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

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
import { useSales } from '@/composables/useSales'

const PORPAGINA = 8
const BUSCA_MAX = 60

const { sucesso, erro } = useFeedback()

// Mapeamentos visuais do Status
const tomStatus = { completed: 'success', pending: 'warning', cancelled: 'danger' }
const rotuloStatus = { completed: 'Concluída', pending: 'Aguardando', cancelled: 'Cancelada' }

// Estilização dos Badges de Pagamento
function tomPagamento(metodo) {
  if (!metodo) return 'neutral'
  const m = metodo.toLowerCase()
  if (m.includes('pix')) return 'success'
  if (m.includes('dinheiro')) return 'info'
  if (m.includes('crédito') || m.includes('credito')) return 'warning'
  if (m.includes('débito') || m.includes('debito')) return 'accent'
  return 'neutral'
}

// Filtros Básicos
const buscaBruta = ref('')
const busca = computed({
  get: () => buscaBruta.value,
  set: (valor) => {
    buscaBruta.value = (valor ?? '').slice(0, BUSCA_MAX)
  },
})

const status = ref('todos')
const formaPagamento = ref('todos')
const dataInicio = ref('')
const dataFim = ref('')

const pagina = ref(1)
const modalAberto = ref(false)

// Estados para exclusão
const vendaParaDeletar = ref(null)
const modalDeletarAberto = ref(false)
const isDeleting = ref(false)

// Estados de Ordenação Local
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

watch([busca, status, formaPagamento, dataInicio, dataFim], () => {
  pagina.value = 1
})

// --- REQUISIÇÃO API ---
const filtros = computed(() => ({
  page: pagina.value,
  per_page: PORPAGINA,
  search: busca.value,
  status: status.value,
  payment_method: formaPagamento.value,
  start_date: dataInicio.value,
  end_date: dataFim.value,
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
  deleteSale,
  updateSaleStatus,
  updateSale,
} = useSales(filtros)

// --- ORDENAÇÃO LOCAL COM ESTABILIDADE DE DATAS ---
const vendasOrdenadas = computed(() => {
  const lista = [...(vendas.value || [])]
  if (!sortCampo.value) return lista

  return lista.sort((a, b) => {
    let valorA, valorB

    if (sortCampo.value === 'data') {
      valorA = new Date(a.created_at || 0).getTime()
      valorB = new Date(b.created_at || 0).getTime()

      if (valorA === valorB) return 0
    } else if (sortCampo.value === 'valor') {
      valorA = Number(a.total || 0)
      valorB = Number(b.total || 0)

      if (valorA === valorB) return 0
    } else {
      return 0
    }

    if (valorA < valorB) return sortDirecao.value === 'asc' ? -1 : 1
    if (valorA > valorB) return sortDirecao.value === 'asc' ? 1 : -1
    return 0
  })
})

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
  formaPagamento.value = 'todos'
  dataInicio.value = ''
  dataFim.value = ''
  sortCampo.value = null
  sortDirecao.value = 'asc'
  pagina.value = 1
}

function abrirModal() {
  modalAberto.value = true
}

function vendaCriada() {
  modalAberto.value = false
  if (typeof refetch === 'function') refetch()
}

function visualizarVenda(venda) {
  sucesso('Venda selecionada', `Visualizando código #${venda.code}`)
}

// --- ATUALIZAÇÃO DO STATUS NO BACK-END E LOCAL ---
async function alterarStatusVenda(venda, novoStatus) {
  if (venda.status === novoStatus) return

  try {
    if (typeof updateSaleStatus === 'function') {
      await updateSaleStatus(venda.id, { status: novoStatus })
    } else if (typeof updateSale === 'function') {
      await updateSale(venda.id, { status: novoStatus })
    }

    venda.status = novoStatus

    sucesso('Status atualizado', `A venda #${venda.code} agora está ${rotuloStatus[novoStatus]}.`)
    if (typeof refetch === 'function') refetch()
  } catch (err) {
    console.error('Erro ao alterar status:', err)
    erro(
      'Erro ao alterar status',
      err?.response?.data?.message || 'Falha ao atualizar no servidor.',
    )
  }
}

function confirmarExclusao(venda) {
  vendaParaDeletar.value = venda
  modalDeletarAberto.value = true
}

// --- EXCLUSÃO COM REMOÇÃO OTIMISTA IMEDIATA ---
async function executarExclusao() {
  if (!vendaParaDeletar.value) return

  const itemDeletado = vendaParaDeletar.value
  isDeleting.value = true

  try {
    if (typeof deleteSale === 'function') {
      await deleteSale(itemDeletado.id)
    }

    // Remove imediatamente da listagem local reativa do Vue
    if (Array.isArray(vendas.value)) {
      vendas.value = vendas.value.filter((v) => v.id !== itemDeletado.id)
    }

    sucesso('Venda excluída', `A venda #${itemDeletado.code} foi removida com sucesso.`)
    modalDeletarAberto.value = false

    if (typeof refetch === 'function') {
      await refetch()
    }
  } catch (err) {
    console.error('Erro ao deletar venda:', err)
    erro('Erro ao excluir', err?.response?.data?.message || 'Não foi possível remover a venda.')
  } finally {
    isDeleting.value = false
    vendaParaDeletar.value = null
  }
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
        class="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:p-5"
      >
        <div class="relative w-full lg:max-w-xs">
          <SearchField
            v-model="busca"
            label="Buscar venda por número ou cliente"
            placeholder="Buscar por código…"
            class="w-full"
            :maxlength="BUSCA_MAX"
          />
        </div>

        <div class="flex flex-wrap items-center gap-2 lg:ml-auto">
          <Select v-model="status">
            <SelectTrigger class="h-10 w-36 cursor-pointer bg-surface" aria-label="Situação">
              <SelectValue placeholder="Situação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos" class="cursor-pointer">Todas situações</SelectItem>
              <SelectItem value="completed" class="cursor-pointer">Concluídas</SelectItem>
              <SelectItem value="pending" class="cursor-pointer">Aguardando</SelectItem>
              <SelectItem value="cancelled" class="cursor-pointer">Canceladas</SelectItem>
            </SelectContent>
          </Select>

          <Select v-model="formaPagamento">
            <SelectTrigger class="h-10 w-40 cursor-pointer bg-surface" aria-label="Pagamento">
              <SelectValue placeholder="Pagamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos" class="cursor-pointer">Todos pagamentos</SelectItem>
              <SelectItem value="Pix" class="cursor-pointer">Pix</SelectItem>
              <SelectItem value="Dinheiro" class="cursor-pointer">Dinheiro</SelectItem>
              <SelectItem value="Cartão de crédito" class="cursor-pointer"
                >Cartão de Crédito</SelectItem
              >
              <SelectItem value="Cartão de débito" class="cursor-pointer"
                >Cartão de Débito</SelectItem
              >
            </SelectContent>
          </Select>

          <div class="flex items-center gap-1">
            <input
              v-model="dataInicio"
              type="date"
              class="h-10 rounded-md border border-input bg-surface px-2 text-xs outline-none focus:ring-1 focus:ring-ring"
              title="Data inicial"
            />
            <span class="text-xs text-muted-foreground">até</span>
            <input
              v-model="dataFim"
              type="date"
              class="h-10 rounded-md border border-input bg-surface px-2 text-xs outline-none focus:ring-1 focus:ring-ring"
              title="Data final"
            />
          </div>

          <Button
            v-if="
              busca || status !== 'todos' || formaPagamento !== 'todos' || dataInicio || dataFim
            "
            variant="ghost"
            size="sm"
            class="h-10 cursor-pointer text-xs"
            @click="limpar"
          >
            Limpar
          </Button>
        </div>
      </div>

      <TableSkeleton v-if="isLoading" :colunas="7" />

      <EmptyState
        v-else-if="vendasOrdenadas.length === 0"
        titulo="Nenhuma venda encontrada"
        descricao="Não encontramos resultados com esses filtros. Tente outra busca ou altere o período."
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
          <li v-for="v in vendasOrdenadas" :key="v.id" class="space-y-2 px-4 py-3.5">
            <div class="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
              <div class="min-w-0">
                <p class="truncate text-sm font-medium">{{ v.code }}</p>
                <p class="truncate text-xs text-muted-foreground">
                  {{ v.customer?.name || v.person?.name || 'Venda avulsa' }}
                </p>
              </div>
              <div class="flex items-center gap-1">
                <span class="text-sm font-semibold">{{ formatBrl(v.total) }}</span>
                <DropdownMenu>
                  <DropdownMenuTrigger as-child>
                    <Button variant="ghost" size="icon" class="size-7 cursor-pointer">
                      <MoreHorizontal class="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem class="cursor-pointer" @click="visualizarVenda(v)">
                      <Eye class="mr-2 size-4" /> Ver / Editar
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />
                    <DropdownMenuLabel class="text-[11px] font-semibold text-muted-foreground">
                      Alterar Situação
                    </DropdownMenuLabel>

                    <DropdownMenuItem
                      class="cursor-pointer text-emerald-600 focus:text-emerald-600"
                      @click="alterarStatusVenda(v, 'completed')"
                    >
                      <CheckCircle2 class="mr-2 size-4" /> Concluída
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      class="cursor-pointer text-amber-600 focus:text-amber-600"
                      @click="alterarStatusVenda(v, 'pending')"
                    >
                      <Clock class="mr-2 size-4" /> Aguardando
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      class="cursor-pointer text-red-600 focus:text-red-600"
                      @click="alterarStatusVenda(v, 'cancelled')"
                    >
                      <XCircle class="mr-2 size-4" /> Cancelada
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem
                      class="cursor-pointer text-destructive focus:text-destructive"
                      @click="confirmarExclusao(v)"
                    >
                      <Trash2 class="mr-2 size-4" /> Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-1.5">
                <StatusPill :tom="tomStatus[v.status] || 'neutral'">
                  {{ rotuloStatus[v.status] || v.status }}
                </StatusPill>
                <StatusPill v-if="v.payment_method" :tom="tomPagamento(v.payment_method)">
                  {{ v.payment_method }}
                </StatusPill>
              </div>
              <span class="text-xs text-muted-foreground">{{ formatDate(v.created_at) }}</span>
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
                <th class="w-10 px-4 py-3"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr
                v-for="v in vendasOrdenadas"
                :key="v.id"
                class="transition-colors hover:bg-muted/60"
              >
                <td class="px-5 py-3 font-medium">{{ v.code }}</td>
                <td class="px-4 py-3 text-muted-foreground">
                  {{ v.customer?.name || v.person?.name || 'Venda avulsa' }}
                </td>
                <td class="px-4 py-3 text-muted-foreground">{{ formatDate(v.created_at) }}</td>
                <td class="px-4 py-3">
                  <StatusPill v-if="v.payment_method" :tom="tomPagamento(v.payment_method)">
                    {{ v.payment_method }}
                  </StatusPill>
                  <span v-else class="text-muted-foreground">-</span>
                </td>
                <td class="px-4 py-3 text-right font-semibold">{{ formatBrl(v.total) }}</td>
                <td class="px-4 py-3">
                  <StatusPill :tom="tomStatus[v.status] || 'neutral'">
                    {{ rotuloStatus[v.status] || v.status }}
                  </StatusPill>
                </td>
                <td class="px-4 py-3 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger as-child>
                      <Button variant="ghost" size="icon" class="size-8 cursor-pointer">
                        <MoreHorizontal class="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem class="cursor-pointer" @click="visualizarVenda(v)">
                        <Eye class="mr-2 size-4" /> Ver / Editar
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />
                      <DropdownMenuLabel class="text-[11px] font-semibold text-muted-foreground">
                        Alterar Situação
                      </DropdownMenuLabel>

                      <DropdownMenuItem
                        class="cursor-pointer text-emerald-600 focus:text-emerald-600"
                        @click="alterarStatusVenda(v, 'completed')"
                      >
                        <CheckCircle2 class="mr-2 size-4" /> Concluída
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        class="cursor-pointer text-amber-600 focus:text-amber-600"
                        @click="alterarStatusVenda(v, 'pending')"
                      >
                        <Clock class="mr-2 size-4" /> Aguardando
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        class="cursor-pointer text-red-600 focus:text-red-600"
                        @click="alterarStatusVenda(v, 'cancelled')"
                      >
                        <XCircle class="mr-2 size-4" /> Cancelada
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />

                      <DropdownMenuItem
                        class="cursor-pointer text-destructive focus:text-destructive"
                        @click="confirmarExclusao(v)"
                      >
                        <Trash2 class="mr-2 size-4" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
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

  <AlertDialog :open="modalDeletarAberto" @update:open="(v) => (modalDeletarAberto = v)">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Deseja excluir esta venda?</AlertDialogTitle>
        <AlertDialogDescription>
          Essa ação removerá o registro da venda
          <strong v-if="vendaParaDeletar">#{{ vendaParaDeletar.code }}</strong> e não poderá ser
          desfeita.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter class="gap-2 sm:gap-0">
        <AlertDialogCancel :disabled="isDeleting" class="cursor-pointer">
          Cancelar
        </AlertDialogCancel>
        <Button
          type="button"
          variant="destructive"
          class="cursor-pointer"
          :disabled="isDeleting"
          @click="executarExclusao"
        >
          {{ isDeleting ? 'Excluindo…' : 'Excluir' }}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
