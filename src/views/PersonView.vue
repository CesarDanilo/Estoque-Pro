<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Download,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-vue-next'

import PageHeader from '@/components/page-shell/PageHeader.vue'
import Section from '@/components/page-shell/Section.vue'
import EmptyState from '@/components/page-shell/EmptyState.vue'
import TableSkeleton from '@/components/page-shell/TableSkeleton.vue'
import SearchField from '@/components/ui-kit/SearchField.vue'
import StatusPill from '@/components/ui-kit/StatusPill.vue'
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

import { dataBR, pessoas } from '@/lib/mockData'

onMounted(() => {
  document.title = 'Pessoas — Estoque Pro'
})

const PORPAGINA = 8
const BUSCA_MAX = 60 // limite de caracteres do campo de busca

// `busca` é um computed com getter/setter: qualquer tentativa de gravar um
// valor maior que BUSCA_MAX é cortada na hora, de forma síncrona — não
// depende do SearchField repassar `maxlength` pro input interno.
const buscaBruta = ref('')
const busca = computed({
  get: () => buscaBruta.value,
  set: (valor) => {
    buscaBruta.value = (valor ?? '').slice(0, BUSCA_MAX)
  },
})

const grupo = ref('todos')
const status = ref('todos')
const pagina = ref(1)
const carregando = ref(false)
const excluir = ref(null)

// extrai só os dígitos de uma string — usado para comparar telefone e
// documento ignorando espaços, parênteses, pontos e traços
function apenasNumeros(texto) {
  return (texto || '').replace(/\D/g, '')
}

// bloqueia a tecla ANTES dela virar caractere, quando já está no limite —
// backspace, setas, delete, tab etc. continuam funcionando normalmente
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

// ordenação clicável nas colunas (Nome e Cadastro)
const sortCampo = ref(null) // 'nome' | 'cadastro' | null
const sortDirecao = ref('asc') // 'asc' | 'desc'

function ordenarPor(campo) {
  if (sortCampo.value === campo) {
    sortDirecao.value = sortDirecao.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortCampo.value = campo
    sortDirecao.value = 'asc'
  }
}

// qualquer mudança de filtro/busca/ordenação volta pra página 1
watch([busca, grupo, status, sortCampo, sortDirecao], () => {
  pagina.value = 1
})

const filtradas = computed(() => {
  const termo = busca.value.trim().toLowerCase()
  const termoNumerico = apenasNumeros(busca.value)

  return pessoas.filter((p) => {
    if (grupo.value !== 'todos' && p.grupo !== grupo.value) return false
    if (status.value !== 'todos' && p.status !== status.value) return false
    if (termo === '') return true

    // nome e e-mail: busca textual normal
    const combinaTexto = [p.nome, p.email].some((c) => c.toLowerCase().includes(termo))

    // documento e telefone: compara só os dígitos, ignorando
    // espaço, ponto, traço e parênteses de ambos os lados
    const combinaNumero =
      termoNumerico !== '' &&
      [p.documento, p.telefone].some((c) => apenasNumeros(c).includes(termoNumerico))

    return combinaTexto || combinaNumero
  })
})

const ordenadas = computed(() => {
  if (!sortCampo.value) return filtradas.value

  const lista = [...filtradas.value]
  const mult = sortDirecao.value === 'asc' ? 1 : -1

  lista.sort((a, b) => {
    if (sortCampo.value === 'nome') {
      return a.nome.localeCompare(b.nome, 'pt-BR') * mult
    }
    // 'cadastro' vem como 'AAAA-MM-DD', comparação de string já ordena certo
    return a.cadastro.localeCompare(b.cadastro) * mult
  })

  return lista
})

const totalPaginas = computed(() => Math.max(1, Math.ceil(ordenadas.value.length / PORPAGINA)))
const paginaAtual = computed(() => Math.min(pagina.value, totalPaginas.value))
const visiveis = computed(() =>
  ordenadas.value.slice((paginaAtual.value - 1) * PORPAGINA, paginaAtual.value * PORPAGINA)
)

const { sucesso, info } = useFeedback()

function limpar() {
  busca.value = ''
  grupo.value = 'todos'
  status.value = 'todos'
  sortCampo.value = null
  pagina.value = 1
}

function exportar() {
  sucesso('Exportação concluída', 'Lista exportada em CSV.')
}

function abrirCadastro() {
  info('Abrindo cadastro', 'Redirecionando para o cadastro da pessoa…')
}

function confirmarExclusao() {
  sucesso('Pessoa excluída', 'A pessoa foi excluída com sucesso.')
  excluir.value = null
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
      <Button as-child class="cursor-pointer bg-emerald-500 text-black hover:bg-emerald-600">
        <RouterLink to="/pessoas/nova">
          <Plus class="size-4" /> Nova pessoa
        </RouterLink>
      </Button>
    </template>
  </PageHeader>

  <div class="p-4 md:p-6">
    <Section>
      <div class="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-center md:p-5">
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
          <Select v-model="grupo">
            <SelectTrigger class="h-10 cursor-pointer md:w-40" aria-label="Filtrar por grupo">
              <SelectValue placeholder="Grupo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos" class="cursor-pointer">Todos os grupos</SelectItem>
              <SelectItem value="Cliente" class="cursor-pointer">Clientes</SelectItem>
              <SelectItem value="Fornecedor" class="cursor-pointer">Fornecedores</SelectItem>
              <SelectItem value="Colaborador" class="cursor-pointer">Colaboradores</SelectItem>
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
        v-else-if="visiveis.length === 0"
        titulo="Nenhuma pessoa encontrada"
        descricao="Não encontramos resultados com esses filtros. Tente outra busca ou cadastre uma nova pessoa."
      >
        <template #acao>
          <div class="flex gap-2">
            <Button variant="outline" @click="limpar" class="cursor-pointer">Limpar filtros</Button>
            <Button as-child class="cursor-pointer bg-emerald-500 text-black hover:bg-emerald-600">
              <RouterLink to="/pessoas/nova">Cadastrar pessoa</RouterLink>
            </Button>
          </div>
        </template>
      </EmptyState>

      <template v-else>
        <!-- Mobile: cartões (já seguem a mesma ordenação da tabela) -->
        <ul class="divide-y divide-border md:hidden">
          <li v-for="p in visiveis" :key="p.id" class="space-y-2 px-4 py-3.5">
            <div class="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
              <div class="min-w-0">
                <p class="truncate text-sm font-medium">{{ p.nome }}</p>
                <p class="truncate text-xs text-muted-foreground">{{ p.documento }} · {{ p.telefone }}</p>
              </div>
              <StatusPill :tom="p.status === 'ativo' ? 'success' : 'neutral'">
                {{ p.status === 'ativo' ? 'Ativa' : 'Inativa' }}
              </StatusPill>
            </div>
            <div class="flex items-center justify-between">
              <StatusPill tom="info">{{ p.grupo }}</StatusPill>
              <span class="text-xs text-muted-foreground">Desde {{ dataBR(p.cadastro) }}</span>
            </div>
          </li>
        </ul>

        <!-- Desktop: tabela -->
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
                <th class="px-4 py-3 font-medium">Documento</th>
                <th class="px-4 py-3 font-medium">Grupo</th>
                <th class="px-4 py-3 font-medium">Telefone</th>
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
              <tr v-for="p in visiveis" :key="p.id" class="transition-colors hover:bg-muted/60">
                <td class="max-w-[240px] px-5 py-3">
                  <p class="truncate font-medium">{{ p.nome }}</p>
                  <p class="truncate text-xs text-muted-foreground">{{ p.email }}</p>
                </td>
                <td class="px-4 py-3 text-muted-foreground">{{ p.documento }}</td>
                <td class="px-4 py-3">
                  <StatusPill tom="info">{{ p.grupo }}</StatusPill>
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
                      <Button variant="ghost" size="icon" class="cursor-pointer" :aria-label="`Ações para ${p.nome}`">
                        <MoreHorizontal class="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem class="cursor-pointer" @click="abrirCadastro">
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
            {{ filtradas.length }} pessoa(s) · página {{ paginaAtual }} de {{ totalPaginas }}
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
          Esta ação não pode ser desfeita. O histórico de vendas desta pessoa continuará registrado.
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