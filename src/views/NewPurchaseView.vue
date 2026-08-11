<script setup lang="ts">
import { RouterLink, useRouter } from 'vue-router'
import { onMounted, computed, ref } from 'vue'
import { ArrowDownRight, Check, FileCode, Loader2, Minus, Plus, Search, Trash2, Upload } from 'lucide-vue-next'

import PageHeader from '@/components/page-shell/PageHeader.vue'
import Section from '@/components/page-shell/Section.vue'
import EmptyState from '@/components/page-shell/EmptyState.vue'
import FieldLabel from '@/components/ui-kit/FieldLabel.vue'
import StatusPill from '@/components/ui-kit/StatusPill.vue'
import NewSupplier from '@/components/NewSupplier.vue'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { useFeedback } from '@/composables/useFeedBack'
import { brl } from '@/lib/mockData'
import { fornecedores, produtos } from '@/lib/mockDataProdutos'

type Item = { id: string; nome: string; qtd: number; valor: number }

onMounted(() => {
  document.title = 'Nova compra — Estoque Pro'
})

const router = useRouter()
const { sucesso, erro, info } = useFeedback()

const passo = ref(1)
const fornecedor = ref('')
const buscaFornecedor = ref('')
const buscaProduto = ref('')
const grupoSelecionado = ref('todos')
const itens = ref<Item[]>([])
const salvando = ref(false)
const modalFornecedorAberto = ref(false)
const importandoXml = ref(false)

const fileInputRef = ref<HTMLInputElement | null>(null)

const passos = ['Fornecedor', 'Produtos e valores', 'Revisar e finalizar']

// ---- Passo 1: Fornecedores em Ordem Alfabética e Filtráveis ----
const fornecedoresAtivos = computed(() => {
  return [...fornecedores]
    .filter((f) => f.status === 'ativo')
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
})

const fornecedoresFiltrados = computed(() => {
  if (!buscaFornecedor.value.trim()) return fornecedoresAtivos.value
  return fornecedoresAtivos.value.filter((f) =>
    f.nome.toLowerCase().includes(buscaFornecedor.value.toLowerCase()),
  )
})

// ---- Passo 2: Grupos e Produtos ----
const grupos = computed(() => {
  const lista = produtos.map((p) => p.grupo || p.categoria).filter(Boolean)
  return ['todos', ...Array.from(new Set(lista))]
})

const produtosFiltrados = computed(() => {
  return produtos.filter((p) => {
    const grupoProduto = p.grupo || p.categoria
    const atendeGrupo =
      grupoSelecionado.value === 'todos' || grupoProduto === grupoSelecionado.value
    const atendeBusca =
      !buscaProduto.value.trim() ||
      [p.nome, p.sku].some((c) =>
        c.toLowerCase().includes(buscaProduto.value.toLowerCase()),
      )
    return atendeGrupo && atendeBusca
  })
})

const total = computed(() =>
  itens.value.reduce((s, i) => s + (Number(i.qtd) || 0) * (Number(i.valor) || 0), 0),
)

function adicionar(id: string) {
  const p = produtos.find((x) => x.id === id)!
  const existente = itens.value.find((i) => i.id === id)
  if (existente) {
    existente.qtd += 1
  } else {
    itens.value.push({ id, nome: p.nome, qtd: 1, valor: p.custo })
  }
}

function remover(id: string) {
  itens.value = itens.value.filter((x) => x.id !== id)
}

function alterarQtd(id: string, delta: number) {
  const item = itens.value.find((x) => x.id === id)
  if (item) {
    item.qtd = Math.max(1, (Number(item.qtd) || 0) + delta)
  }
}

// ---- Modal e Cadastro Rápidos de Fornecedor ----
function abrirModalFornecedor() {
  modalFornecedorAberto.value = true
}

function fornecedorCriado(payload: any) {
  const novo = {
    id: String(Date.now()),
    nome: payload.nome,
    status: payload.ativo ? 'ativo' : 'inativo',
  }
  fornecedores.unshift(novo)
  fornecedor.value = novo.nome
  sucesso('Fornecedor cadastrado', `${novo.nome} foi selecionado para esta compra.`)
}

// ---- Leitura e Importação de XML ----
function dispararImportacaoXml() {
  fileInputRef.value?.click()
}

function processarXml(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  if (!file.name.endsWith('.xml')) {
    erro('Arquivo inválido', 'Selecione um arquivo .xml de nota fiscal válido.')
    return
  }

  importandoXml.value = true

  const reader = new FileReader()
  reader.onload = () => {
    setTimeout(() => {
      const itensImportados = [
        { id: produtos[0]?.id || '1', nome: produtos[0]?.nome || 'Produto Importado 1', qtd: 10, valor: produtos[0]?.custo || 25.5 },
        { id: produtos[1]?.id || '2', nome: produtos[1]?.nome || 'Produto Importado 2', qtd: 5, valor: produtos[1]?.custo || 140.0 },
      ]

      itensImportados.forEach((novoItem) => {
        const existente = itens.value.find((i) => i.id === novoItem.id)
        if (existente) {
          existente.qtd += novoItem.qtd
        } else {
          itens.value.push(novoItem)
        }
      })

      importandoXml.value = false
      info('Nota Fiscal importada', 'Os produtos do XML foram adicionados à lista.')
      if (fileInputRef.value) fileInputRef.value.value = ''
    }, 800)
  }

  reader.onerror = () => {
    importandoXml.value = false
    erro('Falha ao ler o arquivo XML.')
  }

  reader.readAsText(file)
}

function finalizar() {
  if (salvando.value || itens.value.length === 0) return
  salvando.value = true
  setTimeout(() => {
    salvando.value = false
    sucesso('Compra finalizada', 'Estoque atualizado com as entradas.')
    router.push('/compras')
  }, 900)
}
</script>

<template>
  <PageHeader
    titulo="Nova compra"
    descricao="Ao finalizar, o estoque dos produtos aumenta automaticamente."
    :trilha="[
      { titulo: 'Movimentações' },
      { titulo: 'Compras', url: '/compras' },
      { titulo: 'Nova compra' },
    ]"
  >
    <template #acoes>
      <Button variant="outline" as-child class="cursor-pointer">
        <RouterLink to="/compras">Cancelar</RouterLink>
      </Button>
    </template>
  </PageHeader>

  <div class="space-y-4 p-4 md:p-6">
    <div class="panel flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:gap-4 md:p-4">
      <div v-for="(p, i) in passos" :key="p" class="flex min-w-0 items-center gap-2">
        <span
          :class="
            i + 1 <= passo
              ? 'grid size-6 shrink-0 place-items-center rounded-full bg-emerald-500 text-xs font-semibold text-black'
              : 'grid size-6 shrink-0 place-items-center rounded-full bg-surface-2 text-xs font-semibold text-muted-foreground'
          "
        >
          <Check v-if="i + 1 < passo" class="size-3.5" />
          <template v-else>{{ i + 1 }}</template>
        </span>
        <span :class="i + 1 === passo ? 'truncate text-sm font-medium' : 'truncate text-sm text-muted-foreground'">
          {{ p }}
        </span>
      </div>
      <StatusPill tom="info">
        <template #icone>
          <ArrowDownRight class="size-3.5" />
        </template>
        Entrada de estoque
      </StatusPill>
    </div>

    <Section v-if="passo === 1" titulo="Quem está vendendo para você?">
      <div class="space-y-4 p-4 md:p-5">
        <div class="max-w-md space-y-1.5">
          <FieldLabel for="fornecedor" obrigatorio>Fornecedor</FieldLabel>
          <Select v-model="fornecedor">
            <SelectTrigger id="fornecedor" class="h-10 cursor-pointer bg-surface">
              <SelectValue placeholder="Selecione o fornecedor" />
            </SelectTrigger>
            <SelectContent class="max-h-64">
              <div class="p-2 border-b border-border sticky top-0 bg-popover z-10">
                <div class="relative">
                  <Search class="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    v-model="buscaFornecedor"
                    placeholder="Pesquisar fornecedor..."
                    class="h-8 text-xs pl-8 pr-2"
                    @click.stop
                    @keydown.stop
                  />
                </div>
              </div>
              <SelectItem
                v-for="f in fornecedoresFiltrados"
                :key="f.id"
                :value="f.nome"
                class="cursor-pointer text-xs"
              >
                {{ f.nome }}
              </SelectItem>
              <div v-if="fornecedoresFiltrados.length === 0" class="py-3 text-center text-xs text-muted-foreground">
                Nenhum fornecedor encontrado.
              </div>
            </SelectContent>
          </Select>
          <button
            type="button"
            class="cursor-pointer text-xs font-medium text-emerald-600 hover:underline dark:text-emerald-400"
            @click="abrirModalFornecedor"
          >
            + Cadastrar novo fornecedor
          </button>
        </div>
        <Button
          :disabled="!fornecedor"
          class="cursor-pointer bg-emerald-500 text-black hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
          @click="passo = 2"
        >
          Continuar
        </Button>
      </div>
    </Section>

    <div v-else-if="passo === 2" class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
      <Section titulo="Adicionar produtos" descricao="Seleção da lista completa de produtos ou importação de NF-e via XML.">
        <div class="space-y-4 p-4 md:p-5">
          <input ref="fileInputRef" type="file" accept=".xml" class="hidden" @change="processarXml" />

          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-lg border border-dashed border-border bg-surface-2 p-3.5">
            <div class="space-y-0.5">
              <p class="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <FileCode class="size-4 text-emerald-500" />
                Importar via Nota Fiscal (XML)
              </p>
              <p class="text-[11px] text-muted-foreground">
                Carregue o arquivo .xml da NF-e para preencher os produtos automaticamente.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              class="cursor-pointer h-9 text-xs shrink-0 w-full sm:w-auto"
              :disabled="importandoXml"
              @click="dispararImportacaoXml"
            >
              <Loader2 v-if="importandoXml" class="size-3.5 animate-spin mr-1.5" />
              <Upload v-else class="size-3.5 mr-1.5 text-muted-foreground" />
              {{ importandoXml ? 'Lendo XML…' : 'Selecionar XML' }}
            </Button>
          </div>

          <div class="relative flex items-center py-1">
            <div class="grow border-t border-border"></div>
            <span class="shrink px-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">ou selecione da lista</span>
            <div class="grow border-t border-border"></div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-12 gap-2">
            <div class="sm:col-span-8 relative">
              <Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
              <Input
                v-model="buscaProduto"
                placeholder="Buscar por nome ou SKU..."
                class="h-9 text-xs pl-9 cursor-text"
              />
            </div>

            <div class="sm:col-span-4">
              <Select v-model="grupoSelecionado">
                <SelectTrigger class="h-9 text-xs cursor-pointer">
                  <SelectValue placeholder="Grupo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="g in grupos" :key="g" :value="g" class="cursor-pointer text-xs capitalize">
                    {{ g === 'todos' ? 'Todos os Grupos' : g }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div class="max-h-[380px] overflow-y-auto border border-border rounded-lg divide-y divide-border">
            <div
              v-for="p in produtosFiltrados"
              :key="p.id"
              class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 bg-surface px-3 py-2.5 transition-colors hover:bg-muted/40"
            >
              <div class="min-w-0">
                <p class="truncate text-xs font-medium">{{ p.nome }}</p>
                <p class="text-[11px] text-muted-foreground truncate">
                  {{ p.sku }} · Grupo: <span class="capitalize">{{ p.grupo || p.categoria || 'Geral' }}</span> · Custo {{ brl(p.custo) }} · Estoque: {{ p.estoque }} un.
                </p>
              </div>
              <Button size="sm" class="cursor-pointer h-8 text-xs bg-emerald-500 text-black hover:bg-emerald-600" @click="adicionar(p.id)">
                <Plus class="size-3.5 mr-1" /> Adicionar
              </Button>
            </div>

            <div v-if="produtosFiltrados.length === 0" class="p-6 text-center text-xs text-muted-foreground">
              Nenhum produto encontrado com os filtros aplicados.
            </div>
          </div>
        </div>
      </Section>

      <Section titulo="Itens da compra">
        <EmptyState
          v-if="itens.length === 0"
          titulo="Nenhum produto adicionado"
          descricao="Selecione produtos na lista ao lado ou importe uma Nota Fiscal por XML."
        />
        <template v-else>
          <ul class="divide-y divide-border max-h-[360px] overflow-y-auto">
            <li v-for="i in itens" :key="i.id" class="space-y-2 px-4 py-3">
              <div class="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                <p class="truncate text-xs font-medium">{{ i.nome }}</p>
                <Button
                  variant="ghost"
                  size="icon"
                  class="cursor-pointer h-6 w-6 text-destructive hover:bg-destructive/10"
                  :aria-label="`Remover ${i.nome}`"
                  @click="remover(i.id)"
                >
                  <Trash2 class="size-3.5" />
                </Button>
              </div>

              <div class="grid grid-cols-[auto_1fr_auto] items-center gap-2">
                <div class="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    class="cursor-pointer size-7"
                    aria-label="Diminuir quantidade"
                    @click="alterarQtd(i.id, -1)"
                  >
                    <Minus class="size-3" />
                  </Button>
                  <Input
                    v-model.number="i.qtd"
                    type="number"
                    min="1"
                    class="h-7 w-12 text-center text-xs cursor-text p-1"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    class="cursor-pointer size-7"
                    aria-label="Aumentar quantidade"
                    @click="alterarQtd(i.id, 1)"
                  >
                    <Plus class="size-3" />
                  </Button>
                </div>

                <div class="relative">
                  <span class="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">R$</span>
                  <Input
                    v-model.number="i.valor"
                    type="number"
                    min="0"
                    step="0.01"
                    class="h-7 text-xs cursor-text pl-7 pr-1"
                  />
                </div>

                <span class="text-xs font-semibold tabular-nums text-right min-w-[70px]">
                  {{ brl((Number(i.qtd) || 0) * (Number(i.valor) || 0)) }}
                </span>
              </div>
            </li>
          </ul>

          <div class="space-y-3 border-t border-border p-4">
            <div class="flex items-center justify-between">
              <span class="text-xs text-muted-foreground">Total da compra</span>
              <span class="text-metric text-lg font-bold">{{ brl(total) }}</span>
            </div>
            <Button class="w-full cursor-pointer bg-emerald-500 text-black hover:bg-emerald-600" @click="passo = 3">
              Revisar compra
            </Button>
          </div>
        </template>
      </Section>
    </div>

    <Section v-else-if="passo === 3" titulo="Revisar e finalizar" descricao="Confira antes de dar entrada no estoque.">
      <div class="space-y-4 p-4 md:p-5">
        <div class="grid gap-3 sm:grid-cols-2">
          <div class="rounded-lg border border-border bg-surface-2 p-3">
            <p class="text-meta">Fornecedor</p>
            <p class="text-sm font-medium">{{ fornecedor }}</p>
          </div>
          <div class="rounded-lg border border-border bg-surface-2 p-3">
            <p class="text-meta">Itens</p>
            <p class="text-sm font-medium">
              {{ itens.length }} produtos · {{ itens.reduce((s, i) => s + (Number(i.qtd) || 0), 0) }} unidades
            </p>
          </div>
        </div>
        <ul class="divide-y divide-border rounded-lg border border-border">
          <li v-for="i in itens" :key="i.id" class="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
            <span class="truncate">
              {{ i.nome }} <span class="text-muted-foreground">× {{ i.qtd }}</span>
            </span>
            <span class="font-semibold">{{ brl((Number(i.qtd) || 0) * (Number(i.valor) || 0)) }}</span>
          </li>
        </ul>
        <div class="flex items-center justify-between border-t border-border pt-3">
          <span class="text-sm text-muted-foreground">Total</span>
          <span class="text-metric">{{ brl(total) }}</span>
        </div>
        <div class="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" class="cursor-pointer" @click="passo = 2">Voltar</Button>
          <Button
            class="cursor-pointer bg-emerald-500 text-black hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="salvando || itens.length === 0"
            @click="finalizar"
          >
            <Loader2 v-if="salvando" class="size-4 animate-spin" />
            <Check v-else class="size-4" />
            {{ salvando ? 'Finalizando…' : 'Finalizar compra e dar entrada' }}
          </Button>
        </div>
      </div>
    </Section>
  </div>

  <NewSupplier
    v-model:open="modalFornecedorAberto"
    @salvo="fornecedorCriado"
  />
</template>