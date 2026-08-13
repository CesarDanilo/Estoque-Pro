<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { Line, Bar } from 'vue-chartjs'
import {
  ArrowUpRight,
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

// --- Helper Functions ---
function brl(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0)
}

function dataBR(dataString) {
  if (!dataString) return ''
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
  }))
})

function rotaAtividade(a) {
  return a.tipo === 'saida' ? `/vendas/${a.id}` : `/compras/${a.id}`
}

// --- Estados e Callbacks dos Modais ---
const modalProdutoAberto = ref(false)
const produtoSelecionado = ref(null)
const modalVendaAberto = ref(false)

function abrirEdicaoProduto(produto) {
  produtoSelecionado.value = produto
  modalProdutoAberto.value = true
}

function abrirModalVenda() {
  modalVendaAberto.value = true
}

async function onProdutoSalvo() {
  await revalidarDashboard()
}

async function onVendaSalva() {
  await revalidarDashboard()
}

// --- Configuração dos Gráficos ---
const chartDataVendasCompras = computed(() => {
  const pontos = Array.isArray(dailySalesQuery.data.value) ? dailySalesQuery.data.value : []
  return {
    labels: pontos.map((d) => dataBR(d.data)),
    datasets: [
      {
        label: 'Vendas',
        data: pontos.map((d) => Number(d.total || 0)),
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
        :valor="brl(0)"
        apoio="0 compras no total"
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

    <Section
      v-if="atencao.length > 0"
      titulo="Precisa da sua atenção"
      descricao="Produtos que podem faltar para as próximas vendas."
    >
      <template #acoes>
        <Button as-child variant="outline" size="sm">
          <RouterLink to="/compras/nova">Repor estoque</RouterLink>
        </Button>
      </template>

      <ul class="max-h-72 divide-y divide-border overflow-y-auto">
        <li v-for="p in atencao" :key="p.id">
          <button
            type="button"
            class="grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60 md:px-5"
            @click="abrirEdicaoProduto(p)"
          >
            <div class="min-w-0">
              <p class="truncate text-sm font-medium">{{ p.name || p.nome }}</p>
              <p class="truncate text-xs text-muted-foreground">
                {{ p.sku }} · {{ p.group?.name || p.grupo || 'Sem grupo' }} · mínimo
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
    </Section>

    <div class="grid gap-4 xl:grid-cols-3">
      <Section
        titulo="Vendas por dia"
        descricao="Movimentação das vendas no período."
        class="xl:col-span-2"
      >
        <div class="h-64 p-3 md:h-72 md:p-4">
          <Line :data="chartDataVendasCompras" :options="chartOptionsVendasCompras" />
        </div>
      </Section>

      <Section titulo="Vendas por grupo" descricao="Participação de cada categoria.">
        <div class="max-h-72 overflow-y-auto p-3 md:p-4">
          <div :style="{ height: alturaGraficoGrupo + 'px' }">
            <Bar :data="chartDataGrupo" :options="chartOptionsGrupo" />
          </div>
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

        <ul class="max-h-72 divide-y divide-border overflow-y-auto">
          <li v-if="maisVendidos.length === 0" class="p-4 text-sm text-muted-foreground">
            Nenhuma venda registrada nos últimos 30 dias.
          </li>
          <li v-for="(item, i) in maisVendidos" :key="item.product_id || i">
            <button
              type="button"
              class="grid w-full cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60 md:px-5"
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
      </Section>

      <Section titulo="Atividades recentes" descricao="Últimas movimentações de estoque.">
        <ul class="max-h-72 divide-y divide-border overflow-y-auto">
          <li v-if="atividades.length === 0" class="p-4 text-sm text-muted-foreground">
            Nenhuma atividade recente encontrada.
          </li>
          <li v-for="a in atividades" :key="`${a.tipo}-${a.id}`">
            <RouterLink
              :to="rotaAtividade(a)"
              class="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/60 md:px-5"
            >
              <span class="grid size-7 place-items-center rounded-lg bg-primary/15 text-primary">
                <ArrowUpRight class="size-4" aria-hidden="true" />
              </span>
              <div class="min-w-0">
                <p class="truncate text-sm font-medium">{{ a.titulo }}</p>
                <p class="text-xs text-muted-foreground">{{ dataBR(a.data) }} · saída de estoque</p>
              </div>
              <span class="text-sm font-semibold">{{ brl(a.valor) }}</span>
            </RouterLink>
          </li>
        </ul>
      </Section>
    </div>

    <Section titulo="Produtos ativos sem vendas nos últimos 30 dias">
      <div class="flex flex-wrap gap-2 p-4 md:p-5">
        <p v-if="semVendas.length === 0" class="text-sm text-muted-foreground">
          Todos os produtos ativos tiveram vendas no período.
        </p>
        <StatusPill v-else v-for="p in semVendas" :key="p.id" tom="neutral">
          {{ p.name || p.nome }} · {{ p.stock_quantity ?? p.estoque ?? 0 }} un.
        </StatusPill>
      </div>
    </Section>
  </div>

  <NewProduct
    v-model:open="modalProdutoAberto"
    :produto="produtoSelecionado"
    @salvo="onProdutoSalvo"
  />

  <NewSale v-model:open="modalVendaAberto" @salvo="onVendaSalva" />
</template>
