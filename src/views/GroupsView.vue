<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  FolderPlus,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Power,
  Search,
  Trash2,
} from 'lucide-vue-next'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import GroupModal from '@/components/modal/group/NewGroup.vue'
import { useFeedback } from '@/composables/useFeedBack'
import { useGroups } from '@/composables/useGroups'

onMounted(() => {
  document.title = 'Grupos — Estoque Pro'
})

const NOME_BUSCA_MAX = 60
const busca = ref('')
const pagina = ref(1)

// Estado de Filtro de Status
const filtroStatus = ref('todos') // 'todos' | 'ativos' | 'inativos'

// Estado de Ordenação da Tabela ('nome' | 'produtos')
const ordemCampo = ref('nome')
const ordemDirecao = ref('asc') // 'asc' | 'desc'

// TanStack Query
const { groupsQuery, updateMutation, deleteMutation } = useGroups(busca, pagina)

const modalAberto = ref(false)
const grupoEditando = ref(null)
const grupoParaExcluir = ref(null)

const { sucesso, erro } = useFeedback()

// Resposta da API
const listaGruposBruta = computed(() => groupsQuery.data.value?.data || [])
const carregando = computed(() => groupsQuery.isLoading.value)

const meta = computed(() => ({
  paginaAtual: groupsQuery.data.value?.current_page || 1,
  totalPaginas: groupsQuery.data.value?.last_page || 1,
  total: groupsQuery.data.value?.total || 0,
  totalAtivos:
    groupsQuery.data.value?.total_ativos ??
    groupsQuery.data.value?.data?.filter((g) => g.active).length ??
    0,
}))

// Produtos Totais
const totalProdutos = computed(() => {
  return listaGruposBruta.value.reduce((acc, g) => acc + (g.produtos || 0), 0)
})

// Função para alternar a ordenação pelas colunas da tabela
function alternarOrdenacao(campo) {
  if (ordemCampo.value === campo) {
    ordemDirecao.value = ordemDirecao.value === 'asc' ? 'desc' : 'asc'
  } else {
    ordemCampo.value = campo
    ordemDirecao.value = 'asc'
  }
}

// Lista Filtrada e Ordenada
const listaGrupos = computed(() => {
  let resultado = [...listaGruposBruta.value]

  // 1. Filtro por Status
  if (filtroStatus.value === 'ativos') {
    resultado = resultado.filter((g) => g.active)
  } else if (filtroStatus.value === 'inativos') {
    resultado = resultado.filter((g) => !g.active)
  }

  // 2. Ordenação por Coluna
  resultado.sort((a, b) => {
    let valorA, valorB

    if (ordemCampo.value === 'nome') {
      valorA = a.name || ''
      valorB = b.name || ''
      return ordemDirecao.value === 'asc'
        ? valorA.localeCompare(valorB, 'pt-BR', { sensitivity: 'base' })
        : valorB.localeCompare(valorA, 'pt-BR', { sensitivity: 'base' })
    }

    if (ordemCampo.value === 'produtos') {
      valorA = a.produtos || 0
      valorB = b.produtos || 0
      return ordemDirecao.value === 'asc' ? valorA - valorB : valorB - valorA
    }

    return 0
  })

  return resultado
})

// Reseta para a página 1 ao alterar filtros
watch([busca, filtroStatus], () => {
  pagina.value = 1
})

function abrirNovoModal() {
  grupoEditando.value = null
  modalAberto.value = true
}

function abrirEdicaoModal(grupo) {
  grupoEditando.value = { ...grupo }
  modalAberto.value = true
}

function alternarStatusGrupo(grupo) {
  const novoStatus = !grupo.active

  updateMutation.mutate(
    { id: grupo.id, payload: { active: novoStatus } },
    {
      onSuccess: () => {
        sucesso(
          `Grupo ${novoStatus ? 'ativado' : 'desativado'}`,
          `O grupo "${grupo.name}" agora está ${novoStatus ? 'ativo' : 'inativo'}.`,
        )
      },
      onError: () => {
        erro('Erro ao alterar status', 'Não foi possível alterar o status do grupo.')
      },
    },
  )
}

// ---- Bloqueio de exclusão para grupos com produtos vinculados ----
function possuiProdutosVinculados(grupo) {
  return Number(grupo?.produtos || 0) > 0
}

function tentarExcluir(grupo) {
  if (possuiProdutosVinculados(grupo)) {
    erro(
      'Grupo possui produtos vinculados',
      `O grupo "${grupo.name}" tem ${grupo.produtos} produto(s) associado(s). Reclassifique ou remova esses produtos antes de excluir o grupo.`,
    )
    return
  }
  grupoParaExcluir.value = grupo
}

function confirmarExclusao() {
  if (!grupoParaExcluir.value) return

  const grupo = grupoParaExcluir.value

  // Guarda de segurança: nunca deve chegar aqui com produtos vinculados,
  // mas evita exclusão caso os dados tenham mudado entre a abertura do modal e a confirmação.
  if (possuiProdutosVinculados(grupo)) {
    erro(
      'Grupo possui produtos vinculados',
      `O grupo "${grupo.name}" tem ${grupo.produtos} produto(s) associado(s) e não pode ser excluído.`,
    )
    grupoParaExcluir.value = null
    return
  }

  deleteMutation.mutate(grupo.id, {
    onSuccess: () => {
      sucesso('Grupo excluído', `O grupo "${grupo.name}" foi excluído com sucesso.`)
      grupoParaExcluir.value = null
      if (listaGrupos.value.length === 1 && meta.value.paginaAtual > 1) {
        pagina.value = meta.value.paginaAtual - 1
      }
    },
    onError: (err) => {
      const msg = err.response?.data?.message || 'Erro ao excluir grupo.'
      erro('Falha na exclusão', msg)
    },
  })
}
</script>

<template>
  <div>
    <PageHeader
      titulo="Grupos de Produtos"
      descricao="Categorias principais utilizadas para organizar seu estoque, PDV e relatórios."
      :trilha="[{ titulo: 'Gestão' }, { titulo: 'Grupos' }]"
    >
      <template #acoes>
        <Button
          class="cursor-pointer gap-2 bg-emerald-500 font-medium text-black hover:bg-emerald-600"
          @click="abrirNovoModal"
        >
          <Plus class="size-4" />
          Novo grupo
        </Button>
      </template>
    </PageHeader>

    <div class="space-y-4 p-4 md:space-y-5 md:p-6">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div class="flex items-center justify-between rounded-xl border border-border bg-card p-4">
          <div>
            <p class="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Total de Grupos
            </p>
            <p class="mt-1 text-2xl font-bold text-foreground">
              {{ meta.total }}
            </p>
          </div>
          <div class="rounded-lg bg-emerald-500/10 p-2.5 text-emerald-500">
            <FolderPlus class="size-5" />
          </div>
        </div>

        <div class="flex items-center justify-between rounded-xl border border-border bg-card p-4">
          <div>
            <p class="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Grupos Ativos
            </p>
            <p class="mt-1 text-2xl font-bold text-foreground">
              {{ meta.totalAtivos }}
            </p>
          </div>
          <div class="rounded-lg bg-blue-500/10 p-2.5 text-blue-500">
            <CheckCircle2 class="size-5" />
          </div>
        </div>

        <div class="flex items-center justify-between rounded-xl border border-border bg-card p-4">
          <div>
            <p class="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Produtos Cadastrados
            </p>
            <p class="mt-1 text-2xl font-bold text-foreground">
              {{ totalProdutos }}
            </p>
          </div>
          <div class="rounded-lg bg-purple-500/10 p-2.5 text-purple-500">
            <FolderPlus class="size-5" />
          </div>
        </div>
      </div>

      <Section>
        <div
          class="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-center md:justify-between md:p-5"
        >
          <div class="relative w-full md:max-w-xs">
            <Search class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              v-model="busca"
              type="text"
              placeholder="Buscar grupo por nome..."
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

          <div class="flex flex-wrap items-center gap-2">
            <Select v-model="filtroStatus">
              <SelectTrigger class="w-[180px]">
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="ativos">Apenas Ativos</SelectItem>
                <SelectItem value="inativos">Apenas Inativos</SelectItem>
              </SelectContent>
            </Select>

            <div
              v-if="listaGrupos.length > 0"
              class="hidden text-xs font-medium text-muted-foreground sm:block ml-2"
            >
              Exibindo
              <span class="font-semibold text-foreground">{{ listaGrupos.length }}</span>
              registros
            </div>
          </div>
        </div>

        <div v-if="carregando" class="flex items-center justify-center py-12">
          <Loader2 class="size-6 animate-spin text-emerald-500" />
          <span class="ml-2 text-sm text-muted-foreground">Carregando grupos...</span>
        </div>

        <EmptyState
          v-else-if="listaGrupos.length === 0"
          titulo="Nenhum grupo encontrado"
          descricao="Não encontramos nenhuma categoria correspondente aos filtros aplicados. Tente ajustar a busca ou cadastrar um novo grupo."
        >
          <template #acao>
            <Button
              class="cursor-pointer gap-2 bg-emerald-500 font-medium text-black hover:bg-emerald-600"
              @click="abrirNovoModal"
            >
              <Plus class="size-4" />
              Criar grupo
            </Button>
          </template>
        </EmptyState>

        <template v-else>
          <ul class="divide-y divide-border md:hidden">
            <li v-for="g in listaGrupos" :key="g.id" class="space-y-2 px-4 py-3.5">
              <div class="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                <div class="min-w-0">
                  <p class="truncate text-sm font-medium">{{ g.name }}</p>
                  <p v-if="g.description" class="truncate text-xs text-muted-foreground">
                    {{ g.description }}
                  </p>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger as-child>
                    <Button
                      variant="ghost"
                      size="icon"
                      class="cursor-pointer"
                      :aria-label="`Ações para ${g.name}`"
                    >
                      <MoreHorizontal class="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem class="cursor-pointer" @click="abrirEdicaoModal(g)">
                      <Pencil class="size-4" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem class="cursor-pointer" @click="alternarStatusGrupo(g)">
                      <Power class="size-4" />
                      {{ g.active ? 'Inativar' : 'Ativar' }}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      :class="[
                        possuiProdutosVinculados(g)
                          ? 'cursor-not-allowed opacity-50'
                          : 'cursor-pointer text-destructive',
                      ]"
                      :title="
                        possuiProdutosVinculados(g)
                          ? 'Não é possível excluir: grupo possui produtos vinculados'
                          : undefined
                      "
                      @click="tentarExcluir(g)"
                    >
                      <Trash2 class="size-4" /> Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div class="flex flex-wrap items-center gap-2">
                <StatusPill tom="info"> {{ g.produtos || 0 }} produtos </StatusPill>
                <StatusPill :tom="g.active ? 'info' : 'neutral'">
                  {{ g.active ? 'Ativo' : 'Inativo' }}
                </StatusPill>
              </div>
            </li>
          </ul>

          <div class="hidden overflow-x-auto md:block">
            <table class="w-full text-sm">
              <thead class="text-xs text-muted-foreground">
                <tr class="border-b border-border text-left">
                  <th
                    class="px-5 py-3 font-medium cursor-pointer select-none hover:text-foreground transition-colors"
                    @click="alternarOrdenacao('nome')"
                  >
                    <div class="flex items-center gap-1.5">
                      <span>Grupo</span>
                      <ArrowUp
                        v-if="ordemCampo === 'nome' && ordemDirecao === 'asc'"
                        class="size-3.5"
                      />
                      <ArrowDown
                        v-else-if="ordemCampo === 'nome' && ordemDirecao === 'desc'"
                        class="size-3.5"
                      />
                      <ArrowUpDown v-else class="size-3.5 opacity-40" />
                    </div>
                  </th>

                  <th
                    class="px-4 py-3 font-medium cursor-pointer select-none hover:text-foreground transition-colors"
                    @click="alternarOrdenacao('produtos')"
                  >
                    <div class="flex items-center gap-1.5">
                      <span>Produtos</span>
                      <ArrowUp
                        v-if="ordemCampo === 'produtos' && ordemDirecao === 'asc'"
                        class="size-3.5"
                      />
                      <ArrowDown
                        v-else-if="ordemCampo === 'produtos' && ordemDirecao === 'desc'"
                        class="size-3.5"
                      />
                      <ArrowUpDown v-else class="size-3.5 opacity-40" />
                    </div>
                  </th>

                  <th class="px-4 py-3 font-medium">Situação</th>
                  <th class="px-4 py-3 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border">
                <tr
                  v-for="g in listaGrupos"
                  :key="g.id"
                  class="transition-colors hover:bg-muted/60"
                >
                  <td class="max-w-[280px] px-5 py-3">
                    <p class="truncate font-medium text-foreground">
                      {{ g.name }}
                    </p>
                    <p v-if="g.description" class="truncate text-xs text-muted-foreground">
                      {{ g.description }}
                    </p>
                  </td>
                  <td class="px-4 py-3">
                    <StatusPill tom="info"> {{ g.produtos || 0 }} produtos </StatusPill>
                  </td>
                  <td class="px-4 py-3">
                    <StatusPill :tom="g.active ? 'info' : 'neutral'">
                      {{ g.active ? 'Ativo' : 'Inativo' }}
                    </StatusPill>
                  </td>
                  <td class="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger as-child>
                        <Button
                          variant="ghost"
                          size="icon"
                          class="cursor-pointer"
                          :aria-label="`Ações para ${g.name}`"
                        >
                          <MoreHorizontal class="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem class="cursor-pointer" @click="abrirEdicaoModal(g)">
                          <Pencil class="size-4" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem class="cursor-pointer" @click="alternarStatusGrupo(g)">
                          <Power class="size-4" />
                          {{ g.active ? 'Inativar' : 'Ativar' }}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          :class="[
                            possuiProdutosVinculados(g)
                              ? 'cursor-not-allowed opacity-50'
                              : 'cursor-pointer text-destructive',
                          ]"
                          :title="
                            possuiProdutosVinculados(g)
                              ? 'Não é possível excluir: grupo possui produtos vinculados'
                              : undefined
                          "
                          @click="tentarExcluir(g)"
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
              {{ meta.total }} grupo(s) · página {{ meta.paginaAtual }} de {{ meta.totalPaginas }}
            </p>
            <div class="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                class="cursor-pointer disabled:cursor-not-allowed"
                :disabled="meta.paginaAtual === 1"
                @click="pagina = meta.paginaAtual - 1"
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                class="cursor-pointer disabled:cursor-not-allowed"
                :disabled="meta.paginaAtual === meta.totalPaginas"
                @click="pagina = meta.paginaAtual + 1"
              >
                Próxima
              </Button>
            </div>
          </div>
        </template>
      </Section>
    </div>

    <GroupModal v-model:open="modalAberto" :grupo="grupoEditando" />

    <AlertDialog :open="!!grupoParaExcluir" @update:open="(o) => !o && (grupoParaExcluir = null)">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir {{ grupoParaExcluir?.name }}?</AlertDialogTitle>
          <AlertDialogDescription>
            Essa ação não poderá ser desfeita. Essa exclusão só é permitida para grupos sem produtos
            vinculados.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="deleteMutation.isPending.value" class="cursor-pointer">
            Cancelar
          </AlertDialogCancel>
          <Button
            :disabled="deleteMutation.isPending.value"
            class="cursor-pointer bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
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
