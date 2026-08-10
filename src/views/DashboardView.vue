<script setup>
import { computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { Line, Bar } from 'vue-chartjs'
import {
  ArrowDownRight,
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
import {
  brl,
  compras,
  dataBR,
  maisVendidos,
  nivelEstoque,
  produtos,
  totalDoc,
  vendas,
  vendasPorDia,
  vendasPorGrupo,
} from '@/lib/mockData'

onMounted(() => {
  document.title = 'Dashboard — Estoque Pro'
})

const hoje = '2026-08-10'

// ---------- Totais gerais (não mais limitado a um período de 7 dias) ----------
const vendasHoje = computed(() => vendas.filter((v) => v.data === hoje && v.status !== 'cancelada'))
const totalHoje = computed(() =>
  vendasHoje.value.reduce((s, v) => s + totalDoc(v.itens, v.desconto), 0)
)

const vendasValidas = computed(() => vendas.filter((v) => v.status !== 'cancelada'))
const totalVendas = computed(() =>
  vendasValidas.value.reduce((s, v) => s + totalDoc(v.itens, v.desconto), 0)
)

const comprasValidas = computed(() => compras.filter((c) => c.status !== 'cancelada'))
const totalCompras = computed(() =>
  comprasValidas.value.reduce((s, c) => s + totalDoc(c.itens), 0)
)

const baixos = computed(() => produtos.filter((p) => nivelEstoque(p) === 'baixo'))
const semEstoque = computed(() => produtos.filter((p) => nivelEstoque(p) === 'sem'))
const semVendas = computed(() => produtos.filter((p) => p.vendidos30d === 0 && p.status === 'ativo'))

const atencao = computed(() => [...semEstoque.value, ...baixos.value])

// ---------- Atividades recentes: todas as movimentações, mais recentes primeiro ----------
const atividades = computed(() =>
  [
    ...vendas.map((v) => ({
      id: `venda-${v.id}`,
      tipo: 'saida',
      titulo: `Venda ${v.numero} · ${v.cliente}`,
      data: v.data,
      valor: totalDoc(v.itens, v.desconto),
    })),
    ...compras.map((c) => ({
      id: `compra-${c.id}`,
      tipo: 'entrada',
      titulo: `Compra ${c.numero} · ${c.fornecedor}`,
      data: c.data,
      valor: totalDoc(c.itens),
    })),
  ].sort((a, b) => (a.data < b.data ? 1 : -1))
)

// ---------- Gráfico: vendas x compras por dia (Line/Area) ----------
const chartDataVendasCompras = computed(() => ({
  labels: vendasPorDia.map((d) => d.dia),
  datasets: [
    {
      label: 'Vendas',
      data: vendasPorDia.map((d) => d.vendas),
      borderColor: '#00BC7D',
      backgroundColor: 'rgba(49, 202, 146, 0.15)',
      fill: true,
      tension: 0.35,
      pointRadius: 0,
      pointHoverRadius: 4,
    },
    {
      label: 'Compras',
      data: vendasPorDia.map((d) => d.compras),
      borderColor: '#F97316',
      backgroundColor: 'rgba(249, 115, 22, 0.12)',
      borderDash: [4, 4],
      fill: true,
      tension: 0.35,
      pointRadius: 0,
      pointHoverRadius: 4,
    },
  ],
}))

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
      ticks: { callback: (v) => `${v / 1000}k` },
    },
  },
}

// ---------- Gráfico: vendas por grupo (Bar horizontal) ----------
const chartDataGrupo = computed(() => ({
  labels: vendasPorGrupo.map((g) => g.grupo),
  datasets: [
    {
      label: 'Vendas',
      data: vendasPorGrupo.map((g) => g.valor),
      backgroundColor: '#00BC7D',
      borderRadius: 6,
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
        <RouterLink to="/compras/nova">
          <ShoppingCart class="size-4" /> Nova compra
        </RouterLink>
      </Button>
      <Button as-child class="bg-emerald-500 hover:bg-emerald-600 text-black" variant="primary">
        <RouterLink to="/vendas/nova">
          <Plus class="size-4" /> Nova venda
        </RouterLink>
      </Button>
    </template>
  </PageHeader>

  <div class="space-y-4 p-4 md:space-y-5 md:p-6">
    <div class="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <MetricCard
        rotulo="Vendas de hoje"
        :valor="brl(totalHoje)"
        :apoio="`${vendasHoje.length} vendas registradas`"
        tom="success"
        :icone="Receipt"
      />
      <MetricCard
        rotulo="Total de vendas"
        :valor="brl(totalVendas)"
        :apoio="`${vendasValidas.length} vendas no total`"
        tom="success"
        :icone="TrendingUp"
      />
      <MetricCard
        rotulo="Total de compras"
        :valor="brl(totalCompras)"
        :apoio="`${comprasValidas.length} compras no total`"
        tom="info"
        :icone="ShoppingCart"
      />
      <MetricCard
        rotulo="Produtos cadastrados"
        :valor="String(produtos.length)"
        :apoio="`${produtos.filter((p) => p.status === 'ativo').length} ativos`"
        :icone="Package"
      />
      <MetricCard
        rotulo="Estoque baixo"
        :valor="String(baixos.length + semEstoque.length)"
        :apoio="`${semEstoque.length} sem estoque`"
        tom="warning"
        :icone="TriangleAlert"
      />
    </div>

    <Section
      v-if="baixos.length > 0 || semEstoque.length > 0"
      titulo="Precisa da sua atenção"
      descricao="Produtos que podem faltar para as próximas vendas."
    >
      <template #acoes>
        <Button as-child variant="outline" size="sm">
          <RouterLink to="/compras/nova">Repor estoque</RouterLink>
        </Button>
      </template>

      <ul class="divide-y divide-border">
        <li v-for="p in atencao" :key="p.id">
          <RouterLink
            :to="`/produtos/${p.id}`"
            class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/60 md:px-5"
          >
            <div class="min-w-0">
              <p class="truncate text-sm font-medium">{{ p.nome }}</p>
              <p class="truncate text-xs text-muted-foreground">
                {{ p.sku }} · {{ p.grupo }} · mínimo {{ p.minimo }} un.
              </p>
            </div>
            <StatusPill :tom="nivelEstoque(p) === 'sem' ? 'danger' : 'warning'">
              {{ nivelEstoque(p) === 'sem' ? 'Sem estoque' : `${p.estoque} un. restantes` }}
            </StatusPill>
          </RouterLink>
        </li>
      </ul>
    </Section>

    <div class="grid gap-4 xl:grid-cols-3">
      <Section
        titulo="Vendas e compras por dia"
        descricao="Entradas (compras) e saídas (vendas) do período."
        class="xl:col-span-2"
      >
        <div class="h-64 p-3 md:h-72 md:p-4">
          <Line :data="chartDataVendasCompras" :options="chartOptionsVendasCompras" />
        </div>
      </Section>

      <Section titulo="Vendas por grupo" descricao="Participação de cada categoria.">
        <div class="h-64 p-3 md:h-72 md:p-4">
          <Bar :data="chartDataGrupo" :options="chartOptionsGrupo" />
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
          <li
            v-for="(p, i) in maisVendidos"
            :key="p.id"
            class="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 md:px-5"
          >
            <span class="grid size-6 place-items-center rounded-md bg-muted text-xs font-semibold">
              {{ i + 1 }}
            </span>
            <div class="min-w-0">
              <p class="truncate text-sm font-medium">{{ p.nome }}</p>
              <p class="truncate text-xs text-muted-foreground">{{ p.grupo }}</p>
            </div>
            <span class="text-sm font-semibold">{{ p.vendidos30d }} un.</span>
          </li>
        </ul>
      </Section>

      <Section titulo="Atividades recentes" descricao="Todas as movimentações de estoque.">
        <ul class="max-h-72 divide-y divide-border overflow-y-auto">
          <li
            v-for="a in atividades"
            :key="a.id"
            class="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 md:px-5"
          >
            <span
              class="grid size-7 place-items-center rounded-lg"
              :class="a.tipo === 'saida' ? 'bg-primary/15 text-primary' : 'bg-blue-500/15 text-blue-600'"
            >
              <ArrowUpRight v-if="a.tipo === 'saida'" class="size-4" aria-hidden="true" />
              <ArrowDownRight v-else class="size-4" aria-hidden="true" />
            </span>
            <div class="min-w-0">
              <p class="truncate text-sm font-medium">{{ a.titulo }}</p>
              <p class="text-xs text-muted-foreground">
                {{ dataBR(a.data) }} · {{ a.tipo === 'saida' ? 'saída de estoque' : 'entrada de estoque' }}
              </p>
            </div>
            <span class="text-sm font-semibold">{{ brl(a.valor) }}</span>
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
          {{ p.nome }} · {{ p.estoque }} un.
        </StatusPill>
      </div>
    </Section>
  </div>
</template>