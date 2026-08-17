<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import {
  RefreshCw,
  TrendingUp,
  ShoppingCart,
  Package,
  Users,
  Search,
  Calendar as CalendarIcon,
  X,
  Sun,
  Moon,
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
import ChartDataLabels from 'chartjs-plugin-datalabels'

import {
  useSalesReport,
  usePurchasesReport,
  useProductsReport,
  usePeopleReport,
} from '@/composables/useReports'

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
  ChartDataLabels,
)

const queryClient = useQueryClient()

// --- CONTROLE DE TEMA (DARK / LIGHT) ---
const isDark = ref(false)

const toggleTheme = () => {
  isDark.value = !isDark.value
  if (isDark.value) {
    document.documentElement.classList.add('dark')
    localStorage.setItem('theme', 'dark')
  } else {
    document.documentElement.classList.remove('dark')
    localStorage.setItem('theme', 'light')
  }
}

// Detecta preferência salva ou do sistema ao montar
onMounted(() => {
  document.addEventListener('click', handleClickOutside)

  const savedTheme = localStorage.getItem('theme')
  if (
    savedTheme === 'dark' ||
    (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)
  ) {
    isDark.value = true
    document.documentElement.classList.add('dark')
  } else {
    isDark.value = false
    document.documentElement.classList.remove('dark')
  }
})

// --- ESTADOS E FILTROS ---
const activeTab = ref('vendas')
const filtroDataAberto = ref(false)
const dataFiltroRef = ref(null)

const tipoData = ref('7d')
const dataUnica = ref('')
const dataInicio = ref('')
const dataFim = ref('')

const presetsData = [
  { valor: '7d', rotulo: 'Últimos 7 dias' },
  { valor: '30d', rotulo: 'Últimos 30 dias' },
  { valor: '90d', rotulo: 'Últimos 90 dias' },
  { valor: 'este_mes', rotulo: 'Este mês' },
  { valor: 'mes_anterior', rotulo: 'Mês anterior' },
]

const handleClickOutside = (event) => {
  if (dataFiltroRef.value && !dataFiltroRef.value.contains(event.target)) {
    filtroDataAberto.value = false
  }
}

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

const selecionarPreset = (valor) => {
  tipoData.value = valor
  dataUnica.value = ''
  dataInicio.value = ''
  dataFim.value = ''
}

const selecionarModoPersonalizado = (modo) => {
  tipoData.value = modo
}

const limparFiltroData = () => {
  tipoData.value = '7d'
  dataUnica.value = ''
  dataInicio.value = ''
  dataFim.value = ''
  filtroDataAberto.value = false
}

const rotuloFiltroData = computed(() => {
  if (tipoData.value === 'personalizado_dia' && dataUnica.value) {
    return `Dia: ${dataUnica.value.split('-').reverse().join('/')}`
  }
  if (tipoData.value === 'personalizado_periodo' && dataInicio.value && dataFim.value) {
    const inicio = dataInicio.value.split('-').reverse().join('/')
    const fim = dataFim.value.split('-').reverse().join('/')
    return `${inicio} - ${fim}`
  }
  const presetEncontrado = presetsData.find((p) => p.valor === tipoData.value)
  return presetEncontrado ? presetEncontrado.rotulo : 'Filtrar período'
})

const selectedPeriod = computed(() => {
  if (tipoData.value === 'personalizado_dia') {
    return { period: 'personalizado', tipo: 'dia', data: dataUnica.value }
  }
  if (tipoData.value === 'personalizado_periodo') {
    return {
      period: 'personalizado',
      tipo: 'periodo',
      inicio: dataInicio.value,
      fim: dataFim.value,
    }
  }
  return { period: tipoData.value }
})

const searchProductSales = ref('')
const searchProductPurchases = ref('')
const searchProductGroups = ref('')

const salesQuery = useSalesReport(selectedPeriod)
const purchasesQuery = usePurchasesReport(selectedPeriod)
const productsQuery = useProductsReport()
const peopleQuery = usePeopleReport(selectedPeriod)

const formatCurrency = (val) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(val || 0)
}

// -----------------------------------------------------------------------
// 🔴 AQUI: formatter compacto pra rótulos fixos não estourarem o gráfico
// em valores grandes (ex: R$ 12.450,00 -> R$ 12,5k). Usado só nos labels
// fixos; tooltip e cards continuam com o valor completo via formatCurrency.
// -----------------------------------------------------------------------
const formatCurrencyCompact = (val) => {
  const num = val || 0
  if (Math.abs(num) >= 1000) {
    return `R$ ${(num / 1000).toFixed(1).replace('.', ',')}k`
  }
  return formatCurrency(num)
}

const handleRefresh = () => {
  queryClient.invalidateQueries({ queryKey: ['reports'] })
}

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
// CONFIGURAÇÕES DOS GRÁFICOS (DINÂMICAS)
// ==========================================

// Cores dinâmicas dos gráficos baseadas no tema ativo
const chartTextColor = computed(() => (isDark.value ? '#a1a1aa' : '#71717a'))
const chartGridColor = computed(() => (isDark.value ? '#27272a' : '#e4e4e7'))

// -----------------------------------------------------------------------
// 🔴 AQUI: cor dos rótulos fixos (datalabels) sobre elementos "sólidos"
// (barras coloridas, fatias do doughnut) — precisa de contraste forte,
// então usamos branco/quase-preto fixo, não a cor de texto do tema.
// -----------------------------------------------------------------------
const datalabelColorOnSolid = '#ffffff'
const datalabelColorOnLight = computed(() => (isDark.value ? '#f4f4f5' : '#09090b'))

// -----------------------------------------------------------------------
// 🔴 AQUI: geração de cor DETERMINÍSTICA por nome do grupo (hash), em vez
// de um array fixo de 7 cores. Funciona igual com 7, 100 ou 1000 grupos:
// nunca "acaba", e o mesmo grupo sempre recebe a mesma cor, independente
// da ordem em que a API retornar os dados.
// -----------------------------------------------------------------------
function hashString(str) {
  let hash = 0
  const texto = String(str || '')
  for (let i = 0; i < texto.length; i++) {
    hash = texto.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash)
}

function corPorNome(nome) {
  const matiz = hashString(nome) % 360
  const saturacao = 65
  const luminosidade = isDark.value ? 58 : 45
  return `hsl(${matiz}, ${saturacao}%, ${luminosidade}%)`
}

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
          gradient.addColorStop(
            0,
            isDark.value ? 'rgba(16, 185, 129, 0.35)' : 'rgba(16, 185, 129, 0.2)',
          )
          gradient.addColorStop(1, 'rgba(16, 185, 129, 0.01)')
          return gradient
        },
        fill: true,
        tension: 0.4,
        borderWidth: 2.5,
        pointBackgroundColor: '#10b981',
        pointBorderColor: isDark.value ? '#09090b' : '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  }
})

const lineChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  layout: {
    padding: { top: 24 },
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: isDark.value ? '#18181b' : '#ffffff',
      titleColor: isDark.value ? '#ffffff' : '#09090b',
      bodyColor: '#10b981',
      borderColor: isDark.value ? '#27272a' : '#e4e4e7',
      borderWidth: 1,
      padding: 10,
      displayColors: false,
      callbacks: {
        label: (context) => `Valor: ${formatCurrency(context.raw)}`,
      },
    },
    // 🔴 AQUI: valores fixos acima de cada ponto da linha
    datalabels: {
      display: true,
      color: '#10b981',
      anchor: 'end',
      align: 'top',
      offset: 6,
      font: { size: 10, weight: 'bold' },
      formatter: (value) => formatCurrencyCompact(value),
    },
  },
  scales: {
    x: {
      grid: { color: chartGridColor.value },
      ticks: { color: chartTextColor.value, font: { size: 11 } },
    },
    y: {
      grid: { color: chartGridColor.value },
      ticks: {
        color: chartTextColor.value,
        font: { size: 11 },
        callback: (value) => (value >= 1000 ? `${value / 1000}k` : value),
      },
    },
  },
}))

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

const verticalBarOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  layout: {
    padding: { top: 24 },
  },
  plugins: {
    legend: { display: false },
    // 🔴 AQUI: valor fixo em cima de cada barra vertical
    datalabels: {
      display: true,
      color: datalabelColorOnLight.value,
      anchor: 'end',
      align: 'top',
      offset: 4,
      font: { size: 10, weight: 'bold' },
      formatter: (value) => value,
    },
  },
  scales: {
    x: { grid: { display: false }, ticks: { color: chartTextColor.value, font: { size: 11 } } },
    y: {
      grid: { color: chartGridColor.value },
      ticks: { color: chartTextColor.value, font: { size: 11 } },
    },
  },
}))

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

const horizontalBarOptions = computed(() => ({
  indexAxis: 'y',
  responsive: true,
  maintainAspectRatio: false,
  layout: {
    padding: { right: 48 },
  },
  plugins: {
    legend: { display: false },
    // 🔴 AQUI: valor fixo ao final de cada barra horizontal
    datalabels: {
      display: true,
      color: datalabelColorOnLight.value,
      anchor: 'end',
      align: 'right',
      offset: 4,
      font: { size: 10, weight: 'bold' },
      formatter: (value) => value,
    },
  },
  scales: {
    x: {
      grid: { color: chartGridColor.value },
      ticks: { color: chartTextColor.value, font: { size: 11 } },
    },
    y: { grid: { display: false }, ticks: { color: chartTextColor.value, font: { size: 11 } } },
  },
}))

// 🔴 AQUI: opções específicas do gráfico de fornecedores — mesma base do
// horizontalBarOptions, mas o rótulo formata como moeda em vez de número cru.
const purchasesSupplierChartOptions = computed(() => ({
  ...horizontalBarOptions.value,
  plugins: {
    ...horizontalBarOptions.value.plugins,
    datalabels: {
      ...horizontalBarOptions.value.plugins.datalabels,
      formatter: (value) => formatCurrencyCompact(value),
    },
  },
}))

// -----------------------------------------------------------------------
// 🔴 AQUI: "Produtos por grupo" deixou de ser Doughnut e virou Bar
// horizontal com scroll — o mesmo padrão de "Compras por fornecedor".
// Isso escala de 3 a 1000+ grupos sem virar uma pizza ilegível.
// A altura do container cresce dinamicamente com a quantidade de grupos,
// e cada barra recebe sua cor determinística via corPorNome().
// -----------------------------------------------------------------------
const ALTURA_POR_BARRA_GRUPO = 32
const ALTURA_MINIMA_GRUPO = 240

const gruposFiltrados = computed(() => {
  const rawData = productsQuery.data.value?.produtos_por_grupo || []
  const ordenado = [...rawData].sort((a, b) => b.quantidade - a.quantidade)

  if (!searchProductGroups.value) return ordenado

  const termo = searchProductGroups.value.toLowerCase()
  return ordenado.filter((item) => (item.grupo || '').toLowerCase().includes(termo))
})

const alturaGraficoGrupos = computed(() =>
  Math.max(ALTURA_MINIMA_GRUPO, gruposFiltrados.value.length * ALTURA_POR_BARRA_GRUPO),
)

const productsGroupChartData = computed(() => {
  const lista = gruposFiltrados.value
  return {
    labels: lista.map((item) => item.grupo),
    datasets: [
      {
        label: 'Produtos',
        data: lista.map((item) => item.quantidade),
        backgroundColor: lista.map((item) => corPorNome(item.grupo)),
        borderRadius: 4,
        barThickness: 18,
      },
    ],
  }
})

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

const doughnutOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'right',
      labels: {
        color: isDark.value ? '#f4f4f5' : '#09090b',
        font: { size: 11 },
        boxWidth: 12,
        padding: 12,
      },
    },
    // 🔴 AQUI: valor fixo dentro de cada fatia (some sozinho se a fatia for 0)
    datalabels: {
      display: (context) => context.dataset.data[context.dataIndex] > 0,
      color: datalabelColorOnSolid,
      font: { size: 11, weight: 'bold' },
      formatter: (value) => value,
    },
  },
  cutout: '70%',
}))
</script>

<template>
  <div
    class="min-h-screen bg-[#f8fafc] dark:bg-[#09090b] text-[#09090b] dark:text-[#f4f4f5] p-6 font-sans transition-colors duration-200"
  >
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
      <div>
        <p class="text-xs text-[#71717a] dark:text-[#a1a1aa] font-medium tracking-wide">
          Análise / Relatórios
        </p>
        <h1 class="text-2xl font-bold tracking-tight text-[#09090b] dark:text-white mt-1">
          Relatórios
        </h1>
        <p class="text-sm text-[#71717a] dark:text-[#a1a1aa] mt-0.5">
          Escolha um tema e o período para analisar os resultados do negócio.
        </p>
      </div>

      <div class="flex items-center gap-3">
        <div ref="dataFiltroRef" class="relative">
          <button
            type="button"
            class="flex h-9 w-44 cursor-pointer items-center gap-2 rounded-lg border border-[#e4e4e7] dark:border-[#27272a] bg-white dark:bg-[#18181b] px-3 text-xs font-medium shadow-sm transition-colors hover:bg-[#f4f4f5] dark:hover:bg-[#27272a]/50"
            :class="
              !['7d', '30d', '90d'].includes(tipoData)
                ? 'border-emerald-500 text-emerald-700 dark:text-emerald-400 font-semibold'
                : 'text-[#71717a] dark:text-[#a1a1aa]'
            "
            @click="filtroDataAberto = !filtroDataAberto"
          >
            <CalendarIcon class="size-3.5 shrink-0 text-[#71717a] dark:text-[#a1a1aa]" />
            <span class="truncate">{{ rotuloFiltroData }}</span>
            <X
              v-if="!['7d', '30d', '90d'].includes(tipoData)"
              class="ml-auto size-3 shrink-0 text-[#71717a] dark:text-[#a1a1aa] transition-colors hover:text-[#09090b] dark:hover:text-white"
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
              class="absolute right-0 top-[calc(100%+6px)] z-50 w-72 rounded-xl border border-[#e4e4e7] dark:border-[#27272a] bg-white dark:bg-[#18181b] p-3 shadow-lg"
            >
              <p
                class="mb-2 text-[11px] font-semibold uppercase text-[#71717a] dark:text-[#a1a1aa]"
              >
                Atalhos
              </p>
              <div class="mb-3 grid grid-cols-2 gap-1.5">
                <button
                  v-for="preset in presetsData"
                  :key="preset.valor"
                  type="button"
                  class="cursor-pointer rounded-lg border px-2.5 py-1.5 text-left text-xs font-medium transition-colors"
                  :class="
                    tipoData === preset.valor
                      ? 'border-emerald-500/50 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold'
                      : 'border-transparent bg-[#f4f4f5] dark:bg-[#09090b] text-[#71717a] dark:text-[#a1a1aa] hover:text-[#09090b] dark:hover:text-white'
                  "
                  @click="selecionarPreset(preset.valor)"
                >
                  {{ preset.rotulo }}
                </button>
              </div>

              <div class="border-t border-[#e4e4e7] dark:border-[#27272a] pt-3">
                <p
                  class="mb-2 text-[11px] font-semibold uppercase text-[#71717a] dark:text-[#a1a1aa]"
                >
                  Personalizado
                </p>

                <div
                  class="mb-2 grid grid-cols-2 gap-1 rounded-lg bg-[#f4f4f5] dark:bg-[#09090b] p-1"
                >
                  <button
                    type="button"
                    class="cursor-pointer rounded-md px-2 py-1.5 text-xs font-medium transition-colors"
                    :class="
                      tipoData === 'personalizado_dia'
                        ? 'bg-white dark:bg-[#18181b] text-[#09090b] dark:text-white shadow-sm font-semibold'
                        : 'text-[#71717a] dark:text-[#a1a1aa] hover:text-[#09090b] dark:hover:text-white'
                    "
                    @click="selecionarModoPersonalizado('personalizado_dia')"
                  >
                    Dia específico
                  </button>
                  <button
                    type="button"
                    class="cursor-pointer rounded-md px-2 py-1.5 text-xs font-medium transition-colors"
                    :class="
                      tipoData === 'personalizado_periodo'
                        ? 'bg-white dark:bg-[#18181b] text-[#09090b] dark:text-white shadow-sm font-semibold'
                        : 'text-[#71717a] dark:text-[#a1a1aa] hover:text-[#09090b] dark:hover:text-white'
                    "
                    @click="selecionarModoPersonalizado('personalizado_periodo')"
                  >
                    Período
                  </button>
                </div>

                <div v-if="tipoData === 'personalizado_dia'" class="space-y-1.5">
                  <label class="text-[11px] text-[#71717a] dark:text-[#a1a1aa]"
                    >Selecione a data</label
                  >
                  <input
                    v-model="dataUnica"
                    type="date"
                    class="h-9 w-full cursor-pointer rounded-lg border border-[#e4e4e7] dark:border-[#27272a] bg-white dark:bg-[#09090b] px-2 text-xs text-[#09090b] dark:text-white outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div v-else-if="tipoData === 'personalizado_periodo'" class="space-y-2">
                  <div class="space-y-1">
                    <label class="text-[11px] text-[#71717a] dark:text-[#a1a1aa]">De</label>
                    <input
                      v-model="dataInicio"
                      type="date"
                      class="h-9 w-full cursor-pointer rounded-lg border border-[#e4e4e7] dark:border-[#27272a] bg-white dark:bg-[#09090b] px-2 text-xs text-[#09090b] dark:text-white outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div class="space-y-1">
                    <label class="text-[11px] text-[#71717a] dark:text-[#a1a1aa]">Até</label>
                    <input
                      v-model="dataFim"
                      type="date"
                      :min="dataInicio || undefined"
                      class="h-9 w-full cursor-pointer rounded-lg border border-[#e4e4e7] dark:border-[#27272a] bg-white dark:bg-[#09090b] px-2 text-xs text-[#09090b] dark:text-white outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <p v-else class="py-1 text-[11px] text-[#71717a] dark:text-[#a1a1aa]">
                  Escolha "Dia específico" ou "Período" para uma data personalizada.
                </p>
              </div>

              <div
                class="mt-3 flex items-center justify-between border-t border-[#e4e4e7] dark:border-[#27272a] pt-3"
              >
                <button
                  type="button"
                  class="h-8 px-3 cursor-pointer text-xs text-[#71717a] dark:text-[#a1a1aa] hover:text-[#09090b] dark:hover:text-white transition"
                  @click="limparFiltroData"
                >
                  Limpar
                </button>
                <button
                  type="button"
                  class="h-8 px-3.5 cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition"
                  @click="filtroDataAberto = false"
                >
                  Aplicar
                </button>
              </div>
            </div>
          </Transition>
        </div>

        <button
          @click="handleRefresh"
          class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3.5 py-2 rounded-lg flex items-center gap-2 transition cursor-pointer shadow-sm"
        >
          <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': salesQuery.isFetching.value }" />
          <span>Atualizar</span>
        </button>
      </div>
    </div>

    <div
      class="bg-white dark:bg-[#18181b] p-1 rounded-xl border border-[#e4e4e7] dark:border-[#27272a] shadow-sm grid grid-cols-4 gap-1 mb-6"
    >
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
            ? 'bg-[#f4f4f5] dark:bg-[#27272a] text-[#09090b] dark:text-white font-semibold border border-[#e4e4e7] dark:border-transparent shadow-sm'
            : 'text-[#71717a] dark:text-[#a1a1aa] hover:text-[#09090b] dark:hover:text-white hover:bg-[#f4f4f5]/60 dark:hover:bg-[#27272a]/50',
        ]"
      >
        <component :is="tab.icon" class="w-4 h-4" />
        <span>{{ tab.label }}</span>
      </button>
    </div>

    <div v-if="activeTab === 'vendas'" class="space-y-6">
      <div
        v-if="salesQuery.isLoading.value"
        class="text-[#71717a] dark:text-[#a1a1aa] py-12 text-center text-xs"
      >
        Carregando relatórios de vendas...
      </div>

      <template v-else-if="salesQuery.data.value">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            class="bg-white dark:bg-[#18181b] p-4 rounded-xl border border-[#e4e4e7] dark:border-[#27272a] shadow-sm"
          >
            <span class="text-xs text-[#71717a] dark:text-[#a1a1aa] font-medium">Faturamento</span>
            <p class="text-2xl font-bold mt-1 text-[#09090b] dark:text-white">
              {{ formatCurrency(salesQuery.data.value.cards.faturamento) }}
            </p>
          </div>

          <div
            class="bg-white dark:bg-[#18181b] p-4 rounded-xl border border-[#e4e4e7] dark:border-[#27272a] shadow-sm"
          >
            <span class="text-xs text-[#71717a] dark:text-[#a1a1aa] font-medium"
              >Vendas realizadas</span
            >
            <p class="text-2xl font-bold mt-1 text-[#09090b] dark:text-white">
              {{ salesQuery.data.value.cards.vendas_realizadas }}
            </p>
          </div>

          <div
            class="bg-white dark:bg-[#18181b] p-4 rounded-xl border border-[#e4e4e7] dark:border-[#27272a] shadow-sm"
          >
            <span class="text-xs text-[#71717a] dark:text-[#a1a1aa] font-medium"
              >Itens vendidos</span
            >
            <p class="text-2xl font-bold mt-1 text-[#09090b] dark:text-white">
              {{ salesQuery.data.value.cards.itens_vendidos || 0 }}
            </p>
          </div>

          <div
            class="bg-white dark:bg-[#18181b] p-4 rounded-xl border border-[#e4e4e7] dark:border-[#27272a] shadow-sm"
          >
            <span class="text-xs text-[#71717a] dark:text-[#a1a1aa] font-medium"
              >Produtos sem vendas</span
            >
            <p class="text-2xl font-bold mt-1 text-[#09090b] dark:text-white">
              {{ salesQuery.data.value.cards.produtos_sem_vendas }}
            </p>
          </div>
        </div>

        <div
          class="bg-white dark:bg-[#18181b] p-5 rounded-xl border border-[#e4e4e7] dark:border-[#27272a] shadow-sm"
        >
          <div class="mb-4">
            <h3 class="text-sm font-semibold text-[#09090b] dark:text-white">Vendas por dia</h3>
            <p class="text-xs text-[#71717a] dark:text-[#a1a1aa]">
              Evolução do faturamento no período, com destaque para os extremos.
            </p>
          </div>

          <div class="h-64 w-full">
            <Line :data="salesLineChartData" :options="lineChartOptions" />
          </div>
        </div>

        <div
          class="bg-white dark:bg-[#18181b] p-5 rounded-xl border border-[#e4e4e7] dark:border-[#27272a] shadow-sm"
        >
          <h3 class="text-sm font-semibold text-[#09090b] dark:text-white">Vendas por grupo</h3>
          <p class="text-xs text-[#71717a] dark:text-[#a1a1aa] mb-4">
            {{ salesQuery.data.value.vendas_por_grupo?.length || 0 }} grupos no período
          </p>

          <div class="h-72 w-full">
            <Bar :data="salesByGroupChartData" :options="verticalBarOptions" />
          </div>
        </div>

        <div
          class="bg-white dark:bg-[#18181b] p-5 rounded-xl border border-[#e4e4e7] dark:border-[#27272a] shadow-sm"
        >
          <div class="flex items-center justify-between mb-3">
            <div>
              <h3 class="text-sm font-semibold text-[#09090b] dark:text-white">
                Produtos mais vendidos
              </h3>
              <p class="text-xs text-[#71717a] dark:text-[#a1a1aa]">
                Mostrando {{ filteredTopProducts.length }} de
                {{ salesQuery.data.value.produtos_mais_vendidos.length }}
              </p>
            </div>
          </div>

          <div class="relative mb-4">
            <Search
              class="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#71717a] dark:text-[#a1a1aa]"
            />
            <input
              v-model="searchProductSales"
              type="text"
              placeholder="Buscar produto..."
              class="w-full bg-[#f8fafc] dark:bg-[#09090b] border border-[#e4e4e7] dark:border-[#27272a] rounded-lg pl-9 pr-3 py-1.5 text-xs text-[#09090b] dark:text-white placeholder-[#a1a1aa] focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div class="space-y-2 max-h-[300px] overflow-y-auto pr-1.5 custom-scrollbar">
            <div
              v-for="(prod, index) in filteredTopProducts"
              :key="prod.id"
              class="flex items-center justify-between p-2.5 rounded-lg bg-[#f8fafc] dark:bg-[#09090b]/60 border border-[#e4e4e7] dark:border-[#27272a]/40 hover:bg-[#f4f4f5] dark:hover:bg-[#27272a]/40 transition"
            >
              <div class="flex items-center gap-3 min-w-0">
                <span
                  class="w-5 h-5 rounded-full bg-[#e4e4e7] dark:bg-[#27272a] text-emerald-700 dark:text-[#10b981] font-bold text-[10px] flex items-center justify-center shrink-0"
                >
                  {{ index + 1 }}
                </span>
                <span class="text-xs font-medium text-[#09090b] dark:text-white truncate">{{
                  prod.name
                }}</span>
              </div>
              <span class="text-xs font-bold text-emerald-600 dark:text-[#10b981] shrink-0 ml-2"
                >{{ prod.quantidade }} un.</span
              >
            </div>
          </div>
        </div>
      </template>
    </div>

    <div v-if="activeTab === 'compras'" class="space-y-6">
      <div
        v-if="purchasesQuery.isLoading.value"
        class="text-[#71717a] dark:text-[#a1a1aa] py-12 text-center text-xs"
      >
        Carregando relatórios de compras...
      </div>

      <template v-else-if="purchasesQuery.data.value">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div
            class="bg-white dark:bg-[#18181b] p-4 rounded-xl border border-[#e4e4e7] dark:border-[#27272a] shadow-sm"
          >
            <span class="text-xs text-[#71717a] dark:text-[#a1a1aa] font-medium"
              >Total comprado</span
            >
            <p class="text-2xl font-bold mt-1 text-[#09090b] dark:text-white">
              {{ formatCurrency(purchasesQuery.data.value.cards.total_comprado) }}
            </p>
          </div>

          <div
            class="bg-white dark:bg-[#18181b] p-4 rounded-xl border border-[#e4e4e7] dark:border-[#27272a] shadow-sm"
          >
            <span class="text-xs text-[#71717a] dark:text-[#a1a1aa] font-medium"
              >Compras no período</span
            >
            <p class="text-2xl font-bold mt-1 text-[#09090b] dark:text-white">
              {{ purchasesQuery.data.value.cards.compras_no_periodo }}
            </p>
          </div>

          <div
            class="bg-white dark:bg-[#18181b] p-4 rounded-xl border border-[#e4e4e7] dark:border-[#27272a] shadow-sm"
          >
            <span class="text-xs text-[#71717a] dark:text-[#a1a1aa] font-medium"
              >Produtos a repor</span
            >
            <p class="text-2xl font-bold mt-1 text-[#09090b] dark:text-white">
              {{ purchasesQuery.data.value.cards.produtos_a_repor }}
            </p>
          </div>
        </div>

        <div
          class="bg-white dark:bg-[#18181b] p-5 rounded-xl border border-[#e4e4e7] dark:border-[#27272a] shadow-sm"
        >
          <h3 class="text-sm font-semibold text-[#09090b] dark:text-white">
            Compras por fornecedor
          </h3>
          <p class="text-xs text-[#71717a] dark:text-[#a1a1aa] mb-4">
            {{ purchasesQuery.data.value.compras_por_fornecedor?.length || 0 }} fornecedores no
            período
          </p>

          <div class="h-72 w-full">
            <Bar :data="purchasesSupplierChartData" :options="purchasesSupplierChartOptions" />
          </div>
        </div>

        <div
          class="bg-white dark:bg-[#18181b] p-5 rounded-xl border border-[#e4e4e7] dark:border-[#27272a] shadow-sm"
        >
          <h3 class="text-sm mb-4 font-semibold text-[#09090b] dark:text-white">
            Produtos vendidos que precisam de reposição
          </h3>

          <div class="relative mb-4">
            <Search
              class="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#71717a] dark:text-[#a1a1aa]"
            />
            <input
              v-model="searchProductPurchases"
              type="text"
              placeholder="Buscar produto..."
              class="w-full bg-[#f8fafc] dark:bg-[#09090b] border border-[#e4e4e7] dark:border-[#27272a] rounded-lg pl-9 pr-3 py-1.5 text-xs text-[#09090b] dark:text-white placeholder-[#a1a1aa] focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div class="space-y-2 max-h-[320px] overflow-y-auto pr-1.5 custom-scrollbar">
            <div
              v-for="prod in filteredReplenishProducts"
              :key="prod.id"
              class="flex items-center justify-between p-3 rounded-lg bg-[#f8fafc] dark:bg-[#09090b] border border-[#e4e4e7] dark:border-[#27272a]/60 hover:border-[#cbd5e1] dark:hover:border-[#27272a] transition cursor-pointer"
            >
              <div>
                <p class="text-xs font-semibold text-[#09090b] dark:text-white">{{ prod.name }}</p>
                <p class="text-[11px] text-[#71717a] dark:text-[#a1a1aa]">
                  Mínimo: {{ prod.min_stock_quantity }} un.
                </p>
              </div>

              <span
                :class="[
                  'text-[11px] font-bold px-2.5 py-1 rounded-full cursor-pointer',
                  prod.stock_quantity <= 0
                    ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20'
                    : 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20',
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
      <div
        v-if="productsQuery.isLoading.value"
        class="text-[#71717a] dark:text-[#a1a1aa] py-12 text-center text-xs"
      >
        Carregando relatórios de produtos...
      </div>

      <template v-else-if="productsQuery.data.value">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- 🔴 AQUI: "Produtos por grupo" agora é uma barra horizontal com
               scroll (igual "Compras por fornecedor"), com busca embutida.
               Suporta qualquer quantidade de grupos sem virar ilegível. -->
          <div
            class="bg-white dark:bg-[#18181b] p-5 rounded-xl border border-[#e4e4e7] dark:border-[#27272a] shadow-sm"
          >
            <h3 class="text-sm font-semibold text-[#09090b] dark:text-white">Produtos por grupo</h3>
            <p class="text-xs text-[#71717a] dark:text-[#a1a1aa] mb-4">
              {{ gruposFiltrados.length }} grupo(s) cadastrado(s).
            </p>

            <div class="relative mb-3">
              <Search
                class="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#71717a] dark:text-[#a1a1aa]"
              />
              <input
                v-model="searchProductGroups"
                type="text"
                placeholder="Buscar grupo..."
                class="w-full bg-[#f8fafc] dark:bg-[#09090b] border border-[#e4e4e7] dark:border-[#27272a] rounded-lg pl-9 pr-3 py-1.5 text-xs text-[#09090b] dark:text-white placeholder-[#a1a1aa] focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div
              v-if="gruposFiltrados.length > 0"
              class="max-h-72 overflow-y-auto pr-1.5 custom-scrollbar"
            >
              <div :style="{ height: alturaGraficoGrupos + 'px' }">
                <Bar :data="productsGroupChartData" :options="horizontalBarOptions" />
              </div>
            </div>
            <p v-else class="text-xs text-[#71717a] dark:text-[#a1a1aa] py-6 text-center">
              Nenhum grupo encontrado.
            </p>
          </div>

          <div
            class="bg-white dark:bg-[#18181b] p-5 rounded-xl border border-[#e4e4e7] dark:border-[#27272a] shadow-sm"
          >
            <h3 class="text-sm font-semibold text-[#09090b] dark:text-white mb-2">
              Situação do estoque
            </h3>
            <p class="text-xs text-[#71717a] dark:text-[#a1a1aa] mb-4">
              Métricas de níveis de estoque atual.
            </p>

            <div class="h-60 w-full flex items-center justify-center">
              <Doughnut :data="stockDoughnutData" :options="doughnutOptions" />
            </div>
          </div>
        </div>
      </template>
    </div>

    <div v-if="activeTab === 'pessoas'" class="space-y-6">
      <div
        v-if="peopleQuery.isLoading.value"
        class="text-[#71717a] dark:text-[#a1a1aa] py-12 text-center text-xs"
      >
        Carregando relatórios de pessoas...
      </div>

      <template v-else-if="peopleQuery.data.value">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div
            class="bg-white dark:bg-[#18181b] p-5 rounded-xl border border-[#e4e4e7] dark:border-[#27272a] shadow-sm"
          >
            <h3 class="text-sm font-semibold text-[#09090b] dark:text-white mb-4">
              Pessoas por grupo
            </h3>
            <div class="h-60 w-full">
              <Bar :data="peopleGroupChartData" :options="verticalBarOptions" />
            </div>
          </div>

          <div
            class="bg-white dark:bg-[#18181b] p-5 rounded-xl border border-[#e4e4e7] dark:border-[#27272a] shadow-sm"
          >
            <h3 class="text-sm font-semibold text-[#09090b] dark:text-white mb-4">
              Pessoas por faixa etária
            </h3>
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
  background: #f8fafc;
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #e4e4e7;
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #cbd5e1;
}
</style>
