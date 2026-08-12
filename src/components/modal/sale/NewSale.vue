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
import NewPerson from '@/components/modal/person/NewPerson.vue'
import NewProduct from '@/components/modal/product/NewProduct.vue'

import { useFeedback } from '@/composables/useFeedBack'
import { usePeople } from '@/composables/usePeople'
import { useProducts } from '@/composables/useProducts'
import { useSales } from '@/composables/useSales'

const props = defineProps({
  open: { type: Boolean, default: false },
})

const emit = defineEmits(['update:open', 'created'])

const { sucesso, erro } = useFeedback()

// Composables para carregar dados do Backend/Store
const {
  pessoas,
  buscar: buscarPessoas,
  criar: criarPessoa,
  atualizar: atualizarPessoa,
  atualizarParcial: atualizarParcialPessoa,
} = usePeople()

// Mapeado refetch como buscarProdutos para manter compatibilidade com o TanStack Query
const { produtos, refetch: buscarProdutos, criar: criarProduto } = useProducts()
const { createSale, isCreating } = useSales()

// Estados da Venda
const clienteId = ref('')
const semCliente = ref(false)
const buscaCliente = ref('')
const buscaBruta = ref('')
const itens = ref([])
const pagamento = ref('')

// Controle dos modais aninhados
const pessoaModalAberto = ref(false)
const produtoModalAberto = ref(false)

const LIMITE_BUSCA_PRODUTO = 60

// ---- Recarrega clientes e produtos ao abrir o modal ----
watch(
  () => props.open,
  (aberto) => {
    if (aberto) {
      resetar()
      if (typeof buscarPessoas === 'function') {
        buscarPessoas({ type: 'todos', active: 'ativo' })
      }
      if (typeof buscarProdutos === 'function') {
        buscarProdutos()
      }
    }
  },
)

// ---- Filtro local de clientes no Select ----
const clientesAtivos = computed(() => {
  const termo = buscaCliente.value.trim().toLowerCase()
  return (pessoas.value || [])
    .filter((p) => p.status === 'ativo' || p.active)
    .filter((p) => {
      if (!termo) return true
      const nomeMatch = (p.nome || p.name || '').toLowerCase().includes(termo)
      const docMatch = (p.documento || p.document || '').toLowerCase().includes(termo)
      return nomeMatch || docMatch
    })
})

// ---- Filtro local de busca de produtos ----
const busca = computed({
  get: () => buscaBruta.value,
  set: (valor) => {
    buscaBruta.value = (valor ?? '').slice(0, LIMITE_BUSCA_PRODUTO)
  },
})

const disponiveis = computed(() => {
  const termo = busca.value.trim().toLowerCase()
  if (termo === '') return []
  return (produtos.value || []).filter(
    (p) =>
      (p.nome || p.name || '').toLowerCase().includes(termo) ||
      (p.sku || '').toLowerCase().includes(termo),
  )
})

// ---- Helpers de cálculo ----
function safeNumber(val) {
  const num = Number(val)
  return isNaN(num) ? 0 : num
}

function brl(valor) {
  return safeNumber(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function nivelEstoque(p) {
  const qtd = safeNumber(p.estoque ?? p.stock_quantity)
  const min = safeNumber(p.minimo ?? p.min_stock_quantity)
  if (qtd <= 0) return 'sem'
  if (qtd <= min) return 'baixo'
  return 'ok'
}

// ---- Máscaras Financeiras ----
function criarMascaraMoeda(limiteDigitos = 8) {
  const raw = ref('')

  const valorNumerico = computed(() => {
    if (!raw.value) return 0
    const num = Number(raw.value) / 100
    return isNaN(num) ? 0 : num
  })

  const formatted = computed(() => {
    if (!raw.value) return ''
    return valorNumerico.value.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  })

  function onInput(evento) {
    const val = evento?.target?.value || ''
    raw.value = val.replace(/\D/g, '').slice(0, limiteDigitos)
  }

  function setValue(numero) {
    if (numero === null || numero === undefined || numero === '' || isNaN(Number(numero))) {
      raw.value = ''
      return
    }
    raw.value = String(Math.round(Number(numero) * 100))
  }

  return { raw, formatted, valorNumerico, onInput, setValue }
}

function criarMascaraPercentual(limiteDigitos = 5) {
  const raw = ref('')

  const valorNumerico = computed(() => {
    if (!raw.value) return 0
    const num = Number(raw.value) / 100
    return isNaN(num) ? 0 : num
  })

  const formatted = computed(() => {
    if (!raw.value) return ''
    return valorNumerico.value.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  })

  function onInput(evento) {
    const val = evento?.target?.value || ''
    let digitos = val.replace(/\D/g, '').slice(0, limiteDigitos)
    if (Number(digitos) > 10000) digitos = '10000'
    raw.value = digitos
  }

  function setValue(numero) {
    if (numero === null || numero === undefined || numero === '' || isNaN(Number(numero))) {
      raw.value = ''
      return
    }
    raw.value = String(Math.round(Number(numero) * 100))
  }

  return { raw, formatted, valorNumerico, onInput, setValue }
}

const desconto = criarMascaraMoeda(8)
const descontoPercentual = criarMascaraPercentual(5)
const descontoValorPreenchido = computed(() => desconto.valorNumerico.value > 0)
const descontoPercentualPreenchido = computed(() => descontoPercentual.valorNumerico.value > 0)

const acrescimo = criarMascaraMoeda(8)
const acrescimoPercentual = criarMascaraPercentual(5)
const acrescimoValorPreenchido = computed(() => acrescimo.valorNumerico.value > 0)
const acrescimoPercentualPreenchido = computed(() => acrescimoPercentual.valorNumerico.value > 0)

// ---- Navegação de busca por teclado ----
const indiceAtivo = ref(-1)

watch(busca, () => {
  indiceAtivo.value = -1
})

function onBuscaProdutoKeydown(evento) {
  if (disponiveis.value.length === 0) return

  if (evento.key === 'ArrowDown') {
    evento.preventDefault()
    indiceAtivo.value = (indiceAtivo.value + 1) % disponiveis.value.length
  } else if (evento.key === 'ArrowUp') {
    evento.preventDefault()
    indiceAtivo.value =
      indiceAtivo.value <= 0 ? disponiveis.value.length - 1 : indiceAtivo.value - 1
  } else if (evento.key === 'Enter') {
    if (indiceAtivo.value >= 0 && indiceAtivo.value < disponiveis.value.length) {
      evento.preventDefault()
      adicionar(disponiveis.value[indiceAtivo.value].id)
    }
  } else if (evento.key === 'Escape') {
    indiceAtivo.value = -1
  }
}

// Totais
const subtotal = computed(() => {
  const res = itens.value.reduce((s, i) => s + safeNumber(i.qtd) * safeNumber(i.valor), 0)
  return safeNumber(res)
})

const valorDescontoAplicado = computed(() => {
  let val = 0
  if (descontoValorPreenchido.value) {
    val = desconto.valorNumerico.value
  } else if (descontoPercentualPreenchido.value) {
    val = subtotal.value * (descontoPercentual.valorNumerico.value / 100)
  }
  return safeNumber(val)
})

const valorAcrescimoAplicado = computed(() => {
  let val = 0
  if (acrescimoValorPreenchido.value) {
    val = acrescimo.valorNumerico.value
  } else if (acrescimoPercentualPreenchido.value) {
    val = subtotal.value * (acrescimoPercentual.valorNumerico.value / 100)
  }
  return safeNumber(val)
})

const total = computed(() => {
  const res = subtotal.value - valorDescontoAplicado.value + valorAcrescimoAplicado.value
  return Math.max(0, safeNumber(res))
})

const temClienteValido = computed(() => {
  if (Boolean(semCliente.value) === true) return true
  return Boolean(clienteId.value && String(clienteId.value).trim() !== '')
})

watch(semCliente, (marcado) => {
  if (marcado) clienteId.value = ''
})

function resetar() {
  clienteId.value = ''
  semCliente.value = false
  buscaCliente.value = ''
  buscaBruta.value = ''
  itens.value = []
  desconto.setValue('')
  descontoPercentual.setValue('')
  acrescimo.setValue('')
  acrescimoPercentual.setValue('')
  pagamento.value = ''
  indiceAtivo.value = -1
}

function adicionar(id) {
  const p = (produtos.value || []).find((x) => x.id === id)
  const qtdEstoque = safeNumber(p?.estoque ?? p?.stock_quantity)
  const precoVenda = safeNumber(p?.preco ?? p?.sale_price)

  if (!p || qtdEstoque <= 0) {
    erro('Produto sem estoque. Registre uma compra para repor.')
    return
  }

  const atual = itens.value.find((i) => i.id === id)
  if (atual) {
    if (atual.qtd >= qtdEstoque) {
      erro(`Estoque disponível: ${qtdEstoque} unidades.`)
      return
    }
    atual.qtd += 1
  } else {
    itens.value.push({
      id,
      nome: p.nome || p.name,
      qtd: 1,
      valor: precoVenda,
      estoque: qtdEstoque,
    })
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

// ---- Callbacks dos Modais de Cadastro ----
async function pessoaCriada(novaPessoa) {
  sucesso(
    'Cliente cadastrado',
    `${novaPessoa.nome || novaPessoa.name} já está selecionado nesta venda.`,
  )
  if (typeof buscarPessoas === 'function') {
    await buscarPessoas({ type: 'todos', active: 'ativo' })
  }
  clienteId.value = String(novaPessoa.id)
  semCliente.value = false
}

async function produtoCriado(novoProduto) {
  sucesso('Produto cadastrado', 'Produto adicionado ao carrinho.')
  if (typeof buscarProdutos === 'function') {
    await buscarProdutos()
  }
  if (novoProduto?.id) {
    adicionar(novoProduto.id)
  }
}

function fechar() {
  emit('update:open', false)
}

// ---- Finalização da Venda ----
async function finalizar() {
  if (isCreating.value) return

  if (!temClienteValido.value) {
    erro(
      'Cliente não informado',
      'Selecione um cliente ou marque "Venda sem cliente identificado".',
    )
    return
  }

  if (itens.value.length === 0) {
    erro('Carrinho vazio', 'Adicione pelo menos um produto para finalizar a venda.')
    return
  }

  if (!pagamento.value) {
    erro('Forma de pagamento não informada', 'Selecione como o cliente vai pagar.')
    return
  }

  try {
    const payload = {
      person_id: semCliente.value ? null : clienteId.value,
      payment_method: pagamento.value,
      discount_value: valorDescontoAplicado.value,
      discount_percentage: descontoPercentualPreenchido.value
        ? descontoPercentual.valorNumerico.value
        : 0,
      surcharge_value: valorAcrescimoAplicado.value,
      surcharge_percentage: acrescimoPercentualPreenchido.value
        ? acrescimoPercentual.valorNumerico.value
        : 0,
      items: itens.value.map((i) => ({
        product_id: i.id,
        quantity: i.qtd,
        unit_price: i.valor,
      })),
    }

    const response = await createSale(payload)

    sucesso('Venda finalizada.', 'Estoque atualizado com as saídas.')
    emit('created', response)
    fechar()
  } catch (err) {
    erro(
      'Erro ao finalizar venda',
      err?.response?.data?.message || 'Verifique os dados e tente novamente.',
    )
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
                  <Select v-model="clienteId" :disabled="semCliente">
                    <SelectTrigger
                      id="cliente"
                      class="h-10 w-full cursor-pointer bg-surface disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <SelectValue placeholder="Selecione o cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      <div class="sticky top-0 z-10 bg-popover p-2 border-b border-border">
                        <div class="relative flex items-center">
                          <Search
                            class="absolute left-2.5 size-3.5 text-muted-foreground pointer-events-none"
                          />
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
                          :value="String(p.id)"
                          class="cursor-pointer"
                        >
                          {{ p.nome || p.name }}
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
                  <Checkbox
                    id="sem-cliente"
                    :checked="semCliente"
                    @update:checked="(v) => (semCliente = Boolean(v))"
                    class="cursor-pointer"
                  />
                  <Label
                    for="sem-cliente"
                    class="cursor-pointer text-sm font-normal text-muted-foreground"
                  >
                    Venda sem cliente identificado
                  </Label>
                </div>
              </div>
            </section>

            <section class="space-y-3 border-t border-border pt-6">
              <div class="flex items-center justify-between">
                <h3
                  class="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground"
                >
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
                    role="combobox"
                    aria-expanded="disponiveis.length > 0"
                    class="h-10 w-full cursor-text rounded-md border border-input bg-surface py-2 pl-3 pr-14 text-sm outline-none focus:ring-2 focus:ring-ring"
                    @keydown="onBuscaProdutoKeydown"
                  />
                  <span
                    class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] tabular-nums text-muted-foreground/60"
                  >
                    {{ buscaBruta.length }}/{{ LIMITE_BUSCA_PRODUTO }}
                  </span>
                </div>
              </div>

              <p
                v-if="busca.trim() !== '' && disponiveis.length === 0"
                class="text-sm text-muted-foreground"
              >
                Nenhum produto ativo encontrado com esse termo.
              </p>

              <ul
                v-if="disponiveis.length > 0"
                class="max-h-[180px] divide-y divide-border overflow-y-auto rounded-lg border border-border"
              >
                <li
                  v-for="(p, idx) in disponiveis"
                  :key="p.id"
                  class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 transition-colors"
                  :class="idx === indiceAtivo ? 'bg-accent' : 'bg-surface'"
                  @mouseenter="indiceAtivo = idx"
                >
                  <div class="min-w-0">
                    <p class="truncate text-sm font-medium">{{ p.nome || p.name }}</p>
                    <p class="text-xs text-muted-foreground">
                      {{ p.sku }} · {{ brl(p.preco ?? p.sale_price) }}
                    </p>
                  </div>
                  <div class="flex shrink-0 items-center gap-2">
                    <StatusPill
                      :tom="
                        nivelEstoque(p) === 'sem'
                          ? 'danger'
                          : nivelEstoque(p) === 'baixo'
                            ? 'warning'
                            : 'success'
                      "
                    >
                      {{
                        nivelEstoque(p) === 'sem'
                          ? 'Sem estoque'
                          : `${p.estoque ?? p.stock_quantity} un.`
                      }}
                    </StatusPill>
                    <Button
                      type="button"
                      size="sm"
                      class="cursor-pointer disabled:cursor-not-allowed"
                      :disabled="safeNumber(p.estoque ?? p.stock_quantity) <= 0"
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
                  <p
                    v-if="i.qtd >= i.estoque"
                    class="flex items-center gap-1.5 text-xs text-warning"
                  >
                    <TriangleAlert class="size-3.5" aria-hidden="true" />
                    Limite do estoque disponível ({{ i.estoque }} un.).
                  </p>
                </li>
              </ul>
            </section>
          </div>

          <div
            class="space-y-4 border-t border-border pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0"
          >
            <section class="space-y-4">
              <h3 class="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                4. Pagamento e Ajustes
              </h3>

              <div>
                <label class="mb-1.5 block text-sm font-medium text-foreground">Desconto</label>
                <div class="grid grid-cols-2 gap-2">
                  <div class="relative">
                    <span
                      class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
                      >R$</span
                    >
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
                    <span
                      class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
                      >%</span
                    >
                  </div>
                </div>
              </div>

              <div>
                <label class="mb-1.5 block text-sm font-medium text-foreground">Acréscimo</label>
                <div class="grid grid-cols-2 gap-2">
                  <div class="relative">
                    <span
                      class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
                      >R$</span
                    >
                    <input
                      id="acrescimo"
                      :value="acrescimo.formatted.value"
                      inputmode="decimal"
                      placeholder="0,00"
                      :disabled="acrescimoPercentualPreenchido"
                      class="h-10 w-full cursor-text rounded-md border border-input bg-surface py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      @input="acrescimo.onInput"
                      @keypress="(e) => !/[0-9]/.test(e.key) && e.preventDefault()"
                    />
                  </div>
                  <div class="relative">
                    <input
                      id="acrescimo-percentual"
                      :value="acrescimoPercentual.formatted.value"
                      inputmode="decimal"
                      placeholder="0,00"
                      :disabled="acrescimoValorPreenchido"
                      class="h-10 w-full cursor-text rounded-md border border-input bg-surface py-2 pl-3 pr-8 text-sm outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      @input="acrescimoPercentual.onInput"
                      @keypress="(e) => !/[0-9]/.test(e.key) && e.preventDefault()"
                    />
                    <span
                      class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
                      >%</span
                    >
                  </div>
                </div>
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
                    <SelectItem value="Cartão de débito" class="cursor-pointer"
                      >Cartão de débito</SelectItem
                    >
                    <SelectItem value="Cartão de crédito" class="cursor-pointer"
                      >Cartão de crédito</SelectItem
                    >
                  </SelectContent>
                </Select>
              </div>

              <div class="space-y-1 rounded-md border border-input px-3 py-2.5 text-sm">
                <div class="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{{ brl(subtotal) }}</span>
                </div>
                <div
                  v-if="valorDescontoAplicado > 0"
                  class="flex justify-between text-muted-foreground"
                >
                  <span>
                    Desconto
                    <template v-if="descontoPercentualPreenchido">
                      ({{ descontoPercentual.formatted.value }}%)</template
                    >
                  </span>
                  <span>- {{ brl(valorDescontoAplicado) }}</span>
                </div>
                <div
                  v-if="valorAcrescimoAplicado > 0"
                  class="flex justify-between text-muted-foreground"
                >
                  <span>
                    Acréscimo
                    <template v-if="acrescimoPercentualPreenchido">
                      ({{ acrescimoPercentual.formatted.value }}%)</template
                    >
                  </span>
                  <span>+ {{ brl(valorAcrescimoAplicado) }}</span>
                </div>
                <div
                  class="flex items-center justify-between border-t border-border pt-1.5 font-medium"
                >
                  <span>Total a pagar</span>
                  <span class="text-base text-primary">{{ brl(total) }}</span>
                </div>
              </div>
            </section>
          </div>
        </div>

        <DialogFooter
          class="flex-col items-stretch gap-2 border-t border-border pt-5 sm:flex-row sm:items-center"
        >
          <p class="text-xs text-muted-foreground sm:mr-auto">
            Campos com <span class="text-destructive">*</span> são obrigatórios. Você será avisado
            ao finalizar se algo faltar.
          </p>
          <div class="flex gap-2 sm:ml-auto">
            <Button type="button" variant="outline" class="cursor-pointer" @click="fechar"
              >Cancelar</Button
            >
            <Button
              type="submit"
              :disabled="isCreating"
              class="cursor-pointer bg-emerald-500 text-black hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Loader2 v-if="isCreating" class="size-4 animate-spin" />
              <ArrowUpRight v-else class="size-4" />
              {{ isCreating ? 'Finalizando…' : 'Finalizar venda' }}
            </Button>
          </div>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>

  <NewPerson
    v-model:open="pessoaModalAberto"
    :pessoa="null"
    :ao-criar="criarPessoa"
    :ao-atualizar="atualizarPessoa"
    :ao-atualizar-parcial="atualizarParcialPessoa"
    @created="pessoaCriada"
  />

  <NewProduct
    v-model:open="produtoModalAberto"
    :produto="null"
    :ao-criar="criarProduto"
    @created="produtoCriado"
    @salvo="produtoCriado"
  />
</template>
