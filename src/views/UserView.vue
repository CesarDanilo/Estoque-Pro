<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Download,
  Mail,
  MoreHorizontal,
  Pencil,
  Plus,
  Shield,
  Trash2,
  UserCheck,
  UserX,
} from 'lucide-vue-next'

import PageHeader from '@/components/page-shell/PageHeader.vue'
import Section from '@/components/page-shell/Section.vue'
import EmptyState from '@/components/page-shell/EmptyState.vue'
import TableSkeleton from '@/components/page-shell/TableSkeleton.vue'
import SearchField from '@/components/ui-kit/SearchField.vue'
import StatusPill from '@/components/ui-kit/StatusPill.vue'
import UserModal from '@/components/NewUser.vue'
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

import { dataBR } from '@/lib/mockData'

onMounted(() => {
  document.title = 'Usuários — Estoque Pro'
})

const PORPAGINA = 8
const BUSCA_MAX = 60

// ---- Mock Inicial de Usuários ----
const usuarios = ref([
  {
    id: 1,
    nome: 'Ana Silva',
    email: 'ana.silva@empresa.com',
    cargo: 'Administrador',
    status: 'ativo',
    cadastro: '2026-01-15',
    ultimoAcesso: '2026-08-11T10:30:00',
  },
  {
    id: 2,
    nome: 'Carlos Eduardo',
    email: 'carlos.eduardo@empresa.com',
    cargo: 'Vendedor',
    status: 'ativo',
    cadastro: '2026-03-20',
    ultimoAcesso: '2026-08-10T16:45:00',
  },
  {
    id: 3,
    nome: 'Beatriz Lima',
    email: 'beatriz.lima@empresa.com',
    cargo: 'Gerente',
    status: 'inativo',
    cadastro: '2026-05-10',
    ultimoAcesso: '2026-07-28T09:12:00',
  },
])

// ---- Estados de Controle ----
const buscaBruta = ref('')
const busca = computed({
  get: () => buscaBruta.value,
  set: (valor) => {
    buscaBruta.value = (valor ?? '').slice(0, BUSCA_MAX)
  },
})

const cargoFilter = ref('todos')
const statusFilter = ref('todos')
const pagina = ref(1)
const carregando = ref(false)
const excluir = ref(null)

const modalAberto = ref(false)
const usuarioEditando = ref(null)

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

// ---- Ordenação ----
const sortCampo = ref(null)
const sortDirecao = ref('asc')

function ordenarPor(campo) {
  if (sortCampo.value === campo) {
    sortDirecao.value = sortDirecao.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortCampo.value = campo
    sortDirecao.value = 'asc'
  }
}

watch([busca, cargoFilter, statusFilter, sortCampo, sortDirecao], () => {
  pagina.value = 1
})

// ---- Filtragem ----
const filtrados = computed(() => {
  const termo = busca.value.trim().toLowerCase()

  return usuarios.value.filter((u) => {
    if (cargoFilter.value !== 'todos' && u.cargo !== cargoFilter.value) return false
    if (statusFilter.value !== 'todos' && u.status !== statusFilter.value) return false
    if (termo === '') return true

    return [u.nome, u.email].some((c) => c.toLowerCase().includes(termo))
  })
})

const ordenados = computed(() => {
  if (!sortCampo.value) return filtrados.value

  const lista = [...filtrados.value]
  const mult = sortDirecao.value === 'asc' ? 1 : -1

  lista.sort((a, b) => {
    if (sortCampo.value === 'nome') {
      return a.nome.localeCompare(b.nome, 'pt-BR') * mult
    }
    return a.cadastro.localeCompare(b.cadastro) * mult
  })

  return lista
})

// ---- Paginação ----
const totalPaginas = computed(() => Math.max(1, Math.ceil(ordenados.value.length / PORPAGINA)))
const paginaAtual = computed(() => Math.min(pagina.value, totalPaginas.value))
const visiveis = computed(() =>
  ordenados.value.slice((paginaAtual.value - 1) * PORPAGINA, paginaAtual.value * PORPAGINA)
)

const { sucesso } = useFeedback()

function limpar() {
  busca.value = ''
  cargoFilter.value = 'todos'
  statusFilter.value = 'todos'
  sortCampo.value = null
  pagina.value = 1
}

function exportar() {
  sucesso('Exportação concluída', 'Lista de usuários exportada em CSV.')
}

function abrirModal() {
  usuarioEditando.value = null
  modalAberto.value = true
}

function abrirEdicao(usuario) {
  usuarioEditando.value = usuario
  modalAberto.value = true
}

function usuarioCriado(usuario) {
  usuarios.value.unshift({
    ...usuario,
    id: Date.now(),
    cadastro: new Date().toISOString().slice(0, 10),
    ultimoAcesso: null,
  })
  pagina.value = 1
  sucesso('Usuário cadastrado', `${usuario.nome} foi adicionado ao sistema.`)
}

function usuarioAtualizado(usuario) {
  const index = usuarios.value.findIndex((u) => u.id === usuario.id)
  if (index !== -1) {
    usuarios.value[index] = {
      ...usuarios.value[index],
      ...usuario,
    }
    sucesso('Usuário atualizado', `${usuario.nome} foi atualizado com sucesso.`)
  }
}

function alternarStatus(usuario) {
  usuario.status = usuario.status === 'ativo' ? 'inativo' : 'ativo'
  sucesso(
    `Status atualizado`,
    `Usuário ${usuario.nome} agora está ${usuario.status}.`
  )
}

function confirmarExclusao() {
  if (!excluir.value) return
  usuarios.value = usuarios.value.filter((u) => u.id !== excluir.value.id)
  sucesso('Usuário excluído', 'O usuário foi removido do sistema.')
  excluir.value = null
}
</script>

<template>
  <PageHeader
    titulo="Usuários"
    descricao="Gerencie os usuários do sistema, permissões de acesso e cadastros."
    :trilha="[{ titulo: 'Gestão' }, { titulo: 'Usuários' }]"
  >
    <template #acoes>
      <Button variant="outline" @click="exportar" class="cursor-pointer">
        <Download class="size-4" /> Exportar
      </Button>
      <Button
        class="cursor-pointer bg-emerald-500 text-black hover:bg-emerald-600"
        @click="abrirModal"
      >
        <Plus class="size-4" /> Novo usuário
      </Button>
    </template>
  </PageHeader>

  <div class="p-4 md:p-6">
    <Section>
      <div class="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-center md:p-5">
        <div class="relative w-full md:max-w-md lg:max-w-lg" @keydown="bloquearExcedente">
          <SearchField
            v-model="busca"
            label="Buscar usuário por nome ou e-mail"
            placeholder="Buscar por nome ou e-mail…"
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
          <Select v-model="cargoFilter">
            <SelectTrigger class="h-10 cursor-pointer md:w-40" aria-label="Filtrar por cargo">
              <SelectValue placeholder="Cargo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos" class="cursor-pointer">Todos os cargos</SelectItem>
              <SelectItem value="Administrador" class="cursor-pointer">Administrador</SelectItem>
              <SelectItem value="Gerente" class="cursor-pointer">Gerente</SelectItem>
              <SelectItem value="Vendedor" class="cursor-pointer">Vendedor</SelectItem>
            </SelectContent>
          </Select>

          <Select v-model="statusFilter">
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
        v-else-if="visiveis.length === 0"
        titulo="Nenhum usuário encontrado"
        descricao="Não encontramos resultados com esses filtros. Tente outra busca ou cadastre um novo usuário."
      >
        <template #acao>
          <div class="flex gap-2">
            <Button variant="outline" @click="limpar" class="cursor-pointer">Limpar filtros</Button>
            <Button
              class="cursor-pointer bg-emerald-500 text-black hover:bg-emerald-600"
              @click="abrirModal"
            >
              Cadastrar usuário
            </Button>
          </div>
        </template>
      </EmptyState>

      <template v-else>
        <ul class="divide-y divide-border md:hidden">
          <li v-for="u in visiveis" :key="u.id" class="space-y-2 px-4 py-3.5">
            <div class="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
              <div class="min-w-0">
                <p class="truncate text-sm font-medium">{{ u.nome }}</p>
                <p class="truncate text-xs text-muted-foreground">{{ u.email }}</p>
              </div>
              <div class="flex items-center gap-1">
                <StatusPill :tom="u.status === 'ativo' ? 'success' : 'neutral'">
                  {{ u.status === 'ativo' ? 'Ativo' : 'Inativo' }}
                </StatusPill>
                <DropdownMenu>
                  <DropdownMenuTrigger as-child>
                    <Button variant="ghost" size="icon" class="cursor-pointer" :aria-label="`Ações para ${u.nome}`">
                      <MoreHorizontal class="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem class="cursor-pointer" @click="abrirEdicao(u)">
                      <Pencil class="size-4 mr-2" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem class="cursor-pointer" @click="alternarStatus(u)">
                      <component :is="u.status === 'ativo' ? UserX : UserCheck" class="size-4 mr-2" />
                      {{ u.status === 'ativo' ? 'Desativar' : 'Ativar' }}
                    </DropdownMenuItem>
                    <DropdownMenuItem class="cursor-pointer text-destructive" @click="excluir = u">
                      <Trash2 class="size-4 mr-2" /> Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <div class="flex items-center justify-between">
              <StatusPill tom="info">{{ u.cargo }}</StatusPill>
              <span class="text-xs text-muted-foreground">Desde {{ dataBR(u.cadastro) }}</span>
            </div>
          </li>
        </ul>

        <div class="hidden md:block">
          <table class="w-full text-sm">
            <thead class="text-xs text-muted-foreground">
              <tr class="border-b border-border text-left">
                <th class="px-5 py-3 font-medium">
                  <button
                    type="button"
                    class="inline-flex cursor-pointer items-center gap-1 transition-colors hover:text-foreground"
                    @click="ordenarPor('nome')"
                  >
                    Nome
                    <ArrowUp v-if="sortCampo === 'nome' && sortDirecao === 'asc'" class="size-3.5" />
                    <ArrowDown v-else-if="sortCampo === 'nome' && sortDirecao === 'desc'" class="size-3.5" />
                    <ArrowUpDown v-else class="size-3.5 opacity-40" />
                  </button>
                </th>
                <th class="px-4 py-3 font-medium">Cargo</th>
                <th class="px-4 py-3 font-medium">Situação</th>
                <th class="px-4 py-3 font-medium">
                  <button
                    type="button"
                    class="inline-flex cursor-pointer items-center gap-1 transition-colors hover:text-foreground"
                    @click="ordenarPor('cadastro')"
                  >
                    Cadastro
                    <ArrowUp v-if="sortCampo === 'cadastro' && sortDirecao === 'asc'" class="size-3.5" />
                    <ArrowDown v-else-if="sortCampo === 'cadastro' && sortDirecao === 'desc'" class="size-3.5" />
                    <ArrowUpDown v-else class="size-3.5 opacity-40" />
                  </button>
                </th>
                <th class="px-4 py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr v-for="u in visiveis" :key="u.id" class="transition-colors hover:bg-muted/60">
                <td class="max-w-[280px] px-5 py-3">
                  <p class="truncate font-medium">{{ u.nome }}</p>
                  <p class="truncate text-xs text-muted-foreground flex items-center gap-1">
                    <Mail class="size-3" /> {{ u.email }}
                  </p>
                </td>
                <td class="px-4 py-3">
                  <StatusPill tom="info">
                    <Shield class="mr-1 size-3" /> {{ u.cargo }}
                  </StatusPill>
                </td>
                <td class="px-4 py-3">
                  <StatusPill :tom="u.status === 'ativo' ? 'success' : 'neutral'">
                    {{ u.status === 'ativo' ? 'Ativo' : 'Inativo' }}
                  </StatusPill>
                </td>
                <td class="px-4 py-3 text-muted-foreground">{{ dataBR(u.cadastro) }}</td>
                <td class="px-4 py-3 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger as-child>
                      <Button variant="ghost" size="icon" class="cursor-pointer" :aria-label="`Ações para ${u.nome}`">
                        <MoreHorizontal class="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem class="cursor-pointer" @click="abrirEdicao(u)">
                        <Pencil class="size-4 mr-2" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem class="cursor-pointer" @click="alternarStatus(u)">
                        <component :is="u.status === 'ativo' ? UserX : UserCheck" class="size-4 mr-2" />
                        {{ u.status === 'ativo' ? 'Desativar' : 'Ativar' }}
                      </DropdownMenuItem>
                      <DropdownMenuItem class="cursor-pointer text-destructive" @click="excluir = u">
                        <Trash2 class="size-4 mr-2" /> Excluir
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
            {{ filtrados.length }} usuário(s) · página {{ paginaAtual }} de {{ totalPaginas }}
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

  <AlertDialog :open="!!excluir" @update:open="(o) => !o && (excluir = null)">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Excluir {{ excluir?.nome }}?</AlertDialogTitle>
        <AlertDialogDescription>
          Esta ação não pode ser desfeita. O histórico de atividades deste usuário continuará registrado no sistema.
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

  <UserModal
    v-model:open="modalAberto"
    :usuario="usuarioEditando"
    @created="usuarioCriado"
    @updated="usuarioAtualizado"
  />
</template>