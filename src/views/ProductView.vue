<script setup>
import { computed, onMounted, ref } from 'vue'
import { MoreHorizontal, Package, Pencil, Plus, Trash2 } from 'lucide-vue-next'

import PageHeader from '@/components/page-shell/PageHeader.vue'
import Section from '@/components/page-shell/Section.vue'
import EmptyState from '@/components/page-shell/EmptyState.vue'
import TableSkeleton from '@/components/page-shell/TableSkeleton.vue'
import MetricCard from '@/components/ui-kit/MetricCard.vue'
import SearchField from '@/components/ui-kit/SearchField.vue'
import StatusPill from '@/components/ui-kit/StatusPill.vue'
import NewProduct from '@/components/NewProduct.vue'
import { useFeedback } from '@/composables/useFeedBack'

import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import { brl, grupos, marcas, nivelEstoque, produtos, subgrupos } from '@/lib/mockDataProdutos'

onMounted(() => {
  document.title = 'Produtos — Estoque Pro'
})

const PORPAGINA = 8
const BUSCA_MAX = 60

const buscaBruta = ref('')
const busca = computed({
  get: () => buscaBruta.value,
  set: (valor) => {
    buscaBruta.value = (valor ?? '').slice(0, BUSCA_MAX)
  },
})

const grupo = ref('todos')
const subgrupo = ref('todos')
const marca = ref('todas')
const status = ref('todos')
const estoque = ref('todos')
const pagina = ref(1)
const carregando = ref(false)
const excluir = ref(null)

const modalAberto = ref(false)
const produtoEditando = ref(null)

const { sucesso, info } = useFeedback()

const TECLAS_PERMITIDAS = new Set([
  'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
  'Tab', 'Home', 'End', 'Enter', 'Escape', 'Shift', 'Control', 'Alt', 'Meta',
])
function bloquearExcedente(evento) {
  if (TECLAS_PERMITIDAS.has(evento.key) || evento.ctrlKey || evento.metaKey || evento.altKey) {
    return
  }
  if (busca.value.length >= BUSCA_MAX) {
    evento.preventDefault()
  }
}

function resetPag() {
  pagina.value = 1
}

function tomEstoque(p) {
  const nivel = nivelEstoque(p)
  if (nivel === 'sem') return { tom: 'danger', texto: 'Sem estoque' }
  if (nivel === 'baixo') return { tom: 'warning', texto: `Baixo · ${p.estoque} un.` }
  return { tom: 'success', texto: `${p.estoque} un.` }
}

const subgruposFiltrados = computed(() =>
  subgrupos.filter((s) => grupo.value === 'todos' || s.grupo === grupo.value),
)

const filtrados = computed(() =>
  produtos.filter((p) => {
    if (grupo.value !== 'todos' && p.grupo !== grupo.value) return false
    if (subgrupo.value !== 'todos' && p.subgrupo !== subgrupo.value) return false
    if (marca.value !== 'todas' && p.marca !== marca.value) return false
    if (status.value !== 'todos' && p.status !== status.value) return false
    if (estoque.value !== 'todos' && nivelEstoque(p) !== estoque.value) return false

    const termo = busca.value.trim().toLowerCase()
    if (termo === '') return true

    return [p.nome, p.sku, p.marca].some((c) => c.toLowerCase().includes(termo))
  }),
)

const totalPaginas = computed(() => Math.max(1, Math.ceil(filtrados.value.length / PORPAGINA)))
const paginaAtual = computed(() => Math.min(pagina.value, totalPaginas.value))
const visiveis = computed(() =>
  filtrados.value.slice((paginaAtual.value - 1) * PORPAGINA, paginaAtual.value * PORPAGINA),
)

const totalProdutos = produtos.length
const totalNormal = produtos.filter((p) => nivelEstoque(p) === 'normal').length
const totalBaixo = produtos.filter((p) => nivelEstoque(p) === 'baixo').length
const totalSem = produtos.filter((p) => nivelEstoque(p) === 'sem').length

function onGrupoChange(v) {
  grupo.value = v
  subgrupo.value = 'todos'
  resetPag()
}

function abrirNovo() {
  produtoEditando.value = null
  modalAberto.value = true
}

function abrirEdicao(p) {
  produtoEditando.value = p
  modalAberto.value = true
}

function onProdutoSalvo(dados) {
  // Dados mockados: aqui é onde a lista seria atualizada com o retorno da API.
  info('Lista atualizada', 'Assim que a API estiver pronta, a lista recarrega automaticamente.')
}

function confirmarExclusao() {
  sucesso('Produto excluído', 'Produto excluído com sucesso.')
  excluir.value = null
}
</script>

<template>
  <PageHeader
    titulo="Produtos"
    descricao="Cada produto tem seu estoque atualizado pelas compras (entradas) e vendas (saídas)."
    :trilha="[{ titulo: 'Gestão' }, { titulo: 'Produtos' }]"
  >
    <template #acoes>
      <Button class="cursor-pointer bg-emerald-500 text-black hover:bg-emerald-600" @click="abrirNovo">
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
        <div class="relative md:max-w-md" @keydown="bloquearExcedente">
          <SearchField
            v-model="busca"
            label="Buscar produto por nome, código ou marca"
            placeholder="Buscar por nome, código (SKU) ou marca…"
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

        <!-- Filtros: uma única linha, com scroll horizontal no mobile -->
        <div class="flex gap-2 overflow-x-auto pb-1 md:overflow-visible md:flex-nowrap">
          <Select :model-value="grupo" @update:model-value="onGrupoChange">
            <SelectTrigger
              class="h-10 w-[150px] shrink-0 cursor-pointer bg-surface md:w-auto md:min-w-0 md:flex-1"
              aria-label="Filtrar por grupo"
            >
              <SelectValue placeholder="Grupo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos" class="cursor-pointer">Todos os grupos</SelectItem>
              <SelectItem v-for="g in grupos" :key="g.id" :value="g.nome" class="cursor-pointer">
                {{ g.nome }}
              </SelectItem>
            </SelectContent>
          </Select>

          <Select v-model="subgrupo" @update:model-value="resetPag">
            <SelectTrigger
              class="h-10 w-[150px] shrink-0 cursor-pointer bg-surface md:w-auto md:min-w-0 md:flex-1"
              aria-label="Filtrar por subgrupo"
            >
              <SelectValue placeholder="Subgrupo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos" class="cursor-pointer">Todos os subgrupos</SelectItem>
              <SelectItem
                v-for="s in subgruposFiltrados"
                :key="s.id"
                :value="s.nome"
                class="cursor-pointer"
              >
                {{ s.nome }}
              </SelectItem>
            </SelectContent>
          </Select>

          <Select v-model="marca" @update:model-value="resetPag">
            <SelectTrigger
              class="h-10 w-[150px] shrink-0 cursor-pointer bg-surface md:w-auto md:min-w-0 md:flex-1"
              aria-label="Filtrar por marca"
            >
              <SelectValue placeholder="Marca" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas" class="cursor-pointer">Todas as marcas</SelectItem>
              <SelectItem v-for="m in marcas" :key="m.id" :value="m.nome" class="cursor-pointer">
                {{ m.nome }}
              </SelectItem>
            </SelectContent>
          </Select>

          <Select v-model="estoque" @update:model-value="resetPag">
            <SelectTrigger
              class="h-10 w-[150px] shrink-0 cursor-pointer bg-surface md:w-auto md:min-w-0 md:flex-1"
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

          <Select v-model="status" @update:model-value="resetPag">
            <SelectTrigger
              class="h-10 w-[150px] shrink-0 cursor-pointer bg-surface md:w-auto md:min-w-0 md:flex-1"
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

      <TableSkeleton v-if="carregando" :colunas="6" />

      <EmptyState
        v-else-if="visiveis.length === 0"
        titulo="Nenhum produto encontrado"
        descricao="Ajuste os filtros ou cadastre um novo produto para começar a controlar o estoque."
      >
        <template #acao>
          <Button class="cursor-pointer bg-emerald-500 text-black hover:bg-emerald-600" @click="abrirNovo">
            Cadastrar produto
          </Button>
        </template>
      </EmptyState>

      <template v-else>
        <!-- Mobile: cartões -->
        <ul class="divide-y divide-border md:hidden">
          <li v-for="p in visiveis" :key="p.id" class="space-y-2 px-4 py-3.5">
            <div class="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
              <div class="min-w-0">
                <p class="truncate text-sm font-medium">{{ p.nome }}</p>
                <p class="truncate text-xs text-muted-foreground">{{ p.sku }} · {{ p.grupo }} / {{ p.subgrupo }}</p>
              </div>
              <span class="shrink-0 text-sm font-semibold">{{ brl(p.preco) }}</span>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <StatusPill :tom="tomEstoque(p).tom">{{ tomEstoque(p).texto }}</StatusPill>
              <StatusPill :tom="p.status === 'ativo' ? 'info' : 'neutral'">
                {{ p.status === 'ativo' ? 'Ativo' : 'Inativo' }}
              </StatusPill>
              <span class="text-xs text-muted-foreground">{{ p.marca }}</span>
            </div>
          </li>
        </ul>

        <!-- Desktop: tabela -->
        <div class="hidden overflow-x-auto md:block">
          <table class="w-full text-sm">
            <thead class="text-xs text-muted-foreground">
              <tr class="border-b border-border text-left">
                <th class="px-5 py-3 font-medium">Produto</th>
                <th class="px-4 py-3 font-medium">Grupo / Subgrupo</th>
                <th class="px-4 py-3 font-medium">Marca</th>
                <th class="px-4 py-3 text-right font-medium">Preço</th>
                <th class="px-4 py-3 font-medium">Estoque</th>
                <th class="px-4 py-3 font-medium">Situação</th>
                <th class="px-4 py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr v-for="p in visiveis" :key="p.id" class="transition-colors hover:bg-muted/60">
                <td class="max-w-[260px] px-5 py-3">
                  <p class="truncate font-medium">{{ p.nome }}</p>
                  <p class="truncate text-xs text-muted-foreground">{{ p.sku }}</p>
                </td>
                <td class="px-4 py-3 text-muted-foreground">{{ p.grupo }} / {{ p.subgrupo }}</td>
                <td class="px-4 py-3 text-muted-foreground">{{ p.marca }}</td>
                <td class="px-4 py-3 text-right font-medium">{{ brl(p.preco) }}</td>
                <td class="px-4 py-3">
                  <StatusPill :tom="tomEstoque(p).tom">{{ tomEstoque(p).texto }}</StatusPill>
                </td>
                <td class="px-4 py-3">
                  <StatusPill :tom="p.status === 'ativo' ? 'info' : 'neutral'">
                    {{ p.status === 'ativo' ? 'Ativo' : 'Inativo' }}
                  </StatusPill>
                </td>
                <td class="px-4 py-3 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger as-child>
                      <Button variant="ghost" size="icon" class="cursor-pointer" :aria-label="`Ações para ${p.nome}`">
                        <MoreHorizontal class="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem class="cursor-pointer" @click="abrirEdicao(p)">
                        <Pencil class="size-4" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem class="cursor-pointer text-destructive" @click="excluir = p">
                        <Trash2 class="size-4" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-border px-4 py-3 md:px-5">
          <p class="text-xs text-muted-foreground">
            {{ filtrados.length }} produto(s) · página {{ paginaAtual }} de {{ totalPaginas }}
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

  <NewProduct v-model:open="modalAberto" :produto="produtoEditando" @salvo="onProdutoSalvo" />

  <AlertDialog :open="!!excluir" @update:open="(o) => !o && (excluir = null)">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Excluir {{ excluir?.nome }}?</AlertDialogTitle>
        <AlertDialogDescription>
          O produto sairá da lista e não poderá mais ser vendido. As vendas já registradas não
          serão alteradas.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel class="cursor-pointer">Cancelar</AlertDialogCancel>
        <AlertDialogAction class="cursor-pointer bg-red-500 text-white hover:bg-red-600" @click="confirmarExclusao">
          Excluir
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>