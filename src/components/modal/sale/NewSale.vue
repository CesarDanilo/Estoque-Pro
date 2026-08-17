<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import {
  ArrowUpRight,
  Loader2,
  Minus,
  PackagePlus,
  Pencil,
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
  sale: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'created'])

const { sucesso, erro } = useFeedback()

// -----------------------------------------------------------------------------
// COMPOSABLES
// -----------------------------------------------------------------------------

const {
  pessoas,
  buscar: buscarPessoas,
  criar: criarPessoa,
  atualizar: atualizarPessoa,
  atualizarParcial: atualizarParcialPessoa,
} = usePeople()

const { produtos, refetch: buscarProdutos, criar: criarProduto } = useProducts()

const { createSale, updateSale, getSale, isCreating, isUpdating } = useSales()

// -----------------------------------------------------------------------------
// MODO
// -----------------------------------------------------------------------------

const modoEdicao = computed(() => !!props.sale?.id)

// Valor reservado para venda sem cliente
const ID_SEM_CLIENTE = 'sem_cliente'

// -----------------------------------------------------------------------------
// ESTADOS DA VENDA
// -----------------------------------------------------------------------------

const clienteId = ref(ID_SEM_CLIENTE)
const buscaCliente = ref('')
const buscaBruta = ref('')
const itens = ref([])
const pagamento = ref('')

// Fica true quando o usuário tenta salvar sem escolher a forma de
// pagamento. Usado para destacar o campo em vermelho até que ele
// seja preenchido.
const pagamentoInvalido = ref(false)

watch(pagamento, (valor) => {
  if (valor) {
    pagamentoInvalido.value = false
  }
})

// -----------------------------------------------------------------------------
// FOCO AUTOMÁTICO NO CAMPO DE BUSCA DE PRODUTO
// -----------------------------------------------------------------------------
//
// Ref do input "Buscar produto para a venda". Assim que o modal
// termina de abrir (e de carregar pessoas/produtos/itens da venda,
// se for edição), o foco vai automaticamente para este campo.
//
const campoBuscaProduto = ref(null)

function focarBuscaProduto() {
  // nextTick garante que o DOM já foi atualizado (input renderizado).
  // O setTimeout extra evita que o próprio Dialog (que também move o
  // foco ao abrir, por acessibilidade/focus-trap) "roube" o foco do
  // nosso input logo em seguida.
  nextTick(() => {
    setTimeout(() => {
      campoBuscaProduto.value?.focus()
    }, 150)
  })
}

// -----------------------------------------------------------------------------
// MODAIS
// -----------------------------------------------------------------------------

const pessoaModalAberto = ref(false)
const produtoModalAberto = ref(false)

const produtoEmEdicao = ref(null)

// Ao fechar o modal de produto, limpa o modo de edição.
watch(produtoModalAberto, (aberto) => {
  if (!aberto) {
    produtoEmEdicao.value = null
  }
})

// -----------------------------------------------------------------------------
// CARREGAMENTO
// -----------------------------------------------------------------------------

const carregandoItens = ref(false)

const LIMITE_BUSCA_PRODUTO = 60

// -----------------------------------------------------------------------------
// ABERTURA DA VENDA
// -----------------------------------------------------------------------------

watch(
  () => props.open,
  async (aberto) => {
    if (!aberto) return

    buscaBruta.value = ''
    resetar()

    const tarefas = []

    if (typeof buscarPessoas === 'function') {
      tarefas.push(
        buscarPessoas({
          type: 'todos',
          active: 'ativo',
        }),
      )
    }

    if (typeof buscarProdutos === 'function') {
      tarefas.push(buscarProdutos())
    }

    await Promise.all(tarefas)

    if (props.sale) {
      await carregarVendaParaEdicao(props.sale)
    }

    // Só foca depois que pessoas/produtos (e itens da venda, se edição)
    // já terminaram de carregar.
    focarBuscaProduto()
  },
)

// -----------------------------------------------------------------------------
// CARREGAR VENDA PARA EDIÇÃO
// -----------------------------------------------------------------------------

async function carregarVendaParaEdicao(vendaBase) {
  const idVenda = vendaBase?.id

  const jaTemItens =
    (Array.isArray(vendaBase?.items) && vendaBase.items.length > 0) ||
    (Array.isArray(vendaBase?.sale_items) && vendaBase.sale_items.length > 0)

  if (jaTemItens) {
    popularDadosEdicao(vendaBase)
    return
  }

  if (typeof getSale !== 'function' || !idVenda) {
    popularDadosEdicao(vendaBase)
    return
  }

  carregandoItens.value = true

  try {
    const resposta = await getSale(idVenda)
    const detalhes = resposta?.data || resposta

    popularDadosEdicao({
      ...vendaBase,
      ...detalhes,
    })
  } catch (err) {
    console.error('Erro ao carregar itens da venda:', err)

    popularDadosEdicao(vendaBase)

    erro(
      'Não foi possível carregar os itens desta venda',
      'Cliente e pagamento foram preenchidos. Revise os itens manualmente antes de salvar.',
    )
  } finally {
    carregandoItens.value = false
  }
}

// -----------------------------------------------------------------------------
// POPULAR DADOS DA EDIÇÃO
// -----------------------------------------------------------------------------

function popularDadosEdicao(venda) {
  clienteId.value =
    venda.person_id || venda.customer_id
      ? String(venda.person_id || venda.customer_id)
      : ID_SEM_CLIENTE

  pagamento.value = venda.payment_method || ''

  desconto.setValue(venda.discount_value ?? venda.discount ?? 0)

  descontoPercentual.setValue(venda.discount_percentage ?? 0)

  acrescimo.setValue(venda.surcharge_value ?? venda.surcharge ?? 0)

  acrescimoPercentual.setValue(venda.surcharge_percentage ?? 0)

  const listaItensBruta = venda.items || venda.sale_items || []

  itens.value = mapItensDaVenda(listaItensBruta)
}

// -----------------------------------------------------------------------------
// MAPEAR ITENS DA VENDA
// -----------------------------------------------------------------------------

function mapItensDaVenda(listaItensBruta) {
  if (!Array.isArray(listaItensBruta)) {
    return []
  }

  return listaItensBruta.map((i) => {
    const prodId = i.product_id || i.product?.id || i.id

    const produtoAtual = (produtos.value || []).find((p) => p.id === prodId)

    const nomeProduto =
      i.product_name ||
      i.product?.name ||
      i.product?.nome ||
      produtoAtual?.nome ||
      produtoAtual?.name ||
      i.name ||
      'Produto'

    const precoUnitario = safeNumber(i.unit_price || i.price || 0)

    const quantidade = safeNumber(i.quantity || i.qtd || 1)

    const estoqueAtualProduto = safeNumber(
      produtoAtual?.estoque ?? produtoAtual?.stock_quantity ?? 0,
    )

    const estoqueDisponivel = produtoAtual
      ? estoqueAtualProduto + quantidade
      : Math.max(quantidade, 9999)

    return {
      id: prodId,
      nome: nomeProduto,
      qtd: quantidade,
      valor: precoUnitario,
      estoque: estoqueDisponivel,
    }
  })
}

// -----------------------------------------------------------------------------
// CLIENTES
// -----------------------------------------------------------------------------

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

// -----------------------------------------------------------------------------
// BUSCA DE PRODUTOS
// -----------------------------------------------------------------------------

const busca = computed({
  get: () => buscaBruta.value,

  set: (valor) => {
    buscaBruta.value = (valor ?? '').slice(0, LIMITE_BUSCA_PRODUTO)
  },
})

const disponiveis = computed(() => {
  const termo = busca.value.trim().toLowerCase()

  if (termo === '') {
    return []
  }

  return (produtos.value || []).filter(
    (p) =>
      (p.nome || p.name || '').toLowerCase().includes(termo) ||
      (p.sku || '').toLowerCase().includes(termo),
  )
})

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

function safeNumber(val) {
  const num = Number(val)

  return isNaN(num) ? 0 : num
}

function brl(valor) {
  return safeNumber(valor).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function formatarNumero(valor) {
  return safeNumber(valor).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function nivelEstoque(p) {
  const qtd = safeNumber(p.estoque ?? p.stock_quantity)

  const min = safeNumber(p.minimo ?? p.min_stock_quantity)

  if (qtd <= 0) {
    return 'sem'
  }

  if (qtd <= min) {
    return 'baixo'
  }

  return 'ok'
}

// -----------------------------------------------------------------------------
// MÁSCARA DE MOEDA
// -----------------------------------------------------------------------------

function criarMascaraMoeda(limiteDigitos = 8) {
  const raw = ref('')

  const valorNumerico = computed(() => {
    if (!raw.value) {
      return 0
    }

    const num = Number(raw.value) / 100

    return isNaN(num) ? 0 : num
  })

  const formatted = computed(() => {
    if (!raw.value) {
      return ''
    }

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

    raw.value = String(Math.round(Number(numero) * 100)).slice(0, limiteDigitos)
  }

  return {
    raw,
    formatted,
    valorNumerico,
    onInput,
    setValue,
  }
}

// -----------------------------------------------------------------------------
// MÁSCARA DE PERCENTUAL
// -----------------------------------------------------------------------------

function criarMascaraPercentual(limiteDigitos = 5) {
  const raw = ref('')

  const valorNumerico = computed(() => {
    if (!raw.value) {
      return 0
    }

    const num = Number(raw.value) / 100

    return isNaN(num) ? 0 : num
  })

  const formatted = computed(() => {
    if (!raw.value) {
      return ''
    }

    return valorNumerico.value.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  })

  function onInput(evento) {
    const val = evento?.target?.value || ''

    let digitos = val.replace(/\D/g, '').slice(0, limiteDigitos)

    if (Number(digitos) > 10000) {
      digitos = '10000'
    }

    raw.value = digitos
  }

  function setValue(numero) {
    if (numero === null || numero === undefined || numero === '' || isNaN(Number(numero))) {
      raw.value = ''
      return
    }

    raw.value = String(Math.round(Number(numero) * 100))
  }

  return {
    raw,
    formatted,
    valorNumerico,
    onInput,
    setValue,
  }
}

// -----------------------------------------------------------------------------
// DESCONTO / ACRÉSCIMO
// -----------------------------------------------------------------------------

const desconto = criarMascaraMoeda(8)

const descontoPercentual = criarMascaraPercentual(5)

const descontoValorPreenchido = computed(() => desconto.valorNumerico.value > 0)

const descontoPercentualPreenchido = computed(() => descontoPercentual.valorNumerico.value > 0)

const acrescimo = criarMascaraMoeda(8)

const acrescimoPercentual = criarMascaraPercentual(5)

const acrescimoValorPreenchido = computed(() => acrescimo.valorNumerico.value > 0)

const acrescimoPercentualPreenchido = computed(() => acrescimoPercentual.valorNumerico.value > 0)

// -----------------------------------------------------------------------------
// NAVEGAÇÃO DE PRODUTOS
// -----------------------------------------------------------------------------

const indiceAtivo = ref(-1)

watch(busca, () => {
  indiceAtivo.value = -1
})

function onBuscaProdutoKeydown(evento) {
  if (disponiveis.value.length === 0) {
    return
  }

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

// -----------------------------------------------------------------------------
// TOTAIS
// -----------------------------------------------------------------------------

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

// -----------------------------------------------------------------------------
// CONVERSÃO DESCONTO / ACRÉSCIMO
// -----------------------------------------------------------------------------

const descontoValorExibido = computed(() => {
  if (descontoPercentualPreenchido.value) {
    return formatarNumero(valorDescontoAplicado.value)
  }

  return desconto.formatted.value
})

const descontoPercentualExibido = computed(() => {
  if (descontoValorPreenchido.value) {
    if (subtotal.value <= 0) {
      return '0,00'
    }

    return formatarNumero((valorDescontoAplicado.value / subtotal.value) * 100)
  }

  return descontoPercentual.formatted.value
})

const acrescimoValorExibido = computed(() => {
  if (acrescimoPercentualPreenchido.value) {
    return formatarNumero(valorAcrescimoAplicado.value)
  }

  return acrescimo.formatted.value
})

const acrescimoPercentualExibido = computed(() => {
  if (acrescimoValorPreenchido.value) {
    if (subtotal.value <= 0) {
      return '0,00'
    }

    return formatarNumero((valorAcrescimoAplicado.value / subtotal.value) * 100)
  }

  return acrescimoPercentual.formatted.value
})

// -----------------------------------------------------------------------------
// INPUT DESCONTO
// -----------------------------------------------------------------------------

function onInputDescontoValor(evento) {
  desconto.onInput(evento)

  if (desconto.valorNumerico.value > subtotal.value) {
    desconto.setValue(subtotal.value)
  }
}

// -----------------------------------------------------------------------------
// RESET
// -----------------------------------------------------------------------------

function resetar() {
  clienteId.value = ID_SEM_CLIENTE

  buscaCliente.value = ''
  buscaBruta.value = ''
  itens.value = []

  desconto.setValue('')
  descontoPercentual.setValue('')

  acrescimo.setValue('')
  acrescimoPercentual.setValue('')

  pagamento.value = ''
  pagamentoInvalido.value = false
  indiceAtivo.value = -1
}

// -----------------------------------------------------------------------------
// PRODUTOS
// -----------------------------------------------------------------------------

function adicionar(id) {
  const p = (produtos.value || []).find((x) => x.id === id)

  const qtdEstoque = safeNumber(p?.estoque ?? p?.stock_quantity ?? 9999)

  const precoVenda = safeNumber(p?.preco ?? p?.sale_price ?? 0)

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

// -----------------------------------------------------------------------------
// MODAL DE PRODUTO
// -----------------------------------------------------------------------------

function abrirProdutoParaReporEstoque(produto) {
  produtoEmEdicao.value = produto

  produtoModalAberto.value = true
}

function abrirNovoProduto() {
  produtoEmEdicao.value = null

  produtoModalAberto.value = true
}

// -----------------------------------------------------------------------------
// CADASTRO DE PESSOA
// -----------------------------------------------------------------------------
//
// IMPORTANTE:
//
// A API não está retornando o ID da pessoa criada.
//
// Então NÃO usamos:
//
//   novaPessoa.data.id
//
// Em vez disso:
//
// 1. cadastramos a pessoa;
// 2. buscamos novamente a lista;
// 3. assumimos que o backend retorna o último cadastro
//    primeiro;
// 4. pegamos pessoas.value[0];
// 5. usamos o ID desse registro para selecionar o cliente.
//
// No Select:
//
//   Venda sem cliente  -> primeiro item visual
//   pessoas.value[0]   -> segundo item visual
//
// -----------------------------------------------------------------------------

async function pessoaCriada(novaPessoa) {
  const pessoaObj = novaPessoa?.data || novaPessoa

  const nomeExtraido = pessoaObj?.nome || pessoaObj?.name || 'Cliente'

  sucesso('Cliente cadastrado', `${nomeExtraido} será selecionado nesta venda.`)

  try {
    // -------------------------------------------------------
    // 1. RECARREGA A LISTA DE PESSOAS
    // -------------------------------------------------------

    if (typeof buscarPessoas === 'function') {
      await buscarPessoas({
        type: 'todos',
        active: 'ativo',
      })
    }

    // -------------------------------------------------------
    // 2. PEGA O PRIMEIRO REGISTRO DA LISTA
    // -------------------------------------------------------
    //
    // A regra definida é:
    //
    // pessoas.value[0] =
    // último cadastro realizado.
    //
    // "Venda sem cliente" NÃO está dentro de pessoas.
    // Ela é adicionada manualmente no template.
    //
    // Portanto:
    //
    // Select item 1 -> Venda sem cliente
    // Select item 2 -> pessoas.value[0]
    //
    const ultimoCadastrado = pessoas.value?.[0]

    // -------------------------------------------------------
    // 3. VALIDA SE ENCONTROU A PESSOA
    // -------------------------------------------------------

    if (!ultimoCadastrado || !ultimoCadastrado.id) {
      erro(
        'Cliente cadastrado',
        'A pessoa foi cadastrada, mas não foi encontrada como o primeiro registro da lista.',
      )

      return
    }

    // -------------------------------------------------------
    // 4. SELECIONA AUTOMATICAMENTE
    // -------------------------------------------------------

    clienteId.value = String(ultimoCadastrado.id)

    // Limpa a pesquisa do Select
    buscaCliente.value = ''

    // -------------------------------------------------------
    // 5. FECHA O MODAL DE CADASTRO
    // -------------------------------------------------------

    pessoaModalAberto.value = false

    console.log('[Nova venda] Cliente selecionado automaticamente:', {
      id: ultimoCadastrado.id,
      nome: ultimoCadastrado.nome || ultimoCadastrado.name,
    })
  } catch (err) {
    console.error('Erro ao selecionar automaticamente o cliente:', err)

    erro(
      'Cliente cadastrado',
      'A pessoa foi cadastrada, mas não foi possível selecioná-la automaticamente.',
    )
  }
}

// -----------------------------------------------------------------------------
// CADASTRO / EDIÇÃO DE PRODUTO
// -----------------------------------------------------------------------------
//
// CORREÇÃO:
//
// O template escuta três eventos do NewProduct
// (@created, @updated, @salvo) e todos apontam
// para esta mesma função.
//
// Se o componente filho emitir mais de um desses
// eventos para a mesma ação de salvar (ex.: emite
// "created" E também "salvo" no mesmo submit), esta
// função rodava duas vezes e `adicionar()` era chamado
// duas vezes -> o item entrava no carrinho com
// quantidade 2 em vez de 1.
//
// A trava abaixo garante que, mesmo que dois eventos
// disparem para a mesma ação, só processamos uma vez.
// -----------------------------------------------------------------------------

let ultimoProdutoProcessadoId = null
let processandoProduto = false

async function produtoCriado(novoProduto) {
  const prodObj = novoProduto?.data || novoProduto

  // Evita reprocessar o mesmo produto se dois eventos
  // (ex: @created e @salvo) dispararem para a mesma ação.
  if (processandoProduto && prodObj?.id === ultimoProdutoProcessadoId) {
    return
  }

  processandoProduto = true
  ultimoProdutoProcessadoId = prodObj?.id ?? null

  try {
    if (typeof buscarProdutos === 'function') {
      await buscarProdutos()
    }

    if (prodObj?.id) {
      adicionar(prodObj.id)
    }
  } finally {
    // Libera a trava só depois que os eventos síncronos
    // desse mesmo submit já tiverem disparado.
    setTimeout(() => {
      processandoProduto = false
      ultimoProdutoProcessadoId = null
    }, 300)
  }
}

// -----------------------------------------------------------------------------
// FECHAR
// -----------------------------------------------------------------------------

function fechar() {
  emit('update:open', false)
}

// -----------------------------------------------------------------------------
// SALVAR VENDA
// -----------------------------------------------------------------------------

async function salvar() {
  if (isCreating.value || isUpdating.value || carregandoItens.value) {
    return
  }

  if (!clienteId.value) {
    erro('Cliente não informado', 'Selecione um cliente ou escolha a opção de Venda Avulsa.')

    return
  }

  if (itens.value.length === 0) {
    erro('Carrinho vazio', 'Adicione pelo menos um produto para finalizar a venda.')

    return
  }

  if (!pagamento.value) {
    pagamentoInvalido.value = true

    erro('Forma de pagamento não informada', 'Selecione como o cliente vai pagar.')

    return
  }

  try {
    const payload = {
      person_id: clienteId.value === ID_SEM_CLIENTE ? null : clienteId.value,

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

    let response

    if (modoEdicao.value) {
      response = await updateSale(props.sale.id, payload)

      sucesso('Venda atualizada.', 'As alterações foram salvas com sucesso.')
    } else {
      response = await createSale(payload)

      sucesso('Venda finalizada.', 'Estoque atualizado com as saídas.')
    }

    emit('created', response)

    fechar()
  } catch (err) {
    erro(
      'Erro ao salvar venda',
      err?.response?.data?.message || 'Verifique os dados e tente novamente.',
    )
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="(v) => emit('update:open', v)">
    <DialogContent class="flex max-h-[90vh] flex-col w-[950px] max-w-[95vw] p-8 sm:max-w-[950px]">
      <DialogHeader class="space-y-1 shrink-0">
        <DialogTitle class="text-xl font-semibold tracking-tight">
          {{ modoEdicao ? `Editar venda #${props.sale?.code || ''}` : 'Nova venda' }}
        </DialogTitle>

        <DialogDescription class="text-sm text-muted-foreground">
          {{
            modoEdicao
              ? 'Atualize os dados e itens desta venda.'
              : 'Ao finalizar, o estoque dos produtos vendidos é reduzido.'
          }}
        </DialogDescription>
      </DialogHeader>

      <form
        class="flex min-h-0 flex-1 flex-col justify-between space-y-6 pt-1"
        @submit.prevent="salvar"
      >
        <div class="grid flex-1 gap-6 overflow-hidden lg:grid-cols-[minmax(0,1fr)_340px]">
          <!-- ========================================================= -->
          <!-- COLUNA ESQUERDA -->
          <!-- ========================================================= -->

          <div class="flex flex-col space-y-6 overflow-y-auto pr-1">
            <!-- ======================================================= -->
            <!-- CLIENTE -->
            <!-- ======================================================= -->

            <section class="space-y-3">
              <h3 class="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                1. Cliente
              </h3>

              <div>
                <label for="cliente" class="mb-1.5 block text-sm font-medium text-foreground">
                  Para quem é a venda?
                  <span class="text-destructive"> * </span>
                </label>

                <div class="flex gap-2">
                  <Select v-model="clienteId">
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
                        <!-- PRIMEIRO ITEM -->
                        <SelectItem
                          :value="ID_SEM_CLIENTE"
                          class="cursor-pointer font-medium text-primary"
                        >
                          Venda sem cliente (Avulsa)
                        </SelectItem>

                        <p
                          v-if="clientesAtivos.length === 0 && buscaCliente.trim() !== ''"
                          class="p-2 text-center text-xs text-muted-foreground"
                        >
                          Nenhum cliente encontrado.
                        </p>

                        <!--
                          SEGUNDO ITEM EM DIANTE

                          O primeiro registro de
                          clientesAtivos será o
                          último cadastro retornado
                          pela API.
                        -->
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
                    @click="pessoaModalAberto = true"
                  >
                    <UserPlus class="size-4" />
                  </Button>
                </div>
              </div>
            </section>

            <!-- ======================================================= -->
            <!-- PRODUTOS -->
            <!-- ======================================================= -->

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
                  @click="abrirNovoProduto"
                >
                  <PackagePlus class="size-3.5" />

                  Novo produto
                </Button>
              </div>

              <div>
                <label for="busca-produto" class="mb-1.5 block text-sm font-medium text-foreground">
                  Buscar produto para a venda
                </label>

                <div class="relative">
                  <input
                    id="busca-produto"
                    ref="campoBuscaProduto"
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
                class="max-h-[160px] divide-y divide-border overflow-y-auto rounded-lg border border-border"
              >
                <li
                  v-for="(p, idx) in disponiveis"
                  :key="p.id"
                  class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 transition-colors"
                  :class="idx === indiceAtivo ? 'bg-accent' : 'bg-surface'"
                  @mouseenter="indiceAtivo = idx"
                >
                  <div class="min-w-0">
                    <p class="truncate text-sm font-medium">
                      {{ p.nome || p.name }}
                    </p>

                    <p class="text-xs text-muted-foreground">
                      {{ p.sku }} ·
                      {{ brl(p.preco ?? p.sale_price) }}
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
                      v-if="safeNumber(p.estoque ?? p.stock_quantity) <= 0"
                      type="button"
                      variant="outline"
                      size="sm"
                      class="cursor-pointer text-xs"
                      title="Editar este produto e repor o estoque"
                      @click="abrirProdutoParaReporEstoque(p)"
                    >
                      <Pencil class="size-3.5 mr-1" />

                      Repor estoque
                    </Button>

                    <Button
                      v-else
                      type="button"
                      size="sm"
                      class="cursor-pointer"
                      @click="adicionar(p.id)"
                    >
                      <Plus class="size-4" />

                      Adicionar
                    </Button>
                  </div>
                </li>
              </ul>
            </section>

            <!-- ======================================================= -->
            <!-- ITENS -->
            <!-- ======================================================= -->

            <section class="space-y-3 border-t border-border pt-6">
              <h3 class="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                3. Itens da venda
              </h3>

              <div
                v-if="carregandoItens"
                class="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-4 text-sm text-muted-foreground"
              >
                <Loader2 class="size-4 animate-spin" />

                Carregando itens desta venda…
              </div>

              <EmptyState
                v-else-if="itens.length === 0"
                titulo="Carrinho vazio"
                descricao="Adicione produtos para ver o valor total da venda."
              />

              <div v-else class="max-h-[220px] overflow-y-auto rounded-lg border border-border">
                <ul class="divide-y divide-border">
                  <li v-for="i in itens" :key="i.id" class="space-y-2 bg-surface px-3 py-2.5">
                    <div class="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                      <div class="min-w-0">
                        <p class="truncate text-sm font-medium">
                          {{ i.nome }}
                        </p>

                        <p class="text-xs text-muted-foreground">
                          {{ brl(i.valor) }}
                          cada
                        </p>
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

                      <span class="w-8 text-center text-sm font-semibold">
                        {{ i.qtd }}
                      </span>

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

                      <span class="ml-auto text-sm font-semibold">
                        {{ brl(i.qtd * i.valor) }}
                      </span>
                    </div>

                    <p
                      v-if="i.qtd >= i.estoque"
                      class="flex items-center gap-1.5 text-xs text-warning"
                    >
                      <TriangleAlert class="size-3.5" aria-hidden="true" />

                      Limite do estoque disponível ({{ i.estoque }}
                      un.).
                    </p>
                  </li>
                </ul>
              </div>
            </section>
          </div>

          <!-- ========================================================= -->
          <!-- COLUNA DIREITA -->
          <!-- ========================================================= -->

          <div
            class="space-y-4 overflow-y-auto border-t border-border pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0"
          >
            <section class="space-y-4">
              <h3 class="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                4. Pagamento e Ajustes
              </h3>

              <!-- DESCONTO -->

              <div>
                <label class="mb-1.5 block text-sm font-medium text-foreground"> Desconto </label>

                <div class="grid grid-cols-2 gap-2">
                  <div class="relative">
                    <span
                      class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
                    >
                      R$
                    </span>

                    <input
                      id="desconto"
                      :value="descontoValorExibido"
                      inputmode="decimal"
                      placeholder="0,00"
                      maxlength="12"
                      :disabled="descontoPercentualPreenchido"
                      class="h-10 w-full cursor-text rounded-md border border-input bg-surface pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      @input="onInputDescontoValor"
                    />
                  </div>

                  <div class="relative">
                    <input
                      id="desconto-percentual"
                      :value="descontoPercentualExibido"
                      inputmode="decimal"
                      placeholder="0,00"
                      maxlength="6"
                      :disabled="descontoValorPreenchido"
                      class="h-10 w-full cursor-text rounded-md border border-input bg-surface pl-3 pr-8 text-sm outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      @input="descontoPercentual.onInput"
                    />

                    <span
                      class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
                    >
                      %
                    </span>
                  </div>
                </div>
              </div>

              <!-- ACRÉSCIMO -->

              <div>
                <label class="mb-1.5 block text-sm font-medium text-foreground"> Acréscimo </label>

                <div class="grid grid-cols-2 gap-2">
                  <div class="relative">
                    <span
                      class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
                    >
                      R$
                    </span>

                    <input
                      id="acrescimo"
                      :value="acrescimoValorExibido"
                      inputmode="decimal"
                      placeholder="0,00"
                      maxlength="12"
                      :disabled="acrescimoPercentualPreenchido"
                      class="h-10 w-full cursor-text rounded-md border border-input bg-surface pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      @input="acrescimo.onInput"
                    />
                  </div>

                  <div class="relative">
                    <input
                      id="acrescimo-percentual"
                      :value="acrescimoPercentualExibido"
                      inputmode="decimal"
                      placeholder="0,00"
                      maxlength="6"
                      :disabled="acrescimoValorPreenchido"
                      class="h-10 w-full cursor-text rounded-md border border-input bg-surface pl-3 pr-8 text-sm outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      @input="acrescimoPercentual.onInput"
                    />

                    <span
                      class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
                    >
                      %
                    </span>
                  </div>
                </div>
              </div>

              <!-- PAGAMENTO -->

              <div>
                <label for="pagamento" class="mb-1.5 block text-sm font-medium text-foreground">
                  Forma de pagamento
                  <span class="text-destructive"> * </span>
                </label>

                <Select v-model="pagamento" required>
                  <SelectTrigger
                    id="pagamento"
                    required
                    :aria-invalid="pagamentoInvalido"
                    class="h-10 w-full cursor-pointer bg-surface"
                    :class="
                      pagamentoInvalido
                        ? 'border-destructive text-destructive ring-1 ring-destructive focus:ring-destructive'
                        : ''
                    "
                  >
                    <SelectValue placeholder="Como o cliente vai pagar?" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="Dinheiro" class="cursor-pointer"> Dinheiro </SelectItem>

                    <SelectItem value="Pix" class="cursor-pointer"> Pix </SelectItem>

                    <SelectItem value="Cartão de débito" class="cursor-pointer">
                      Cartão de débito
                    </SelectItem>

                    <SelectItem value="Cartão de crédito" class="cursor-pointer">
                      Cartão de crédito
                    </SelectItem>
                  </SelectContent>
                </Select>

                <p
                  v-if="pagamentoInvalido"
                  class="mt-1.5 flex items-center gap-1.5 text-xs text-destructive"
                >
                  <TriangleAlert class="size-3.5" aria-hidden="true" />

                  Selecione uma forma de pagamento.
                </p>
              </div>

              <!-- RESUMO -->

              <div class="space-y-1 rounded-md border border-input px-3 py-2.5 text-sm">
                <div class="flex justify-between text-muted-foreground">
                  <span> Subtotal </span>

                  <span>
                    {{ brl(subtotal) }}
                  </span>
                </div>

                <div
                  v-if="valorDescontoAplicado > 0"
                  class="flex justify-between text-muted-foreground"
                >
                  <span>
                    Desconto

                    <template v-if="descontoPercentualPreenchido">
                      ({{ descontoPercentual.formatted.value }}%)
                    </template>
                  </span>

                  <span>
                    -
                    {{ brl(valorDescontoAplicado) }}
                  </span>
                </div>

                <div
                  v-if="valorAcrescimoAplicado > 0"
                  class="flex justify-between text-muted-foreground"
                >
                  <span>
                    Acréscimo

                    <template v-if="acrescimoPercentualPreenchido">
                      ({{ acrescimoPercentual.formatted.value }}%)
                    </template>
                  </span>

                  <span>
                    +
                    {{ brl(valorAcrescimoAplicado) }}
                  </span>
                </div>

                <div
                  class="flex items-center justify-between border-t border-border pt-1.5 font-medium"
                >
                  <span> Total a pagar </span>

                  <span class="text-base text-primary">
                    {{ brl(total) }}
                  </span>
                </div>
              </div>
            </section>
          </div>
        </div>

        <!-- =========================================================== -->
        <!-- FOOTER -->
        <!-- =========================================================== -->

        <DialogFooter
          class="flex-col items-stretch gap-2 border-t border-border pt-5 shrink-0 sm:flex-row sm:items-center"
        >
          <p class="text-xs text-muted-foreground sm:mr-auto">
            Campos com
            <span class="text-destructive"> * </span>
            são obrigatórios. Você será avisado ao finalizar se algo faltar.
          </p>

          <div class="flex gap-2 sm:ml-auto">
            <Button type="button" variant="outline" class="cursor-pointer" @click="fechar">
              Cancelar
            </Button>

            <Button
              type="submit"
              :disabled="isCreating || isUpdating || carregandoItens"
              class="cursor-pointer bg-emerald-500 text-black hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Loader2 v-if="isCreating || isUpdating" class="size-4 animate-spin" />

              <ArrowUpRight v-else class="size-4" />

              {{
                isCreating || isUpdating
                  ? 'Salvando…'
                  : modoEdicao
                    ? 'Salvar alterações'
                    : 'Finalizar venda'
              }}
            </Button>
          </div>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>

  <!-- =============================================================== -->
  <!-- MODAL NOVA PESSOA -->
  <!-- =============================================================== -->

  <NewPerson
    v-model:open="pessoaModalAberto"
    :pessoa="null"
    :ao-criar="criarPessoa"
    :ao-atualizar="atualizarPessoa"
    :ao-atualizar-parcial="atualizarParcialPessoa"
    @created="pessoaCriada"
  />

  <!-- =============================================================== -->
  <!-- MODAL NOVO PRODUTO -->
  <!-- =============================================================== -->

  <NewProduct
    v-model:open="produtoModalAberto"
    :produto="produtoEmEdicao"
    :ao-criar="criarProduto"
    @created="produtoCriado"
    @updated="produtoCriado"
    @salvo="produtoCriado"
  />
</template>
