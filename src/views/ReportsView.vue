<script setup>
import { computed, onMounted, ref } from 'vue'
import {
  Download,
  FileBarChart,
  Package,
  Pencil,
  RefreshCw,
  Search,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-vue-next'
import { Bar, Line, Pie } from 'vue-chartjs'
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip as ChartTooltip,
} from 'chart.js'
import ChartDataLabels from 'chartjs-plugin-datalabels'

import PageHeader from '@/components/page-shell/PageHeader.vue'
import Section from '@/components/page-shell/Section.vue'
import TableSkeleton from '@/components/page-shell/TableSkeleton.vue'
import MetricCard from '@/components/ui-kit/MetricCard.vue'
import StatusPill from '@/components/ui-kit/StatusPill.vue'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import NewProduct from '@/components/modal/product/NewProduct.vue'

import { useFeedback } from '@/composables/useFeedBack'
import {
  brl,
  compras,
  maisVendidos,
  nivelEstoque,
  pessoas,
  produtos,
  totalDoc,
  vendas,
  vendasPorDia,
  vendasPorGrupo,
} from '@/lib/mockData'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  ChartTooltip,
  Legend,
  Filler,
  ChartDataLabels
)

const { sucesso } = useFeedback()

const periodo = ref('7')
const carregando = ref(false)

function recarregar(valor) {
  periodo.value = valor
  carregando.value = true
  setTimeout(() => {
    carregando.value = false
  }, 700)
}

function atualizarRelatorio() {
  carregando.value = true
  setTimeout(() => {
    carregando.value = false
    sucesso('Relatório atualizado', 'Os dados foram recarregados.')
  }, 700)
}

function exportar() {
  sucesso('Relatório exportado', 'O arquivo CSV foi gerado com sucesso.')
}

// ---- Cores do sistema (paleta fixa em tons de verde — não depende do tema) ----
const paleta = ['#059669', '#10b981', '#34d399', '#16a34a', '#4ade80']

// ---- Cores estruturais (essas seguem o tema, só afetam eixos/grade/texto) ----
const corEixo = ref('#94a3b8')
const corGrade = ref('#e2e8f0')
const corPainel = ref('#ffffff')
const corTexto = ref('#0f172a')
const corTextoSecundario = ref('#64748b')

onMounted(() => {
  const estilo = getComputedStyle(document.documentElement)
  const lerVar = (nome, fallback) => estilo.getPropertyValue(nome).trim() || fallback

  corEixo.value = lerVar('--muted-foreground', corEixo.value)
  corGrade.value = lerVar('--border', corGrade.value)
  corPainel.value = lerVar('--popover', corPainel.value)
  corTexto.value = lerVar('--popover-foreground', corTexto.value)
  corTextoSecundario.value = lerVar('--muted-foreground', corTextoSecundario.value)
})

const tooltipBase = computed(() => ({
  backgroundColor: corPainel.value,
  titleColor: corTexto.value,
  bodyColor: corTextoSecundario.value,
  borderColor: corGrade.value,
  borderWidth: 1,
  padding: 10,
  cornerRadius: 8,
  displayColors: false,
}))

// ==================================================================
// MODAL DE EDIÇÃO DE PRODUTO (aberto pelas listas clicáveis)
// ==================================================================
const produtoModalAberto = ref(false)
const produtoEditando = ref(null)

function editarProduto(produto) {
  if (!produto) return
  produtoEditando.value = produto
  produtoModalAberto.value = true
}

function produtoSalvo(dados) {
  const alvo = produtoEditando.value
  if (alvo) {
    const idx = produtos.findIndex((p) => p.id === alvo.id)
    if (idx !== -1) produtos[idx] = { ...produtos[idx], ...dados }
  }
  sucesso('Produto atualizado', `${dados?.nome ?? alvo?.nome ?? 'Produto'} foi atualizado.`)
  produtoEditando.value = null
}

function detalheProduto(id) {
  return produtos.find((p) => p.id === id) ?? null
}

// ---- Dados derivados ----
const porGrupoPessoas = computed(() =>
  ['Cliente', 'Fornecedor', 'Colaborador'].map((g) => ({
    nome: g,
    valor: pessoas.filter((p) => p.grupo === g).length,
  }))
)

const porGeneroPessoas = computed(() =>
  ['Feminino', 'Masculino', 'Não informado'].map((g) => ({
    nome: g,
    valor: pessoas.filter((p) => p.genero === g).length,
  }))
)
const totalPessoasGenero = computed(() => porGeneroPessoas.value.reduce((s, p) => s + p.valor, 0))

// ---- Pessoas por faixa etária (a partir de `nascimento`) ----
function calcularIdade(nascimento) {
  if (!nascimento) return null
  const nasc = new Date(nascimento)
  if (isNaN(nasc.getTime())) return null
  const hoje = new Date()
  let idade = hoje.getFullYear() - nasc.getFullYear()
  const m = hoje.getMonth() - nasc.getMonth()
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--
  return idade
}

function faixaEtaria(idade) {
  if (idade === null) return 'Não informado'
  if (idade < 26) return '18-25'
  if (idade < 36) return '26-35'
  if (idade < 46) return '36-45'
  if (idade < 61) return '46-60'
  return '60+'
}

const pessoasPorFaixaEtaria = computed(() => {
  const ordem = ['18-25', '26-35', '36-45', '46-60', '60+', 'Não informado']
  const contagem = Object.fromEntries(ordem.map((f) => [f, 0]))
  pessoas.forEach((p) => {
    const faixa = faixaEtaria(calcularIdade(p.nascimento))
    contagem[faixa] = (contagem[faixa] ?? 0) + 1
  })
  return ordem.map((f) => ({ nome: f, valor: contagem[f] }))
})

const comprasPorFornecedor = computed(() =>
  Array.from(new Set(compras.map((c) => c.fornecedor))).map((f) => ({
    nome: f.split(' ')[0],
    valor: compras.filter((c) => c.fornecedor === f).reduce((s, c) => s + totalDoc(c.itens), 0),
  }))
)

const produtosPorGrupo = computed(() =>
  Array.from(new Set(produtos.map((p) => p.grupo))).map((g) => ({
    nome: g,
    valor: produtos.filter((p) => p.grupo === g).length,
  }))
)
const totalProdutosGrupo = computed(() => produtosPorGrupo.value.reduce((s, p) => s + p.valor, 0))
const grupoAtivo = ref(null)
function alternarGrupo(nome) {
  grupoAtivo.value = grupoAtivo.value === nome ? null : nome
}

// ---- Produtos por marca ----
const produtosPorMarca = computed(() =>
  Array.from(new Set(produtos.map((p) => p.marca).filter(Boolean)))
    .map((m) => ({ nome: m, valor: produtos.filter((p) => p.marca === m).length }))
    .sort((a, b) => b.valor - a.valor)
)

// ---- Produtos ativos x inativos ----
const produtosPorStatus = computed(() => [
  { nome: 'Ativos', valor: produtos.filter((p) => p.status === 'ativo').length },
  { nome: 'Inativos', valor: produtos.filter((p) => p.status === 'inativo').length },
])
const totalProdutosStatus = computed(() => produtosPorStatus.value.reduce((s, p) => s + p.valor, 0))

const semVendas = computed(() => produtos.filter((p) => p.vendidos30d === 0))
const baixos = computed(() => produtos.filter((p) => nivelEstoque(p) !== 'normal'))

const faturamento = computed(() =>
  brl(
    vendas
      .filter((v) => v.status !== 'cancelada')
      .reduce((s, v) => s + totalDoc(v.itens, v.desconto), 0)
  )
)
const itensVendidos = computed(() =>
  String(vendas.reduce((s, v) => s + v.itens.reduce((a, i) => a + i.qtd, 0), 0))
)

// ==================================================================
// PRODUTOS MAIS VENDIDOS — busca + rolagem + paginação + clique abre modal
// ==================================================================
const buscaMaisVendidos = ref('')
const limiteMaisVendidos = ref(10)

const maisVendidosFiltrados = computed(() => {
  const termo = buscaMaisVendidos.value.trim().toLowerCase()
  const base = termo ? maisVendidos.filter((p) => p.nome.toLowerCase().includes(termo)) : maisVendidos
  return [...base].sort((a, b) => b.vendidos30d - a.vendidos30d)
})
const maxVendidos30d = computed(() =>
  Math.max(1, ...maisVendidosFiltrados.value.map((p) => p.vendidos30d))
)
const maisVendidosVisiveis = computed(() => maisVendidosFiltrados.value.slice(0, limiteMaisVendidos.value))

function carregarMaisVendidos() {
  limiteMaisVendidos.value += 10
}

// ==================================================================
// REPOSIÇÃO — busca + rolagem + clique abre modal
// ==================================================================
const buscaReposicao = ref('')

const baixosFiltrados = computed(() => {
  const termo = buscaReposicao.value.trim().toLowerCase()
  if (!termo) return baixos.value
  return baixos.value.filter((p) => p.nome.toLowerCase().includes(termo))
})

// ==================================================================
// VENDAS POR DIA — resumo estatístico
// ==================================================================
const indicePico = computed(() => {
  let idx = 0
  vendasPorDia.forEach((v, i) => {
    if (v.vendas > vendasPorDia[idx].vendas) idx = i
  })
  return idx
})
const indiceMinimo = computed(() => {
  let idx = 0
  vendasPorDia.forEach((v, i) => {
    if (v.vendas < vendasPorDia[idx].vendas) idx = i
  })
  return idx
})
const totalPeriodo = computed(() => vendasPorDia.reduce((s, v) => s + v.vendas, 0))
const mediaDiaria = computed(() => totalPeriodo.value / (vendasPorDia.length || 1))
const variacaoPeriodo = computed(() => {
  if (vendasPorDia.length < 2) return 0
  const metade = Math.floor(vendasPorDia.length / 2)
  const primeira = vendasPorDia.slice(0, metade).reduce((s, v) => s + v.vendas, 0)
  const segunda = vendasPorDia.slice(metade).reduce((s, v) => s + v.vendas, 0)
  if (primeira === 0) return 0
  return ((segunda - primeira) / primeira) * 100
})

// ---- Chart: Vendas por dia ----
const dadosVendasPorDia = computed(() => ({
  labels: vendasPorDia.map((v) => v.dia),
  datasets: [
    {
      label: 'Vendas',
      data: vendasPorDia.map((v) => v.vendas),
      borderColor: paleta[0],
      backgroundColor: (context) => {
        const { ctx, chartArea } = context.chart
        if (!chartArea) return `${paleta[0]}22`
        const gradiente = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
        gradiente.addColorStop(0, `${paleta[0]}55`)
        gradiente.addColorStop(1, `${paleta[0]}00`)
        return gradiente
      },
      tension: 0.35,
      borderWidth: 2,
      fill: true,
      pointBackgroundColor: vendasPorDia.map((_, i) =>
        i === indicePico.value ? paleta[0] : i === indiceMinimo.value ? '#ef4444' : paleta[0]
      ),
      pointRadius: vendasPorDia.map((_, i) =>
        i === indicePico.value || i === indiceMinimo.value ? 5 : 0
      ),
      pointHoverRadius: 6,
      datalabels: {
        align: 'top',
        anchor: 'end',
        color: corTexto.value,
        font: { size: 10, weight: '600' },
        formatter: (valor, ctx) => {
          const idx = ctx.dataIndex
          if (idx === indicePico.value || idx === indiceMinimo.value) return brl(valor)
          return ''
        },
      },
    },
  ],
}))

const opcoesVendasPorDia = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { display: false },
    tooltip: {
      ...tooltipBase.value,
      callbacks: {
        label: (ctx) => {
          const valor = ctx.parsed.y
          const idx = ctx.dataIndex
          const anterior = idx > 0 ? ctx.dataset.data[idx - 1] : null
          let linha = `Faturamento: ${brl(valor)}`
          if (anterior !== null && anterior !== 0) {
            const variacao = ((valor - anterior) / anterior) * 100
            const sinal = variacao >= 0 ? '+' : ''
            linha += ` (${sinal}${variacao.toFixed(1)}% vs dia anterior)`
          }
          return linha
        },
      },
    },
  },
  scales: {
    x: { grid: { display: false }, ticks: { color: corEixo.value, font: { size: 12 } } },
    y: {
      grid: { color: corGrade.value },
      ticks: { color: corEixo.value, font: { size: 12 }, callback: (v) => `${v / 1000}k` },
    },
  },
}))

// ---- Chart: Vendas por grupo ----
const dadosVendasPorGrupo = computed(() => ({
  labels: vendasPorGrupo.map((v) => v.grupo),
  datasets: [
    {
      label: 'Vendas',
      data: vendasPorGrupo.map((v) => v.valor),
      backgroundColor: paleta[0],
      borderRadius: 6,
      maxBarThickness: 40,
      datalabels: {
        anchor: 'end',
        align: 'top',
        color: corTexto.value,
        font: { size: 10, weight: '600' },
        formatter: (valor) => brl(valor),
      },
    },
  ],
}))

const opcoesVendasPorGrupo = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  layout: { padding: { top: 24 } },
  plugins: { legend: { display: false }, tooltip: tooltipBase.value },
  scales: {
    x: { grid: { display: false }, ticks: { color: corEixo.value, font: { size: 12 } } },
    y: {
      grid: { color: corGrade.value },
      ticks: { color: corEixo.value, font: { size: 12 }, callback: (v) => `${v / 1000}k` },
    },
  },
}))

// ---- Chart: Compras por fornecedor ----
const dadosComprasPorFornecedor = computed(() => ({
  labels: comprasPorFornecedor.value.map((c) => c.nome),
  datasets: [
    {
      label: 'Compras',
      data: comprasPorFornecedor.value.map((c) => c.valor),
      backgroundColor: paleta[1],
      borderRadius: 6,
      maxBarThickness: 24,
      datalabels: {
        anchor: 'end',
        align: 'right',
        color: corTexto.value,
        font: { size: 10, weight: '600' },
        formatter: (valor) => brl(valor),
      },
    },
  ],
}))

const opcoesComprasPorFornecedor = computed(() => ({
  indexAxis: 'y',
  responsive: true,
  maintainAspectRatio: false,
  layout: { padding: { right: 56 } },
  plugins: { legend: { display: false }, tooltip: tooltipBase.value },
  scales: {
    x: { grid: { display: false }, ticks: { display: false } },
    y: { grid: { display: false }, ticks: { color: corEixo.value, font: { size: 12 } } },
  },
}))

// ---- Chart: Produtos por marca ----
const dadosProdutosPorMarca = computed(() => ({
  labels: produtosPorMarca.value.map((m) => m.nome),
  datasets: [
    {
      label: 'Produtos',
      data: produtosPorMarca.value.map((m) => m.valor),
      backgroundColor: paleta[2],
      borderRadius: 6,
      maxBarThickness: 24,
      datalabels: {
        anchor: 'end',
        align: 'right',
        color: corTexto.value,
        font: { size: 10, weight: '600' },
        formatter: (valor) => String(valor),
      },
    },
  ],
}))

const opcoesProdutosPorMarca = computed(() => ({
  indexAxis: 'y',
  responsive: true,
  maintainAspectRatio: false,
  layout: { padding: { right: 32 } },
  plugins: { legend: { display: false }, tooltip: tooltipBase.value },
  scales: {
    x: { grid: { display: false }, ticks: { display: false } },
    y: { grid: { display: false }, ticks: { color: corEixo.value, font: { size: 12 } } },
  },
}))

// ---- Chart: Produtos por grupo (donut) ----
const dadosProdutosPorGrupo = computed(() => ({
  labels: produtosPorGrupo.value.map((p) => p.nome),
  datasets: [
    {
      data: produtosPorGrupo.value.map((p) => p.valor),
      backgroundColor: produtosPorGrupo.value.map((_, i) => paleta[i % paleta.length]),
      borderWidth: 0,
    },
  ],
}))

const opcoesDonut = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  cutout: '55%',
  plugins: {
    legend: { display: false },
    tooltip: tooltipBase.value,
    datalabels: {
      color: '#fff',
      font: { size: 11, weight: '700' },
      formatter: (valor) => {
        const total = totalProdutosGrupo.value || 1
        return `${Math.round((valor / total) * 100)}%`
      },
    },
  },
}))

// ---- Chart: Produtos ativos x inativos (donut) ----
const dadosProdutosPorStatus = computed(() => ({
  labels: produtosPorStatus.value.map((p) => p.nome),
  datasets: [
    {
      data: produtosPorStatus.value.map((p) => p.valor),
      backgroundColor: [paleta[0], '#94a3b8'],
      borderWidth: 0,
    },
  ],
}))

const opcoesDonutStatus = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  cutout: '65%',
  plugins: {
    legend: { display: false },
    tooltip: tooltipBase.value,
    datalabels: {
      color: '#fff',
      font: { size: 11, weight: '700' },
      formatter: (valor) => {
        const total = totalProdutosStatus.value || 1
        return `${Math.round((valor / total) * 100)}%`
      },
    },
  },
}))

// ---- Chart: Pessoas por grupo ----
const dadosPessoasPorGrupo = computed(() => ({
  labels: porGrupoPessoas.value.map((p) => p.nome),
  datasets: [
    {
      label: 'Pessoas',
      data: porGrupoPessoas.value.map((p) => p.valor),
      backgroundColor: paleta[0],
      borderRadius: 6,
      maxBarThickness: 40,
      datalabels: {
        anchor: 'end',
        align: 'top',
        color: corTexto.value,
        font: { size: 11, weight: '600' },
        formatter: (valor) => String(valor),
      },
    },
  ],
}))

const opcoesPessoasPorGrupo = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  layout: { padding: { top: 20 } },
  plugins: { legend: { display: false }, tooltip: tooltipBase.value },
  scales: {
    x: { grid: { display: false }, ticks: { color: corEixo.value, font: { size: 12 } } },
    y: { grid: { color: corGrade.value }, ticks: { color: corEixo.value, font: { size: 12 } } },
  },
}))

// ---- Chart: Pessoas por gênero (pizza) ----
const dadosPessoasPorGenero = computed(() => ({
  labels: porGeneroPessoas.value.map((p) => p.nome),
  datasets: [
    {
      data: porGeneroPessoas.value.map((p) => p.valor),
      backgroundColor: porGeneroPessoas.value.map((_, i) => paleta[i % paleta.length]),
      borderWidth: 0,
    },
  ],
}))

const opcoesPizza = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: tooltipBase.value,
    datalabels: {
      color: '#fff',
      font: { size: 11, weight: '700' },
      formatter: (valor) => {
        const total = totalPessoasGenero.value || 1
        return `${Math.round((valor / total) * 100)}%`
      },
    },
  },
}))

// ---- Chart: Pessoas por faixa etária ----
const dadosPessoasPorFaixaEtaria = computed(() => ({
  labels: pessoasPorFaixaEtaria.value.map((f) => f.nome),
  datasets: [
    {
      label: 'Pessoas',
      data: pessoasPorFaixaEtaria.value.map((f) => f.valor),
      backgroundColor: paleta[1],
      borderRadius: 6,
      maxBarThickness: 40,
      datalabels: {
        anchor: 'end',
        align: 'top',
        color: corTexto.value,
        font: { size: 11, weight: '600' },
        formatter: (valor) => String(valor),
      },
    },
  ],
}))

const opcoesPessoasPorFaixaEtaria = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  layout: { padding: { top: 20 } },
  plugins: { legend: { display: false }, tooltip: tooltipBase.value },
  scales: {
    x: { grid: { display: false }, ticks: { color: corEixo.value, font: { size: 12 } } },
    y: { grid: { color: corGrade.value }, ticks: { color: corEixo.value, font: { size: 12 } } },
  },
}))
</script>

<template>
  <PageHeader
    titulo="Relatórios"
    descricao="Escolha um tema e o período para analisar os resultados do negócio."
    :trilha="[{ titulo: 'Análise' }, { titulo: 'Relatórios' }]"
  >
    <template #acoes>
      <Select :model-value="periodo" @update:model-value="recarregar">
        <SelectTrigger class="h-10 w-40 bg-surface" aria-label="Período do relatório">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="7">Últimos 7 dias</SelectItem>
          <SelectItem value="30">Últimos 30 dias</SelectItem>
          <SelectItem value="365">Últimos 12 meses</SelectItem>
        </SelectContent>
      </Select>
      <Button
        type="button"
        class="cursor-pointer bg-emerald-500 text-black hover:bg-emerald-600"
        :disabled="carregando"
        @click="atualizarRelatorio"
      >
        <RefreshCw class="size-4" :class="carregando ? 'animate-spin' : ''" /> Atualizar
      </Button>
      <Button variant="outline" class="cursor-pointer" @click="exportar">
        <Download class="size-4" /> Exportar
      </Button>
    </template>
  </PageHeader>

  <div class="p-4 md:p-6">
    <Tabs default-value="vendas" class="space-y-4">
      <TabsList class="w-full justify-start overflow-x-auto">
        <TabsTrigger value="vendas" class="cursor-pointer">
          <FileBarChart class="size-4" /> Vendas
        </TabsTrigger>
        <TabsTrigger value="compras" class="cursor-pointer">
          <ShoppingCart class="size-4" /> Compras
        </TabsTrigger>
        <TabsTrigger value="produtos" class="cursor-pointer">
          <Package class="size-4" /> Produtos
        </TabsTrigger>
        <TabsTrigger value="pessoas" class="cursor-pointer">
          <Users class="size-4" /> Pessoas
        </TabsTrigger>
      </TabsList>

      <!-- ============================= VENDAS ============================= -->
      <TabsContent value="vendas" class="space-y-4">
        <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard rotulo="Faturamento" :valor="faturamento" tom="success" />
          <MetricCard rotulo="Vendas realizadas" :valor="String(vendas.length)" />
          <MetricCard rotulo="Itens vendidos" :valor="itensVendidos" />
          <MetricCard rotulo="Produtos sem vendas" :valor="String(semVendas.length)" tom="warning" />
        </div>

        <Section titulo="Vendas por dia" descricao="Evolução do faturamento no período, com destaque para os extremos.">
          <TableSkeleton v-if="carregando" :linhas="4" :colunas="3" />
          <template v-else>
            <div class="grid grid-cols-2 gap-3 border-b border-border p-3 md:grid-cols-4 md:p-4">
              <div class="rounded-lg bg-surface p-3">
                <p class="text-meta">Total do período</p>
                <p class="text-lg font-semibold">{{ brl(totalPeriodo) }}</p>
              </div>
              <div class="rounded-lg bg-surface p-3">
                <p class="text-meta">Média diária</p>
                <p class="text-lg font-semibold">{{ brl(mediaDiaria) }}</p>
              </div>
              <div class="rounded-lg bg-surface p-3">
                <p class="text-meta">Melhor dia</p>
                <p class="truncate text-lg font-semibold text-emerald-600">
                  {{ vendasPorDia[indicePico]?.dia }} · {{ brl(vendasPorDia[indicePico]?.vendas ?? 0) }}
                </p>
              </div>
              <div class="rounded-lg bg-surface p-3">
                <p class="text-meta">Variação no período</p>
                <p
                  class="flex items-center gap-1 text-lg font-semibold"
                  :class="variacaoPeriodo >= 0 ? 'text-emerald-600' : 'text-destructive'"
                >
                  <TrendingUp v-if="variacaoPeriodo >= 0" class="size-4" />
                  <TrendingDown v-else class="size-4" />
                  {{ variacaoPeriodo >= 0 ? '+' : '' }}{{ variacaoPeriodo.toFixed(1) }}%
                </p>
              </div>
            </div>
            <div class="h-72 p-3 md:p-4">
              <Line :data="dadosVendasPorDia" :options="opcoesVendasPorDia" />
            </div>
          </template>
        </Section>

        <div class="grid gap-4 lg:grid-cols-2 lg:items-start">
          <Section titulo="Vendas por grupo" :descricao="`${vendasPorGrupo.length} grupos no período`">
            <div class="flex h-[460px] flex-col p-3 md:p-4">
              <div class="flex-1 overflow-x-auto">
                <div
                  class="h-full"
                  :style="{ minWidth: Math.max(vendasPorGrupo.length * 110, 100) + 'px' }"
                >
                  <Bar :data="dadosVendasPorGrupo" :options="opcoesVendasPorGrupo" />
                </div>
              </div>
            </div>
          </Section>

          <Section
            titulo="Produtos mais vendidos"
            :descricao="`Mostrando ${maisVendidosVisiveis.length} de ${maisVendidosFiltrados.length} · clique para editar`"
          >
            <div class="flex h-[460px] flex-col">
              <div class="shrink-0 border-b border-border p-2">
                <div class="relative">
                  <Search class="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    v-model="buscaMaisVendidos"
                    type="text"
                    placeholder="Buscar produto…"
                    class="h-8 w-full rounded-md border border-input bg-background pl-8 pr-3 text-xs outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>

              <ul class="flex-1 divide-y divide-border overflow-y-auto">
                <li
                  v-if="maisVendidosVisiveis.length === 0"
                  class="p-4 text-center text-sm text-muted-foreground"
                >
                  Nenhum produto encontrado.
                </li>
                <li v-for="(p, idx) in maisVendidosVisiveis" :key="p.id">
                  <button
                    type="button"
                    class="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-accent"
                    @click="editarProduto(detalheProduto(p.id))"
                  >
                    <span
                      class="flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                      :class="
                        idx === 0
                          ? 'bg-amber-400/20 text-amber-600'
                          : idx === 1
                            ? 'bg-slate-400/20 text-slate-600'
                            : idx === 2
                              ? 'bg-orange-400/20 text-orange-700'
                              : 'bg-muted text-muted-foreground'
                      "
                    >
                      {{ idx + 1 }}
                    </span>
                    <div class="min-w-0 flex-1">
                      <div class="flex items-center justify-between gap-2">
                        <span class="truncate text-sm">{{ p.nome }}</span>
                        <span class="shrink-0 text-sm font-semibold">{{ p.vendidos30d }} un.</span>
                      </div>
                      <div class="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          class="h-full rounded-full bg-primary"
                          :style="{ width: `${(p.vendidos30d / maxVendidos30d) * 100}%` }"
                        />
                      </div>
                    </div>
                    <Pencil class="size-3.5 shrink-0 text-muted-foreground" />
                  </button>
                </li>
              </ul>

              <div v-if="limiteMaisVendidos < maisVendidosFiltrados.length" class="shrink-0 border-t border-border p-2">
                <Button variant="ghost" size="sm" class="w-full cursor-pointer text-xs" @click="carregarMaisVendidos">
                  Carregar mais ({{ maisVendidosFiltrados.length - limiteMaisVendidos }} restantes)
                </Button>
              </div>
            </div>
          </Section>
        </div>
      </TabsContent>

      <!-- ============================= COMPRAS ============================= -->
      <TabsContent value="compras" class="space-y-4">
        <div class="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <MetricCard
            rotulo="Total comprado"
            :valor="brl(compras.reduce((s, c) => s + totalDoc(c.itens), 0))"
            tom="info"
          />
          <MetricCard rotulo="Compras no período" :valor="String(compras.length)" />
          <MetricCard rotulo="Produtos a repor" :valor="String(baixos.length)" tom="warning" />
        </div>

        <Section titulo="Compras por fornecedor" :descricao="`${comprasPorFornecedor.length} fornecedores no período`">
          <div class="overflow-x-auto">
            <div
              class="h-64 p-3 md:p-4"
              :style="{ minHeight: Math.max(comprasPorFornecedor.length * 44, 200) + 'px' }"
            >
              <Bar :data="dadosComprasPorFornecedor" :options="opcoesComprasPorFornecedor" />
            </div>
          </div>
        </Section>

        <Section titulo="Produtos vendidos que precisam de reposição" descricao="Clique em um produto para editar o cadastro.">
          <div class="border-b border-border p-2">
            <div class="relative">
              <Search class="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                v-model="buscaReposicao"
                type="text"
                placeholder="Buscar produto…"
                class="h-8 w-full rounded-md border border-input bg-background pl-8 pr-3 text-xs outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>

          <ul class="max-h-[360px] divide-y divide-border overflow-y-auto">
            <li v-if="baixosFiltrados.length === 0" class="p-4 text-center text-sm text-muted-foreground">
              Nenhum produto encontrado.
            </li>
            <li v-for="p in baixosFiltrados" :key="p.id">
              <button
                type="button"
                class="grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent"
                @click="editarProduto(p)"
              >
                <div class="min-w-0">
                  <p class="truncate text-sm font-medium">{{ p.nome }}</p>
                  <p class="text-meta">Vendidos: {{ p.vendidos30d }} un. · mínimo {{ p.minimo }}</p>
                </div>
                <StatusPill :tom="nivelEstoque(p) === 'sem' ? 'danger' : 'warning'">
                  {{ nivelEstoque(p) === 'sem' ? 'Sem estoque' : `${p.estoque} un.` }}
                </StatusPill>
                <Pencil class="size-3.5 shrink-0 text-muted-foreground" />
              </button>
            </li>
          </ul>
        </Section>
      </TabsContent>

      <!-- ============================= PRODUTOS ============================= -->
      <TabsContent value="produtos" class="space-y-4">
        <div class="grid gap-4 lg:grid-cols-2">
          <Section titulo="Produtos por grupo" descricao="Distribuição percentual por grupo cadastrado.">
            <div class="grid gap-4 p-3 sm:grid-cols-2 md:p-4">
              <div class="h-64">
                <Pie :data="dadosProdutosPorGrupo" :options="opcoesDonut" />
              </div>
              <ul class="max-h-64 space-y-1 overflow-y-auto">
                <li v-for="(p, i) in produtosPorGrupo" :key="p.nome">
                  <button
                    type="button"
                    class="flex w-full cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-accent"
                    :class="grupoAtivo === p.nome ? 'bg-accent' : ''"
                    @click="alternarGrupo(p.nome)"
                  >
                    <span class="flex min-w-0 items-center gap-2">
                      <span
                        class="size-2.5 shrink-0 rounded-full"
                        :style="{ backgroundColor: paleta[i % paleta.length] }"
                      />
                      <span class="truncate">{{ p.nome }}</span>
                    </span>
                    <span class="shrink-0 text-muted-foreground">
                      {{ p.valor }} · {{ totalProdutosGrupo > 0 ? Math.round((p.valor / totalProdutosGrupo) * 100) : 0 }}%
                    </span>
                  </button>
                </li>
              </ul>
            </div>
          </Section>

          <Section titulo="Situação do estoque">
            <ul class="divide-y divide-border">
              <li
                v-for="n in ['normal', 'baixo', 'sem']"
                :key="n"
                class="flex items-center justify-between px-4 py-3.5"
              >
                <StatusPill :tom="n === 'normal' ? 'success' : n === 'baixo' ? 'warning' : 'danger'">
                  {{ n === 'normal' ? 'Estoque normal' : n === 'baixo' ? 'Estoque baixo' : 'Sem estoque' }}
                </StatusPill>
                <span class="text-sm font-semibold">
                  {{ produtos.filter((p) => nivelEstoque(p) === n).length }} produtos
                </span>
              </li>
            </ul>
          </Section>

          <Section titulo="Produtos por marca" :descricao="`${produtosPorMarca.length} marcas cadastradas`">
            <div class="overflow-x-auto">
              <div
                class="h-64 p-3 md:p-4"
                :style="{ minHeight: Math.max(produtosPorMarca.length * 40, 200) + 'px' }"
              >
                <Bar :data="dadosProdutosPorMarca" :options="opcoesProdutosPorMarca" />
              </div>
            </div>
          </Section>

          <Section titulo="Produtos ativos × inativos">
            <div class="grid gap-4 p-3 sm:grid-cols-2 md:p-4">
              <div class="h-56">
                <Pie :data="dadosProdutosPorStatus" :options="opcoesDonutStatus" />
              </div>
              <ul class="space-y-1">
                <li
                  v-for="(p, i) in produtosPorStatus"
                  :key="p.nome"
                  class="flex items-center justify-between gap-2 rounded-md px-2 py-2 text-sm"
                >
                  <span class="flex min-w-0 items-center gap-2">
                    <span
                      class="size-2.5 shrink-0 rounded-full"
                      :style="{ backgroundColor: i === 0 ? paleta[0] : '#94a3b8' }"
                    />
                    <span class="truncate">{{ p.nome }}</span>
                  </span>
                  <span class="shrink-0 text-muted-foreground">
                    {{ p.valor }} · {{ totalProdutosStatus > 0 ? Math.round((p.valor / totalProdutosStatus) * 100) : 0 }}%
                  </span>
                </li>
              </ul>
            </div>
          </Section>
        </div>
      </TabsContent>

      <!-- ============================= PESSOAS ============================= -->
      <TabsContent value="pessoas" class="space-y-4">
        <div class="grid gap-4 lg:grid-cols-2">
          <Section titulo="Pessoas por grupo">
            <div class="h-64 p-3 md:p-4">
              <Bar :data="dadosPessoasPorGrupo" :options="opcoesPessoasPorGrupo" />
            </div>
          </Section>
          <Section titulo="Pessoas por gênero">
            <div class="grid gap-4 p-3 sm:grid-cols-2 md:p-4">
              <div class="h-64">
                <Pie :data="dadosPessoasPorGenero" :options="opcoesPizza" />
              </div>
              <ul class="space-y-1">
                <li
                  v-for="(p, i) in porGeneroPessoas"
                  :key="p.nome"
                  class="flex items-center justify-between gap-2 rounded-md px-2 py-2 text-sm"
                >
                  <span class="flex min-w-0 items-center gap-2">
                    <span
                      class="size-2.5 shrink-0 rounded-full"
                      :style="{ backgroundColor: paleta[i % paleta.length] }"
                    />
                    <span class="truncate">{{ p.nome }}</span>
                  </span>
                  <span class="shrink-0 text-muted-foreground">
                    {{ p.valor }} · {{ totalPessoasGenero > 0 ? Math.round((p.valor / totalPessoasGenero) * 100) : 0 }}%
                  </span>
                </li>
              </ul>
            </div>
          </Section>
        </div>

        <Section titulo="Pessoas por faixa etária" descricao="Calculada a partir da data de nascimento cadastrada.">
          <div class="h-64 p-3 md:p-4">
            <Bar :data="dadosPessoasPorFaixaEtaria" :options="opcoesPessoasPorFaixaEtaria" />
          </div>
        </Section>
      </TabsContent>
    </Tabs>
  </div>

  <NewProduct v-model:open="produtoModalAberto" :produto="produtoEditando" @salvo="produtoSalvo" />
</template>