<script setup>
import { computed, onMounted, ref } from 'vue'
import {
  Building2,
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

import EmptyState from '@/components/page-shell/EmptyState.vue'
import PageHeader from '@/components/page-shell/PageHeader.vue'
import Section from '@/components/page-shell/Section.vue'
import StatusPill from '@/components/ui-kit/StatusPill.vue'
import SupplierModal from '@/components/modal/supplier/NewSupplier.vue'
import { useFeedback } from '@/composables/useFeedBack'
import { fornecedores as mockFornecedores } from '@/lib/mockDataProdutos'

onMounted(() => {
  document.title = 'Fornecedores — Estoque Pro'
})

const NOME_BUSCA_MAX = 60

const busca = ref('')
const listaFornecedores = ref(
  mockFornecedores.map((f) => ({
    ...f,
    status: f.status || 'ativo',
  })),
)

// Controle do Modal de Cadastro/Edição
const modalAberto = ref(false)
const fornecedorEditando = ref(null)

// Controle do Dialog de Exclusão
const fornecedorParaExcluir = ref(null)

const { sucesso } = useFeedback()

const lista = computed(() => {
  const termo = busca.value.toLowerCase().trim()
  if (!termo) return listaFornecedores.value
  return listaFornecedores.value.filter((f) =>
    [f.nome, f.documento, f.cidade, f.telefone].some((campo) =>
      (campo || '').toLowerCase().includes(termo),
    ),
  )
})

const totalAtivos = computed(() => {
  return lista.value.filter((f) => f.status === 'ativo').length
})

const totalCompras = computed(() => {
  return lista.value.reduce((acc, f) => acc + (f.compras || 0), 0)
})

function abrirNovoModal() {
  fornecedorEditando.value = null
  modalAberto.value = true
}

function abrirEdicaoModal(fornecedor) {
  fornecedorEditando.value = { ...fornecedor }
  modalAberto.value = true
}

function alternarStatusFornecedor(fornecedor) {
  const novoStatus = fornecedor.status === 'ativo' ? 'inativo' : 'ativo'
  fornecedor.status = novoStatus
  sucesso(
    `Fornecedor ${novoStatus === 'ativo' ? 'ativado' : 'desativado'}`,
    `O fornecedor "${fornecedor.nome}" agora está ${novoStatus === 'ativo' ? 'ativo' : 'inativo'}.`,
  )
}

function confirmarExclusao() {
  if (!fornecedorParaExcluir.value) return
  listaFornecedores.value = listaFornecedores.value.filter(
    (f) => f.id !== fornecedorParaExcluir.value.id,
  )
  sucesso(
    'Fornecedor excluído',
    `O fornecedor "${fornecedorParaExcluir.value.nome}" foi removido com sucesso.`,
  )
  fornecedorParaExcluir.value = null
}

function onFornecedorSalvo(dados) {
  if (fornecedorEditando.value?.id) {
    const index = listaFornecedores.value.findIndex(
      (f) => f.id === fornecedorEditando.value.id,
    )
    if (index !== -1) {
      listaFornecedores.value[index] = {
        ...listaFornecedores.value[index],
        ...dados,
      }
    }
  } else {
    const novoFornecedor = {
      id: Date.now(),
      nome: dados.nome,
      documento: dados.documento,
      telefone: dados.telefone,
      cidade: dados.cidade,
      compras: 0,
      status: dados.ativo ? 'ativo' : 'inativo',
    }
    listaFornecedores.value.unshift(novoFornecedor)
  }
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
        <div
          class="flex items-center justify-between rounded-xl border border-border bg-card p-4"
        >
          <div>
            <p
              class="text-xs font-medium uppercase tracking-wider text-muted-foreground"
            >
              Total de Fornecedores
            </p>
            <p class="mt-1 text-2xl font-bold text-foreground">
              {{ lista.length }}
            </p>
          </div>
          <div class="rounded-lg bg-emerald-500/10 p-2.5 text-emerald-500">
            <Truck class="size-5" />
          </div>
        </div>

        <div
          class="flex items-center justify-between rounded-xl border border-border bg-card p-4"
        >
          <div>
            <p
              class="text-xs font-medium uppercase tracking-wider text-muted-foreground"
            >
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

        <div
          class="flex items-center justify-between rounded-xl border border-border bg-card p-4"
        >
          <div>
            <p
              class="text-xs font-medium uppercase tracking-wider text-muted-foreground"
            >
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
        <div
          class="flex items-center justify-between gap-4 border-b border-border p-4 md:p-5"
        >
          <div class="relative w-full md:max-w-sm">
            <Search
              class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              v-model="busca"
              type="text"
              placeholder="Buscar por nome, CNPJ ou cidade..."
              :maxlength="NOME_BUSCA_MAX"
              class="h-10 cursor-text pl-9 pr-14"
            />
            <span
              class="pointer-events-none absolute right-3 top-1/2 select-none -translate-y-1/2 text-[11px] font-medium tabular-nums transition-colors"
              :class="
                busca.length >= NOME_BUSCA_MAX
                  ? 'text-red-500'
                  : 'text-muted-foreground/40'
              "
            >
              {{ busca.length }}/{{ NOME_BUSCA_MAX }}
            </span>
          </div>

          <div
            v-if="lista.length > 0"
            class="hidden text-xs font-medium text-muted-foreground sm:block"
          >
            Exibindo
            <span class="font-semibold text-foreground">{{
              lista.length
            }}</span>
            registros
          </div>
        </div>

        <EmptyState
          v-if="lista.length === 0"
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
            <li
              v-for="f in lista"
              :key="f.id"
              class="space-y-2 px-4 py-3.5"
            >
              <div class="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                <div class="min-w-0">
                  <p class="truncate text-sm font-medium">{{ f.nome }}</p>
                  <p class="truncate text-xs text-muted-foreground">
                    {{ f.documento }} · {{ f.cidade }}
                  </p>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger as-child>
                    <Button
                      variant="ghost"
                      size="icon"
                      class="cursor-pointer"
                      :aria-label="`Ações para ${f.nome}`"
                    >
                      <MoreHorizontal class="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      class="cursor-pointer"
                      @click="abrirEdicaoModal(f)"
                    >
                      <Pencil class="size-4" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      class="cursor-pointer"
                      @click="alternarStatusFornecedor(f)"
                    >
                      <Power class="size-4" />
                      {{ f.status === 'ativo' ? 'Inativar' : 'Ativar' }}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      class="cursor-pointer text-destructive"
                      @click="fornecedorParaExcluir = f"
                    >
                      <Trash2 class="size-4" /> Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div class="flex flex-wrap items-center gap-2">
                <StatusPill :tom="f.status === 'ativo' ? 'info' : 'neutral'">
                  {{ f.status === 'ativo' ? 'Ativo' : 'Inativo' }}
                </StatusPill>
                <span class="text-xs text-muted-foreground">
                  {{ f.telefone }} · {{ f.compras || 0 }} compras
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
                  <th class="px-4 py-3 font-medium">Cidade</th>
                  <th class="px-4 py-3 text-right font-medium">Compras</th>
                  <th class="px-4 py-3 font-medium">Situação</th>
                  <th class="px-4 py-3 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border">
                <tr
                  v-for="f in lista"
                  :key="f.id"
                  class="transition-colors hover:bg-muted/60"
                >
                  <td class="max-w-[260px] px-5 py-3">
                    <p class="truncate font-medium text-foreground">
                      {{ f.nome }}
                    </p>
                  </td>
                  <td class="px-4 py-3 text-muted-foreground">
                    {{ f.documento }}
                  </td>
                  <td class="px-4 py-3 text-muted-foreground">
                    {{ f.telefone }}
                  </td>
                  <td class="px-4 py-3 text-muted-foreground">
                    {{ f.cidade }}
                  </td>
                  <td class="px-4 py-3 text-right font-medium">
                    {{ f.compras || 0 }}
                  </td>
                  <td class="px-4 py-3">
                    <StatusPill :tom="f.status === 'ativo' ? 'info' : 'neutral'">
                      {{ f.status === 'ativo' ? 'Ativo' : 'Inativo' }}
                    </StatusPill>
                  </td>
                  <td class="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger as-child>
                        <Button
                          variant="ghost"
                          size="icon"
                          class="cursor-pointer"
                          :aria-label="`Ações para ${f.nome}`"
                        >
                          <MoreHorizontal class="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          class="cursor-pointer"
                          @click="abrirEdicaoModal(f)"
                        >
                          <Pencil class="size-4" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          class="cursor-pointer"
                          @click="alternarStatusFornecedor(f)"
                        >
                          <Power class="size-4" />
                          {{ f.status === 'ativo' ? 'Inativar' : 'Ativar' }}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          class="cursor-pointer text-destructive"
                          @click="fornecedorParaExcluir = f"
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
      </Section>
    </div>

    <SupplierModal
      v-model:open="modalAberto"
      :fornecedor="fornecedorEditando"
      @salvo="onFornecedorSalvo"
    />

    <AlertDialog
      :open="!!fornecedorParaExcluir"
      @update:open="(o) => !o && (fornecedorParaExcluir = null)"
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir {{ fornecedorParaExcluir?.nome }}?</AlertDialogTitle>
          <AlertDialogDescription>
            A remoção deste fornecedor impedirá a associação em novos registros de
            compra. As entradas já efetuadas no histórico continuarão registradas.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel class="cursor-pointer">Cancelar</AlertDialogCancel>
          <AlertDialogAction
            class="cursor-pointer bg-red-500 text-white hover:bg-red-600"
            @click="confirmarExclusao"
          >
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>