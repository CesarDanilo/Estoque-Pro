<script setup>
import { RouterLink, useRouter } from 'vue-router'
import { computed, onMounted, ref } from 'vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { ArrowDownRight, Check, Loader2, Minus, Plus, Search, Trash2 } from 'lucide-vue-next'

import PageHeader from '@/components/page-shell/PageHeader.vue'
import Section from '@/components/page-shell/Section.vue'
import EmptyState from '@/components/page-shell/EmptyState.vue'
import FieldLabel from '@/components/ui-kit/FieldLabel.vue'
import StatusPill from '@/components/ui-kit/StatusPill.vue'

// Modais On-the-Fly
// 🔴 TROCADO: não usamos mais o modal específico de fornecedor (NewSupplier.vue).
// Agora chamamos o mesmo modal unificado de Pessoa usado no módulo de
// clientes/pessoas, no NewProduct.vue e na página de Fornecedores, já
// pré-configurado como fornecedor pessoa jurídica (ver props na tag
// <PersonModal> no template).
import PersonModal from '@/components/modal/person/NewPerson.vue'
import ProductModal from '@/components/modal/product/NewProduct.vue'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { useFeedback } from '@/composables/useFeedBack'
import { usePurchases } from '@/composables/usePurchases'
import { supplierService } from '@/services/supplierService'
import { productService } from '@/services/productService'
import { groupService } from '@/services/groupService'

onMounted(() => {
  document.title = 'Nova compra — Estoque Pro'
})

const queryClient = useQueryClient()
const router = useRouter()
const { sucesso, erro } = useFeedback()
const { createPurchase, isCreating } = usePurchases()

const passo = ref(1)
const fornecedorId = ref('')
const buscaFornecedor = ref('')
const buscaProduto = ref('')
const grupoSelecionado = ref('todos')

const itens = ref([])
const observacoes = ref('')

// Controle dos Modais
const modalFornecedorAberto = ref(false)
const modalProdutoAberto = ref(false)

const passos = ['Fornecedor', 'Produtos e valores', 'Revisar e finalizar']

// Fornecedor é obrigatório: sem ele, não é possível avançar para a Aba 2.
const podeAvancarParaProdutos = computed(() => !!fornecedorId.value)

function brl(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    Number(valor) || 0,
  )
}

// ---- Helpers de formatação do custo ----
function custoValor(item) {
  return item.custoCentavos ? Number(item.custoCentavos) / 100 : 0
}

function custoFormatado(item) {
  if (!item.custoCentavos) return ''
  return custoValor(item).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function onInputCusto(item, evento) {
  item.custoCentavos = (evento.target.value || '').replace(/\D/g, '').slice(0, 10)
}

// ---- Fornecedores (API) ----
const {
  data: fornecedoresData,
  isLoading: carregandoFornecedores,
  refetch: refetchFornecedores,
} = useQuery({
  queryKey: ['suppliers'],
  queryFn: () => supplierService.getAll(),
  staleTime: 1000 * 60 * 5,
})

const listaFornecedores = computed(() => {
  const dados = fornecedoresData.value
  if (Array.isArray(dados)) return dados
  return dados?.data || []
})

const fornecedoresAtivos = computed(() => {
  return [...listaFornecedores.value]
    .filter((f) => f.active ?? true)
    .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR'))
})

const fornecedoresFiltrados = computed(() => {
  if (!buscaFornecedor.value.trim()) return fornecedoresAtivos.value
  const termo = buscaFornecedor.value.toLowerCase()
  return fornecedoresAtivos.value.filter((f) => (f.name || '').toLowerCase().includes(termo))
})

const fornecedorSelecionado = computed(() =>
  listaFornecedores.value.find((f) => String(f.id) === String(fornecedorId.value)),
)

function abrirModalFornecedor() {
  modalFornecedorAberto.value = true
}

// Seleciona automaticamente o fornecedor recém-cadastrado na Aba 1
async function fornecedorCriado(fornecedor) {
  await queryClient.invalidateQueries({ queryKey: ['suppliers'] })
  await refetchFornecedores()

  const novoId = fornecedor?.id ?? fornecedor?.data?.id
  const nome = fornecedor?.name ?? fornecedor?.data?.name ?? 'Fornecedor'

  // Limpa a busca ANTES de selecionar: se houver texto digitado no campo de
  // pesquisa que não bate com o nome do fornecedor recém-criado, ele fica de
  // fora da lista filtrada e o Select não consegue exibir o label
  // corretamente mesmo com o v-model apontando pro id certo.
  buscaFornecedor.value = ''

  if (novoId) {
    fornecedorId.value = String(novoId)
  }
  sucesso('Fornecedor cadastrado', `${nome} foi selecionado automaticamente nesta compra.`)
}

// ---- Tradução do payload do PersonModal para o formato da API de Fornecedor ----
// Mesmo mapeamento usado no NewProduct.vue — o PersonModal fala a "língua" de
// Pessoa (nome, documento, nascimento...) e o endpoint de fornecedores espera
// os campos no formato da tabela suppliers (name, document, birth_date...).
const CAMPO_PESSOA_PARA_FORNECEDOR = {
  categoria: 'category',
  type: 'type',
  nome: 'name',
  documento: 'document',
  nomeFantasia: 'trade_name',
  inscricaoEstadual: 'state_registration',
  pessoaContato: 'contact_person',
  genero: 'gender',
  nascimento: 'birth_date',
  telefone: 'phone',
  email: 'email',
  cep: 'zip_code',
  logradouro: 'street',
  numero: 'number',
  complemento: 'complement',
  bairro: 'neighborhood',
  cidade: 'city',
  uf: 'state',
  ativo: 'active',
}

function traduzirPayloadDePessoaParaFornecedor(payload) {
  const traduzido = {}
  for (const [campoFront, valor] of Object.entries(payload)) {
    const chaveApi = CAMPO_PESSOA_PARA_FORNECEDOR[campoFront] ?? campoFront
    traduzido[chaveApi] = valor
  }
  return traduzido
}

async function criarFornecedorViaPersonModal(payload) {
  return supplierService.create(traduzirPayloadDePessoaParaFornecedor(payload))
}

async function atualizarFornecedorViaPersonModal(id, payload) {
  return supplierService.update(id, traduzirPayloadDePessoaParaFornecedor(payload))
}

// ---- Grupos (API) ----
const { data: gruposData } = useQuery({
  queryKey: ['groups'],
  queryFn: () => groupService.listar(),
  staleTime: 1000 * 60 * 10,
})

const listaGrupos = computed(() => {
  const dados = gruposData.value
  if (Array.isArray(dados)) return dados
  return dados?.data || []
})

// ---- Produtos (API) ----
const {
  data: produtosData,
  isLoading: carregandoProdutos,
  refetch: refetchProdutos,
} = useQuery({
  queryKey: ['products'],
  queryFn: () => productService.getAll(),
  staleTime: 1000 * 60 * 5,
})

const listaProdutos = computed(() => {
  const dados = produtosData.value
  if (Array.isArray(dados)) return dados
  return dados?.data || []
})

const produtosFiltrados = computed(() => {
  return listaProdutos.value.filter((p) => {
    const atendeGrupo =
      grupoSelecionado.value === 'todos' || String(p.group_id) === String(grupoSelecionado.value)
    const termo = buscaProduto.value.trim().toLowerCase()
    const atendeBusca =
      !termo ||
      (p.name || '').toLowerCase().includes(termo) ||
      (p.sku || '').toLowerCase().includes(termo)
    return atendeGrupo && atendeBusca
  })
})

function nomeGrupo(produto) {
  return (
    produto.group?.name ||
    listaGrupos.value.find((g) => String(g.id) === String(produto.group_id))?.name ||
    'Sem grupo'
  )
}

// ---- Totais ----
const total = computed(() =>
  itens.value.reduce((s, i) => s + (Number(i.qtd) || 0) * custoValor(i), 0),
)

function adicionar(produto) {
  const existente = itens.value.find((i) => String(i.id) === String(produto.id))
  if (existente) {
    existente.qtd += 1
    return
  }

  const custoInicial = Number(produto.cost_price ?? produto.custo) || 0

  itens.value.push({
    id: produto.id,
    nome: produto.name ?? produto.nome,
    qtd: 1,
    custoCentavos: custoInicial > 0 ? String(Math.round(custoInicial * 100)) : '',
  })
}

function remover(id) {
  itens.value = itens.value.filter((i) => String(i.id) !== String(id))
}

function alterarQtd(id, delta) {
  const item = itens.value.find((i) => String(i.id) === String(id))
  if (item) item.qtd = Math.max(1, (Number(item.qtd) || 0) + delta)
}

// Callback do Modal de Produto Completo
async function produtoCriadoEAdicionado(produtoCriado) {
  await refetchProdutos()
  if (produtoCriado) {
    adicionar(produtoCriado)
    sucesso(
      'Produto cadastrado',
      `${produtoCriado.name || produtoCriado.nome} foi adicionado à lista da compra.`,
    )
  }
}

async function finalizar() {
  if (isCreating.value || itens.value.length === 0 || !fornecedorId.value) return

  try {
    const payload = {
      supplier_id: fornecedorId.value,
      notes: observacoes.value || null,
      items: itens.value.map((i) => ({
        product_id: i.id,
        quantity: i.qtd,
        unit_cost: custoValor(i),
      })),
    }

    await createPurchase(payload)
    sucesso('Compra finalizada', 'Estoque atualizado com as entradas.')
    router.push('/compras')
  } catch (err) {
    erro(
      'Erro ao registrar compra',
      err?.response?.data?.message || 'Verifique os dados e tente novamente.',
    )
  }
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

  <div class="space-y-4 p-4 md:p-6 min-w-0">
    <div
      class="panel flex flex-col gap-2 rounded-xl border border-border bg-card p-3 sm:flex-row sm:items-center sm:gap-4 md:p-4 min-w-0"
    >
      <div v-for="(p, i) in passos" :key="p" class="flex min-w-0 items-center gap-2">
        <span
          :class="
            i + 1 <= passo
              ? 'grid size-6 shrink-0 place-items-center rounded-full bg-emerald-500 text-xs font-semibold text-black'
              : 'grid size-6 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold text-muted-foreground'
          "
        >
          <Check v-if="i + 1 < passo" class="size-3.5" />
          <template v-else>{{ i + 1 }}</template>
        </span>
        <span
          :class="
            i + 1 === passo
              ? 'truncate text-sm font-medium'
              : 'truncate text-sm text-muted-foreground'
          "
        >
          {{ p }}
        </span>
      </div>
      <StatusPill tom="info">
        <ArrowDownRight class="size-3.5" />
        Entrada de estoque
      </StatusPill>
    </div>

    <Section v-if="passo === 1" titulo="Quem está vendendo para você?">
      <div class="space-y-4 p-4 md:p-5 min-w-0">
        <div class="w-full max-w-md min-w-0 space-y-1.5">
          <FieldLabel for="fornecedor"
            >Fornecedor <span class="text-destructive">*</span></FieldLabel
          >
          <Select v-model="fornecedorId">
            <SelectTrigger
              id="fornecedor"
              class="h-10 w-full min-w-0 cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap"
            >
              <SelectValue placeholder="Selecione o fornecedor" class="truncate min-w-0" />
            </SelectTrigger>
            <SelectContent class="max-h-64">
              <div class="sticky top-0 z-10 border-b border-border bg-popover p-2">
                <div class="relative">
                  <Search
                    class="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    v-model="buscaFornecedor"
                    placeholder="Pesquisar fornecedor..."
                    class="h-8 pl-8 pr-2 text-xs"
                    @click.stop
                    @keydown.stop
                  />
                </div>
              </div>
              <SelectItem
                v-for="f in fornecedoresFiltrados"
                :key="f.id"
                :value="String(f.id)"
                class="cursor-pointer text-xs truncate"
              >
                {{ f.name }}
              </SelectItem>
              <div
                v-if="!carregandoFornecedores && fornecedoresFiltrados.length === 0"
                class="py-3 text-center text-xs text-muted-foreground"
              >
                Nenhum fornecedor encontrado.
              </div>
            </SelectContent>
          </Select>
          <p v-if="!fornecedorId" class="text-[11px] text-muted-foreground">
            É necessário selecionar um fornecedor para continuar.
          </p>
          <button
            type="button"
            class="cursor-pointer text-xs font-medium text-emerald-600 hover:underline dark:text-emerald-400"
            @click="abrirModalFornecedor"
          >
            + Cadastrar novo fornecedor
          </button>
        </div>
        <Button
          class="cursor-pointer bg-emerald-500 text-black hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="!podeAvancarParaProdutos"
          @click="passo = 2"
        >
          Continuar
        </Button>
      </div>
    </Section>

    <div v-else-if="passo === 2" class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px] min-w-0">
      <Section
        titulo="Adicionar produtos"
        descricao="Selecione os produtos recebidos nesta compra."
      >
        <template #acoes>
          <Button
            size="sm"
            variant="outline"
            class="cursor-pointer text-xs"
            @click="modalProdutoAberto = true"
          >
            <Plus class="mr-1 size-3.5" /> Novo produto
          </Button>
        </template>

        <div class="space-y-4 p-4 md:p-5 min-w-0">
          <div class="grid grid-cols-1 gap-2 sm:grid-cols-12 min-w-0">
            <div class="relative sm:col-span-8 min-w-0">
              <Search
                class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60"
              />
              <Input
                v-model="buscaProduto"
                placeholder="Buscar por nome ou SKU..."
                class="h-9 cursor-text pl-9 text-xs w-full"
              />
            </div>

            <div class="sm:col-span-4 min-w-0">
              <Select v-model="grupoSelecionado">
                <SelectTrigger
                  class="h-9 w-full min-w-0 cursor-pointer text-xs overflow-hidden text-ellipsis whitespace-nowrap"
                >
                  <SelectValue placeholder="Grupo" class="truncate min-w-0" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos" class="cursor-pointer text-xs"
                    >Todos os grupos</SelectItem
                  >
                  <SelectItem
                    v-for="g in listaGrupos"
                    :key="g.id"
                    :value="String(g.id)"
                    class="cursor-pointer text-xs truncate"
                  >
                    {{ g.name }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div
            v-if="carregandoProdutos"
            class="flex items-center justify-center gap-2 rounded-lg border border-border p-6 text-xs text-muted-foreground"
          >
            <Loader2 class="size-4 animate-spin" /> Carregando produtos…
          </div>

          <div
            v-else
            class="max-h-[380px] divide-y divide-border overflow-y-auto rounded-lg border border-border min-w-0"
          >
            <div
              v-for="p in produtosFiltrados"
              :key="p.id"
              class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 bg-card px-3 py-2.5 transition-colors hover:bg-muted/40"
            >
              <div class="min-w-0">
                <p class="truncate text-xs font-medium">{{ p.name || p.nome }}</p>
                <p class="truncate text-[11px] text-muted-foreground">
                  {{ p.sku }} · Grupo: {{ nomeGrupo(p) }} · Custo
                  {{ brl(p.cost_price ?? p.custo) }} · Estoque:
                  {{ p.stock_quantity ?? p.estoque }} un.
                </p>
              </div>
              <Button
                size="sm"
                class="h-8 cursor-pointer bg-emerald-500 text-xs text-black hover:bg-emerald-600 shrink-0"
                @click="adicionar(p)"
              >
                <Plus class="mr-1 size-3.5" /> Adicionar
              </Button>
            </div>

            <div
              v-if="produtosFiltrados.length === 0"
              class="flex flex-col items-center justify-center space-y-3 p-8 text-center"
            >
              <p class="text-xs text-muted-foreground">
                Nenhum produto encontrado com os filtros aplicados.
              </p>
              <Button
                size="sm"
                variant="outline"
                class="cursor-pointer text-xs"
                @click="modalProdutoAberto = true"
              >
                <Plus class="mr-1 size-3.5" /> Cadastrar novo produto
              </Button>
            </div>
          </div>
        </div>
      </Section>

      <Section titulo="Itens da compra">
        <EmptyState
          v-if="itens.length === 0"
          titulo="Nenhum produto adicionado"
          descricao="Selecione produtos na lista ao lado."
        />
        <template v-else>
          <ul class="max-h-[360px] divide-y divide-border overflow-y-auto">
            <li v-for="i in itens" :key="i.id" class="space-y-2 px-4 py-3 min-w-0">
              <div class="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 min-w-0">
                <p class="truncate text-xs font-medium">{{ i.nome }}</p>
                <Button
                  variant="ghost"
                  size="icon"
                  class="size-6 cursor-pointer text-destructive hover:bg-destructive/10 shrink-0"
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
                    class="size-7 cursor-pointer"
                    aria-label="Diminuir quantidade"
                    @click="alterarQtd(i.id, -1)"
                  >
                    <Minus class="size-3" />
                  </Button>
                  <Input
                    v-model.number="i.qtd"
                    type="number"
                    min="1"
                    class="h-7 w-12 cursor-text p-1 text-center text-xs"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    class="size-7 cursor-pointer"
                    aria-label="Aumentar quantidade"
                    @click="alterarQtd(i.id, 1)"
                  >
                    <Plus class="size-3" />
                  </Button>
                </div>

                <div class="relative min-w-0">
                  <span
                    class="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground"
                  >
                    R$
                  </span>
                  <input
                    :value="custoFormatado(i)"
                    inputmode="decimal"
                    placeholder="0,00"
                    class="h-7 w-full cursor-text rounded-md border border-input bg-transparent pl-7 pr-1 text-xs outline-none focus:ring-2 focus:ring-ring"
                    @input="onInputCusto(i, $event)"
                  />
                </div>

                <span class="min-w-[70px] text-right text-xs font-semibold tabular-nums shrink-0">
                  {{ brl((Number(i.qtd) || 0) * custoValor(i)) }}
                </span>
              </div>
            </li>
          </ul>

          <div class="space-y-3 border-t border-border p-4">
            <div class="flex items-center justify-between">
              <span class="text-xs text-muted-foreground">Total da compra</span>
              <span class="text-lg font-bold">{{ brl(total) }}</span>
            </div>
            <div class="flex gap-2">
              <Button variant="outline" class="cursor-pointer" @click="passo = 1">Voltar</Button>
              <Button
                class="flex-1 cursor-pointer bg-emerald-500 text-black hover:bg-emerald-600"
                @click="passo = 3"
              >
                Revisar compra
              </Button>
            </div>
          </div>
        </template>
      </Section>
    </div>

    <Section
      v-else-if="passo === 3"
      titulo="Revisar e finalizar"
      descricao="Confira antes de dar entrada no estoque."
    >
      <div class="space-y-4 p-4 md:p-5 min-w-0">
        <div class="grid gap-3 sm:grid-cols-2">
          <div class="rounded-lg border border-border bg-muted/40 p-3 min-w-0">
            <p class="text-xs text-muted-foreground">Fornecedor</p>
            <p class="text-sm font-medium truncate">
              {{ fornecedorSelecionado?.name || 'Não informado' }}
            </p>
          </div>
          <div class="rounded-lg border border-border bg-muted/40 p-3 min-w-0">
            <p class="text-xs text-muted-foreground">Itens</p>
            <p class="text-sm font-medium truncate">
              {{ itens.length }} produtos ·
              {{ itens.reduce((s, i) => s + (Number(i.qtd) || 0), 0) }} unidades
            </p>
          </div>
        </div>

        <ul class="divide-y divide-border rounded-lg border border-border">
          <li
            v-for="i in itens"
            :key="i.id"
            class="flex items-center justify-between gap-3 px-3 py-2.5 text-sm min-w-0"
          >
            <span class="truncate min-w-0">
              {{ i.nome }} <span class="text-muted-foreground">× {{ i.qtd }}</span>
            </span>
            <span class="font-semibold shrink-0">
              {{ brl((Number(i.qtd) || 0) * custoValor(i)) }}
            </span>
          </li>
        </ul>

        <div>
          <FieldLabel for="observacoes">Observações (opcional)</FieldLabel>
          <Textarea
            id="observacoes"
            v-model="observacoes"
            placeholder="Nota fiscal, condição de pagamento, etc."
            rows="3"
            class="cursor-text"
          />
        </div>

        <div class="flex items-center justify-between border-t border-border pt-3">
          <span class="text-sm text-muted-foreground">Total</span>
          <span class="text-xl font-bold">{{ brl(total) }}</span>
        </div>

        <div class="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" class="cursor-pointer" @click="passo = 2">Voltar</Button>
          <Button
            class="cursor-pointer bg-emerald-500 text-black hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="isCreating || itens.length === 0 || !fornecedorId"
            @click="finalizar"
          >
            <Loader2 v-if="isCreating" class="size-4 animate-spin" />
            <Check v-else class="size-4" />
            {{ isCreating ? 'Finalizando…' : 'Finalizar compra e dar entrada' }}
          </Button>
        </div>
      </div>
    </Section>
  </div>

  <!-- 🔴 TROCADO: mesmo padrão da página de Fornecedores e do NewProduct.vue —
       modal unificado de Pessoa, já nascendo como categoria "Fornecedor" (o
       que trava o Tipo automaticamente em "Pessoa jurídica" dentro do próprio
       NewPerson.vue). Sem prop `pessoa`, então sempre abre em modo criação. -->
  <PersonModal
    v-model:open="modalFornecedorAberto"
    :ao-criar="criarFornecedorViaPersonModal"
    :ao-atualizar="atualizarFornecedorViaPersonModal"
    :ao-atualizar-parcial="atualizarFornecedorViaPersonModal"
    categoria-padrao="supplier"
    :categoria-fixa="true"
    titulo-criacao="Novo fornecedor"
    @created="fornecedorCriado"
  />

  <ProductModal
    v-model:open="modalProdutoAberto"
    @created="produtoCriadoEAdicionado"
    @salvo="produtoCriadoEAdicionado"
  />
</template>
