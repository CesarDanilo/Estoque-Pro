<script setup>
import { computed, ref, watch } from 'vue'
import {
  ArrowUpRight,
  Loader2,
  Minus,
  PackagePlus,
  Plus,
  Search,
  Trash2,
  TriangleAlert,
  UserPlus,
} from 'lucide-vue-next'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

import EmptyState from '@/components/page-shell/EmptyState.vue'
import StatusPill from '@/components/ui-kit/StatusPill.vue'
import NewPerson from '@/components/NewPerson.vue'
import NewProduct from '@/components/NewProduct.vue'

import { useFeedback } from '@/composables/useFeedBack'
import { brl, nivelEstoque, pessoas, produtos } from '@/lib/mockData'

const props = defineProps({
  open: { type: Boolean, default: false },
})

const emit = defineEmits(['update:open', 'created'])

const { sucesso, erro } = useFeedback()

const cliente = ref('')
const semCliente = ref(false)
const buscaCliente = ref('')
const buscaBruta = ref('')
const itens = ref([])
const pagamento = ref('')
const salvando = ref(false)

// controla os modais aninhados de cadastro rápido
const pessoaModalAberto = ref(false)
const produtoModalAberto = ref(false)

// ---- limite de caracteres da busca de produto ----
const LIMITE_BUSCA_PRODUTO = 60

const busca = computed({
  get: () => buscaBruta.value,
  set: (valor) => {
    buscaBruta.value = (valor ?? '').slice(0, LIMITE_BUSCA_PRODUTO)
  },
})

// ---- Máscara monetária (centavos) — mesmo padrão usado em custo/preço do produto ----
function criarMascaraMoeda(limiteDigitos = 8) {
  const raw = ref('')

  const formatted = computed(() => {
    if (!raw.value) return ''
    const numero = Number(raw.value) / 100
    return numero.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  })

  const valorNumerico = computed(() => (raw.value ? Number(raw.value) / 100 : 0))

  function onInput(evento) {
    const digitos = evento.target.value.replace(/\D/g, '').slice(0, limiteDigitos)
    raw.value = digitos
    evento.target.value = formatted.value
  }

  function setValue(numero) {
    if (numero === null || numero === undefined || numero === '') {
      raw.value = ''
      return
    }
    raw.value = String(Math.round(Number(numero) * 100))
  }

  return { raw, formatted, valorNumerico, onInput, setValue }
}

// ---- Máscara percentual (0 a 100,00%) — mesmo esquema de centavos, mas travando em 100 ----
function criarMascaraPercentual(limiteDigitos = 5) {
  const raw = ref('')

  const formatted = computed(() => {
    if (!raw.value) return ''
    const numero = Number(raw.value) / 100
    return numero.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  })

  const valorNumerico = computed(() => (raw.value ? Number(raw.value) / 100 : 0))

  function onInput(evento) {
    let digitos = evento.target.value.replace(/\D/g, '').slice(0, limiteDigitos)
    if (Number(digitos) > 10000) digitos = '10000' // trava em 100,00%
    raw.value = digitos
    evento.target.value = formatted.value
  }

  function setValue(numero) {
    if (numero === null || numero === undefined || numero === '') {
      raw.value = ''
      return
    }
    raw.value = String(Math.round(Number(numero) * 100))
  }

  return { raw, formatted, valorNumerico, onInput, setValue }
}

const desconto = criarMascaraMoeda(8)
const descontoPercentual = criarMascaraPercentual(5)

// só um tipo de desconto pode estar preenchido por vez (valor numérico > 0, não apenas "tem dígitos")
const descontoValorPreenchido = computed(() => desconto.valorNumerico.value > 0)
const descontoPercentualPreenchido = computed(() => descontoPercentual.valorNumerico.value > 0)

// Clientes ativos ordenados alfabeticamente e filtrados pela busca do select
const clientesAtivos = computed(() => {
  const termo = buscaCliente.value.trim().toLowerCase()

  return pessoas
    .filter((p) => p.grupo === 'Cliente' && p.status === 'ativo')
    .filter((p) => {
      if (!termo) return true
      const nomeMatch = p.nome?.toLowerCase().includes(termo)
      const docMatch = p.documento?.toLowerCase().includes(termo)
      return nomeMatch || docMatch
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }))
})

const disponiveis = computed(() => {
  const termo = busca.value.trim().toLowerCase()
  if (termo === '') return []
  return produtos.filter(
    (p) => p.status === 'ativo' && [p.nome, p.sku].some((c) => c.toLowerCase().includes(termo))
  )
})

const subtotal = computed(() => itens.value.reduce((s, i) => s + i.qtd * i.valor, 0))

const valorDescontoAplicado = computed(() => {
  if (descontoValorPreenchido.value) return desconto.valorNumerico.value
  if (descontoPercentualPreenchido.value) return subtotal.value * (descontoPercentual.valorNumerico.value / 100)
  return 0
})

const total = computed(() => Math.max(0, subtotal.value - valorDescontoAplicado.value))

const podeFinalizar = computed(
  () => (!!cliente.value || semCliente.value) && !!pagamento.value && itens.value.length > 0
)

// ao marcar "venda sem cliente", limpa a seleção de cliente
watch(semCliente, (marcado) => {
  if (marcado) cliente.value = ''
})

watch(
  () => props.open,
  (aberto) => {
    if (aberto) resetar()
  }
)

function resetar() {
  cliente.value = ''
  semCliente.value = false
  buscaCliente.value = ''
  buscaBruta.value = ''
  itens.value = []
  desconto.setValue('')
  descontoPercentual.setValue('')
  pagamento.value = ''
  salvando.value = false
}

function adicionar(id) {
  const p = produtos.find((x) => x.id === id)
  if (!p || p.estoque === 0) {
    erro('Produto sem estoque. Registre uma compra para repor.')
    return
  }

  const atual = itens.value.find((i) => i.id === id)
  if (atual) {
    if (atual.qtd >= p.estoque) {
      erro(`Estoque disponível: ${p.estoque} unidades.`)
      return
    }
    atual.qtd += 1
  } else {
    itens.value.push({ id, nome: p.nome, qtd: 1, valor: p.preco, estoque: p.estoque })
  }
  busca.value = ''
}

function remover(id) {
  itens.value = itens.value.filter((i) => i.id !== id)
}

function diminuir(item) {
  item.qtd = Math.max(1, item.qtd - 1)
}

function aumentar(item) {
  item.qtd = Math.min(item.estoque, item.qtd + 1)
}

// cliente cadastrado direto do "+"; preenche automaticamente e fecha o modal
function pessoaCriada(pessoa) {
  const nova = {
    id: Date.now(),
    nome: pessoa.nome,
    documento: pessoa.documento,
    telefone: pessoa.telefone,
    email: pessoa.email || '',
    grupo: pessoa.grupo,
    genero: pessoa.genero,
    nascimento: pessoa.nascimento,
    cep: pessoa.cep,
    cidade: pessoa.cidade,
    endereco: pessoa.endereco,
    observacoes: pessoa.observacoes,
    status: pessoa.ativo ? 'ativo' : 'inativo',
    cadastro: new Date().toISOString().slice(0, 10),
  }
  pessoas.unshift(nova)
  cliente.value = nova.nome
  sucesso('Cliente cadastrado', `${nova.nome} já está selecionado nesta venda.`)
}

// produto cadastrado direto do "+"; entra automaticamente no carrinho
function produtoCriado(produto) {
  const novo = {
    id: Date.now(),
    nome: produto.nome,
    sku: produto.sku,
    grupo: produto.grupo,
    subgrupo: produto.subgrupo,
    marca: produto.marca,
    status: produto.ativo ? 'ativo' : 'inativo',
    descricao: produto.descricao,
    custo: produto.custo,
    preco: produto.preco,
    estoque: produto.estoque,
    minimo: produto.minimo,
  }
  produtos.unshift(novo)
  adicionar(novo.id)
}

function fechar() {
  emit('update:open', false)
}

async function finalizar() {
  if (salvando.value || !podeFinalizar.value) return

  salvando.value = true
  try {
    await new Promise((resolve) => setTimeout(resolve, 900))

    sucesso('Venda finalizada.', 'Estoque atualizado com as saídas.')
    emit('created', {
      cliente: semCliente.value ? 'Consumidor final' : cliente.value,
      itens: itens.value.map((i) => ({ ...i })),
      desconto: valorDescontoAplicado.value,
      descontoPercentual: descontoPercentualPreenchido.value ? descontoPercentual.valorNumerico.value : null,
      pagamento: pagamento.value,
    })
    fechar()
  } finally {
    salvando.value = false
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="(v) => emit('update:open', v)">
    <DialogContent class="w-[950px] max-w-[95vw] overflow-y-auto p-8 sm:max-w-[950px]">
      <DialogHeader class="space-y-1">
        <DialogTitle class="text-xl font-semibold tracking-tight">Nova venda</DialogTitle>
        <DialogDescription class="text-sm text-muted-foreground">
          Ao finalizar, o estoque dos produtos vendidos é reduzido.
        </DialogDescription>
      </DialogHeader>

      <form class="space-y-6 pt-1" @submit.prevent="finalizar">
        <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div class="space-y-6">
            <section class="space-y-3">
              <h3 class="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                1. Cliente
              </h3>
              <div>
                <label for="cliente" class="mb-1.5 block text-sm font-medium text-foreground">
                  Para quem é a venda?
                  <span v-if="!semCliente" class="text-destructive">*</span>
                </label>
                <div class="flex gap-2">
                  <Select v-model="cliente" :disabled="semCliente">
                    <SelectTrigger
                      id="cliente"
                      class="h-10 w-full cursor-pointer bg-surface disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <SelectValue placeholder="Selecione o cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      <div class="sticky top-0 z-10 bg-popover p-2 border-b border-border">
                        <div class="relative flex items-center">
                          <Search class="absolute left-2.5 size-3.5 text-muted-foreground pointer-events-none" />
                          <input
                            v-model="buscaCliente"
                            type="text"
                            placeholder="Pesquisar cliente..."
                            class="h-8 w-full rounded-md border border-input bg-background pl-8 pr-3 text-xs outline-none focus:ring-1 focus:ring-ring"
                            @keydown.stop
                          />
                        </div>
                      </div>

                      <div class="max-h-[200px] overflow-y-auto pt-1">
                        <p
                          v-if="clientesAtivos.length === 0"
                          class="p-2 text-center text-xs text-muted-foreground"
                        >
                          Nenhum cliente encontrado.
                        </p>
                        <SelectItem
                          v-for="p in clientesAtivos"
                          :key="p.id"
                          :value="p.nome"
                          class="cursor-pointer"
                        >
                          {{ p.nome }}
                        </SelectItem>
                      </div>
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    class="h-10 w-10 shrink-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Cadastrar novo cliente"
                    :disabled="semCliente"
                    @click="pessoaModalAberto = true"
                  >
                    <UserPlus class="size-4" />
                  </Button>
                </div>
                <div class="mt-2 flex items-center gap-2">
                  <Checkbox id="sem-cliente" v-model:checked="semCliente" class="cursor-pointer" />
                  <Label for="sem-cliente" class="cursor-pointer text-sm font-normal text-muted-foreground">
                    Venda sem cliente identificado
                  </Label>
                </div>
              </div>
            </section>

            <section class="space-y-3 border-t border-border pt-6">
              <div class="flex items-center justify-between">
                <h3 class="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  2. Produtos
                </h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  class="h-7 cursor-pointer px-2 text-xs"
                  @click="produtoModalAberto = true"
                >
                  <PackagePlus class="size-3.5" /> Novo produto
                </Button>
              </div>

              <div>
                <label for="busca-produto" class="mb-1.5 block text-sm font-medium text-foreground">
                  Buscar produto para a venda
                </label>
                <div class="relative">
                  <input
                    id="busca-produto"
                    v-model="busca"
                    type="text"
                    placeholder="Buscar por nome ou código…"
                    :maxlength="LIMITE_BUSCA_PRODUTO"
                    class="h-10 w-full cursor-text rounded-md border border-input bg-surface py-2 pl-3 pr-14 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                  <span
                    class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] tabular-nums text-muted-foreground/60"
                  >
                    {{ buscaBruta.length }}/{{ LIMITE_BUSCA_PRODUTO }}
                  </span>
                </div>
              </div>

              <p v-if="busca.trim() !== '' && disponiveis.length === 0" class="text-sm text-muted-foreground">
                Nenhum produto ativo encontrado com esse termo.
              </p>

              <ul
                v-if="disponiveis.length > 0"
                class="max-h-[180px] divide-y divide-border overflow-y-auto rounded-lg border border-border"
              >
                <li
                  v-for="p in disponiveis"
                  :key="p.id"
                  class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 bg-surface px-3 py-2.5"
                >
                  <div class="min-w-0">
                    <p class="truncate text-sm font-medium">{{ p.nome }}</p>
                    <p class="text-xs text-muted-foreground">{{ p.sku }} · {{ brl(p.preco) }}</p>
                  </div>
                  <div class="flex shrink-0 items-center gap-2">
                    <StatusPill :tom="nivelEstoque(p) === 'sem' ? 'danger' : nivelEstoque(p) === 'baixo' ? 'warning' : 'success'">
                      {{ nivelEstoque(p) === 'sem' ? 'Sem estoque' : `${p.estoque} un.` }}
                    </StatusPill>
                    <Button
                      type="button"
                      size="sm"
                      class="cursor-pointer disabled:cursor-not-allowed"
                      :disabled="p.estoque === 0"
                      @click="adicionar(p.id)"
                    >
                      <Plus class="size-4" /> Adicionar
                    </Button>
                  </div>
                </li>
              </ul>
            </section>

            <section class="space-y-3 border-t border-border pt-6">
              <h3 class="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                3. Itens da venda
              </h3>

              <EmptyState
                v-if="itens.length === 0"
                titulo="Carrinho vazio"
                descricao="Adicione produtos para ver o valor total da venda."
              />

              <ul
                v-else
                class="max-h-[260px] divide-y divide-border overflow-y-auto rounded-lg border border-border"
              >
                <li v-for="i in itens" :key="i.id" class="space-y-2 bg-surface px-3 py-2.5">
                  <div class="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                    <div class="min-w-0">
                      <p class="truncate text-sm font-medium">{{ i.nome }}</p>
                      <p class="text-xs text-muted-foreground">{{ brl(i.valor) }} cada</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      class="size-7 cursor-pointer"
                      :aria-label="`Remover ${i.nome}`"
                      @click="remover(i.id)"
                    >
                      <Trash2 class="size-4 text-destructive" />
                    </Button>
                  </div>
                  <div class="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      class="size-7 cursor-pointer"
                      aria-label="Diminuir quantidade"
                      @click="diminuir(i)"
                    >
                      <Minus class="size-3.5" />
                    </Button>
                    <span class="w-8 text-center text-sm font-semibold">{{ i.qtd }}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      class="size-7 cursor-pointer disabled:cursor-not-allowed"
                      aria-label="Aumentar quantidade"
                      :disabled="i.qtd >= i.estoque"
                      @click="aumentar(i)"
                    >
                      <Plus class="size-3.5" />
                    </Button>
                    <span class="ml-auto text-sm font-semibold">{{ brl(i.qtd * i.valor) }}</span>
                  </div>
                  <p v-if="i.qtd >= i.estoque" class="flex items-center gap-1.5 text-xs text-warning">
                    <TriangleAlert class="size-3.5" aria-hidden="true" />
                    Limite do estoque disponível ({{ i.estoque }} un.).
                  </p>
                </li>
              </ul>
            </section>
          </div>

          <div class="space-y-4 border-t border-border pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
            <section class="space-y-3">
              <h3 class="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                4. Pagamento
              </h3>

              <div>
                <label class="mb-1.5 block text-sm font-medium text-foreground">Desconto</label>
                <div class="grid grid-cols-2 gap-2">
                  <div class="relative">
                    <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      R$
                    </span>
                    <input
                      id="desconto"
                      :value="desconto.formatted.value"
                      inputmode="decimal"
                      placeholder="0,00"
                      :disabled="descontoPercentualPreenchido"
                      class="h-10 w-full cursor-text rounded-md border border-input bg-surface py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      @input="desconto.onInput"
                      @keypress="(e) => !/[0-9]/.test(e.key) && e.preventDefault()"
                    />
                  </div>
                  <div class="relative">
                    <input
                      id="desconto-percentual"
                      :value="descontoPercentual.formatted.value"
                      inputmode="decimal"
                      placeholder="0,00"
                      :disabled="descontoValorPreenchido"
                      class="h-10 w-full cursor-text rounded-md border border-input bg-surface py-2 pl-3 pr-8 text-sm outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      @input="descontoPercentual.onInput"
                      @keypress="(e) => !/[0-9]/.test(e.key) && e.preventDefault()"
                    />
                    <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      %
                    </span>
                  </div>
                </div>
                <p class="mt-1 text-[11px] text-muted-foreground">
                  Use valor em R$ ou em %. Preenchendo um, o outro é bloqueado.
                </p>
              </div>

              <div>
                <label for="pagamento" class="mb-1.5 block text-sm font-medium text-foreground">
                  Forma de pagamento <span class="text-destructive">*</span>
                </label>
                <Select v-model="pagamento">
                  <SelectTrigger id="pagamento" class="h-10 w-full cursor-pointer bg-surface">
                    <SelectValue placeholder="Como o cliente vai pagar?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Dinheiro" class="cursor-pointer">Dinheiro</SelectItem>
                    <SelectItem value="Pix" class="cursor-pointer">Pix</SelectItem>
                    <SelectItem value="Cartão de débito" class="cursor-pointer">Cartão de débito</SelectItem>
                    <SelectItem value="Cartão de crédito" class="cursor-pointer">Cartão de crédito</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div class="space-y-1 rounded-md border border-input px-3 py-2.5 text-sm">
                <div class="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{{ brl(subtotal) }}</span>
                </div>
                <div class="flex justify-between text-muted-foreground">
                  <span>
                    Desconto
                    <template v-if="descontoPercentualPreenchido"> ({{ descontoPercentual.formatted.value }}%)</template>
                  </span>
                  <span>- {{ brl(valorDescontoAplicado) }}</span>
                </div>
                <div class="flex items-center justify-between border-t border-border pt-1.5 font-medium">
                  <span>Total a pagar</span>
                  <span class="text-base text-primary">{{ brl(total) }}</span>
                </div>
              </div>
            </section>
          </div>
        </div>

        <DialogFooter class="flex-col items-stretch gap-2 border-t border-border pt-5 sm:flex-row sm:items-center">
          <p v-if="!podeFinalizar" class="text-xs text-muted-foreground sm:mr-auto">
            Escolha o cliente (ou marque venda sem cliente), adicione produtos e selecione o pagamento para finalizar.
          </p>
          <div class="flex gap-2 sm:ml-auto">
            <Button type="button" variant="outline" class="cursor-pointer" @click="fechar">Cancelar</Button>
            <Button
              type="submit"
              :disabled="!podeFinalizar || salvando"
              class="cursor-pointer bg-emerald-500 text-black hover:bg-emerald-600 disabled:cursor-not-allowed"
            >
              <Loader2 v-if="salvando" class="size-4 animate-spin" />
              <ArrowUpRight v-else class="size-4" />
              {{ salvando ? 'Finalizando…' : 'Finalizar venda' }}
            </Button>
          </div>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>

  <NewPerson v-model:open="pessoaModalAberto" :pessoa="null" @created="pessoaCriada" />

  <NewProduct v-model:open="produtoModalAberto" :produto="null" @salvo="produtoCriado" />
</template>