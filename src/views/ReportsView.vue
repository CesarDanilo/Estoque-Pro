<script setup>
import { ref, computed } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import {
  RefreshCw,
  Download,
  TrendingUp,
  ShoppingCart,
  Package,
  Users,
  Search,
} from 'lucide-vue-next'

// Vue Chart.js e Chart.js
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  ArcElement,
  PointElement,
  LineElement,
  Filler,
} from 'chart.js'
import { Bar, Doughnut, Line } from 'vue-chartjs'

import {
  useSalesReport,
  usePurchasesReport,
  useProductsReport,
  usePeopleReport,
} from '@/composables/useReports'

// Registrando módulos do Chart.js
ChartJS.register(
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  ArcElement,
  PointElement,
  LineElement,
  Filler,
)

const queryClient = useQueryClient()

// Estados principais
const activeTab = ref('vendas')
const selectedPeriod = ref('7d')

// Filtros internos
const searchProductSales = ref('')
const searchProductPurchases = ref('')

// Queries do TanStack Query
const salesQuery = useSalesReport(selectedPeriod)
const purchasesQuery = usePurchasesReport(selectedPeriod)
const productsQuery = useProductsReport()
const peopleQuery = usePeopleReport(selectedPeriod)

// Helpers de formatação
const formatCurrency = (val) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(val || 0)
}

const handleRefresh = () => {
  queryClient.invalidateQueries({ queryKey: ['reports'] })
}

// Filtros de busca
const filteredTopProducts = computed(() => {
  const list = salesQuery.data.value?.produtos_mais_vendidos || []
  if (!searchProductSales.value) return list
  return list.filter((p) => p.name.toLowerCase().includes(searchProductSales.value.toLowerCase()))
})

const filteredReplenishProducts = computed(() => {
  const list = purchasesQuery.data.value?.produtos_reposicao || []
  if (!searchProductPurchases.value) return list
  return list.filter((p) =>
    p.name.toLowerCase().includes(searchProductPurchases.value.toLowerCase()),
  )
})

// ==========================================
// CONFIGURAÇÕES DOS GRÁFICOS (CHART.JS)
// ==========================================

// 1. Vendas por Dia
const salesLineChartData = computed(() => {
  const rawData = salesQuery.data.value?.vendas_por_dia?.chart || []
  return {
    labels: rawData.map((item) => item.data),
    datasets: [
      {
        label: 'Vendas (R$)',
        data: rawData.map((item) => item.valor),
        borderColor: '#10b981',
        backgroundColor: (context) => {
          const chart = context.chart
          const { ctx, chartArea } = chart
          if (!chartArea) return 'rgba(16, 185, 129, 0.2)'
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
          gradient.addColorStop(0, 'rgba(16, 185, 129, 0.35)')
          gradient.addColorStop(1, 'rgba(16, 185, 129, 0.02)')
          return gradient
        },
        fill: true,
        tension: 0.4,
        borderWidth: 2.5,
        pointBackgroundColor: '#10b981',
        pointBorderColor: '#09090b',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  }
})

const lineChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#18181b',
      titleColor: '#ffffff',
      bodyColor: '#10b981',
      borderColor: '#27272a',
      borderWidth: 1,
      padding: 10,
      displayColors: false,
      callbacks: {
        label: (context) => `Valor: ${formatCurrency(context.raw)}`,
      },
    },
  },
  scales: {
    x: {
      grid: { color: '#27272a33' },
      ticks: { color: '#a1a1aa', font: { size: 11 } },
    },
    y: {
      grid: { color: '#27272a88' },
      ticks: {
        color: '#a1a1aa',
        font: { size: 11 },
        callback: (value) => (value >= 1000 ? `${value / 1000}k` : value),
      },
    },
  },
}

// 2. Vendas por Grupo (Largura Total)
const salesByGroupChartData = computed(() => {
  const rawData = salesQuery.data.value?.vendas_por_grupo || []
  return {
    labels: rawData.map((item) => item.grupo),
    datasets: [
      {
        label: 'Total',
        data: rawData.map((item) => item.total),
        backgroundColor: '#10b981',
        borderRadius: 4,
        barThickness: 36,
      },
    ],
  }
})

const verticalBarOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { display: false }, ticks: { color: '#a1a1aa', font: { size: 11 } } },
    y: { grid: { color: '#27272a' }, ticks: { color: '#a1a1aa', font: { size: 11 } } },
  },
}

// 3. Compras por Fornecedor (Largura Total)
const purchasesSupplierChartData = computed(() => {
  const rawData = purchasesQuery.data.value?.compras_por_fornecedor || []
  return {
    labels: rawData.map((item) => item.fornecedor),
    datasets: [
      {
        label: 'Total Comprado',
        data: rawData.map((item) => item.total),
        backgroundColor: '#3b82f6',
        borderRadius: 4,
        barThickness: 24,
      },
    ],
  }
})

const horizontalBarOptions = {
  indexAxis: 'y',
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { color: '#27272a' }, ticks: { color: '#a1a1aa', font: { size: 11 } } },
    y: { grid: { display: false }, ticks: { color: '#a1a1aa', font: { size: 11 } } },
  },
}

// 4. Produtos por Grupo (Cores Variadas)
const productsGroupChartData = computed(() => {
  const rawData = productsQuery.data.value?.produtos_por_grupo || []
  return {
    labels: rawData.map((item) => item.grupo),
    datasets: [
      {
        data: rawData.map((item) => item.quantidade),
        backgroundColor: [
          '#10b981',
          '#3b82f6',
          '#f59e0b',
          '#8b5cf6',
          '#ec4899',
          '#06b6d4',
          '#84cc16',
        ],
        borderWidth: 0,
      },
    ],
  }
})

// 5. Situação do Estoque (Donut)
const stockDoughnutData = computed(() => {
  const stock = productsQuery.data.value?.situacao_estoque || {
    normal: 0,
    baixo: 0,
    sem_estoque: 0,
  }
  return {
    labels: ['Normal', 'Baixo', 'Sem Estoque'],
    datasets: [
      {
        backgroundColor: ['#10b981', '#f59e0b', '#f43f5e'],
        borderWidth: 0,
        data: [stock.normal, stock.baixo, stock.sem_estoque],
      },
    ],
  }
})

// 6. Pessoas por Grupo (Protegido com Array.isArray)
const peopleGroupChartData = computed(() => {
  const rawData = peopleQuery.data.value?.pessoas_por_grupo
  const safeData = Array.isArray(rawData) ? rawData : []
  return {
    labels: safeData.map((item) => item.grupo),
    datasets: [
      {
        data: safeData.map((item) => item.quantidade),
        backgroundColor: '#8b5cf6',
        borderRadius: 4,
        barThickness: 28,
      },
    ],
  }
})

// 7. Pessoas por Faixa Etária (Protegido com Array.isArray)
const peopleAgeChartData = computed(() => {
  const rawData = peopleQuery.data.value?.pessoas_por_faixa_etaria
  const safeData = Array.isArray(rawData) ? rawData : []
  return {
    labels: safeData.map((item) => item.faixa),
    datasets: [
      {
        data: safeData.map((item) => item.quantidade),
        backgroundColor: '#06b6d4',
        borderRadius: 4,
        barThickness: 28,
      },
    ],
  }
})

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'right',
      labels: { color: '#f4f4f5', font: { size: 11 }, boxWidth: 12, padding: 12 },
    },
  },
  cutout: '70%',
}
</script>

<template>
  <div class="min-h-screen bg-[#09090b] text-[#f4f4f5] p-6 font-sans">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
      <div>
        <p class="text-xs text-[#a1a1aa] font-medium tracking-wide">Análise / Relatórios</p>
        <h1 class="text-2xl font-bold tracking-tight text-white mt-1">Relatórios</h1>
        <p class="text-sm text-[#a1a1aa] mt-0.5">
          Escolha um tema e o período para analisar os resultados do negócio.
        </p>
      </div>

      <div class="flex items-center gap-3">
        <select
          v-model="selectedPeriod"
          class="bg-[#18181b] border border-[#27272a] text-xs font-medium rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#10b981] transition cursor-pointer"
        >
          <option value="7d">Últimos 7 dias</option>
          <option value="30d">Últimos 30 dias</option>
          <option value="90d">Últimos 90 dias</option>
        </select>

        <button
          @click="handleRefresh"
          class="bg-[#10b981] hover:bg-[#059669] text-black font-semibold text-xs px-3.5 py-2 rounded-lg flex items-center gap-2 transition cursor-pointer"
        >
          <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': salesQuery.isFetching.value }" />
          <span>Atualizar</span>
        </button>

        <button
          class="bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] text-white font-medium text-xs px-3.5 py-2 rounded-lg flex items-center gap-2 transition cursor-pointer"
        >
          <Download class="w-3.5 h-3.5 text-[#a1a1aa]" />
          <span>Exportar</span>
        </button>
      </div>
    </div>

    <div class="bg-[#18181b] p-1 rounded-xl border border-[#27272a] grid grid-cols-4 gap-1 mb-6">
      <button
        v-for="tab in [
          { id: 'vendas', label: 'Vendas', icon: TrendingUp },
          { id: 'compras', label: 'Compras', icon: ShoppingCart },
          { id: 'produtos', label: 'Produtos', icon: Package },
          { id: 'pessoas', label: 'Pessoas', icon: Users },
        ]"
        :key="tab.id"
        @click="activeTab = tab.id"
        :class="[
          'flex items-center justify-center gap-2 py-2.5 text-xs font-medium rounded-lg transition cursor-pointer select-none',
          activeTab === tab.id
            ? 'bg-[#27272a] text-white shadow-sm font-semibold'
            : 'text-[#a1a1aa] hover:text-white hover:bg-[#27272a]/50',
        ]"
      >
        <component :is="tab.icon" class="w-4 h-4" />
        <span>{{ tab.label }}</span>
      </button>
    </div>

    <div v-if="activeTab === 'vendas'" class="space-y-6">
      <div v-if="salesQuery.isLoading.value" class="text-[#a1a1aa] py-12 text-center text-xs">
        Carregando relatórios de vendas...
      </div>

      <template v-else-if="salesQuery.data.value">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="bg-[#18181b] p-4 rounded-xl border border-[#27272a]">
            <span class="text-xs text-[#a1a1aa] font-medium">Faturamento</span>
            <p class="text-2xl font-bold mt-1 text-white">
              {{ formatCurrency(salesQuery.data.value.cards.faturamento) }}
            </p>
          </div>

          <div class="bg-[#18181b] p-4 rounded-xl border border-[#27272a]">
            <span class="text-xs text-[#a1a1aa] font-medium">Vendas realizadas</span>
            <p class="text-2xl font-bold mt-1 text-white">
              {{ salesQuery.data.value.cards.vendas_realizadas }}
            </p>
          </div>

          <div class="bg-[#18181b] p-4 rounded-xl border border-[#27272a]">
            <span class="text-xs text-[#a1a1aa] font-medium">Itens vendidos</span>
            <p class="text-2xl font-bold mt-1 text-white">
              {{ salesQuery.data.value.cards.itens_vendidos || 0 }}
            </p>
          </div>

          <div class="bg-[#18181b] p-4 rounded-xl border border-[#27272a]">
            <span class="text-xs text-[#a1a1aa] font-medium">Produtos sem vendas</span>
            <p class="text-2xl font-bold mt-1 text-white">
              {{ salesQuery.data.value.cards.produtos_sem_vendas }}
            </p>
          </div>
        </div>

        <div class="bg-[#18181b] p-5 rounded-xl border border-[#27272a]">
          <div class="mb-4">
            <h3 class="text-sm font-semibold text-white">Vendas por dia</h3>
            <p class="text-xs text-[#a1a1aa]">
              Evolução do faturamento no período, com destaque para os extremos.
            </p>
          </div>

          <div class="h-64 w-full">
            <Line :data="salesLineChartData" :options="lineChartOptions" />
          </div>
        </div>

        <div class="bg-[#18181b] p-5 rounded-xl border border-[#27272a]">
          <h3 class="text-sm font-semibold text-white">Vendas por grupo</h3>
          <p class="text-xs text-[#a1a1aa] mb-4">
            {{ salesQuery.data.value.vendas_por_grupo?.length || 0 }} grupos no período
          </p>

          <div class="h-72 w-full">
            <Bar :data="salesByGroupChartData" :options="verticalBarOptions" />
          </div>
        </div>

        <div class="bg-[#18181b] p-5 rounded-xl border border-[#27272a]">
          <div class="flex items-center justify-between mb-3">
            <div>
              <h3 class="text-sm font-semibold text-white">Produtos mais vendidos</h3>
              <p class="text-xs text-[#a1a1aa]">
                Mostrando {{ filteredTopProducts.length }} de
                {{ salesQuery.data.value.produtos_mais_vendidos.length }}
              </p>
            </div>
          </div>

          <div class="relative mb-4">
            <Search class="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#a1a1aa]" />
            <input
              v-model="searchProductSales"
              type="text"
              placeholder="Buscar produto..."
              class="w-full bg-[#09090b] border border-[#27272a] rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-[#71717a] focus:outline-none focus:ring-1 focus:ring-[#10b981]"
            />
          </div>

          <div class="space-y-2 max-h-[300px] overflow-y-auto pr-1.5 custom-scrollbar">
            <div
              v-for="(prod, index) in filteredTopProducts"
              :key="prod.id"
              class="flex items-center justify-between p-2.5 rounded-lg bg-[#09090b]/60 border border-[#27272a]/40 hover:bg-[#27272a]/40 transition"
            >
              <div class="flex items-center gap-3 min-w-0">
                <span
                  class="w-5 h-5 rounded-full bg-[#27272a] text-[#10b981] font-bold text-[10px] flex items-center justify-center shrink-0"
                >
                  {{ index + 1 }}
                </span>
                <span class="text-xs font-medium text-white truncate">{{ prod.name }}</span>
              </div>
              <span class="text-xs font-bold text-[#10b981] shrink-0 ml-2"
                >{{ prod.quantidade }} un.</span
              >
            </div>
          </div>
        </div>
      </template>
    </div>

    <div v-if="activeTab === 'compras'" class="space-y-6">
      <div v-if="purchasesQuery.isLoading.value" class="text-[#a1a1aa] py-12 text-center text-xs">
        Carregando relatórios de compras...
      </div>

      <template v-else-if="purchasesQuery.data.value">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="bg-[#18181b] p-4 rounded-xl border border-[#27272a]">
            <span class="text-xs text-[#a1a1aa] font-medium">Total comprado</span>
            <p class="text-2xl font-bold mt-1 text-white">
              {{ formatCurrency(purchasesQuery.data.value.cards.total_comprado) }}
            </p>
          </div>

          <div class="bg-[#18181b] p-4 rounded-xl border border-[#27272a]">
            <span class="text-xs text-[#a1a1aa] font-medium">Compras no período</span>
            <p class="text-2xl font-bold mt-1 text-white">
              {{ purchasesQuery.data.value.cards.compras_no_periodo }}
            </p>
          </div>

          <div class="bg-[#18181b] p-4 rounded-xl border border-[#27272a]">
            <span class="text-xs text-[#a1a1aa] font-medium">Produtos a repor</span>
            <p class="text-2xl font-bold mt-1 text-white">
              {{ purchasesQuery.data.value.cards.produtos_a_repor }}
            </p>
          </div>
        </div>

        <div class="bg-[#18181b] p-5 rounded-xl border border-[#27272a]">
          <h3 class="text-sm font-semibold text-white">Compras por fornecedor</h3>
          <p class="text-xs text-[#a1a1aa] mb-4">
            {{ purchasesQuery.data.value.compras_por_fornecedor?.length || 0 }} fornecedores no
            período
          </p>

          <div class="h-72 w-full">
            <Bar :data="purchasesSupplierChartData" :options="horizontalBarOptions" />
          </div>
        </div>

        <div class="bg-[#18181b] p-5 rounded-xl border border-[#27272a]">
          <h3 class="text-sm font-semibold text-white">
            Produtos vendidos que precisam de reposição
          </h3>
          <p class="text-xs text-[#a1a1aa] mb-4">Clique em um produto para editar o cadastro.</p>

          <div class="relative mb-4">
            <Search class="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#a1a1aa]" />
            <input
              v-model="searchProductPurchases"
              type="text"
              placeholder="Buscar produto..."
              class="w-full bg-[#09090b] border border-[#27272a] rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-[#71717a] focus:outline-none focus:ring-1 focus:ring-[#10b981]"
            />
          </div>

          <div class="space-y-2 max-h-[320px] overflow-y-auto pr-1.5 custom-scrollbar">
            <div
              v-for="prod in filteredReplenishProducts"
              :key="prod.id"
              class="flex items-center justify-between p-3 rounded-lg bg-[#09090b] border border-[#27272a]/60 hover:border-[#27272a] transition cursor-pointer"
            >
              <div>
                <p class="text-xs font-semibold text-white">{{ prod.name }}</p>
                <p class="text-[11px] text-[#a1a1aa]">Mínimo: {{ prod.min_stock_quantity }} un.</p>
              </div>

              <span
                :class="[
                  'text-[11px] font-bold px-2.5 py-1 rounded-full cursor-pointer',
                  prod.stock_quantity <= 0
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
                ]"
              >
                {{ prod.status_label }}
              </span>
            </div>
          </div>
        </div>
      </template>
    </div>

    <div v-if="activeTab === 'produtos'" class="space-y-6">
      <div v-if="productsQuery.isLoading.value" class="text-[#a1a1aa] py-12 text-center text-xs">
        Carregando relatórios de produtos...
      </div>

      <template v-else-if="productsQuery.data.value">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="bg-[#18181b] p-5 rounded-xl border border-[#27272a]">
            <h3 class="text-sm font-semibold text-white">Produtos por grupo</h3>
            <p class="text-xs text-[#a1a1aa] mb-4">Distribuição percentual por grupo cadastrado.</p>

            <div class="h-60 w-full flex items-center justify-center">
              <Doughnut :data="productsGroupChartData" :options="doughnutOptions" />
            </div>
          </div>

          <div class="bg-[#18181b] p-5 rounded-xl border border-[#27272a]">
            <h3 class="text-sm font-semibold text-white mb-2">Situação do estoque</h3>
            <p class="text-xs text-[#a1a1aa] mb-4">Métricas de níveis de estoque atual.</p>

            <div class="h-60 w-full flex items-center justify-center">
              <Doughnut :data="stockDoughnutData" :options="doughnutOptions" />
            </div>
          </div>
        </div>
      </template>
    </div>

    <div v-if="activeTab === 'pessoas'" class="space-y-6">
      <div v-if="peopleQuery.isLoading.value" class="text-[#a1a1aa] py-12 text-center text-xs">
        Carregando relatórios de pessoas...
      </div>

      <template v-else-if="peopleQuery.data.value">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="bg-[#18181b] p-5 rounded-xl border border-[#27272a]">
            <h3 class="text-sm font-semibold text-white mb-4">Pessoas por grupo</h3>
            <div class="h-60 w-full">
              <Bar :data="peopleGroupChartData" :options="verticalBarOptions" />
            </div>
          </div>

          <div class="bg-[#18181b] p-5 rounded-xl border border-[#27272a]">
            <h3 class="text-sm font-semibold text-white mb-4">Pessoas por faixa etária</h3>
            <div class="h-60 w-full">
              <Bar :data="peopleAgeChartData" :options="verticalBarOptions" />
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: #09090b;
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #27272a;
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #3f3f46;
}
</style>
