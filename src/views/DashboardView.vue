<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { Line, Bar } from 'vue-chartjs'
import {
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Inbox,
  Package,
  Plus,
  Receipt,
  ShoppingCart,
  TrendingUp,
  TriangleAlert,
} from 'lucide-vue-next'

import PageHeader from '@/components/page-shell/PageHeader.vue'
import Section from '@/components/page-shell/Section.vue'
import MetricCard from '@/components/ui-kit/MetricCard.vue'
import StatusPill from '@/components/ui-kit/StatusPill.vue'
import { Button } from '@/components/ui/button'
import NewProduct from '@/components/modal/product/NewProduct.vue'
import NewSale from '@/components/modal/sale/NewSale.vue'

import { useDashboard } from '@/composables/useDashboard'
import { useFeedback } from '@/composables/useFeedBack'
import api from '@/services/api'

onMounted(() => {
  document.title = 'Dashboard — Estoque Pro'
})

// --- Instância do Composable ---
const {
  summaryQuery,
  topProductsQuery,
  salesByGroupQuery,
  dailySalesQuery,
  withoutSalesQuery,
  lowStockQuery,
  recentSalesQuery,
  revalidarDashboard,
} = useDashboard()

const { erro } = useFeedback()

// --- Helper Functions ---
function brl(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0)
}

function dataBR(dataString) {
  if (!dataString) return '-'
  const data = new Date(dataString)
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(data)
}

// --- Computed Properties Tratadas ---
const atencao = computed(() =>
  Array.isArray(lowStockQuery.data.value) ? lowStockQuery.data.value : [],
)
const maisVendidos = computed(() =>
  Array.isArray(topProductsQuery.data.value) ? topProductsQuery.data.value : [],
)
const semVendas = computed(() =>
  Array.isArray(withoutSalesQuery.data.value) ? withoutSalesQuery.data.value : [],
)

const atividades = computed(() => {
  const listaVendas = Array.isArray(recentSalesQuery.data.value) ? recentSalesQuery.data.value : []
  return listaVendas.map((v) => ({
    id: v.id,
    tipo: 'saida',
    titulo: `Venda ${v.code || String(v.id).slice(0, 8)} · ${v.customer?.name || 'Cliente Avulso'}`,
    data: v.created_at,
    valor: Number(v.total || 0),
    // Mantém o objeto original da venda para poder reabrir o modal em modo de edição
    raw: v,
  }))
})

// --- Estados e Callbacks dos Modais ---
const modalProdutoAberto = ref(false)
const produtoSelecionado = ref(null)
// Evita cliques duplicados enquanto o produto completo é buscado na API
const carregandoProdutoEdicao = ref(false)

const modalVendaAberto = ref(false)
// Quando preenchido, o modal de venda abre em modo edição já com esta venda
// (usado ao clicar num item de "Atividades recentes"). Quando null, o modal
// abre em modo criação normal ("Nova venda").
const vendaEmEdicao = ref(null)

// Ao fechar o modal de venda, sempre volta pro estado de criação limpo
watch(modalVendaAberto, (aberto) => {
  if (!aberto) vendaEmEdicao.value = null
})

// Os endpoints de resumo do dashboard (baixo estoque, mais vendidos) retornam
// apenas um payload enxuto do produto (nome, sku, estoque, grupo) — sem custo,
// preço de venda, estoque mínimo, descrição, etc. Por isso, antes de abrir o
// modal de edição, buscamos o produto completo em /products/{id}.
async function abrirEdicaoProduto(produtoResumido) {
  if (!produtoResumido?.id || carregandoProdutoEdicao.value) return

  carregandoProdutoEdicao.value = true
  try {
    const { data } = await api.get(`/products/${produtoResumido.id}`)
    produtoSelecionado.value = data?.data || data
    modalProdutoAberto.value = true
  } catch (e) {
    erro('Erro ao carregar produto', 'Não foi possível carregar os dados completos do produto.')
  } finally {
    carregandoProdutoEdicao.value = false
  }
}

function abrirModalVenda() {
  vendaEmEdicao.value = null
  modalVendaAberto.value = true
}

function abrirEdicaoVenda(atividade) {
  vendaEmEdicao.value = atividade.raw || atividade
  modalVendaAberto.value = true
}

async function onProdutoSalvo() {
  await revalidarDashboard()
}

async function onVendaSalva() {
  await revalidarDashboard()
}

// --- Configuração dos Gráficos ---
const pontosGraficoDiario = computed(() =>
  Array.isArray(dailySalesQuery.data.value) ? dailySalesQuery.data.value : [],
)

const chartDataVendasCompras = computed(() => {
  return {
    labels: pontosGraficoDiario.value.map((d) => dataBR(d.data)),
    datasets: [
      {
        label: 'Vendas',
        data: pontosGraficoDiario.value.map((d) => Number(d.total || 0)),
        borderColor: '#00BC7D',
        backgroundColor: 'rgba(49, 202, 146, 0.15)',
        fill: true,
        tension: 0.35,
        pointRadius: 2,
        pointHoverRadius: 5,
      },
    ],
  }
})

const chartOptionsVendasCompras = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: {
      display: true,
      position: 'top',
      align: 'end',
      labels: {
        usePointStyle: true,
        pointStyle: 'rectRounded',
        boxWidth: 10,
        boxHeight: 10,
        padding: 16,
        color: '#64748b',
        font: { size: 12 },
      },
    },
    tooltip: {
      callbacks: {
        label: (ctx) => `${ctx.dataset.label}: ${brl(ctx.parsed.y)}`,
      },
    },
  },
  scales: {
    x: { grid: { display: false } },
    y: {
      grid: { color: 'rgba(148,163,184,0.15)' },
      ticks: { callback: (v) => `${v}` },
    },
  },
}

const ALTURA_POR_BARRA = 40
const ALTURA_MINIMA_GRAFICO = 260

const listaGrupos = computed(() =>
  Array.isArray(salesByGroupQuery.data.value) ? salesByGroupQuery.data.value : [],
)

const alturaGraficoGrupo = computed(() =>
  Math.max(ALTURA_MINIMA_GRAFICO, listaGrupos.value.length * ALTURA_POR_BARRA),
)

const chartDataGrupo = computed(() => ({
  labels: listaGrupos.value.map((g) => g.grupo || 'Outros'),
  datasets: [
    {
      label: 'Vendas',
      data: listaGrupos.value.map((g) => Number(g.valor || 0)),
      backgroundColor: '#00BC7D',
      borderRadius: 6,
      barThickness: 22,
    },
  ],
}))

const chartOptionsGrupo = {
  indexAxis: 'y',
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx) => brl(ctx.parsed.x),
      },
    },
  },
  scales: {
    x: { display: false },
    y: { grid: { display: false } },
  },
}
</script>

<template>
  <PageHeader
    titulo="Dashboard"
    descricao="Visão geral do negócio — todos os registros."
    :trilha="[{ titulo: 'Início' }, { titulo: 'Dashboard' }]"
  >
    <template #acoes>
      <Button as-child variant="outline">
        <RouterLink to="/compras/nova"> <ShoppingCart class="size-4" /> Nova compra </RouterLink>
      </Button>
      <Button
        class="bg-emerald-500 text-black hover:bg-emerald-600 cursor-pointer"
        variant="primary"
        @click="abrirModalVenda"
      >
        <Plus class="size-4" /> Nova venda
      </Button>
    </template>
  </PageHeader>

  <div class="space-y-4 p-4 md:space-y-5 md:p-6">
    <div class="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <MetricCard
        rotulo="Vendas de hoje"
        :valor="
          summaryQuery.isLoading.value ? '...' : brl(summaryQuery.data.value?.vendas_hoje?.total)
        "
        :apoio="`${summaryQuery.data.value?.vendas_hoje?.count || 0} vendas registradas`"
        tom="success"
        :icone="Receipt"
      />
      <MetricCard
        rotulo="Total de vendas"
        :valor="
          summaryQuery.isLoading.value ? '...' : brl(summaryQuery.data.value?.total_vendas?.total)
        "
        :apoio="`${summaryQuery.data.value?.total_vendas?.count || 0} vendas no total`"
        tom="success"
        :icone="TrendingUp"
      />
      <MetricCard
        rotulo="Total de compras"
        :valor="
          summaryQuery.isLoading.value ? '...' : brl(summaryQuery.data.value?.total_compras?.total)
        "
        :apoio="`${summaryQuery.data.value?.total_compras?.count || 0} compras no total`"
        tom="info"
        :icone="ShoppingCart"
      />
      <MetricCard
        rotulo="Produtos cadastrados"
        :valor="String(summaryQuery.data.value?.produtos?.total || 0)"
        :apoio="`${summaryQuery.data.value?.produtos?.ativos || 0} ativos`"
        :icone="Package"
      />
      <MetricCard
        rotulo="Estoque baixo"
        :valor="String(summaryQuery.data.value?.produtos?.estoque_baixo || 0)"
        apoio="Atenção recomendada"
        tom="warning"
        :icone="TriangleAlert"
      />
    </div>

    <Section titulo="Precisa da sua atenção" descricao="Produtos com risco de desabastecimento.">
      <template #acoes>
        <Button as-child variant="outline" size="sm">
          <RouterLink to="/compras/nova">Repor estoque</RouterLink>
        </Button>
      </template>

      <ul v-if="atencao.length > 0" class="max-h-72 divide-y divide-border overflow-y-auto">
        <li v-for="p in atencao" :key="p.id">
          <button
            type="button"
            class="grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60 md:px-5 disabled:cursor-wait disabled:opacity-60"
            :disabled="carregandoProdutoEdicao"
            @click="abrirEdicaoProduto(p)"
          >
            <div class="min-w-0">
              <p class="truncate text-sm font-medium">{{ p.name || p.nome }}</p>
              <p class="truncate text-xs text-muted-foreground">
                {{ p.sku || 'Sem SKU' }} · {{ p.group?.name || p.grupo || 'Sem grupo' }} · mínimo
                {{ p.min_stock_quantity || p.minimo || 0 }} un.
              </p>
            </div>
            <StatusPill :tom="(p.stock_quantity ?? p.estoque) <= 0 ? 'danger' : 'warning'">
              {{
                (p.stock_quantity ?? p.estoque) <= 0
                  ? 'Sem estoque'
                  : `${p.stock_quantity ?? p.estoque} un. restantes`
              }}
            </StatusPill>
          </button>
        </li>
      </ul>

      <div
        v-else
        class="flex flex-col items-center justify-center p-6 text-center text-muted-foreground"
      >
        <CheckCircle2 class="mb-2 size-8 text-emerald-500/80" />
        <p class="text-sm font-medium text-foreground">Tudo certo com o estoque!</p>
        <p class="text-xs">Nenhum produto em nível crítico no momento.</p>
      </div>
    </Section>

    <div class="grid gap-4 xl:grid-cols-3">
      <Section
        titulo="Vendas por dia"
        descricao="Movimentação das vendas no período."
        class="xl:col-span-2"
      >
        <div v-if="pontosGraficoDiario.length > 0" class="h-64 p-3 md:h-72 md:p-4">
          <Line :data="chartDataVendasCompras" :options="chartOptionsVendasCompras" />
        </div>
        <div
          v-else
          class="flex h-64 flex-col items-center justify-center p-4 text-center text-muted-foreground md:h-72"
        >
          <BarChart3 class="mb-2 size-8 text-muted-foreground/50" />
          <p class="text-sm font-medium">Sem dados no período</p>
          <p class="text-xs">Registre vendas para visualizar a evolução gráfica do negócio.</p>
        </div>
      </Section>

      <Section titulo="Vendas por grupo" descricao="Participação de cada categoria.">
        <div v-if="listaGrupos.length > 0" class="max-h-72 overflow-y-auto p-3 md:p-4">
          <div :style="{ height: alturaGraficoGrupo + 'px' }">
            <Bar :data="chartDataGrupo" :options="chartOptionsGrupo" />
          </div>
        </div>
        <div
          v-else
          class="flex h-64 flex-col items-center justify-center p-4 text-center text-muted-foreground md:h-72"
        >
          <BarChart3 class="mb-2 size-8 text-muted-foreground/50" />
          <p class="text-sm font-medium">Nenhum grupo com vendas</p>
          <p class="text-xs">O comparativo aparecerá assim que houverem registros.</p>
        </div>
      </Section>
    </div>

    <div class="grid gap-4 lg:grid-cols-2">
      <Section titulo="Mais vendidos (30 dias)">
        <template #acoes>
          <Button as-child variant="ghost" size="sm">
            <RouterLink to="/relatorios">Ver relatório</RouterLink>
          </Button>
        </template>

        <ul v-if="maisVendidos.length > 0" class="max-h-72 divide-y divide-border overflow-y-auto">
          <li v-for="(item, i) in maisVendidos" :key="item.product_id || i">
            <button
              type="button"
              class="grid w-full cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60 md:px-5 disabled:cursor-wait disabled:opacity-60"
              :disabled="carregandoProdutoEdicao"
              @click="item.product && abrirEdicaoProduto(item.product)"
            >
              <span
                class="grid size-6 place-items-center rounded-md bg-muted text-xs font-semibold"
              >
                {{ i + 1 }}
              </span>
              <div class="min-w-0">
                <p class="truncate text-sm font-medium">
                  {{ item.product?.name || item.nome || 'Produto' }}
                </p>
                <p class="truncate text-xs text-muted-foreground">
                  {{ item.product?.group?.name || item.grupo || 'Geral' }}
                </p>
              </div>
              <span class="text-sm font-semibold"
                >{{ item.total_quantity || item.vendidos30d || 0 }} un.</span
              >
            </button>
          </li>
        </ul>

        <div
          v-else
          class="flex flex-col items-center justify-center p-8 text-center text-muted-foreground"
        >
          <Inbox class="mb-2 size-8 text-muted-foreground/50" />
          <p class="text-sm font-medium">Nenhum produto em destaque</p>
          <p class="text-xs">Não foram encontradas vendas nos últimos 30 dias.</p>
        </div>
      </Section>

      <Section titulo="Atividades recentes" descricao="Últimas movimentações de estoque.">
        <ul v-if="atividades.length > 0" class="max-h-72 divide-y divide-border overflow-y-auto">
          <li v-for="a in atividades" :key="`${a.tipo}-${a.id}`">
            <button
              type="button"
              class="grid w-full cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60 md:px-5"
              @click="abrirEdicaoVenda(a)"
            >
              <span class="grid size-7 place-items-center rounded-lg bg-primary/15 text-primary">
                <ArrowUpRight class="size-4" aria-hidden="true" />
              </span>
              <div class="min-w-0">
                <p class="truncate text-sm font-medium">{{ a.titulo }}</p>
                <p class="text-xs text-muted-foreground">{{ dataBR(a.data) }} · saída de estoque</p>
              </div>
              <span class="text-sm font-semibold">{{ brl(a.valor) }}</span>
            </button>
          </li>
        </ul>

        <div
          v-else
          class="flex flex-col items-center justify-center p-8 text-center text-muted-foreground"
        >
          <Inbox class="mb-2 size-8 text-muted-foreground/50" />
          <p class="text-sm font-medium">Sem atividades recentes</p>
          <p class="text-xs">Nenhuma venda ou movimentação recente cadastrada.</p>
        </div>
      </Section>
    </div>

    <Section titulo="Produtos ativos sem vendas nos últimos 30 dias">
      <div class="flex flex-wrap gap-2 p-4 md:p-5">
        <StatusPill v-if="semVendas.length > 0" v-for="p in semVendas" :key="p.id" tom="neutral">
          {{ p.name || p.nome }} · {{ p.stock_quantity ?? p.estoque ?? 0 }} un.
        </StatusPill>

        <p v-else class="text-sm text-muted-foreground">
          Todos os produtos ativos registraram vendas no período.
        </p>
      </div>
    </Section>
  </div>

  <NewProduct
    v-model:open="modalProdutoAberto"
    :produto="produtoSelecionado"
    @salvo="onProdutoSalvo"
  />

  <NewSale v-model:open="modalVendaAberto" :sale="vendaEmEdicao" @salvo="onVendaSalva" />
</template>
