<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ArrowUpRight,
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  Eye,
  MoreHorizontal,
  Package,
  Pencil,
  Plus,
  Printer,
  RotateCcw,
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

// ---------------------------------------------------------------------------
// Mapeamentos visuais de Situação e Pagamento
// ---------------------------------------------------------------------------
// Inclui "refunded" (Estornada) e "processing" (Em processamento). Ajuste as
// chaves para bater com os valores reais que o back-end retorna em `status`.
const tomStatus = {
  completed: 'success',
  pending: 'warning',
  processing: 'info',
  cancelled: 'danger',
  refunded: 'neutral',
}
const rotuloStatus = {
  completed: 'Concluída',
  pending: 'Aguardando',
  processing: 'Processando',
  cancelled: 'Cancelada',
  refunded: 'Estornada',
}

function tomPagamento(metodo) {
  if (!metodo) return 'neutral'
  const m = metodo.toLowerCase()
  if (m.includes('pix')) return 'success'
  if (m.includes('dinheiro')) return 'info'
  if (m.includes('crédito') || m.includes('credito')) return 'warning'
  if (m.includes('débito') || m.includes('debito')) return 'accent'
  return 'neutral'
}

// ---------------------------------------------------------------------------
// Filtros básicos
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
  todos: '',
  completed: 'Concluída',
  pending: 'Aguardando',
  processing: 'Processando',
  cancelled: 'Cancelada',
  refunded: 'Estornada',
}

// ---------------------------------------------------------------------------
// Filtro de data: presets rápidos (Hoje, 7 dias, Este mês, Mês anterior) +
// modo personalizado (dia específico ou período), tudo dentro de um único
// popover para não poluir a barra de filtros.
// ---------------------------------------------------------------------------
const tipoData = ref('nenhum') // 'nenhum' | 'hoje' | '7dias' | 'mes' | 'mesAnterior' | 'personalizado_dia' | 'personalizado_periodo'
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

  if (preset === 'hoje') {
    return { start: toISO(inicioHoje), end: toISO(inicioHoje) }
  }
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

function selecionarModoPersonalizado(modo) {
  tipoData.value = modo
  dataUnica.value = ''
  dataInicio.value = ''
  dataFim.value = ''
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
const modalAberto = ref(false)
const vendaEmEdicao = ref(null)

const vendaParaDeletar = ref(null)
const modalDeletarAberto = ref(false)
const isDeleting = ref(false)

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

// ---------------------------------------------------------------------------
// Filtros ativos (para os chips de "filtros aplicados")
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Requisição à API
// ---------------------------------------------------------------------------
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
    payment_method: formaPagamento.value,
    start_date,
    end_date,
  }
})

const {
  vendas,
  totalPaginas,
  totalRegistros,
  totalVendido,
  aguardandoPagamento,
  ticketMedio,
  // Campos opcionais de comparação com o período anterior. Só existem se o
  // back-end/composable já os calcular; se `useSales` ainda não retorna
  // essas chaves, os cards abaixo simplesmente não mostram a variação —
  // nenhum número é inventado no front-end.
  variacaoTotalVendido,
  variacaoVendas,
  vendasAguardandoPagamento,
  ticketMedioAnterior,
  isLoading,
  refetch,
  deleteSale,
  updateSaleStatus,
} = useSales(filtros)

// ---------------------------------------------------------------------------
// Ordenação local (data / valor), com fallback estável em caso de empate
// ---------------------------------------------------------------------------
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

function formatVariacao(valor) {
  if (valor === null || valor === undefined || Number.isNaN(Number(valor))) return null
  const num = Number(valor)
  const sinal = num > 0 ? '+' : ''
  return `${sinal}${num.toFixed(1)}% vs. período anterior`
}

// Quantidade de itens de uma venda: tenta `items_count` (campo agregado do
// back-end) e cai para o tamanho do array `items`, se vier carregado.
function qtdItens(venda) {
  if (typeof venda.items_count === 'number') return venda.items_count
  if (Array.isArray(venda.items)) return venda.items.length
  return null
}

function rotuloItens(venda) {
  const qtd = qtdItens(venda)
  if (qtd === null) return '-'
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

function abrirModalNovaVenda() {
  vendaEmEdicao.value = null
  modalAberto.value = true
}

function visualizarOuEditarVenda(venda) {
  vendaEmEdicao.value = venda
  modalAberto.value = true
}

// Clique na linha inteira: abre os detalhes. Ícones de ação usam .stop para
// não disparar essa navegação junto.
function abrirDetalhesNaLinha(venda, evento) {
  if (evento?.target?.closest('[data-linha-ignorar]')) return
  visualizarOuEditarVenda(venda)
}

function vendaSalva() {
  modalAberto.value = false
  vendaEmEdicao.value = null
  if (typeof refetch === 'function') refetch()
}

// Comprovante: ajuste esta função para o fluxo real (rota de impressão,
// geração de PDF, etc.). Por padrão, abre a impressão do navegador.
function imprimirComprovante(venda) {
  window.open(`/vendas/${venda.id}/comprovante`, '_blank')
}

async function alterarStatusVenda(venda, novoStatus) {
  if (venda.status === novoStatus) return

  try {
    if (typeof updateSaleStatus === 'function') {
      await updateSaleStatus(venda.id, { status: novoStatus })
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

async function executarExclusao() {
  if (!vendaParaDeletar.value) return

  const itemDeletado = vendaParaDeletar.value
  isDeleting.value = true

  try {
    if (typeof deleteSale === 'function') {
      await deleteSale(itemDeletado.id)
    }

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
        @click="abrirModalNovaVenda"
      >
        <Plus class="size-4" /> Nova venda
      </Button>
    </template>
  </PageHeader>

  <div class="space-y-4 p-4 md:space-y-5 md:p-6">
    <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <MetricCard
        rotulo="Vendas listadas"
        :valor="String(totalRegistros)"
        :apoio="formatVariacao(variacaoVendas)"
      />
      <MetricCard
        rotulo="Faturamento (concluídas)"
        :valor="formatBrl(totalVendido)"
        tom="success"
        :apoio="formatVariacao(variacaoTotalVendido) || 'Saídas de estoque'"
      >
        <template #icone><ArrowUpRight class="size-4" /></template>
      </MetricCard>
      <MetricCard
        rotulo="Aguardando pagamento"
        :valor="formatBrl(aguardandoPagamento)"
        tom="warning"
        :apoio="
          typeof vendasAguardandoPagamento === 'number'
            ? `${vendasAguardandoPagamento} venda(s)`
            : undefined
        "
      />
      <MetricCard
        rotulo="Ticket médio"
        :valor="formatBrl(ticketMedio)"
        :apoio="
          typeof ticketMedioAnterior === 'number'
            ? `vs. ${formatBrl(ticketMedioAnterior)} anterior`
            : undefined
        "
      />
    </div>

    <Section>
      <div class="flex flex-col gap-3 border-b border-border p-4 lg:p-5">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div class="relative w-full lg:max-w-sm">
            <label for="busca-vendas" class="sr-only">
              Buscar por venda, cliente, código ou CPF/CNPJ
            </label>
            <Search
              class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <input
              id="busca-vendas"
              v-model="busca"
              type="text"
              inputmode="search"
              autocomplete="off"
              :maxlength="BUSCA_MAX"
              placeholder="Buscar por venda, cliente ou código…"
              class="h-10 w-full rounded-md border border-input bg-surface pl-9 pr-14 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
            />
            <!-- Contador fantasma: some visualmente até o campo ganhar foco/texto, sempre não-interativo -->
            <span
              class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 select-none text-xs tabular-nums text-muted-foreground/50"
              aria-hidden="true"
            >
              {{ busca.length }}/{{ BUSCA_MAX }}
            </span>
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
                <SelectItem value="processing" class="cursor-pointer">Processando</SelectItem>
                <SelectItem value="cancelled" class="cursor-pointer">Canceladas</SelectItem>
                <SelectItem value="refunded" class="cursor-pointer">Estornadas</SelectItem>
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

            <!-- Filtro de data: presets rápidos + modo personalizado dentro de um popover -->
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

                  <div class="border-t border-border pt-3">
                    <p class="mb-2 text-[11px] font-semibold uppercase text-muted-foreground">
                      Personalizado
                    </p>

                    <div class="mb-2 grid grid-cols-2 gap-1 rounded-md bg-muted p-1">
                      <button
                        type="button"
                        class="cursor-pointer rounded px-2 py-1.5 text-xs font-medium transition-colors"
                        :class="
                          tipoData === 'personalizado_dia'
                            ? 'bg-surface text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        "
                        @click="selecionarModoPersonalizado('personalizado_dia')"
                      >
                        Dia específico
                      </button>
                      <button
                        type="button"
                        class="cursor-pointer rounded px-2 py-1.5 text-xs font-medium transition-colors"
                        :class="
                          tipoData === 'personalizado_periodo'
                            ? 'bg-surface text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        "
                        @click="selecionarModoPersonalizado('personalizado_periodo')"
                      >
                        Período
                      </button>
                    </div>

                    <div v-if="tipoData === 'personalizado_dia'" class="space-y-1.5">
                      <label class="text-xs text-muted-foreground">Selecione a data</label>
                      <input
                        v-model="dataUnica"
                        type="date"
                        class="h-9 w-full cursor-pointer rounded-md border border-input bg-surface px-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>

                    <div v-else-if="tipoData === 'personalizado_periodo'" class="space-y-2">
                      <div class="space-y-1.5">
                        <label class="text-xs text-muted-foreground">De</label>
                        <input
                          v-model="dataInicio"
                          type="date"
                          class="h-9 w-full cursor-pointer rounded-md border border-input bg-surface px-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                        />
                      </div>
                      <div class="space-y-1.5">
                        <label class="text-xs text-muted-foreground">Até</label>
                        <input
                          v-model="dataFim"
                          type="date"
                          :min="dataInicio || undefined"
                          class="h-9 w-full cursor-pointer rounded-md border border-input bg-surface px-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                        />
                      </div>
                    </div>

                    <p v-else class="py-1 text-xs text-muted-foreground">
                      Escolha "Dia específico" ou "Período" para uma data personalizada.
                    </p>
                  </div>

                  <div class="mt-3 flex items-center justify-between border-t border-border pt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      class="h-8 cursor-pointer text-xs"
                      @click="limparFiltroData"
                    >
                      Limpar
                    </Button>
                    <Button
                      size="sm"
                      class="h-8 cursor-pointer bg-emerald-500 text-xs text-black hover:bg-emerald-600"
                      @click="filtroDataAberto = false"
                    >
                      Aplicar
                    </Button>
                  </div>
                </div>
              </Transition>
            </div>

            <Button
              v-if="temFiltrosAtivos"
              variant="ghost"
              size="sm"
              class="h-10 cursor-pointer text-xs"
              @click="limpar"
            >
              Limpar tudo
            </Button>
          </div>
        </div>

        <!-- Chips de filtros ativos: cada um pode ser removido individualmente -->
        <div v-if="temFiltrosAtivos" class="flex flex-wrap items-center gap-1.5">
          <span class="text-xs text-muted-foreground">Filtros:</span>
          <button
            v-for="filtro in filtrosAtivos"
            :key="filtro.chave"
            type="button"
            class="inline-flex cursor-pointer items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-1 text-xs text-foreground transition-colors hover:bg-muted/70"
            @click="removerFiltro(filtro.chave)"
          >
            {{ filtro.rotulo }}
            <X class="size-3 text-muted-foreground" />
          </button>
        </div>
      </div>

      <TableSkeleton v-if="isLoading" :colunas="8" />

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
              @click="abrirModalNovaVenda"
            >
              Registrar venda
            </Button>
          </div>
        </template>
      </EmptyState>

      <template v-else>
        <!-- Mobile -->
        <ul class="divide-y divide-border md:hidden">
          <li
            v-for="v in vendasOrdenadas"
            :key="v.id"
            class="cursor-pointer space-y-2 px-4 py-3.5 transition-colors active:bg-muted/60"
            @click="abrirDetalhesNaLinha(v, $event)"
          >
            <div class="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
              <div class="min-w-0">
                <p class="truncate text-sm font-medium">{{ v.code }}</p>
                <p class="truncate text-xs text-muted-foreground">
                  {{ v.customer?.name || v.person?.name || 'Venda avulsa' }}
                </p>
              </div>
              <div class="flex items-center gap-1" data-linha-ignorar>
                <span class="text-sm font-semibold">{{ formatBrl(v.total) }}</span>
                <DropdownMenu>
                  <DropdownMenuTrigger as-child>
                    <Button variant="ghost" size="icon" class="size-7 cursor-pointer">
                      <MoreHorizontal class="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem class="cursor-pointer" @click="visualizarOuEditarVenda(v)">
                      <Eye class="mr-2 size-4" /> Ver detalhes
                    </DropdownMenuItem>
                    <DropdownMenuItem class="cursor-pointer" @click="visualizarOuEditarVenda(v)">
                      <Pencil class="mr-2 size-4" /> Editar venda
                    </DropdownMenuItem>
                    <DropdownMenuItem class="cursor-pointer" @click="imprimirComprovante(v)">
                      <Printer class="mr-2 size-4" /> Ver comprovante
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />
                    <DropdownMenuLabel class="text-[11px] font-semibold text-muted-foreground">
                      Alterar situação
                    </DropdownMenuLabel>

                    <DropdownMenuItem
                      v-if="v.status !== 'completed'"
                      class="cursor-pointer text-emerald-600 focus:text-emerald-600"
                      @click="alterarStatusVenda(v, 'completed')"
                    >
                      <CheckCircle2 class="mr-2 size-4" /> Concluída
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      v-if="v.status !== 'pending'"
                      class="cursor-pointer text-amber-600 focus:text-amber-600"
                      @click="alterarStatusVenda(v, 'pending')"
                    >
                      <Clock class="mr-2 size-4" /> Aguardando
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem
                      v-if="v.status !== 'cancelled'"
                      class="cursor-pointer text-red-600 focus:text-red-600"
                      @click="alterarStatusVenda(v, 'cancelled')"
                    >
                      <XCircle class="mr-2 size-4" /> Cancelar venda
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      v-if="v.status === 'completed'"
                      class="cursor-pointer text-red-600 focus:text-red-600"
                      @click="alterarStatusVenda(v, 'refunded')"
                    >
                      <RotateCcw class="mr-2 size-4" /> Estornar venda
                    </DropdownMenuItem>

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
              <div class="flex flex-wrap items-center gap-1.5">
                <StatusPill :tom="tomStatus[v.status] || 'neutral'">
                  {{ rotuloStatus[v.status] || v.status }}
                </StatusPill>
                <StatusPill v-if="v.payment_method" :tom="tomPagamento(v.payment_method)">
                  {{ v.payment_method
                  }}<template v-if="v.installments > 1"> · {{ v.installments }}x</template>
                </StatusPill>
                <span
                  v-if="qtdItens(v) !== null"
                  class="inline-flex items-center gap-1 text-xs text-muted-foreground"
                >
                  <Package class="size-3" /> {{ rotuloItens(v) }}
                </span>
              </div>
              <span class="text-xs text-muted-foreground">{{ formatDate(v.created_at) }}</span>
            </div>
          </li>
        </ul>

        <!-- Desktop -->
        <div class="hidden md:block">
          <table class="w-full text-sm">
            <thead class="text-xs text-muted-foreground">
              <tr class="border-b border-border text-left">
                <th class="px-5 py-3 font-medium">Venda</th>
                <th class="px-4 py-3 font-medium">Cliente</th>
                <th class="px-4 py-3 font-medium">Itens</th>
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
                class="cursor-pointer transition-colors hover:bg-muted/60"
                tabindex="0"
                role="button"
                :aria-label="`Ver detalhes da venda ${v.code}`"
                @click="abrirDetalhesNaLinha(v, $event)"
                @keydown.enter="visualizarOuEditarVenda(v)"
              >
                <td class="px-5 py-3 font-medium">{{ v.code }}</td>
                <td class="px-4 py-3 text-muted-foreground">
                  {{ v.customer?.name || v.person?.name || 'Venda avulsa' }}
                </td>
                <td class="px-4 py-3 text-muted-foreground">{{ rotuloItens(v) }}</td>
                <td class="px-4 py-3 text-muted-foreground">{{ formatDate(v.created_at) }}</td>
                <td class="px-4 py-3">
                  <StatusPill v-if="v.payment_method" :tom="tomPagamento(v.payment_method)">
                    {{ v.payment_method
                    }}<template v-if="v.installments > 1"> · {{ v.installments }}x</template>
                  </StatusPill>
                  <span v-else class="text-muted-foreground">-</span>
                </td>
                <td class="px-4 py-3 text-right font-semibold">{{ formatBrl(v.total) }}</td>
                <td class="px-4 py-3">
                  <StatusPill :tom="tomStatus[v.status] || 'neutral'">
                    {{ rotuloStatus[v.status] || v.status }}
                  </StatusPill>
                </td>
                <td class="px-4 py-3 text-right" data-linha-ignorar>
                  <DropdownMenu>
                    <DropdownMenuTrigger as-child>
                      <Button variant="ghost" size="icon" class="size-8 cursor-pointer">
                        <MoreHorizontal class="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem class="cursor-pointer" @click="visualizarOuEditarVenda(v)">
                        <Eye class="mr-2 size-4" /> Ver detalhes
                      </DropdownMenuItem>
                      <DropdownMenuItem class="cursor-pointer" @click="visualizarOuEditarVenda(v)">
                        <Pencil class="mr-2 size-4" /> Editar venda
                      </DropdownMenuItem>
                      <DropdownMenuItem class="cursor-pointer" @click="imprimirComprovante(v)">
                        <Printer class="mr-2 size-4" /> Ver comprovante
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />
                      <DropdownMenuLabel class="text-[11px] font-semibold text-muted-foreground">
                        Alterar situação
                      </DropdownMenuLabel>

                      <DropdownMenuItem
                        v-if="v.status !== 'completed'"
                        class="cursor-pointer text-emerald-600 focus:text-emerald-600"
                        @click="alterarStatusVenda(v, 'completed')"
                      >
                        <CheckCircle2 class="mr-2 size-4" /> Concluída
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        v-if="v.status !== 'pending'"
                        class="cursor-pointer text-amber-600 focus:text-amber-600"
                        @click="alterarStatusVenda(v, 'pending')"
                      >
                        <Clock class="mr-2 size-4" /> Aguardando
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />

                      <DropdownMenuItem
                        v-if="v.status !== 'cancelled'"
                        class="cursor-pointer text-red-600 focus:text-red-600"
                        @click="alterarStatusVenda(v, 'cancelled')"
                      >
                        <XCircle class="mr-2 size-4" /> Cancelar venda
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        v-if="v.status === 'completed'"
                        class="cursor-pointer text-red-600 focus:text-red-600"
                        @click="alterarStatusVenda(v, 'refunded')"
                      >
                        <RotateCcw class="mr-2 size-4" /> Estornar venda
                      </DropdownMenuItem>

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

  <NewSale v-model:open="modalAberto" :sale="vendaEmEdicao" @created="vendaSalva" />

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
