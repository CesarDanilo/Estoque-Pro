<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { Download, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-vue-next'

import PageHeader from '@/components/page-shell/PageHeader.vue'
import Section from '@/components/page-shell/Section.vue'
import EmptyState from '@/components/page-shell/EmptyState.vue'
import TableSkeleton from '@/components/page-shell/TableSkeleton.vue'
import SearchField from '@/components/ui-kit/SearchField.vue'
import StatusPill from '@/components/ui-kit/StatusPill.vue'
import NewPerson from '@/components/modal/person/NewPerson.vue'
import { useFeedback } from '@/composables/useFeedBack'
import { usePeople } from '@/composables/usePeople'
import { useDebounceFn } from '@/composables/useDebounce'

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

import { dataBR } from '@/lib/mockData'

onMounted(() => {
  document.title = 'Pessoas — Estoque Pro'
  recarregar()
})

const BUSCA_MAX = 60

const { pessoas, carregando, meta, buscar, criar, atualizar, atualizarParcial, remover } =
  usePeople()
const { sucesso, erro: erroFeedback } = useFeedback()

const buscaBruta = ref('')
const busca = computed({
  get: () => buscaBruta.value,
  set: (valor) => {
    buscaBruta.value = (valor ?? '').slice(0, BUSCA_MAX)
  },
})

const type = ref('todos') // 'todos' | 'individual' | 'company'
const status = ref('todos') // 'todos' | 'ativo' | 'inativo'
const pagina = ref(1)
const excluir = ref(null)
const excluindo = ref(false)
const modalAberto = ref(false)
const pessoaEditando = ref(null)

const TECLAS_PERMITIDAS = new Set([
  'Backspace',
  'Delete',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Tab',
  'Home',
  'End',
  'Enter',
  'Escape',
  'Shift',
  'Control',
  'Alt',
  'Meta',
])
function bloquearExcedente(evento) {
  if (TECLAS_PERMITIDAS.has(evento.key) || evento.ctrlKey || evento.metaKey || evento.altKey) return
  if (busca.value.length >= BUSCA_MAX) evento.preventDefault()
}

function recarregar() {
  buscar({ search: busca.value, type: type.value, active: status.value, page: pagina.value })
}
const recarregarDebounced = useDebounceFn(recarregar, 400)

watch([type, status], () => {
  pagina.value = 1
  recarregar()
})
watch(busca, () => {
  pagina.value = 1
  recarregarDebounced()
})
watch(pagina, recarregar)

function limpar() {
  busca.value = ''
  type.value = 'todos'
  status.value = 'todos'
  pagina.value = 1
}

function exportar() {
  sucesso('Exportação concluída', 'Lista exportada em CSV.')
}

function abrirModal() {
  pessoaEditando.value = null
  modalAberto.value = true
}

// aguarda o DropdownMenu terminar de fechar (nextTick) antes de abrir o modal —
// evita o bug de pointer-events travado do Radix/shadcn quando Dropdown + Dialog se sobrepõem
async function abrirEdicao(pessoa) {
  pessoaEditando.value = pessoa
  await nextTick()
  modalAberto.value = true
}

// Apenas SELECIONA a pessoa e ABRE o modal de confirmação — não exclui nada aqui.
// (mesmo cuidado com nextTick que abrirEdicao, pelo mesmo motivo: Dropdown + AlertDialog sobrepostos)
async function selecionarParaExclusao(pessoa) {
  await nextTick()
  excluir.value = pessoa
}

function pessoaCriada() {
  sucesso('Pessoa cadastrada', 'Cadastro realizado com sucesso.')
  pagina.value = 1
  recarregar()
}

function pessoaAtualizada() {
  sucesso('Pessoa atualizada', 'Dados atualizados com sucesso.')
  recarregar()
}

// Só é chamada pelo clique no botão "Excluir" dentro do AlertDialog — exclui de fato.
//
// IMPORTANTE: o botão de confirmar é um <Button> comum, NÃO um AlertDialogAction.
// O AlertDialogAction do reka-ui/radix-vue fecha o diálogo sozinho ao ser clicado,
// de forma incondicional (nem "event.preventDefault()" bloqueia esse comportamento
// na porta pra Vue). Isso disparava o @update:open ANTES desta função terminar,
// zerando `excluir.value` no meio do caminho e cancelando a exclusão. Usando um
// Button comum, o fechamento do diálogo passa a ser controlado 100% por nós —
// só acontece quando `excluir.value = null` é setado abaixo, após o sucesso.
async function confirmarExclusao() {
  const alvo = excluir.value
  if (!alvo || excluindo.value) return

  excluindo.value = true
  try {
    await remover(alvo.id)
    sucesso('Pessoa excluída', 'A pessoa foi excluída com sucesso.')
    excluir.value = null
    pagina.value = 1
    recarregar()
  } catch (e) {
    erroFeedback('Erro ao excluir', e.response?.data?.message || 'Tente novamente.')
  } finally {
    excluindo.value = false
  }
}
</script>

<template>
  <PageHeader
    titulo="Pessoas"
    descricao="Clientes, fornecedores e colaboradores cadastrados."
    :trilha="[{ titulo: 'Gestão' }, { titulo: 'Pessoas' }]"
  >
    <template #acoes>
      <Button variant="outline" @click="exportar" class="cursor-pointer">
        <Download class="size-4" /> Exportar
      </Button>
      <Button
        class="cursor-pointer bg-emerald-500 text-black hover:bg-emerald-600"
        @click="abrirModal"
      >
        <Plus class="size-4" /> Nova pessoa
      </Button>
    </template>
  </PageHeader>

  <div class="p-4 md:p-6">
    <Section>
      <div
        class="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-center md:p-5"
      >
        <div class="relative w-full md:max-w-md lg:max-w-lg" @keydown="bloquearExcedente">
          <SearchField
            v-model="busca"
            label="Buscar pessoa por nome, documento, telefone ou e-mail"
            placeholder="Buscar por nome, documento ou telefone…"
            class="w-full"
            :maxlength="BUSCA_MAX"
          />
          <span
            class="pointer-events-none absolute right-3 top-1/2 z-10 -translate-y-1/2 select-none text-[11px] font-medium tabular-nums transition-colors"
            :class="busca.length >= BUSCA_MAX ? 'text-red-500' : 'text-muted-foreground/40'"
          >
            {{ busca.length }}/{{ BUSCA_MAX }}
          </span>
        </div>
        <div class="grid grid-cols-2 gap-2 md:ml-auto md:flex md:shrink-0">
          <Select v-model="type">
            <SelectTrigger class="h-10 cursor-pointer md:w-40" aria-label="Filtrar por tipo">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos" class="cursor-pointer">Todos os tipos</SelectItem>
              <SelectItem value="individual" class="cursor-pointer">Pessoa física</SelectItem>
              <SelectItem value="company" class="cursor-pointer">Pessoa jurídica</SelectItem>
            </SelectContent>
          </Select>
          <Select v-model="status">
            <SelectTrigger class="h-10 cursor-pointer md:w-36" aria-label="Filtrar por situação">
              <SelectValue placeholder="Situação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos" class="cursor-pointer">Todas</SelectItem>
              <SelectItem value="ativo" class="cursor-pointer">Ativas</SelectItem>
              <SelectItem value="inativo" class="cursor-pointer">Inativas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <TableSkeleton v-if="carregando" :colunas="6" />

      <EmptyState
        v-else-if="pessoas.length === 0"
        titulo="Nenhuma pessoa encontrada"
        descricao="Não encontramos resultados com esses filtros. Tente outra busca ou cadastre uma nova pessoa."
      >
        <template #acao>
          <div class="flex gap-2">
            <Button variant="outline" @click="limpar" class="cursor-pointer">Limpar filtros</Button>
            <Button
              class="cursor-pointer bg-emerald-500 text-black hover:bg-emerald-600"
              @click="abrirModal"
            >
              Cadastrar pessoa
            </Button>
          </div>
        </template>
      </EmptyState>

      <template v-else>
        <!-- Mobile: cartões -->
        <ul class="divide-y divide-border md:hidden">
          <li v-for="p in pessoas" :key="p.id" class="space-y-2 px-4 py-3.5">
            <div class="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
              <div class="min-w-0">
                <p class="truncate text-sm font-medium">{{ p.nome }}</p>
                <p class="truncate text-xs text-muted-foreground">
                  {{ p.documento }} · {{ p.telefone }}
                </p>
              </div>
              <div class="flex items-center gap-1">
                <StatusPill :tom="p.status === 'ativo' ? 'success' : 'neutral'">
                  {{ p.status === 'ativo' ? 'Ativa' : 'Inativa' }}
                </StatusPill>
                <DropdownMenu>
                  <DropdownMenuTrigger as-child>
                    <Button
                      variant="ghost"
                      size="icon"
                      class="cursor-pointer"
                      :aria-label="`Ações para ${p.nome}`"
                    >
                      <MoreHorizontal class="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem class="cursor-pointer" @click="abrirEdicao(p)">
                      <Pencil class="size-4" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      class="cursor-pointer text-destructive"
                      @click="selecionarParaExclusao(p)"
                    >
                      <Trash2 class="size-4" /> Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <div class="flex items-center justify-between">
              <StatusPill tom="info">{{
                p.type === 'individual' ? 'Física' : 'Jurídica'
              }}</StatusPill>
              <span class="text-xs text-muted-foreground">Desde {{ dataBR(p.cadastro) }}</span>
            </div>
          </li>
        </ul>

        <!-- Desktop: tabela -->
        <div class="hidden md:block">
          <table class="w-full text-sm">
            <thead class="text-xs text-muted-foreground">
              <tr class="border-b border-border text-left">
                <th class="px-5 py-3 font-medium">Nome</th>
                <th class="px-4 py-3 font-medium">Documento</th>
                <th class="px-4 py-3 font-medium">Tipo</th>
                <th class="px-4 py-3 font-medium">Telefone</th>
                <th class="px-4 py-3 font-medium">Situação</th>
                <th class="px-4 py-3 font-medium">Cadastro</th>
                <th class="px-4 py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr v-for="p in pessoas" :key="p.id" class="transition-colors hover:bg-muted/60">
                <td class="max-w-[240px] px-5 py-3">
                  <p class="truncate font-medium">{{ p.nome }}</p>
                  <p class="truncate text-xs text-muted-foreground">{{ p.email }}</p>
                </td>
                <td class="px-4 py-3 text-muted-foreground">{{ p.documento }}</td>
                <td class="px-4 py-3">
                  <StatusPill tom="info">{{
                    p.type === 'individual' ? 'Física' : 'Jurídica'
                  }}</StatusPill>
                </td>
                <td class="px-4 py-3 text-muted-foreground">{{ p.telefone }}</td>
                <td class="px-4 py-3">
                  <StatusPill :tom="p.status === 'ativo' ? 'success' : 'neutral'">
                    {{ p.status === 'ativo' ? 'Ativa' : 'Inativa' }}
                  </StatusPill>
                </td>
                <td class="px-4 py-3 text-muted-foreground">{{ dataBR(p.cadastro) }}</td>
                <td class="px-4 py-3 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger as-child>
                      <Button
                        variant="ghost"
                        size="icon"
                        class="cursor-pointer"
                        :aria-label="`Ações para ${p.nome}`"
                      >
                        <MoreHorizontal class="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem class="cursor-pointer" @click="abrirEdicao(p)">
                        <Pencil class="size-4" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        class="cursor-pointer text-destructive"
                        @click="selecionarParaExclusao(p)"
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
            {{ meta.total }} pessoa(s) · página {{ meta.paginaAtual }} de {{ meta.totalPaginas }}
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

  <AlertDialog :open="!!excluir" @update:open="(o) => !o && (excluir = null)">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Excluir {{ excluir?.nome }}?</AlertDialogTitle>
        <AlertDialogDescription>
          Esta ação não pode ser desfeita. O histórico de vendas desta pessoa continuará registrado.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel class="cursor-pointer" :disabled="excluindo">Cancelar</AlertDialogCancel>
        <Button
          type="button"
          class="cursor-pointer bg-red-500 text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="excluindo"
          @click="confirmarExclusao"
        >
          {{ excluindo ? 'Excluindo…' : 'Excluir' }}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>

  <NewPerson
    v-model:open="modalAberto"
    :pessoa="pessoaEditando"
    :ao-criar="criar"
    :ao-atualizar="atualizar"
    :ao-atualizar-parcial="atualizarParcial"
    @created="pessoaCriada"
    @updated="pessoaAtualizada"
  />
</template>
