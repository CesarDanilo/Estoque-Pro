<script setup>
import { computed, onMounted, ref } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { Loader2, MoreHorizontal, Package, Pencil, Plus, Power, Trash2 } from 'lucide-vue-next'

import { Button } from '@/components/ui/button'
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import EmptyState from '@/components/page-shell/EmptyState.vue'
import PageHeader from '@/components/page-shell/PageHeader.vue'
import Section from '@/components/page-shell/Section.vue'
import MetricCard from '@/components/ui-kit/MetricCard.vue'
import SearchField from '@/components/ui-kit/SearchField.vue'
import StatusPill from '@/components/ui-kit/StatusPill.vue'
import NewProduct from '@/components/modal/product/NewProduct.vue'

import { useFeedback } from '@/composables/useFeedBack'
import { productService } from '@/services/productService'
import { groupService } from '@/services/groupService'

onMounted(() => {
  document.title = 'Produtos — Estoque Pro'
})

const queryClient = useQueryClient()
const { sucesso, erro } = useFeedback()

const PORPAGINA = 8
const BUSCA_MAX = 60

// ---- Filtros e Estados ----
const buscaBruta = ref('')
const busca = computed({
  get: () => buscaBruta.value,
  set: (valor) => {
    buscaBruta.value = (valor ?? '').slice(0, BUSCA_MAX)
  },
})

const grupoFiltro = ref('todos')
const statusFiltro = ref('todos')
const estoqueFiltro = ref('todos')
const pagina = ref(1)

const modalAberto = ref(false)
const produtoEditando = ref(null)
const produtoParaExcluir = ref(null)

// ---- Funções Auxiliares de Formatação ----
function formatarMoeda(valor) {
  const v = Number(valor) || 0
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function calcularNivelEstoque(p) {
  const atual = Number(p.stock_quantity ?? p.estoque) || 0
  const min = Number(p.min_stock_quantity ?? p.minimo) || 0

  if (atual === 0) return 'sem'
  if (atual <= min) return 'baixo'
  return 'normal'
}

function tomEstoque(p) {
  const nivel = calcularNivelEstoque(p)
  const qtd = p.stock_quantity ?? p.estoque ?? 0

  if (nivel === 'sem') return { tom: 'danger', texto: 'Sem estoque' }
  if (nivel === 'baixo') return { tom: 'warning', texto: `Baixo · ${qtd} un.` }
  return { tom: 'success', texto: `${qtd} un.` }
}

function resetPag() {
  pagina.value = 1
}

// ---- TanStack Query: Carregar Grupos para o Filtro ----
const { data: listaGruposData } = useQuery({
  queryKey: ['groups', 'filtro'],
  queryFn: () => groupService.listar({ per_page: 100 }),
  staleTime: 1000 * 60 * 10,
})

const listaGrupos = computed(() => {
  const payload = listaGruposData?.value
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.data?.data)) return payload.data.data
  return []
})

// ---- TanStack Query: Buscar Lista de Produtos ----
const {
  data: rawProdutos,
  isLoading,
  isError,
} = useQuery({
  queryKey: ['products'],
  queryFn: () => productService.getAll(),
  staleTime: 1000 * 60 * 5,
})

const listaProdutos = computed(() => {
  if (Array.isArray(rawProdutos?.value)) return rawProdutos.value
  return rawProdutos?.value?.data || []
})

// ---- TanStack Mutations ----
const deleteMutation = useMutation({
  mutationFn: (id) => productService.delete(id),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['products'] })
    sucesso(
      'Produto excluído',
      `O produto "${produtoParaExcluir.value?.name || produtoParaExcluir.value?.nome || ''}" foi removido com sucesso.`,
    )
    produtoParaExcluir.value = null
  },
  onError: (err) => {
    erro('Erro ao excluir', err.response?.data?.message || 'Não foi possível excluir o produto.')
  },
})

const toggleStatusMutation = useMutation({
  mutationFn: ({ id, payload }) => productService.update(id, payload),
  onSuccess: (_, variables) => {
    queryClient.invalidateQueries({ queryKey: ['products'] })
    const statusTxt = variables.payload.active ? 'ativado' : 'inativado'
    sucesso('Status atualizado', `O produto foi ${statusTxt} com sucesso.`)
  },
  onError: (err) => {
    erro(
      'Erro ao alterar status',
      err.response?.data?.message || 'Não foi possível alterar a situação.',
    )
  },
})

// ---- Computados: Filtragem Local e Paginação ----
const produtosFiltrados = computed(() => {
  const produtos = listaProdutos.value
  if (!produtos || !produtos.length) return []

  return produtos.filter((p) => {
    // Filtro Grupo
    if (grupoFiltro.value !== 'todos' && String(p.group_id) !== String(grupoFiltro.value))
      return false

    // Filtro Status
    const ativo = typeof p.active !== 'undefined' ? p.active : p.ativo
    if (statusFiltro.value === 'ativo' && !ativo) return false
    if (statusFiltro.value === 'inativo' && ativo) return false

    // Filtro Nível de Estoque
    if (estoqueFiltro.value !== 'todos' && calcularNivelEstoque(p) !== estoqueFiltro.value)
      return false

    // Busca textual (Nome, SKU, Fornecedor ou Grupo)
    const termo = busca.value.trim().toLowerCase()
    if (termo === '') return true

    const nome = (p.name || p.nome || '').toLowerCase()
    const sku = (p.sku || '').toLowerCase()
    const grupoNome = (p.group?.name || p.grupo?.nome || '').toLowerCase()
    const fornecedorNome = (p.supplier?.name || p.fornecedor?.nome || '').toLowerCase()

    return (
      nome.includes(termo) ||
      sku.includes(termo) ||
      grupoNome.includes(termo) ||
      fornecedorNome.includes(termo)
    )
  })
})

const totalPaginas = computed(() =>
  Math.max(1, Math.ceil(produtosFiltrados.value.length / PORPAGINA)),
)

const paginaAtual = computed(() => {
  if (pagina.value > totalPaginas.value) {
    return totalPaginas.value
  }
  return Math.max(1, pagina.value)
})

const visiveis = computed(() =>
  produtosFiltrados.value.slice((paginaAtual.value - 1) * PORPAGINA, paginaAtual.value * PORPAGINA),
)

// ---- Métricas Rápidas ----
const totalProdutos = computed(() => listaProdutos.value.length)
const totalNormal = computed(
  () => listaProdutos.value.filter((p) => calcularNivelEstoque(p) === 'normal').length,
)
const totalBaixo = computed(
  () => listaProdutos.value.filter((p) => calcularNivelEstoque(p) === 'baixo').length,
)
const totalSem = computed(
  () => listaProdutos.value.filter((p) => calcularNivelEstoque(p) === 'sem').length,
)

// ---- Ações ----
function abrirNovo() {
  produtoEditando.value = null
  modalAberto.value = true
}

function abrirEdicao(p) {
  produtoEditando.value = p
  modalAberto.value = true
}

function alternarStatus(p) {
  const ativoAtual = typeof p.active !== 'undefined' ? p.active : p.ativo
  toggleStatusMutation.mutate({
    id: p.id,
    payload: {
      ...p,
      active: !ativoAtual,
    },
  })
}

function confirmarExclusao() {
  const id = produtoParaExcluir.value?.id
  if (!id || deleteMutation.isPending.value) return
  deleteMutation.mutate(id)
}

function aoSalvarProduto() {
  queryClient.invalidateQueries({ queryKey: ['products'] })
}
</script>

<template>
  <div>
    <PageHeader
      titulo="Produtos"
      descricao="Cada produto tem seu estoque atualizado pelas compras (entradas) e vendas (saídas)."
      :trilha="[{ titulo: 'Gestão' }, { titulo: 'Produtos' }]"
    >
      <template #acoes>
        <Button
          class="cursor-pointer bg-emerald-500 font-medium text-black hover:bg-emerald-600"
          @click="abrirNovo"
        >
          <Plus class="size-4" /> Novo produto
        </Button>
      </template>
    </PageHeader>

    <div class="space-y-4 p-4 md:space-y-5 md:p-6">
      <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard rotulo="Total de produtos" :valor="String(totalProdutos)" :icone="Package">
          <template #icone>
            <Package class="size-4" />
          </template>
        </MetricCard>
        <MetricCard rotulo="Estoque normal" :valor="String(totalNormal)" tom="success" />
        <MetricCard rotulo="Estoque baixo" :valor="String(totalBaixo)" tom="warning" />
        <MetricCard rotulo="Sem estoque" :valor="String(totalSem)" tom="danger" />
      </div>

      <Section>
        <div class="space-y-3 border-b border-border p-4 md:p-5">
          <div class="relative md:max-w-md">
            <SearchField
              v-model="busca"
              label="Buscar produto por nome, código SKU, grupo ou fornecedor"
              placeholder="Buscar por nome, código (SKU), grupo…"
              class="w-full"
              :maxlength="BUSCA_MAX"
              @update:model-value="resetPag"
            />
            <span
              class="pointer-events-none absolute right-3 top-1/2 z-10 -translate-y-1/2 select-none text-[11px] font-medium tabular-nums transition-colors"
              :class="busca.length >= BUSCA_MAX ? 'text-red-500' : 'text-muted-foreground/40'"
            >
              {{ busca.length }}/{{ BUSCA_MAX }}
            </span>
          </div>

          <div class="flex gap-2 overflow-x-auto pb-1 md:overflow-visible md:flex-nowrap">
            <Select v-model="grupoFiltro" @update:model-value="resetPag">
              <SelectTrigger
                class="h-10 w-[160px] shrink-0 cursor-pointer bg-surface md:w-auto md:min-w-0 md:flex-1"
                aria-label="Filtrar por grupo"
              >
                <SelectValue placeholder="Grupo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos" class="cursor-pointer">Todos os grupos</SelectItem>
                <SelectItem
                  v-for="g in listaGrupos"
                  :key="g.id"
                  :value="String(g.id)"
                  class="cursor-pointer"
                >
                  {{ g.name }}
                </SelectItem>
              </SelectContent>
            </Select>

            <Select v-model="estoqueFiltro" @update:model-value="resetPag">
              <SelectTrigger
                class="h-10 w-[160px] shrink-0 cursor-pointer bg-surface md:w-auto md:min-w-0 md:flex-1"
                aria-label="Filtrar por estoque"
              >
                <SelectValue placeholder="Estoque" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos" class="cursor-pointer">Qualquer estoque</SelectItem>
                <SelectItem value="normal" class="cursor-pointer">Estoque normal</SelectItem>
                <SelectItem value="baixo" class="cursor-pointer">Estoque baixo</SelectItem>
                <SelectItem value="sem" class="cursor-pointer">Sem estoque</SelectItem>
              </SelectContent>
            </Select>

            <Select v-model="statusFiltro" @update:model-value="resetPag">
              <SelectTrigger
                class="h-10 w-[160px] shrink-0 cursor-pointer bg-surface md:w-auto md:min-w-0 md:flex-1"
                aria-label="Filtrar por situação"
              >
                <SelectValue placeholder="Situação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos" class="cursor-pointer">Todas as situações</SelectItem>
                <SelectItem value="ativo" class="cursor-pointer">Ativos</SelectItem>
                <SelectItem value="inativo" class="cursor-pointer">Inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div
          v-if="isLoading"
          class="p-12 flex flex-col items-center justify-center gap-2 text-muted-foreground"
        >
          <Loader2 class="size-6 animate-spin text-emerald-500" />
          <p class="text-xs">Carregando catálogo de produtos…</p>
        </div>

        <div v-else-if="isError" class="p-8 text-center text-xs text-destructive">
          Ocorreu um erro ao carregar os produtos. Verifique sua conexão.
        </div>

        <EmptyState
          v-else-if="visiveis.length === 0"
          titulo="Nenhum produto encontrado"
          descricao="Ajuste os filtros ou cadastre um novo produto para começar a controlar seu estoque."
        >
          <template #acao>
            <Button
              class="cursor-pointer bg-emerald-500 font-medium text-black hover:bg-emerald-600"
              @click="abrirNovo"
            >
              Cadastrar produto
            </Button>
          </template>
        </EmptyState>

        <template v-else>
          <ul class="divide-y divide-border md:hidden">
            <li v-for="p in visiveis" :key="p.id" class="space-y-2 px-4 py-3.5">
              <div class="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                <div class="min-w-0">
                  <p class="truncate text-sm font-medium">{{ p.name || p.nome }}</p>
                  <p class="truncate text-xs text-muted-foreground font-mono">
                    {{ p.sku }} · {{ p.group?.name || p.grupo?.nome || 'Sem grupo' }}
                  </p>
                </div>
                <span class="shrink-0 text-sm font-semibold">{{
                  formatarMoeda(p.sale_price ?? p.preco)
                }}</span>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <StatusPill :tom="tomEstoque(p).tom">{{ tomEstoque(p).texto }}</StatusPill>
                <StatusPill :tom="(p.active ?? p.ativo) ? 'info' : 'neutral'">
                  {{ (p.active ?? p.ativo) ? 'Ativo' : 'Inativo' }}
                </StatusPill>
                <span v-if="p.supplier || p.fornecedor" class="text-xs text-muted-foreground">
                  {{ p.supplier?.name || p.fornecedor?.nome }}
                </span>
              </div>
            </li>
          </ul>

          <div class="hidden overflow-x-auto md:block">
            <table class="w-full text-sm">
              <thead class="text-xs text-muted-foreground">
                <tr class="border-b border-border text-left">
                  <th class="px-5 py-3 font-medium">Produto</th>
                  <th class="px-4 py-3 font-medium">Grupo</th>
                  <th class="px-4 py-3 font-medium">Fornecedor</th>
                  <th class="px-4 py-3 text-right font-medium">Preço Venda</th>
                  <th class="px-4 py-3 font-medium">Estoque</th>
                  <th class="px-4 py-3 font-medium">Situação</th>
                  <th class="px-4 py-3 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border">
                <tr v-for="p in visiveis" :key="p.id" class="transition-colors hover:bg-muted/60">
                  <td class="max-w-[260px] px-5 py-3">
                    <p class="truncate font-medium text-foreground">{{ p.name || p.nome }}</p>
                    <p class="truncate text-xs font-mono text-muted-foreground">{{ p.sku }}</p>
                  </td>
                  <td class="px-4 py-3 text-muted-foreground">
                    {{ p.group?.name || p.grupo?.nome || '-' }}
                  </td>
                  <td class="px-4 py-3 text-muted-foreground">
                    {{ p.supplier?.name || p.fornecedor?.nome || 'Avulso / Sem fornecedor' }}
                  </td>
                  <td class="px-4 py-3 text-right font-medium">
                    {{ formatarMoeda(p.sale_price ?? p.preco) }}
                  </td>
                  <td class="px-4 py-3">
                    <StatusPill :tom="tomEstoque(p).tom">{{ tomEstoque(p).texto }}</StatusPill>
                  </td>
                  <td class="px-4 py-3">
                    <StatusPill :tom="(p.active ?? p.ativo) ? 'info' : 'neutral'">
                      {{ (p.active ?? p.ativo) ? 'Ativo' : 'Inativo' }}
                    </StatusPill>
                  </td>
                  <td class="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger as-child>
                        <Button
                          variant="ghost"
                          size="icon"
                          class="cursor-pointer"
                          :aria-label="`Ações para ${p.name || p.nome}`"
                        >
                          <MoreHorizontal class="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem class="cursor-pointer" @click="abrirEdicao(p)">
                          <Pencil class="size-4" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem class="cursor-pointer" @click="alternarStatus(p)">
                          <Power class="size-4" />
                          {{ (p.active ?? p.ativo) ? 'Inativar' : 'Ativar' }}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          class="cursor-pointer text-destructive"
                          @click="produtoParaExcluir = p"
                        >
                          <Trash2 class="size-4" /> Excluir
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
              {{ produtosFiltrados.length }} produto(s) · página {{ paginaAtual }} de
              {{ totalPaginas }}
            </p>
            <div class="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                class="cursor-pointer disabled:cursor-not-allowed"
                :disabled="paginaAtual === 1"
                @click="pagina = paginaAtual - 1"
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                class="cursor-pointer disabled:cursor-not-allowed"
                :disabled="paginaAtual === totalPaginas"
                @click="pagina = paginaAtual + 1"
              >
                Próxima
              </Button>
            </div>
          </div>
        </template>
      </Section>
    </div>

    <NewProduct v-model:open="modalAberto" :produto="produtoEditando" @salvo="aoSalvarProduto" />

    <AlertDialog
      :open="!!produtoParaExcluir"
      @update:open="
        (o) => {
          if (!o && !deleteMutation.isPending.value) produtoParaExcluir = null
        }
      "
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Excluir {{ produtoParaExcluir?.name || produtoParaExcluir?.nome }}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            O produto sairá do catálogo e não poderá ser selecionado em novas vendas/compras. O
            histórico existente não será alterado.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            class="cursor-pointer"
            :disabled="deleteMutation.isPending.value"
            @click="produtoParaExcluir = null"
          >
            Cancelar
          </AlertDialogCancel>
          <Button
            type="button"
            class="cursor-pointer bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
            :disabled="deleteMutation.isPending.value"
            @click="confirmarExclusao"
          >
            <Loader2 v-if="deleteMutation.isPending.value" class="size-4 animate-spin mr-1.5" />
            {{ deleteMutation.isPending.value ? 'Excluindo…' : 'Excluir' }}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
