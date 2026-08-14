<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ArrowUpRight,
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Loader2,
  MoreHorizontal,
  Package,
  Plus,
  Search,
  Trash2,
  X,
  XCircle,
} from 'lucide-vue-next'

import PageHeader from '@/components/page-shell/PageHeader.vue'
import Section from '@/components/page-shell/Section.vue'
import EmptyState from '@/components/page-shell/EmptyState.vue'
import TableSkeleton from '@/components/page-shell/TableSkeleton.vue'
import StatusPill from '@/components/ui-kit/StatusPill.vue'
import MetricCard from '@/components/ui-kit/MetricCard.vue'

import { Button } from '@/components/ui/button'
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

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import { useFeedback } from '@/composables/useFeedBack'
import { usePurchases } from '@/composables/usePurchases'

const PORPAGINA = 8
const BUSCA_MAX = 60

const { sucesso, erro } = useFeedback()

// ---------------------------------------------------------------------------
// Mapeamentos visuais
// ---------------------------------------------------------------------------
const tomStatus = {
  received: 'success',
  pending: 'warning',
  cancelled: 'danger',
}

const rotuloStatus = {
  received: 'Recebida',
  pending: 'Aguardando recebimento',
  cancelled: 'Cancelada',
}

// ---------------------------------------------------------------------------
// Controle de Linhas Expandidas (Accordion)
// ---------------------------------------------------------------------------
const linhasExpandidas = ref([])

function toggleExpansao(compraId) {
  if (linhasExpandidas.value.includes(compraId)) {
    linhasExpandidas.value = linhasExpandidas.value.filter((id) => id !== compraId)
  } else {
    linhasExpandidas.value.push(compraId)
  }
}

function isExpandida(compraId) {
  return linhasExpandidas.value.includes(compraId)
}

// Resiliência para extração dos itens do backend
function obterItensCompra(compra) {
  if (!compra) return []
  if (Array.isArray(compra.items)) return compra.items
  if (Array.isArray(compra.purchase_items)) return compra.purchase_items
  if (Array.isArray(compra.purchaseItems)) return compra.purchaseItems
  return []
}

function obterNomeProduto(item) {
  return item?.product?.name || item?.name || item?.product_name || 'Produto sem nome'
}

function obterPrecoUnitario(item) {
  return Number(item?.unit_cost ?? item?.unit_price ?? item?.price ?? item?.cost ?? 0)
}

function obterQuantidade(item) {
  return Number(item?.quantity ?? item?.qty ?? item?.amount ?? 1)
}

// ---------------------------------------------------------------------------
// Filtros e Estado
// ---------------------------------------------------------------------------
const buscaBruta = ref('')
const busca = computed({
  get: () => buscaBruta.value,
  set: (valor) => {
    buscaBruta.value = (valor ?? '').slice(0, BUSCA_MAX)
  },
})

const status = ref('todos')
const formaPagamento = ref('todos')

const rotulosSituacao = {
  todos: 'Todas',
  received: 'Recebida',
  pending: 'Aguardando recebimento',
  cancelled: 'Cancelada',
}

const tipoData = ref('nenhum')
const dataUnica = ref('')
const dataInicio = ref('')
const dataFim = ref('')

const filtroDataAberto = ref(false)
const dataFiltroRef = ref(null)

function toISO(date) {
  return date.toISOString().slice(0, 10)
}

function limitesPreset(preset) {
  const hoje = new Date()
  const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())

  if (preset === 'hoje') return { start: toISO(inicioHoje), end: toISO(inicioHoje) }
  if (preset === '7dias') {
    const inicio = new Date(inicioHoje)
    inicio.setDate(inicio.getDate() - 6)
    return { start: toISO(inicio), end: toISO(inicioHoje) }
  }
  if (preset === 'mes') {
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
    return { start: toISO(inicio), end: toISO(inicioHoje) }
  }
  if (preset === 'mesAnterior') {
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)
    const fim = new Date(hoje.getFullYear(), hoje.getMonth(), 0)
    return { start: toISO(inicio), end: toISO(fim) }
  }
  return { start: '', end: '' }
}

function selecionarPreset(preset) {
  tipoData.value = preset
  dataUnica.value = ''
  dataInicio.value = ''
  dataFim.value = ''
  filtroDataAberto.value = false
}

function formatDateCurta(dateStr) {
  if (!dateStr) return ''
  const [ano, mes, dia] = dateStr.split('-')
  return `${dia}/${mes}`
}

const presetsData = [
  { valor: 'hoje', rotulo: 'Hoje' },
  { valor: '7dias', rotulo: 'Últimos 7 dias' },
  { valor: 'mes', rotulo: 'Este mês' },
  { valor: 'mesAnterior', rotulo: 'Mês anterior' },
]

const rotuloFiltroData = computed(() => {
  const preset = presetsData.find((p) => p.valor === tipoData.value)
  if (preset) return preset.rotulo

  if (tipoData.value === 'personalizado_dia') {
    return dataUnica.value ? formatDateCurta(dataUnica.value) : 'Dia específico'
  }
  if (tipoData.value === 'personalizado_periodo') {
    if (dataInicio.value && dataFim.value) {
      return `${formatDateCurta(dataInicio.value)} – ${formatDateCurta(dataFim.value)}`
    }
    return 'Período'
  }
  return 'Filtrar por data'
})

function limparFiltroData() {
  tipoData.value = 'nenhum'
  dataUnica.value = ''
  dataInicio.value = ''
  dataFim.value = ''
  filtroDataAberto.value = false
}

function handleClickFora(evento) {
  if (dataFiltroRef.value && !dataFiltroRef.value.contains(evento.target)) {
    filtroDataAberto.value = false
  }
}

function handleTeclaEsc(evento) {
  if (evento.key === 'Escape') filtroDataAberto.value = false
}

onMounted(() => {
  document.addEventListener('mousedown', handleClickFora)
  document.addEventListener('keydown', handleTeclaEsc)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickFora)
  document.removeEventListener('keydown', handleTeclaEsc)
})

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

watch([busca, status, formaPagamento, tipoData, dataUnica, dataInicio, dataFim], () => {
  pagina.value = 1
})

const filtrosAtivos = computed(() => {
  const lista = []

  if (status.value !== 'todos') {
    lista.push({ chave: 'status', rotulo: rotulosSituacao[status.value] || status.value })
  }
  if (formaPagamento.value !== 'todos') {
    lista.push({ chave: 'pagamento', rotulo: formaPagamento.value })
  }
  if (tipoData.value !== 'nenhum') {
    lista.push({ chave: 'data', rotulo: rotuloFiltroData.value })
  }
  if (busca.value) {
    lista.push({ chave: 'busca', rotulo: `"${busca.value}"` })
  }

  return lista
})

function removerFiltro(chave) {
  if (chave === 'status') status.value = 'todos'
  if (chave === 'pagamento') formaPagamento.value = 'todos'
  if (chave === 'data') limparFiltroData()
  if (chave === 'busca') busca.value = ''
}

const temFiltrosAtivos = computed(() => filtrosAtivos.value.length > 0)

const filtros = computed(() => {
  let start_date = ''
  let end_date = ''

  if (presetsData.some((p) => p.valor === tipoData.value)) {
    const limites = limitesPreset(tipoData.value)
    start_date = limites.start
    end_date = limites.end
  } else if (tipoData.value === 'personalizado_dia' && dataUnica.value) {
    start_date = dataUnica.value
    end_date = dataUnica.value
  } else if (tipoData.value === 'personalizado_periodo') {
    start_date = dataInicio.value
    end_date = dataFim.value
  }

  return {
    page: pagina.value,
    per_page: PORPAGINA,
    search: busca.value,
    status: status.value,
    start_date,
    end_date,
  }
})

// 🚀 CONEXÃO CORRETA COM O COMPOSABLE DE COMPRAS
const {
  compras,
  totalRegistros,
  totalComprado,
  ticketMedio,
  aguardandoRecebimento,
  isLoading,
  refetch,
  updatePurchase,
  deletePurchase,
} = usePurchases(filtros)

const comprasOrdenadas = computed(() => {
  const lista = [...(compras.value || [])]
  if (!sortCampo.value) return lista

  return lista.sort((a, b) => {
    let valorA, valorB

    if (sortCampo.value === 'data') {
      valorA = new Date(a.created_at || 0).getTime()
      valorB = new Date(b.created_at || 0).getTime()
    } else if (sortCampo.value === 'valor') {
      valorA = Number(a.total || a.total_amount || 0)
      valorB = Number(b.total || b.total_amount || 0)
    } else {
      return 0
    }

    if (valorA === valorB) return 0
    if (valorA < valorB) return sortDirecao.value === 'asc' ? -1 : 1
    return sortDirecao.value === 'asc' ? 1 : -1
  })
})

function formatBrl(val) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0)
}

function formatDate(dateString) {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('pt-BR')
}

function qtdItens(compra) {
  if (typeof compra.items_count === 'number') return compra.items_count
  const itens = obterItensCompra(compra)
  return itens.length
}

function rotuloItens(compra) {
  const qtd = qtdItens(compra)
  return qtd === 1 ? '1 item' : `${qtd} itens`
}

function limpar() {
  busca.value = ''
  status.value = 'todos'
  formaPagamento.value = 'todos'
  limparFiltroData()
  sortCampo.value = null
  sortDirecao.value = 'asc'
  pagina.value = 1
}

function handleLinhaClick(compra, evento) {
  if (evento?.target?.closest('[data-linha-ignorar]')) return
  toggleExpansao(compra.id)
}

async function alterarStatusCompra(compra, novoStatus) {
  if (compra.status === novoStatus) return

  try {
    await updatePurchase(compra.id, { status: novoStatus })
    compra.status = novoStatus
    sucesso('Status atualizado', `A compra #${compra.code} agora está ${rotuloStatus[novoStatus]}.`)
    refetch()
  } catch (err) {
    console.error('Erro ao alterar status:', err)
    erro(
      'Erro ao alterar status',
      err?.response?.data?.message || 'Falha ao atualizar no servidor.',
    )
  }
}

// ---------------------------------------------------------------------------
// Exclusão de Compra (com confirmação e bloqueio para compras recebidas)
// ---------------------------------------------------------------------------
const compraParaExcluir = ref(null)
const excluindo = ref(false)

// Compras já recebidas (concluídas) já deram entrada no estoque — excluir
// diretamente deixaria o estoque inconsistente. Por isso, bloqueamos a
// exclusão e pedimos pra mudar o status antes (ex.: cancelar a compra).
const exclusaoBloqueada = computed(() => compraParaExcluir.value?.status === 'received')

function pedirExclusao(compra) {
  compraParaExcluir.value = compra
}

function fecharDialogExclusao() {
  if (excluindo.value) return
  compraParaExcluir.value = null
}

async function confirmarExclusao() {
  const compra = compraParaExcluir.value
  if (!compra || excluindo.value || exclusaoBloqueada.value) return

  excluindo.value = true
  try {
    await deletePurchase(compra.id)
    sucesso('Compra excluída', `A compra #${compra.code} foi removida com sucesso.`)
    compraParaExcluir.value = null
    refetch()
  } catch (err) {
    erro('Erro ao excluir', err?.response?.data?.message || 'Falha ao excluir no servidor.')
  } finally {
    excluindo.value = false
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
        tom="success"
        apoio="Entradas de estoque"
      >
        <template #icone><ArrowUpRight class="size-4" /></template>
      </MetricCard>

      <MetricCard
        rotulo="Aguardando recebimento"
        :valor="String(aguardandoRecebimento)"
        tom="warning"
        :apoio="
          aguardandoRecebimento === 1
            ? '1 compra pendente'
            : `${aguardandoRecebimento} compras pendentes`
        "
      />

      <MetricCard rotulo="Ticket médio" :valor="formatBrl(ticketMedio)" />
    </div>

    <Section>
      <div class="flex flex-col gap-3 border-b border-border p-4 lg:p-5">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div class="relative w-full lg:max-w-sm">
            <label for="busca-compras" class="sr-only">Buscar por número ou fornecedor</label>
            <Search
              class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <input
              id="busca-compras"
              v-model="busca"
              type="text"
              inputmode="search"
              autocomplete="off"
              :maxlength="BUSCA_MAX"
              placeholder="Buscar por número ou fornecedor..."
              class="h-10 w-full rounded-md border border-input bg-surface pl-9 pr-14 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
            />
            <span
              class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 select-none text-xs tabular-nums text-muted-foreground/50"
            >
              {{ busca.length }}/{{ BUSCA_MAX }}
            </span>
          </div>

          <div class="flex flex-wrap items-center gap-2 lg:ml-auto">
            <Select v-model="status">
              <SelectTrigger class="h-10 w-48 cursor-pointer bg-surface" aria-label="Situação">
                <SelectValue placeholder="Todas situações" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos" class="cursor-pointer">Todas situações</SelectItem>
                <SelectItem value="received" class="cursor-pointer">Recebidas</SelectItem>
                <SelectItem value="pending" class="cursor-pointer"
                  >Aguardando recebimento</SelectItem
                >
                <SelectItem value="cancelled" class="cursor-pointer">Canceladas</SelectItem>
              </SelectContent>
            </Select>

            <div ref="dataFiltroRef" class="relative">
              <button
                type="button"
                class="flex h-10 w-44 cursor-pointer items-center gap-2 rounded-md border border-input bg-surface px-3 text-sm transition-colors hover:bg-muted/50"
                :class="
                  tipoData !== 'nenhum'
                    ? 'border-emerald-500/50 text-foreground'
                    : 'text-muted-foreground'
                "
                @click="filtroDataAberto = !filtroDataAberto"
              >
                <CalendarIcon class="size-4 shrink-0" />
                <span class="truncate">{{ rotuloFiltroData }}</span>
                <X
                  v-if="tipoData !== 'nenhum'"
                  class="ml-auto size-3.5 shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                  @click.stop="limparFiltroData"
                />
              </button>

              <Transition
                enter-active-class="transition ease-out duration-100"
                enter-from-class="opacity-0 scale-95"
                enter-to-class="opacity-100 scale-100"
                leave-active-class="transition ease-in duration-75"
                leave-from-class="opacity-100 scale-100"
                leave-to-class="opacity-0 scale-95"
              >
                <div
                  v-if="filtroDataAberto"
                  class="absolute right-0 top-[calc(100%+6px)] z-50 w-72 rounded-lg border border-border bg-popover p-3 shadow-lg"
                >
                  <p class="mb-2 text-[11px] font-semibold uppercase text-muted-foreground">
                    Atalhos
                  </p>
                  <div class="mb-3 grid grid-cols-2 gap-1.5">
                    <button
                      v-for="preset in presetsData"
                      :key="preset.valor"
                      type="button"
                      class="cursor-pointer rounded-md border px-2 py-1.5 text-left text-xs font-medium transition-colors"
                      :class="
                        tipoData === preset.valor
                          ? 'border-emerald-500/50 bg-emerald-500/10 text-foreground'
                          : 'border-transparent bg-muted text-muted-foreground hover:text-foreground'
                      "
                      @click="selecionarPreset(preset.valor)"
                    >
                      {{ preset.rotulo }}
                    </button>
                  </div>
                  <div class="mt-3 flex items-center justify-between border-t border-border pt-3">
                    <Button variant="ghost" size="sm" class="h-8 text-xs" @click="limparFiltroData"
                      >Limpar</Button
                    >
                    <Button
                      size="sm"
                      class="h-8 bg-emerald-500 text-xs text-black hover:bg-emerald-600"
                      @click="filtroDataAberto = false"
                      >Aplicar</Button
                    >
                  </div>
                </div>
              </Transition>
            </div>

            <Button
              v-if="temFiltrosAtivos"
              variant="ghost"
              size="sm"
              class="h-10 text-xs"
              @click="limpar"
            >
              Limpar tudo
            </Button>
          </div>
        </div>
      </div>

      <TableSkeleton v-if="isLoading" :colunas="7" />

      <EmptyState
        v-else-if="comprasOrdenadas.length === 0"
        titulo="Nenhum resultado encontrado"
        descricao="Não encontramos correspondências para os filtros aplicados."
      >
        <template #acao>
          <Button variant="outline" @click="limpar">Limpar filtros</Button>
        </template>
      </EmptyState>

      <template v-else>
        <div class="hidden md:block">
          <table class="w-full text-sm border-collapse">
            <thead class="text-xs text-muted-foreground">
              <tr class="border-b border-border text-left">
                <th class="w-8 px-3 py-3"></th>
                <th class="px-5 py-3 font-medium">Compra</th>
                <th class="px-5 py-3 font-medium">Fornecedor</th>
                <th class="px-5 py-3 font-medium cursor-pointer" @click="ordenarPor('data')">
                  <div class="flex items-center gap-1">
                    Data
                    <ArrowUpDown v-if="sortCampo !== 'data'" class="size-3" />
                    <ArrowUp v-else-if="sortDirecao === 'asc'" class="size-3 text-foreground" />
                    <ArrowDown v-else class="size-3 text-foreground" />
                  </div>
                </th>
                <th class="px-5 py-3 font-medium">Itens</th>
                <th
                  class="px-5 py-3 font-medium cursor-pointer text-right"
                  @click="ordenarPor('valor')"
                >
                  <div class="flex items-center justify-end gap-1">
                    Valor total
                    <ArrowUpDown v-if="sortCampo !== 'valor'" class="size-3" />
                    <ArrowUp v-else-if="sortDirecao === 'asc'" class="size-3 text-foreground" />
                    <ArrowDown v-else class="size-3 text-foreground" />
                  </div>
                </th>
                <th class="px-5 py-3 font-medium">Situação</th>
                <th class="px-5 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <template v-for="c in comprasOrdenadas" :key="c.id">
                <tr
                  class="cursor-pointer transition-colors hover:bg-muted/40 select-none"
                  :class="{ 'bg-muted/30': isExpandida(c.id) }"
                  @click="handleLinhaClick(c, $event)"
                >
                  <td class="px-3 py-3 text-muted-foreground">
                    <ChevronDown v-if="isExpandida(c.id)" class="size-4" />
                    <ChevronRight v-else class="size-4" />
                  </td>
                  <td class="px-5 py-3 font-medium text-foreground">{{ c.code }}</td>
                  <td class="px-5 py-3 text-muted-foreground">
                    {{ c.supplier?.name || c.customer?.name || 'Fornecedor não informado' }}
                  </td>
                  <td class="px-5 py-3 text-muted-foreground">{{ formatDate(c.created_at) }}</td>
                  <td class="px-5 py-3 text-muted-foreground">{{ rotuloItens(c) }}</td>
                  <td class="px-5 py-3 text-right font-semibold text-foreground">
                    {{ formatBrl(c.total || c.total_amount) }}
                  </td>
                  <td class="px-5 py-3">
                    <StatusPill :tom="tomStatus[c.status] || 'neutral'">
                      {{ rotuloStatus[c.status] || c.status }}
                    </StatusPill>
                  </td>
                  <td class="px-5 py-3 text-right" data-linha-ignorar>
                    <DropdownMenu>
                      <DropdownMenuTrigger as-child>
                        <Button variant="ghost" size="icon" class="size-8 cursor-pointer">
                          <MoreHorizontal class="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" class="w-48">
                        <DropdownMenuLabel class="text-[11px] font-semibold text-muted-foreground">
                          Mudar situação
                        </DropdownMenuLabel>

                        <DropdownMenuItem
                          v-if="c.status !== 'received'"
                          class="cursor-pointer text-emerald-600 focus:text-emerald-600"
                          @click="alterarStatusCompra(c, 'received')"
                        >
                          <CheckCircle2 class="mr-2 size-4" /> Recebida
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          v-if="c.status !== 'pending'"
                          class="cursor-pointer text-amber-600 focus:text-amber-600"
                          @click="alterarStatusCompra(c, 'pending')"
                        >
                          <Clock class="mr-2 size-4" /> Aguardando recebimento
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          v-if="c.status !== 'cancelled'"
                          class="cursor-pointer text-red-600 focus:text-red-600"
                          @click="alterarStatusCompra(c, 'cancelled')"
                        >
                          <XCircle class="mr-2 size-4" /> Cancelar
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          class="cursor-pointer text-destructive focus:text-destructive"
                          @click="pedirExclusao(c)"
                        >
                          <Trash2 class="mr-2 size-4" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>

                <tr v-if="isExpandida(c.id)" class="bg-muted/20">
                  <td colspan="8" class="px-8 py-3">
                    <div class="rounded-md border border-border/60 bg-surface/80 p-3 shadow-inner">
                      <div class="mb-2 flex items-center justify-between">
                        <p
                          class="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                        >
                          Itens da Compra ({{ obterItensCompra(c).length }})
                        </p>
                      </div>

                      <div
                        v-if="obterItensCompra(c).length > 0"
                        class="max-h-64 overflow-y-auto pr-1 divide-y divide-border/40 text-xs"
                      >
                        <div
                          v-for="(item, idx) in obterItensCompra(c)"
                          :key="item.id || idx"
                          class="flex items-center justify-between py-2 transition-colors hover:bg-muted/30 px-1 rounded-sm"
                        >
                          <div class="flex items-center gap-2.5 min-w-0 pr-4">
                            <Package class="size-3.5 shrink-0 text-muted-foreground" />
                            <span class="font-medium text-foreground truncate">
                              {{ obterNomeProduto(item) }}
                            </span>
                          </div>
                          <div class="flex items-center gap-6 shrink-0 text-muted-foreground">
                            <span
                              >Qtd:
                              <strong class="text-foreground">{{
                                obterQuantidade(item)
                              }}</strong></span
                            >
                            <span>Valor unit.: {{ formatBrl(obterPrecoUnitario(item)) }}</span>
                            <span class="font-semibold text-foreground">
                              Subtotal:
                              {{ formatBrl(obterQuantidade(item) * obterPrecoUnitario(item)) }}
                            </span>
                          </div>
                        </div>
                      </div>

                      <p v-else class="py-2 text-xs text-muted-foreground italic">
                        Nenhum item vinculado encontrado nesta compra.
                      </p>
                    </div>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </template>
    </Section>
  </div>

  <AlertDialog :open="!!compraParaExcluir" @update:open="(o) => !o && fecharDialogExclusao()">
    <AlertDialogContent>
      <template v-if="exclusaoBloqueada">
        <AlertDialogHeader>
          <AlertDialogTitle class="flex items-center gap-2 text-amber-600">
            <AlertTriangle class="size-5 shrink-0" />
            Não é possível excluir a compra #{{ compraParaExcluir?.code }}
          </AlertDialogTitle>
          <AlertDialogDescription>
            Essa compra já está com a situação <strong>Recebida</strong> (concluída) e o estoque já
            foi atualizado com base nela. Para excluí-la, primeiro mude a situação para
            <strong>Aguardando recebimento</strong> ou <strong>Cancelada</strong> no menu de ações
            da compra.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel class="cursor-pointer" @click="fecharDialogExclusao">
            Entendi
          </AlertDialogCancel>
        </AlertDialogFooter>
      </template>

      <template v-else>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir a compra #{{ compraParaExcluir?.code }}?</AlertDialogTitle>
          <AlertDialogDescription>
            Essa ação não pode ser desfeita. A compra será removida permanentemente do histórico.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            class="cursor-pointer"
            :disabled="excluindo"
            @click="fecharDialogExclusao"
          >
            Cancelar
          </AlertDialogCancel>
          <Button
            type="button"
            class="cursor-pointer bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
            :disabled="excluindo"
            @click="confirmarExclusao"
          >
            <Loader2 v-if="excluindo" class="size-4 animate-spin mr-1.5" />
            {{ excluindo ? 'Excluindo…' : 'Excluir' }}
          </Button>
        </AlertDialogFooter>
      </template>
    </AlertDialogContent>
  </AlertDialog>
</template>
