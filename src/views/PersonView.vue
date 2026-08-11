<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { Download, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-vue-next'
import { toast } from 'vue-sonner'

import PageHeader from '@/components/page-shell/PageHeader.vue'
import Section from '@/components/page-shell/Section.vue'
import EmptyState from '@/components/page-shell/EmptyState.vue'
import TableSkeleton from '@/components/page-shell/TableSkeleton.vue'
import SearchField from '@/components/ui-kit/SearchField.vue'
import StatusPill from '@/components/ui-kit/StatusPill.vue'

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

const busca = ref('')
const grupo = ref('todos')
const status = ref('todos')
const pagina = ref(1)
const carregando = ref(false)
const excluir = ref(null)

// qualquer mudança de filtro/busca volta pra página 1
watch([busca, grupo, status], () => {
  pagina.value = 1
})

const filtradas = computed(() =>
  pessoas.filter(
    (p) =>
      (grupo.value === 'todos' || p.grupo === grupo.value) &&
      (status.value === 'todos' || p.status === status.value) &&
      (busca.value.trim() === '' ||
        [p.nome, p.documento, p.telefone, p.email].some((c) =>
          c.toLowerCase().includes(busca.value.toLowerCase())
        ))
  )
)

const totalPaginas = computed(() => Math.max(1, Math.ceil(filtradas.value.length / PORPAGINA)))
const paginaAtual = computed(() => Math.min(pagina.value, totalPaginas.value))
const visiveis = computed(() =>
  filtradas.value.slice((paginaAtual.value - 1) * PORPAGINA, paginaAtual.value * PORPAGINA)
)

function limpar() {
  busca.value = ''
  grupo.value = 'todos'
  status.value = 'todos'
  pagina.value = 1
}

function confirmarExclusao() {
  toast.success('Pessoa excluída com sucesso.')
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
      <Button variant="outline" @click="toast.success('Lista exportada em CSV.')">
        <Download class="size-4" /> Exportar
      </Button>
      <Button as-child>
        <RouterLink to="/pessoas/nova">
          <Plus class="size-4" /> Nova pessoa
        </RouterLink>
      </Button>
    </template>
  </PageHeader>

  <div class="p-4 md:p-6">
    <Section>
      <div class="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-center md:p-5">
        <SearchField
          v-model="busca"
          label="Buscar pessoa por nome, documento, telefone ou e-mail"
          placeholder="Buscar por nome, documento ou telefone…"
          class="md:max-w-sm"
        />
        <div class="grid grid-cols-2 gap-2 md:ml-auto md:flex">
          <Select v-model="grupo">
            <SelectTrigger class="h-10 md:w-40" aria-label="Filtrar por grupo">
              <SelectValue placeholder="Grupo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os grupos</SelectItem>
              <SelectItem value="Cliente">Clientes</SelectItem>
              <SelectItem value="Fornecedor">Fornecedores</SelectItem>
              <SelectItem value="Colaborador">Colaboradores</SelectItem>
            </SelectContent>
          </Select>
          <Select v-model="status">
            <SelectTrigger class="h-10 md:w-36" aria-label="Filtrar por situação">
              <SelectValue placeholder="Situação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas</SelectItem>
              <SelectItem value="ativo">Ativas</SelectItem>
              <SelectItem value="inativo">Inativas</SelectItem>
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
            <Button variant="outline" @click="limpar">Limpar filtros</Button>
            <Button as-child>
              <RouterLink to="/pessoas/nova">Cadastrar pessoa</RouterLink>
            </Button>
          </div>
        </template>
      </EmptyState>

      <template v-else>
        <!-- Mobile: cartões -->
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
                <th class="px-5 py-3 font-medium">Nome</th>
                <th class="px-4 py-3 font-medium">Documento</th>
                <th class="px-4 py-3 font-medium">Grupo</th>
                <th class="px-4 py-3 font-medium">Telefone</th>
                <th class="px-4 py-3 font-medium">Situação</th>
                <th class="px-4 py-3 font-medium">Cadastro</th>
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
                      <Button variant="ghost" size="icon" :aria-label="`Ações para ${p.nome}`">
                        <MoreHorizontal class="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem @click="toast('Abrindo cadastro…')">
                        <Pencil class="size-4" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem class="text-destructive" @click="excluir = p">
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
              :disabled="paginaAtual === 1"
              @click="pagina = paginaAtual - 1"
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
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
        <AlertDialogCancel>Cancelar</AlertDialogCancel>
        <AlertDialogAction @click="confirmarExclusao">Excluir</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>