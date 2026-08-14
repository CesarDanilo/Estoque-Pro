<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import {
  ArchiveRestore,
  AlertTriangle,
  Boxes,
  Clock,
  Group,
  Loader2,
  Package,
  RefreshCw,
  Search,
  ShoppingCart,
  Trash2,
  Users,
} from 'lucide-vue-next'

import PageHeader from '@/components/page-shell/PageHeader.vue'
import Section from '@/components/page-shell/Section.vue'
import EmptyState from '@/components/page-shell/EmptyState.vue'
import StatusPill from '@/components/ui-kit/StatusPill.vue'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

import { useFeedback } from '@/composables/useFeedBack'
import { useTrash } from '@/composables/useTrash'

onMounted(() => {
  document.title = 'Lixeira — Estoque Pro'
})

const { sucesso, erro } = useFeedback()

// --- Filtros de Estado ---
const paginaAtual = ref(1)
const porPagina = ref(15)
const filtroBusca = ref('')
const filtroTipo = ref('todos')

// Reset da página ao alterar os filtros
watch([filtroBusca, filtroTipo], () => {
  paginaAtual.value = 1
})

// --- Integrando TanStack Query via Composable ---
const { trashQuery, restoreMutation, destroyMutation, revalidarLixeira } = useTrash({
  page: paginaAtual,
  perPage: porPagina,
  busca: filtroBusca,
  tipo: filtroTipo,
})

// --- Extração Reativa Segura ---
const itens = computed(() => trashQuery.data.value?.data || [])
const totalPaginas = computed(() => trashQuery.data.value?.last_page || 1)
const carregando = computed(() => trashQuery.isLoading.value)

// Modal Exclusão
const itemParaExcluir = ref(null)
const modalExclusaoAberto = ref(false)

// --- Mapeamento de Tipos e Helpers ---
const MAPPING_TIPOS = {
  products: { rotulo: 'Produto', icone: Package },
  produtos: { rotulo: 'Produto', icone: Package },
  people: { rotulo: 'Pessoa/Cliente', icone: Users },
  pessoas: { rotulo: 'Pessoa/Cliente', icone: Users },
  suppliers: { rotulo: 'Fornecedor', icone: Users },
  fornecedores: { rotulo: 'Fornecedor', icone: Users },
  sales: { rotulo: 'Venda', icone: ShoppingCart },
  vendas: { rotulo: 'Venda', icone: ShoppingCart },
  purchases: { rotulo: 'Compra', icone: ShoppingCart },
  compras: { rotulo: 'Compra', icone: ShoppingCart },
  groups: { rotulo: 'Grupo/Categoria', icone: Group },
  grupos: { rotulo: 'Grupo/Categoria', icone: Group },
}

function obterInfoTipo(tabela) {
  return MAPPING_TIPOS[tabela] || { rotulo: tabela || 'Registro', icone: Boxes }
}

function dataBR(dataString) {
  if (!dataString) return '-'
  const data = new Date(dataString)
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(data)
}

function extrairTitulo(item) {
  const d = item.dados || {}
  return (
    d.name ||
    d.nome ||
    d.title ||
    d.description ||
    d.code ||
    d.sku ||
    `Registro #${String(item.id).slice(0, 8)}`
  )
}

function extrairSubtitulo(item) {
  const d = item.dados || {}
  const partes = []

  if (d.sku) partes.push(`SKU: ${d.sku}`)
  if (d.code) partes.push(`Código: ${d.code}`)
  if (d.email) partes.push(d.email)
  if (d.document || d.documento) partes.push(d.document || d.documento)

  return partes.length > 0 ? partes.join(' · ') : 'Dados salvos no snapshot'
}

function paginaAnterior() {
  if (paginaAtual.value > 1) paginaAtual.value--
}

function proximaPagina() {
  if (paginaAtual.value < totalPaginas.value) paginaAtual.value++
}

// --- Operações de Mutation ---
function restaurarItem(item) {
  restoreMutation.mutate(item.id, {
    onSuccess: () => {
      sucesso('Item restaurado', `"${extrairTitulo(item)}" voltou para a lista ativa.`)
    },
    onError: (e) => {
      const mensagem = e?.response?.data?.erro || 'Erro ao restaurar registro.'
      erro('Falha na restauração', mensagem)
    },
  })
}

function confirmarExclusaoPermanente(item) {
  itemParaExcluir.value = item
  modalExclusaoAberto.value = true
}

function destruirPermanente() {
  if (!itemParaExcluir.value) return

  const item = itemParaExcluir.value
  destroyMutation.mutate(item.id, {
    onSuccess: () => {
      sucesso('Excluído permanentemente', 'O registro foi removido definitivamente.')
      modalExclusaoAberto.value = false
      itemParaExcluir.value = null
    },
    onError: () => {
      erro('Erro ao excluir', 'Não foi possível apagar o registro definitivamente.')
    },
  })
}
</script>

<template>
  <PageHeader
    titulo="Lixeira"
    descricao="Histórico de registros excluídos. Itens são permanentemente removidos após 7 dias."
    :trilha="[{ titulo: 'Início' }, { titulo: 'Lixeira' }]"
  >
    <template #acoes>
      <Button
        variant="outline"
        size="sm"
        :disabled="trashQuery.isFetching.value"
        @click="revalidarLixeira"
      >
        <RefreshCw class="size-4" :class="{ 'animate-spin': trashQuery.isFetching.value }" />
        Atualizar
      </Button>
    </template>
  </PageHeader>

  <div class="space-y-4 p-4 md:space-y-5 md:p-6">
    <Section title-tag="h2">
      <div class="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_220px] md:p-5">
        <div class="relative">
          <Search class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            v-model="filtroBusca"
            type="text"
            placeholder="Pesquisar por nome, SKU, código..."
            class="h-10 w-full rounded-md border border-input bg-surface pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <Select v-model="filtroTipo">
          <SelectTrigger class="h-10 w-full bg-surface">
            <SelectValue placeholder="Filtrar por tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            <SelectItem value="products">Produtos</SelectItem>
            <SelectItem value="people">Pessoas / Clientes</SelectItem>
            <SelectItem value="suppliers">Fornecedores</SelectItem>
            <SelectItem value="sales">Vendas</SelectItem>
            <SelectItem value="purchases">Compras</SelectItem>
            <SelectItem value="groups">Grupos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div v-if="carregando" class="flex h-64 items-center justify-center">
        <Loader2 class="size-8 animate-spin text-muted-foreground" />
      </div>

      <EmptyState
        v-else-if="itens.length === 0"
        titulo="A lixeira está vazia"
        descricao="Nenhum registro excluído foi encontrado no período de retenção de 7 dias."
      />

      <div v-else class="divide-y divide-border overflow-hidden">
        <ul class="divide-y divide-border">
          <li
            v-for="item in itens"
            :key="item.id"
            class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 p-4 transition-colors hover:bg-muted/50 md:px-5"
          >
            <div class="flex items-start gap-3 min-w-0">
              <div
                class="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-muted/60 text-muted-foreground"
              >
                <component :is="obterInfoTipo(item.tabela_origem).icone" class="size-4" />
              </div>

              <div class="min-w-0 space-y-1">
                <div class="flex flex-wrap items-center gap-2">
                  <p class="truncate text-sm font-semibold text-foreground">
                    {{ extrairTitulo(item) }}
                  </p>
                  <StatusPill tom="neutral">
                    {{ obterInfoTipo(item.tabela_origem).rotulo }}
                  </StatusPill>
                </div>

                <p class="truncate text-xs text-muted-foreground">
                  {{ extrairSubtitulo(item) }}
                </p>

                <div
                  class="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground pt-0.5"
                >
                  <span class="flex items-center gap-1">
                    <Clock class="size-3" /> Excluído em {{ dataBR(item.excluido_em) }}
                  </span>
                  <span>·</span>
                  <span
                    class="font-medium"
                    :class="item.dias_restantes <= 2 ? 'text-amber-500' : ''"
                  >
                    Expira em {{ item.dias_restantes }}
                    {{ item.dias_restantes === 1 ? 'dia' : 'dias' }}
                  </span>
                </div>
              </div>
            </div>

            <div class="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                class="h-8 gap-1.5 cursor-pointer text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10 border-emerald-500/20"
                :disabled="
                  restoreMutation.isPending.value && restoreMutation.variables.value === item.id
                "
                @click="restaurarItem(item)"
              >
                <Loader2
                  v-if="
                    restoreMutation.isPending.value && restoreMutation.variables.value === item.id
                  "
                  class="size-3.5 animate-spin"
                />
                <ArchiveRestore v-else class="size-3.5" />
                <span class="hidden sm:inline">Restaurar</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                class="h-8 text-destructive hover:bg-destructive/10 cursor-pointer"
                :disabled="
                  destroyMutation.isPending.value && destroyMutation.variables.value === item.id
                "
                @click="confirmarExclusaoPermanente(item)"
              >
                <Trash2 class="size-3.5" />
                <span class="sr-only">Excluir permanentemente</span>
              </Button>
            </div>
          </li>
        </ul>

        <div
          v-if="totalPaginas > 1"
          class="flex items-center justify-between border-t border-border p-4"
        >
          <p class="text-xs text-muted-foreground">
            Página <span class="font-medium text-foreground">{{ paginaAtual }}</span> de
            {{ totalPaginas }}
          </p>
          <div class="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              :disabled="paginaAtual <= 1 || carregando"
              @click="paginaAnterior"
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              :disabled="paginaAtual >= totalPaginas || carregando"
              @click="proximaPagina"
            >
              Próxima
            </Button>
          </div>
        </div>
      </div>
    </Section>
  </div>

  <Dialog :open="modalExclusaoAberto" @update:open="(v) => (modalExclusaoAberto = v)">
    <DialogContent class="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2 text-destructive">
          <AlertTriangle class="size-5" /> Excluir permanentemente
        </DialogTitle>
        <DialogDescription class="pt-2">
          Tem certeza de que deseja apagar o registro
          <strong class="text-foreground"
            >"{{ itemParaExcluir ? extrairTitulo(itemParaExcluir) : '' }}"</strong
          >? Esta ação não poderá ser desfeita.
        </DialogDescription>
      </DialogHeader>

      <DialogFooter class="gap-2 sm:gap-0 pt-4">
        <Button variant="outline" @click="modalExclusaoAberto = false"> Cancelar </Button>
        <Button
          variant="destructive"
          :disabled="destroyMutation.isPending.value"
          @click="destruirPermanente"
        >
          <Loader2 v-if="destroyMutation.isPending.value" class="mr-2 size-4 animate-spin" />
          Excluir definitivamente
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
