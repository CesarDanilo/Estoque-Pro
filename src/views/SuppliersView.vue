<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import {
  Building2,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Power,
  Search,
  ShoppingCart,
  Trash2,
  Truck,
} from 'lucide-vue-next'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

import EmptyState from '@/components/page-shell/EmptyState.vue'
import PageHeader from '@/components/page-shell/PageHeader.vue'
import Section from '@/components/page-shell/Section.vue'
import StatusPill from '@/components/ui-kit/StatusPill.vue'
import SupplierModal from '@/components/modal/supplier/NewSupplier.vue'
import { useFeedback } from '@/composables/useFeedBack'
import { supplierService } from '@/services/supplierService'

onMounted(() => {
  document.title = 'Fornecedores — Estoque Pro'
})

const queryClient = useQueryClient()
const { sucesso, erro } = useFeedback()

const NOME_BUSCA_MAX = 60
const busca = ref('')
const pagina = ref(1)

watch(busca, () => {
  pagina.value = 1
})

// ---- Modais e Diálogos ----
const modalAberto = ref(false)
const fornecedorEditando = ref(null)
const fornecedorParaExcluir = ref(null)

// ---- Funções de Formatação (CPF / CNPJ e Telefone) ----
function formatarDocumento(v) {
  if (!v) return '-'
  const nums = String(v).replace(/\D/g, '')
  if (nums.length === 11) {
    return nums.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }
  if (nums.length === 14) {
    return nums.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  }
  return v
}

function formatarTelefone(v) {
  if (!v) return '-'
  const nums = String(v).replace(/\D/g, '')
  if (nums.length === 10) {
    return nums.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  }
  if (nums.length === 11) {
    return nums.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  }
  return v
}

// ---- TanStack Query: Buscar Lista de Fornecedores ----
const {
  data: respostaFornecedores,
  isLoading,
  isError,
} = useQuery({
  queryKey: ['suppliers', busca, pagina],
  queryFn: () => supplierService.getAll({ search: busca.value, page: pagina.value }),
  staleTime: 1000 * 60 * 5,
})

const listaFornecedores = computed(() => respostaFornecedores.value?.data || [])
const metaFornecedores = computed(() => ({
  paginaAtual: respostaFornecedores.value?.current_page || 1,
  totalPaginas: respostaFornecedores.value?.last_page || 1,
  total: respostaFornecedores.value?.total || 0,
}))

// ---- TanStack Mutation: Excluir Fornecedor ----
const deleteMutation = useMutation({
  mutationFn: (id) => supplierService.delete(id),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['suppliers'] })
    sucesso(
      'Fornecedor excluído',
      `O fornecedor "${fornecedorParaExcluir.value?.name || ''}" foi removido com sucesso.`,
    )
    fornecedorParaExcluir.value = null
  },
  onError: (err) => {
    fornecedorParaExcluir.value = null

    if (ehErroDeVinculo(err)) {
      erro(
        'Não é possível excluir este fornecedor',
        'Existem compras vinculadas a este fornecedor. Desative-o ou exclua/desvincule as compras relacionadas antes de excluir.',
      )
      return
    }

    erro('Erro ao excluir', err.response?.data?.message || 'Não foi possível remover o fornecedor.')
  },
})

// Detecta violação de chave estrangeira (fornecedor com compras vinculadas),
// seja pelo status HTTP (409 Conflict, convenção comum para esse caso) ou,
// como salvaguarda, pelo texto cru do erro do Postgres quando ele vaza na
// mensagem da API (ex.: ambiente com debug ligado).
function ehErroDeVinculo(err) {
  const status = err.response?.status
  const mensagem = err.response?.data?.message || ''
  return status === 409 || /foreign key|violates foreign key constraint/i.test(mensagem)
}

// ---- TanStack Mutation: Alternar Status (Ativo/Inativo) ----
const toggleStatusMutation = useMutation({
  mutationFn: ({ id, active }) => supplierService.update(id, { active }),
  onSuccess: (_, variables) => {
    queryClient.invalidateQueries({ queryKey: ['suppliers'] })
    const novoStatus = variables.active ? 'ativado' : 'desativado'
    sucesso(`Fornecedor ${novoStatus}`, 'O status do fornecedor foi atualizado com sucesso.')
  },
  onError: (err) => {
    erro(
      'Erro ao alterar status',
      err.response?.data?.message || 'Não foi possível alterar o status.',
    )
  },
})

// ---- Computados de Métricas ----
const totalFornecedores = computed(() => listaFornecedores.value?.length || 0)

const totalAtivos = computed(() => {
  if (!listaFornecedores.value) return 0
  return listaFornecedores.value.filter((f) => f.active).length
})

const totalCompras = computed(() => {
  if (!listaFornecedores.value) return 0
  return listaFornecedores.value.reduce((acc, f) => acc + (f.purchases_count || 0), 0)
})

// ---- Ações da Tela ----
function abrirNovoModal() {
  fornecedorEditando.value = null
  modalAberto.value = true
}

function abrirEdicaoModal(fornecedor) {
  fornecedorEditando.value = fornecedor
  modalAberto.value = true
}

function alternarStatusFornecedor(fornecedor) {
  toggleStatusMutation.mutate({
    id: fornecedor.id,
    active: !fornecedor.active,
  })
}

// Fornecedor com compras vinculadas não pode ser excluído (restrição de
// chave estrangeira no banco). Avisamos o usuário antes mesmo de tentar,
// em vez de deixar o erro cru do banco chegar até ele.
function possuiVinculo(fornecedor) {
  return (fornecedor?.purchases_count || 0) > 0
}

function tentarExcluir(fornecedor) {
  if (possuiVinculo(fornecedor)) {
    erro(
      'Não é possível excluir este fornecedor',
      `"${fornecedor.name}" possui ${fornecedor.purchases_count} compra(s) vinculada(s). Desative o fornecedor ou exclua/desvincule essas compras antes de removê-lo.`,
    )
    return
  }

  fornecedorParaExcluir.value = fornecedor
}

function confirmarExclusao() {
  const id = fornecedorParaExcluir.value?.id
  if (!id || deleteMutation.isPending.value) return

  deleteMutation.mutate(id)
}
</script>

<template>
  <div>
    <PageHeader
      titulo="Fornecedores"
      descricao="Toda compra registrada para um fornecedor gera entrada automatizada de estoque."
      :trilha="[{ titulo: 'Gestão' }, { titulo: 'Fornecedores' }]"
    >
      <template #acoes>
        <Button
          class="cursor-pointer gap-2 bg-emerald-500 font-medium text-black hover:bg-emerald-600"
          @click="abrirNovoModal"
        >
          <Plus class="size-4" />
          Novo fornecedor
        </Button>
      </template>
    </PageHeader>

    <div class="space-y-4 p-4 md:space-y-5 md:p-6">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div class="flex items-center justify-between rounded-xl border border-border bg-card p-4">
          <div>
            <p class="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Total de Fornecedores
            </p>
            <p class="mt-1 text-2xl font-bold text-foreground">
              {{ totalFornecedores }}
            </p>
          </div>
          <div class="rounded-lg bg-emerald-500/10 p-2.5 text-emerald-500">
            <Truck class="size-5" />
          </div>
        </div>

        <div class="flex items-center justify-between rounded-xl border border-border bg-card p-4">
          <div>
            <p class="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Fornecedores Ativos
            </p>
            <p class="mt-1 text-2xl font-bold text-foreground">
              {{ totalAtivos }}
            </p>
          </div>
          <div class="rounded-lg bg-blue-500/10 p-2.5 text-blue-500">
            <Building2 class="size-5" />
          </div>
        </div>

        <div class="flex items-center justify-between rounded-xl border border-border bg-card p-4">
          <div>
            <p class="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Compras Realizadas
            </p>
            <p class="mt-1 text-2xl font-bold text-foreground">
              {{ totalCompras }}
            </p>
          </div>
          <div class="rounded-lg bg-purple-500/10 p-2.5 text-purple-500">
            <ShoppingCart class="size-5" />
          </div>
        </div>
      </div>

      <Section>
        <div class="flex items-center justify-between gap-4 border-b border-border p-4 md:p-5">
          <div class="relative w-full md:max-w-sm">
            <Search class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              v-model="busca"
              type="text"
              placeholder="Buscar por nome, CNPJ ou cidade..."
              :maxlength="NOME_BUSCA_MAX"
              class="h-10 cursor-text pl-9 pr-14"
            />
            <span
              class="pointer-events-none absolute right-3 top-1/2 select-none -translate-y-1/2 text-[11px] font-medium tabular-nums transition-colors"
              :class="busca.length >= NOME_BUSCA_MAX ? 'text-red-500' : 'text-muted-foreground/40'"
            >
              {{ busca.length }}/{{ NOME_BUSCA_MAX }}
            </span>
          </div>

          <div
            v-if="listaFornecedores?.length > 0"
            class="hidden text-xs font-medium text-muted-foreground sm:block"
          >
            Exibindo
            <span class="font-semibold text-foreground">{{ listaFornecedores.length }}</span>
            registros
          </div>
        </div>

        <div
          v-if="isLoading"
          class="p-12 flex flex-col items-center justify-center gap-2 text-muted-foreground"
        >
          <Loader2 class="size-6 animate-spin text-emerald-500" />
          <p class="text-xs">Carregando fornecedores…</p>
        </div>

        <div v-else-if="isError" class="p-8 text-center text-xs text-destructive">
          Não foi possível carregar a lista de fornecedores. Verifique sua conexão com o servidor.
        </div>

        <EmptyState
          v-else-if="!listaFornecedores?.length"
          titulo="Nenhum fornecedor encontrado"
          descricao="Não encontramos nenhum fornecedor com o termo informado. Tente buscar por outros dados ou cadastre um novo fornecedor."
        >
          <template #acao>
            <Button
              class="cursor-pointer gap-2 bg-emerald-500 font-medium text-black hover:bg-emerald-600"
              @click="abrirNovoModal"
            >
              <Plus class="size-4" />
              Criar fornecedor
            </Button>
          </template>
        </EmptyState>

        <template v-else>
          <ul class="divide-y divide-border md:hidden">
            <li v-for="f in listaFornecedores" :key="f.id" class="space-y-2 px-4 py-3.5">
              <div class="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                <div class="min-w-0">
                  <p class="truncate text-sm font-medium">{{ f.name }}</p>
                  <p class="truncate text-xs text-muted-foreground font-mono">
                    {{ formatarDocumento(f.document) }} · {{ f.city || 'Sem cidade' }}
                  </p>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger as-child>
                    <Button
                      variant="ghost"
                      size="icon"
                      class="cursor-pointer"
                      :aria-label="`Ações para ${f.name}`"
                    >
                      <MoreHorizontal class="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem class="cursor-pointer" @click="abrirEdicaoModal(f)">
                      <Pencil class="size-4" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem class="cursor-pointer" @click="alternarStatusFornecedor(f)">
                      <Power class="size-4" />
                      {{ f.active ? 'Inativar' : 'Ativar' }}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      class="cursor-pointer text-destructive"
                      @click="tentarExcluir(f)"
                    >
                      <Trash2 class="size-4" /> Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div class="flex flex-wrap items-center gap-2">
                <StatusPill :tom="f.active ? 'info' : 'neutral'">
                  {{ f.active ? 'Ativo' : 'Inativo' }}
                </StatusPill>
                <span class="text-xs text-muted-foreground">
                  {{ formatarTelefone(f.phone) }}
                </span>
              </div>
            </li>
          </ul>

          <div class="hidden overflow-x-auto md:block">
            <table class="w-full text-sm">
              <thead class="text-xs text-muted-foreground">
                <tr class="border-b border-border text-left">
                  <th class="px-5 py-3 font-medium">Fornecedor</th>
                  <th class="px-4 py-3 font-medium">CNPJ / CPF</th>
                  <th class="px-4 py-3 font-medium">Telefone</th>
                  <th class="px-4 py-3 font-medium">Cidade/UF</th>
                  <th class="px-4 py-3 font-medium">Situação</th>
                  <th class="px-4 py-3 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border">
                <tr
                  v-for="f in listaFornecedores"
                  :key="f.id"
                  class="transition-colors hover:bg-muted/60"
                >
                  <td class="max-w-[260px] px-5 py-3">
                    <p class="truncate font-medium text-foreground">{{ f.name }}</p>
                    <p v-if="f.trade_name" class="truncate text-[10px] text-muted-foreground">
                      {{ f.trade_name }}
                    </p>
                  </td>
                  <td class="px-4 py-3 text-muted-foreground font-mono text-xs">
                    {{ formatarDocumento(f.document) }}
                  </td>
                  <td class="px-4 py-3 text-muted-foreground">
                    {{ formatarTelefone(f.phone) }}
                  </td>
                  <td class="px-4 py-3 text-muted-foreground">
                    {{ f.city ? `${f.city}/${f.state || ''}` : '-' }}
                  </td>
                  <td class="px-4 py-3">
                    <StatusPill :tom="f.active ? 'info' : 'neutral'">
                      {{ f.active ? 'Ativo' : 'Inativo' }}
                    </StatusPill>
                  </td>
                  <td class="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger as-child>
                        <Button
                          variant="ghost"
                          size="icon"
                          class="cursor-pointer"
                          :aria-label="`Ações para ${f.name}`"
                        >
                          <MoreHorizontal class="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem class="cursor-pointer" @click="abrirEdicaoModal(f)">
                          <Pencil class="size-4" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          class="cursor-pointer"
                          @click="alternarStatusFornecedor(f)"
                        >
                          <Power class="size-4" />
                          {{ f.active ? 'Inativar' : 'Ativar' }}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          class="cursor-pointer text-destructive"
                          @click="tentarExcluir(f)"
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
        </template>
        <div
          v-if="!isLoading && listaFornecedores.length > 0"
          class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-border px-4 py-3 md:px-5"
        >
          <p class="text-xs text-muted-foreground">
            {{ metaFornecedores.total }} fornecedor(es) · página
            {{ metaFornecedores.paginaAtual }} de {{ metaFornecedores.totalPaginas }}
          </p>
          <div class="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              class="cursor-pointer disabled:cursor-not-allowed"
              :disabled="metaFornecedores.paginaAtual === 1"
              @click="pagina = metaFornecedores.paginaAtual - 1"
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              class="cursor-pointer disabled:cursor-not-allowed"
              :disabled="metaFornecedores.paginaAtual === metaFornecedores.totalPaginas"
              @click="pagina = metaFornecedores.paginaAtual + 1"
            >
              Próxima
            </Button>
          </div>
        </div>
      </Section>
    </div>

    <SupplierModal v-model:open="modalAberto" :fornecedor="fornecedorEditando" />

    <AlertDialog
      :open="!!fornecedorParaExcluir"
      @update:open="
        (o) => {
          if (!o && !deleteMutation.isPending.value) fornecedorParaExcluir = null
        }
      "
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir {{ fornecedorParaExcluir?.name }}?</AlertDialogTitle>
          <AlertDialogDescription>
            A remoção deste fornecedor impedirá a associação em novos registros de compra. As
            entradas já efetuadas no histórico continuarão registradas.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            class="cursor-pointer"
            :disabled="deleteMutation.isPending.value"
            @click="fornecedorParaExcluir = null"
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
