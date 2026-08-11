<script setup>
import { computed, onMounted, ref } from 'vue'
import { Download, FileBarChart, Package, ShoppingCart, Users } from 'lucide-vue-next'
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

import PageHeader from '@/components/page-shell/PageHeader.vue'
import Section from '@/components/page-shell/Section.vue'
import TableSkeleton from '@/components/page-shell/TableSkeleton.vue'
import  MetricCard from '@/components/ui-kit/MetricCard.vue'
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
  Filler
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

function exportar() {
  sucesso('Relatório exportado', 'O arquivo CSV foi gerado com sucesso.')
}

// ---- Cores do tema (resolvidas em runtime a partir das CSS vars) ----
const paleta = ref(['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4'])
const corEixo = ref('#94a3b8')
const corGrade = ref('#e2e8f0')
const corPainel = ref('#ffffff')
const corTexto = ref('#0f172a')
const corTextoSecundario = ref('#64748b')

onMounted(() => {
  const estilo = getComputedStyle(document.documentElement)
  const lerVar = (nome, fallback) => estilo.getPropertyValue(nome).trim() || fallback

  paleta.value = [1, 2, 3, 4, 5].map((n) => lerVar(`--chart-${n}`, paleta.value[n - 1]))
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

// ---- Dados derivados (mesma lógica da versão de referência) ----
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

// ---- Chart: Vendas por dia (linha) ----
const dadosVendasPorDia = computed(() => ({
  labels: vendasPorDia.map((v) => v.dia),
  datasets: [
    {
      label: 'Vendas',
      data: vendasPorDia.map((v) => v.vendas),
      borderColor: paleta.value[0],
      backgroundColor: paleta.value[0],
      tension: 0.35,
      pointRadius: 0,
      borderWidth: 2,
      fill: false,
    },
  ],
}))

const opcoesVendasPorDia = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: tooltipBase.value },
  scales: {
    x: { grid: { display: false }, ticks: { color: corEixo.value, font: { size: 12 } } },
    y: {
      grid: { color: corGrade.value },
      ticks: { color: corEixo.value, font: { size: 12 }, callback: (v) => `${v / 1000}k` },
    },
  },
}))

// ---- Chart: Vendas por grupo (barra) ----
const dadosVendasPorGrupo = computed(() => ({
  labels: vendasPorGrupo.map((v) => v.grupo),
  datasets: [
    {
      label: 'Vendas',
      data: vendasPorGrupo.map((v) => v.valor),
      backgroundColor: paleta.value[0],
      borderRadius: 6,
      maxBarThickness: 40,
    },
  ],
}))

const opcoesVendasPorGrupo = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: tooltipBase.value },
  scales: {
    x: { grid: { display: false }, ticks: { color: corEixo.value, font: { size: 12 } } },
    y: {
      grid: { color: corGrade.value },
      ticks: { color: corEixo.value, font: { size: 12 }, callback: (v) => `${v / 1000}k` },
    },
  },
}))

// ---- Chart: Compras por fornecedor (barra horizontal) ----
const dadosComprasPorFornecedor = computed(() => ({
  labels: comprasPorFornecedor.value.map((c) => c.nome),
  datasets: [
    {
      label: 'Compras',
      data: comprasPorFornecedor.value.map((c) => c.valor),
      backgroundColor: paleta.value[1],
      borderRadius: 6,
      maxBarThickness: 24,
    },
  ],
}))

const opcoesComprasPorFornecedor = computed(() => ({
  indexAxis: 'y',
  responsive: true,
  maintainAspectRatio: false,
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
      backgroundColor: produtosPorGrupo.value.map((_, i) => paleta.value[i % paleta.value.length]),
      borderWidth: 0,
    },
  ],
}))

const opcoesDonut = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  cutout: '55%',
  plugins: {
    legend: { position: 'bottom', labels: { color: corEixo.value, boxWidth: 10, font: { size: 11 } } },
    tooltip: tooltipBase.value,
  },
}))

// ---- Chart: Pessoas por grupo (barra) ----
const dadosPessoasPorGrupo = computed(() => ({
  labels: porGrupoPessoas.value.map((p) => p.nome),
  datasets: [
    {
      label: 'Pessoas',
      data: porGrupoPessoas.value.map((p) => p.valor),
      backgroundColor: paleta.value[0],
      borderRadius: 6,
      maxBarThickness: 40,
    },
  ],
}))

const opcoesPessoasPorGrupo = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
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
      backgroundColor: porGeneroPessoas.value.map((_, i) => paleta.value[i % paleta.value.length]),
      borderWidth: 0,
    },
  ],
}))

const opcoesPizza = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom', labels: { color: corEixo.value, boxWidth: 10, font: { size: 11 } } },
    tooltip: tooltipBase.value,
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

      <!-- VENDAS -->
      <TabsContent value="vendas" class="space-y-4">
        <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard rotulo="Faturamento" :valor="faturamento" tom="success" />
          <MetricCard rotulo="Vendas realizadas" :valor="String(vendas.length)" />
          <MetricCard rotulo="Itens vendidos" :valor="itensVendidos" />
          <MetricCard rotulo="Produtos sem vendas" :valor="String(semVendas.length)" tom="warning" />
        </div>

        <Section titulo="Vendas por dia" descricao="Evolução do faturamento no período.">
          <TableSkeleton v-if="carregando" :linhas="4" :colunas="3" />
          <div v-else class="h-64 p-3 md:p-4">
            <Line :data="dadosVendasPorDia" :options="opcoesVendasPorDia" />
          </div>
        </Section>

        <div class="grid gap-4 lg:grid-cols-2">
          <Section titulo="Vendas por grupo">
            <div class="h-60 p-3 md:p-4">
              <Bar :data="dadosVendasPorGrupo" :options="opcoesVendasPorGrupo" />
            </div>
          </Section>
          <Section titulo="Produtos mais vendidos">
            <ul class="divide-y divide-border">
              <li
                v-for="p in maisVendidos"
                :key="p.id"
                class="flex items-center justify-between gap-3 px-4 py-3"
              >
                <span class="truncate text-sm">{{ p.nome }}</span>
                <span class="shrink-0 text-sm font-semibold">{{ p.vendidos30d }} un.</span>
              </li>
            </ul>
          </Section>
        </div>
      </TabsContent>

      <!-- COMPRAS -->
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

        <Section titulo="Compras por fornecedor">
          <div class="h-64 p-3 md:p-4">
            <Bar :data="dadosComprasPorFornecedor" :options="opcoesComprasPorFornecedor" />
          </div>
        </Section>

        <Section titulo="Produtos vendidos que precisam de reposição">
          <ul class="divide-y divide-border">
            <li
              v-for="p in baixos"
              :key="p.id"
              class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3"
            >
              <div class="min-w-0">
                <p class="truncate text-sm font-medium">{{ p.nome }}</p>
                <p class="text-meta">Vendidos: {{ p.vendidos30d }} un. · mínimo {{ p.minimo }}</p>
              </div>
              <StatusPill :tom="nivelEstoque(p) === 'sem' ? 'danger' : 'warning'">
                {{ nivelEstoque(p) === 'sem' ? 'Sem estoque' : `${p.estoque} un.` }}
              </StatusPill>
            </li>
          </ul>
        </Section>
      </TabsContent>

      <!-- PRODUTOS -->
      <TabsContent value="produtos" class="space-y-4">
        <div class="grid gap-4 lg:grid-cols-2">
          <Section titulo="Produtos por grupo">
            <div class="h-64 p-3 md:p-4">
              <Pie :data="dadosProdutosPorGrupo" :options="opcoesDonut" />
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
              <li class="flex items-center justify-between px-4 py-3.5">
                <StatusPill tom="neutral">Inativos</StatusPill>
                <span class="text-sm font-semibold">
                  {{ produtos.filter((p) => p.status === 'inativo').length }} produtos
                </span>
              </li>
            </ul>
          </Section>
        </div>
      </TabsContent>

      <!-- PESSOAS -->
      <TabsContent value="pessoas" class="space-y-4">
        <div class="grid gap-4 lg:grid-cols-2">
          <Section titulo="Pessoas por grupo">
            <div class="h-64 p-3 md:p-4">
              <Bar :data="dadosPessoasPorGrupo" :options="opcoesPessoasPorGrupo" />
            </div>
          </Section>
          <Section titulo="Pessoas por gênero">
            <div class="h-64 p-3 md:p-4">
              <Pie :data="dadosPessoasPorGenero" :options="opcoesPizza" />
            </div>
          </Section>
        </div>
      </TabsContent>
    </Tabs>
  </div>
</template>