<script setup lang="ts">
import { RouterLink, useRouter } from 'vue-router'
import { onMounted, computed, ref } from 'vue'
import { ArrowDownRight, Check, FileCode, Loader2, Minus, Plus, Trash2, Upload } from 'lucide-vue-next'

import PageHeader from '@/components/page-shell/PageHeader.vue'
import Section from '@/components/page-shell/Section.vue'
import EmptyState from '@/components/page-shell/EmptyState.vue'
import FieldLabel from '@/components/ui-kit/FieldLabel.vue'
import SearchField from '@/components/ui-kit/SearchField.vue'
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
const busca = ref('')
const itens = ref<Item[]>([])
const salvando = ref(false)
const modalFornecedorAberto = ref(false)
const importandoXml = ref(false)

const fileInputRef = ref<HTMLInputElement | null>(null)

const passos = ['Fornecedor', 'Produtos e valores', 'Revisar e finalizar']

const fornecedoresAtivos = computed(() => fornecedores.filter((f) => f.status === 'ativo'))

const total = computed(() => itens.value.reduce((s, i) => s + i.qtd * i.valor, 0))

const encontrados = computed(() =>
  produtos.filter(
    (p) =>
      busca.value.trim() !== '' &&
      [p.nome, p.sku].some((c) => c.toLowerCase().includes(busca.value.toLowerCase())),
  ),
)

function adicionar(id: string) {
  const p = produtos.find((x) => x.id === id)!
  const existente = itens.value.find((i) => i.id === id)
  if (existente) {
    existente.qtd += 1
  } else {
    itens.value.push({ id, nome: p.nome, qtd: 1, valor: p.custo })
  }
  busca.value = ''
}

function remover(id: string) {
  itens.value = itens.value.filter((x) => x.id !== id)
}

function alterarQtd(id: string, delta: number) {
  const item = itens.value.find((x) => x.id === id)
  if (item) item.qtd = Math.max(1, item.qtd + delta)
}

function onInputValor(id: string, e: Event) {
  const item = itens.value.find((x) => x.id === id)
  if (item) item.valor = Number((e.target as HTMLInputElement).value)
}

// Controle do Modal de Novo Fornecedor
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

// Importação e Processamento do XML da Nota Fiscal
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
      // Simulação da leitura dos itens contidos no XML da NF-e
      const itensImportados = [
        { id: produtos[0]?.id || '1', nome: produtos[0]?.nome || 'Produto Importado 1', qtd: 10, valor: produtos[0]?.custo || 25.50 },
        { id: produtos[1]?.id || '2', nome: produtos[1]?.nome || 'Produto Importado 2', qtd: 5, valor: produtos[1]?.custo || 140.00 },
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
            <SelectContent>
              <SelectItem v-for="f in fornecedoresAtivos" :key="f.id" :value="f.nome" class="cursor-pointer">
                {{ f.nome }}
              </SelectItem>
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

    <div v-else-if="passo === 2" class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <Section titulo="Adicionar produtos" descricao="Busque os produtos manual ou importe a Nota Fiscal por XML.">
        <div class="space-y-4 p-4 md:p-5">
          <input
            ref="fileInputRef"
            type="file"
            accept=".xml"
            class="hidden"
            @change="processarXml"
          />

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
            <span class="shrink px-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">ou busque manualmente</span>
            <div class="grow border-t border-border"></div>
          </div>

          <SearchField v-model="busca" label="Buscar produto para a compra" placeholder="Buscar por nome ou SKU..." />
          <ul v-if="encontrados.length > 0" class="divide-y divide-border overflow-hidden rounded-lg border border-border">
            <li
              v-for="p in encontrados"
              :key="p.id"
              class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 bg-surface px-3 py-2.5"
            >
              <div class="min-w-0">
                <p class="truncate text-sm font-medium">{{ p.nome }}</p>
                <p class="text-meta">
                  {{ p.sku }} · custo {{ brl(p.custo) }} · estoque {{ p.estoque }} un.
                </p>
              </div>
              <Button size="sm" class="cursor-pointer bg-emerald-500 text-black hover:bg-emerald-600" @click="adicionar(p.id)">
                <Plus class="size-4" /> Adicionar
              </Button>
            </li>
          </ul>
        </div>
      </Section>

      <Section titulo="Itens da compra">
        <EmptyState
          v-if="itens.length === 0"
          titulo="Nenhum produto adicionado"
          descricao="Use a busca ao lado ou importe o arquivo XML da nota fiscal."
        />
        <template v-else>
          <ul class="divide-y divide-border max-h-[420px] overflow-y-auto">
            <li v-for="i in itens" :key="i.id" class="space-y-2 px-4 py-3">
              <div class="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                <p class="truncate text-sm font-medium">{{ i.nome }}</p>
                <Button
                  variant="ghost"
                  size="icon"
                  class="cursor-pointer h-7 w-7"
                  :aria-label="`Remover ${i.nome}`"
                  @click="remover(i.id)"
                >
                  <Trash2 class="size-4 text-destructive" />
                </Button>
              </div>
              <div class="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  class="cursor-pointer size-8"
                  aria-label="Diminuir quantidade"
                  @click="alterarQtd(i.id, -1)"
                >
                  <Minus class="size-3.5" />
                </Button>
                <span class="w-8 text-center text-xs font-semibold">{{ i.qtd }}</span>
                <Button
                  variant="outline"
                  size="icon"
                  class="cursor-pointer size-8"
                  aria-label="Aumentar quantidade"
                  @click="alterarQtd(i.id, 1)"
                >
                  <Plus class="size-3.5" />
                </Button>
                <Input
                  type="number"
                  :min="0"
                  step="0.01"
                  :value="i.valor"
                  :aria-label="`Valor unitário de ${i.nome}`"
                  class="h-8 text-xs cursor-text bg-surface"
                  @input="onInputValor(i.id, $event)"
                />
                <span class="ml-auto shrink-0 text-xs font-semibold tabular-nums">
                  {{ brl(i.qtd * i.valor) }}
                </span>
              </div>
            </li>
          </ul>
          <div class="space-y-3 border-t border-border p-4">
            <div class="flex items-center justify-between">
              <span class="text-sm text-muted-foreground">Total da compra</span>
              <span class="text-metric">{{ brl(total) }}</span>
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
              {{ itens.length }} produtos · {{ itens.reduce((s, i) => s + i.qtd, 0) }} unidades
            </p>
          </div>
        </div>
        <ul class="divide-y divide-border rounded-lg border border-border">
          <li v-for="i in itens" :key="i.id" class="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
            <span class="truncate">
              {{ i.nome }} <span class="text-muted-foreground">× {{ i.qtd }}</span>
            </span>
            <span class="font-semibold">{{ brl(i.qtd * i.valor) }}</span>
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