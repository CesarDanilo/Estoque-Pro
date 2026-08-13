<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { Loader2, Plus, Save } from 'lucide-vue-next'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'

import { useFeedback } from '@/composables/useFeedBack'
import { useGroups } from '@/composables/useGroups'
import { productService } from '@/services/productService'
import { supplierService } from '@/services/supplierService'

// Componentes dos Modais On-the-Fly
import GroupModal from '@/components/modal/group/NewGroup.vue'
import SupplierModal from '@/components/modal/supplier/NewSupplier.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  produto: { type: Object, default: null },
  aoCriar: { type: Function, default: null },
  aoAtualizar: { type: Function, default: null },
})

const emit = defineEmits(['update:open', 'created', 'updated', 'salvo'])

const queryClient = useQueryClient()
const { sucesso, erro } = useFeedback()

// Instância do useGroups para carregar a lista de grupos da API
const { groupsQuery } = useGroups()

// Estados dos Modais On-the-Fly
const modalGrupoAberto = ref(false)
const modalFornecedorAberto = ref(false)

const NOME_MAX = 120
const SKU_MAX = 30
const DESCRICAO_MAX = 500

const erros = reactive({})

const form = reactive({
  name: '',
  sku: '',
  group_id: '',
  supplier_id: 'none',
  active: true,
  description: '',
})

const editando = computed(() => !!props.produto?.id)

// Lista de grupos tratada vindos da Query
const listaGrupos = computed(() => {
  const dados = groupsQuery?.data?.value
  if (Array.isArray(dados)) return dados
  return dados?.data || []
})

// Grupos ordenados em ordem alfabética (A-Z)
const gruposOrdenados = computed(() => {
  return [...listaGrupos.value].sort((a, b) =>
    (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' }),
  )
})

const carregandoGrupos = computed(() => groupsQuery?.isLoading?.value ?? false)

// ---- Máscaras Sanitizadas ----
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

function criarMascaraInteiro(limiteDigitos = 6) {
  const raw = ref('0')

  function onInput(evento) {
    const digitos = evento.target.value.replace(/\D/g, '').slice(0, limiteDigitos)
    raw.value = digitos === '' ? '0' : digitos.replace(/^0+(?=\d)/, '')
    evento.target.value = raw.value
  }

  function setValue(numero) {
    raw.value = String(Math.max(0, Math.trunc(Number(numero) || 0)))
  }

  return { raw, onInput, setValue }
}

const custo = criarMascaraMoeda(8)
const preco = criarMascaraMoeda(8)
const estoque = criarMascaraInteiro(6)
const minimo = criarMascaraInteiro(6)

function brl(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0)
}

const skuModel = computed({
  get: () => form.sku,
  set: (v) => {
    form.sku = (v ?? '')
      .toUpperCase()
      .replace(/[^A-Z0-9\-_]/g, '')
      .slice(0, SKU_MAX)
  },
})

const nomeModel = computed({
  get: () => form.name,
  set: (v) => {
    form.name = (v ?? '').slice(0, NOME_MAX)
  },
})

const descricaoModel = computed({
  get: () => form.description,
  set: (v) => {
    form.description = (v ?? '').slice(0, DESCRICAO_MAX)
  },
})

const margem = computed(() => {
  const p = preco.valorNumerico.value
  const c = custo.valorNumerico.value
  return p > 0 && c > 0 ? ((p - c) / p) * 100 : null
})

const margemClasse = computed(() => {
  if (margem.value === null) return ''
  return margem.value >= 0 ? 'text-emerald-500' : 'text-red-500'
})

// ---- TanStack Query (Fornecedores) ----
const {
  data: fornecedoresData,
  isLoading: carregandoFornecedores,
  refetch: refetchFornecedores,
} = useQuery({
  queryKey: ['suppliers'],
  queryFn: () => supplierService.getAll(),
  enabled: computed(() => props.open),
  staleTime: 1000 * 60 * 10,
})

const listaFornecedores = computed(() => {
  if (Array.isArray(fornecedoresData.value)) return fornecedoresData.value
  return fornecedoresData.value?.data || []
})

// Fornecedores ordenados em ordem alfabética (A-Z)
const fornecedoresOrdenados = computed(() => {
  return [...listaFornecedores.value].sort((a, b) =>
    (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' }),
  )
})

// ---- Callbacks para seleção automática de Grupo e Fornecedor ----
async function grupoCriado(grupo) {
  await queryClient.invalidateQueries({ queryKey: ['groups'] })
  if (groupsQuery?.refetch) await groupsQuery.refetch()

  const novoId = grupo?.id ?? grupo?.data?.id
  if (novoId) {
    form.group_id = String(novoId)
    if (erros.group_id) delete erros.group_id
  }
}

async function fornecedorCriado(fornecedor) {
  await queryClient.invalidateQueries({ queryKey: ['suppliers'] })
  await refetchFornecedores()

  const novoId = fornecedor?.id ?? fornecedor?.data?.id
  if (novoId) {
    form.supplier_id = String(novoId)
  }
}

// ---- TanStack Mutation (Criação e Edição do Produto) ----
const saveMutation = useMutation({
  mutationFn: async (payload) => {
    if (editando.value) {
      if (props.aoAtualizar) return await props.aoAtualizar(props.produto.id, payload)
      return await productService.update(props.produto.id, payload)
    }
    if (props.aoCriar) return await props.aoCriar(payload)
    return await productService.create(payload)
  },
  onSuccess: (res) => {
    queryClient.invalidateQueries({ queryKey: ['products'] })

    const produtoSalvo = res?.data || res

    sucesso(
      editando.value ? 'Produto atualizado' : 'Produto cadastrado',
      editando.value ? 'As alterações foram salvas com sucesso.' : 'Produto adicionado ao estoque.',
    )

    if (editando.value) {
      emit('updated', produtoSalvo)
    } else {
      emit('created', produtoSalvo)
    }
    emit('salvo', produtoSalvo)

    fechar()
  },
  onError: (err) => {
    const apiErrors = err.response?.data?.errors
    if (apiErrors) {
      Object.assign(erros, apiErrors)
      erro('Verifique os campos destacados.')
    } else {
      erro('Erro ao salvar', err.response?.data?.message || 'Não foi possível salvar o produto.')
    }
  },
})

// Limpeza de erros dinâmicos
watch(
  () => form.name,
  (v) => {
    if (erros.name && v.trim().length >= 3) delete erros.name
  },
)
watch(skuModel, (v) => {
  if (erros.sku && v.trim()) delete erros.sku
})
watch(
  () => form.group_id,
  (v) => {
    if (erros.group_id && v) delete erros.group_id
  },
)
watch(preco.raw, (v) => {
  if (erros.sale_price && Number(v) > 0) delete erros.sale_price
})

watch(
  () => props.open,
  (aberto) => {
    if (!aberto) return
    preencherFormulario()
  },
)

function preencherFormulario() {
  const p = props.produto
  Object.keys(erros).forEach((chave) => delete erros[chave])

  if (p) {
    form.name = p.name ?? p.nome ?? ''
    form.sku = p.sku ?? ''
    form.group_id = p.group_id ? String(p.group_id) : ''
    form.supplier_id = p.supplier_id ? String(p.supplier_id) : 'none'
    form.active = typeof p.active !== 'undefined' ? Boolean(p.active) : true
    form.description = p.description ?? ''
    custo.setValue(p.cost_price ?? p.custo)
    preco.setValue(p.sale_price ?? p.preco)
    estoque.setValue(p.stock_quantity ?? p.estoque)
    minimo.setValue(p.min_stock_quantity ?? p.minimo)
  } else {
    form.name = ''
    form.sku = ''
    form.group_id = ''
    form.supplier_id = 'none'
    form.active = true
    form.description = ''
    custo.setValue('')
    preco.setValue('')
    estoque.setValue(0)
    minimo.setValue(0)
  }
}

function fechar() {
  emit('update:open', false)
}

function validar() {
  Object.keys(erros).forEach((chave) => delete erros[chave])

  if (form.name.trim().length < 3) erros.name = 'Informe o nome do produto (mínimo 3 caracteres).'
  if (!form.sku.trim()) erros.sku = 'Informe um código SKU válido.'
  if (!form.group_id) erros.group_id = 'Selecione um grupo.'
  if (!(preco.valorNumerico.value > 0)) erros.sale_price = 'Informe o preço de venda.'

  return Object.keys(erros).length === 0
}

function salvar() {
  if (saveMutation.isPending.value) return

  if (!validar()) {
    erro('Confira os campos destacados antes de salvar.')
    return
  }

  const payload = {
    name: form.name.trim(),
    sku: form.sku.trim(),
    group_id: form.group_id,
    supplier_id: form.supplier_id === 'none' || !form.supplier_id ? null : form.supplier_id,
    active: form.active,
    description: form.description ? form.description.trim() : null,
    cost_price: custo.valorNumerico.value,
    sale_price: preco.valorNumerico.value,
    stock_quantity: Number(estoque.raw.value),
    min_stock_quantity: Number(minimo.raw.value),
  }

  saveMutation.mutate(payload)
}
</script>

<template>
  <Dialog :open="open" @update:open="(v) => emit('update:open', v)">
    <DialogContent class="w-[950px] max-w-[95vw] overflow-y-auto p-8 sm:max-w-[950px]">
      <DialogHeader class="space-y-1">
        <DialogTitle class="text-xl font-semibold tracking-tight">
          {{ editando ? 'Editar produto' : 'Novo produto' }}
        </DialogTitle>
        <DialogDescription class="text-sm text-muted-foreground">
          Os campos marcados com <span class="text-destructive">*</span> são obrigatórios.
        </DialogDescription>
      </DialogHeader>

      <form class="space-y-7 pt-1" @submit.prevent="salvar">
        <section class="space-y-4">
          <h3 class="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Identificação
          </h3>

          <div class="grid grid-cols-1 gap-x-6 gap-y-4">
            <div>
              <label for="produto-nome" class="mb-1.5 block text-sm font-medium text-foreground">
                Nome do produto <span class="text-destructive">*</span>
              </label>
              <div class="relative">
                <Input
                  id="produto-nome"
                  v-model="nomeModel"
                  placeholder="Ex.: Coca-Cola 2L"
                  :maxlength="NOME_MAX"
                  class="h-10 cursor-text pr-14"
                  :aria-invalid="!!erros.name"
                />
                <span
                  class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 select-none text-[11px] font-medium tabular-nums transition-colors"
                  :class="
                    form.name.length >= NOME_MAX ? 'text-red-500' : 'text-muted-foreground/40'
                  "
                >
                  {{ form.name.length }}/{{ NOME_MAX }}
                </span>
              </div>
              <p v-if="erros.name" class="mt-1 text-xs text-destructive">
                {{ Array.isArray(erros.name) ? erros.name[0] : erros.name }}
              </p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
              <div>
                <label for="produto-sku" class="mb-1.5 block text-sm font-medium text-foreground">
                  Código (SKU) <span class="text-destructive">*</span>
                </label>
                <div class="relative">
                  <Input
                    id="produto-sku"
                    v-model="skuModel"
                    placeholder="BEB-0001"
                    :maxlength="SKU_MAX"
                    class="h-10 cursor-text pr-12 uppercase font-mono"
                    :aria-invalid="!!erros.sku"
                  />
                  <span
                    class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 select-none text-[10px] font-medium tabular-nums transition-colors"
                    :class="
                      form.sku.length >= SKU_MAX ? 'text-red-500' : 'text-muted-foreground/40'
                    "
                  >
                    {{ form.sku.length }}/{{ SKU_MAX }}
                  </span>
                </div>
                <p v-if="erros.sku" class="mt-1 text-xs text-destructive">
                  {{ Array.isArray(erros.sku) ? erros.sku[0] : erros.sku }}
                </p>
                <p v-else class="mt-1 text-xs text-muted-foreground">
                  Usado na busca rápida de vendas.
                </p>
              </div>

              <div>
                <label for="produto-grupo" class="mb-1.5 block text-sm font-medium text-foreground">
                  Grupo <span class="text-destructive">*</span>
                </label>
                <div class="flex gap-2">
                  <Select v-model="form.group_id">
                    <SelectTrigger
                      id="produto-grupo"
                      class="!h-10 w-full cursor-pointer"
                      :aria-invalid="!!erros.group_id"
                    >
                      <SelectValue
                        :placeholder="carregandoGrupos ? 'Carregando…' : 'Selecione um grupo'"
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem
                        v-for="g in gruposOrdenados"
                        :key="g.id"
                        :value="String(g.id)"
                        class="cursor-pointer truncate"
                      >
                        {{ g.name }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    class="h-10 w-10 shrink-0 cursor-pointer"
                    title="Criar novo grupo"
                    @click="modalGrupoAberto = true"
                  >
                    <Plus class="size-4" />
                  </Button>
                </div>
                <p v-if="erros.group_id" class="mt-1 text-xs text-destructive">
                  {{ Array.isArray(erros.group_id) ? erros.group_id[0] : erros.group_id }}
                </p>
              </div>

              <div>
                <label
                  for="produto-fornecedor"
                  class="mb-1.5 block text-sm font-medium text-foreground"
                >
                  Fornecedor (Opcional)
                </label>
                <div class="flex gap-2 min-w-0 w-full">
                  <Select v-model="form.supplier_id">
                    <SelectTrigger
                      id="produto-fornecedor"
                      class="!h-10 w-full max-w-[280px] min-w-0 cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap"
                    >
                      <SelectValue
                        class="truncate block min-w-0"
                        :placeholder="
                          carregandoFornecedores ? 'Carregando…' : 'Sem fornecedor (Avulso)'
                        "
                      />
                    </SelectTrigger>
                    <SelectContent class="max-w-[320px]">
                      <SelectItem value="none" class="cursor-pointer truncate">
                        Sem fornecedor (Avulso)
                      </SelectItem>
                      <SelectItem
                        v-for="s in fornecedoresOrdenados"
                        :key="s.id"
                        :value="String(s.id)"
                        class="cursor-pointer truncate"
                      >
                        {{ s.name }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    class="h-10 w-10 shrink-0 cursor-pointer"
                    title="Criar novo fornecedor"
                    @click="modalFornecedorAberto = true"
                  >
                    <Plus class="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="space-y-4 border-t border-border pt-6">
          <h3 class="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Preços e estoque
          </h3>

          <div class="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4">
            <div>
              <label for="produto-custo" class="mb-1.5 block text-sm font-medium text-foreground">
                Custo de compra
              </label>
              <div class="relative">
                <span
                  class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
                >
                  R$
                </span>
                <input
                  id="produto-custo"
                  :value="custo.formatted.value"
                  inputmode="decimal"
                  placeholder="0,00"
                  class="h-10 w-full cursor-text rounded-md border border-input bg-transparent py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  @input="custo.onInput"
                  @keypress="(e) => !/[0-9]/.test(e.key) && e.preventDefault()"
                />
              </div>
            </div>

            <div>
              <label for="produto-preco" class="mb-1.5 block text-sm font-medium text-foreground">
                Preço de venda <span class="text-destructive">*</span>
              </label>
              <div class="relative">
                <span
                  class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
                >
                  R$
                </span>
                <input
                  id="produto-preco"
                  :value="preco.formatted.value"
                  inputmode="decimal"
                  placeholder="0,00"
                  class="h-10 w-full cursor-text rounded-md border border-input bg-transparent py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  :aria-invalid="!!erros.sale_price"
                  :class="{ 'border-destructive': erros.sale_price }"
                  @input="preco.onInput"
                  @keypress="(e) => !/[0-9]/.test(e.key) && e.preventDefault()"
                />
              </div>
              <p v-if="erros.sale_price" class="mt-1 text-xs text-destructive">
                {{ Array.isArray(erros.sale_price) ? erros.sale_price[0] : erros.sale_price }}
              </p>
            </div>

            <div>
              <label for="produto-estoque" class="mb-1.5 block text-sm font-medium text-foreground">
                Estoque inicial
              </label>
              <input
                id="produto-estoque"
                :value="estoque.raw.value"
                inputmode="numeric"
                placeholder="0"
                class="h-10 w-full cursor-text rounded-md border border-input bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                @input="estoque.onInput"
                @keypress="(e) => !/[0-9]/.test(e.key) && e.preventDefault()"
              />
            </div>

            <div>
              <label for="produto-minimo" class="mb-1.5 block text-sm font-medium text-foreground">
                Estoque mínimo
              </label>
              <input
                id="produto-minimo"
                :value="minimo.raw.value"
                inputmode="numeric"
                placeholder="0"
                class="h-10 w-full cursor-text rounded-md border border-input bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                @input="minimo.onInput"
                @keypress="(e) => !/[0-9]/.test(e.key) && e.preventDefault()"
              />
            </div>

            <div
              v-if="margem !== null"
              class="col-span-2 md:col-span-4 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
            >
              Margem estimada:
              <span class="font-semibold" :class="margemClasse">{{ margem.toFixed(1) }}%</span>
              · lucro de {{ brl(preco.valorNumerico.value - custo.valorNumerico.value) }} por
              unidade
            </div>
          </div>
        </section>

        <section class="space-y-4 border-t border-border pt-6">
          <h3 class="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Descrição e situação
          </h3>

          <div>
            <label for="produto-descricao" class="mb-1.5 block text-sm font-medium text-foreground">
              Descrição (opcional)
            </label>
            <div class="relative">
              <Textarea
                id="produto-descricao"
                v-model="descricaoModel"
                placeholder="Observações complementares do produto…"
                class="cursor-text pr-16"
                rows="3"
                :maxlength="DESCRICAO_MAX"
              />
              <span
                class="pointer-events-none absolute bottom-2 right-3 select-none text-[11px] font-medium tabular-nums transition-colors"
                :class="
                  form.description.length >= DESCRICAO_MAX
                    ? 'text-red-500'
                    : 'text-muted-foreground/40'
                "
              >
                {{ form.description.length }}/{{ DESCRICAO_MAX }}
              </span>
            </div>
          </div>

          <div
            class="flex items-center justify-between gap-3 rounded-md border border-input px-4 py-3"
          >
            <div class="space-y-0.5">
              <label for="produto-ativo" class="text-sm font-medium text-foreground"
                >Produto ativo</label
              >
              <p class="text-xs text-muted-foreground">
                Produtos inativos ficam ocultos na PDV/vendas.
              </p>
            </div>
            <Switch
              id="produto-ativo"
              v-model="form.active"
              class="cursor-pointer data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-input"
            />
          </div>
        </section>

        <DialogFooter class="pt-3">
          <Button
            type="button"
            variant="outline"
            class="cursor-pointer"
            :disabled="saveMutation.isPending.value"
            @click="fechar"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            :disabled="saveMutation.isPending.value"
            class="cursor-pointer bg-emerald-500 font-medium text-black hover:bg-emerald-600 disabled:opacity-50"
          >
            <Loader2 v-if="saveMutation.isPending.value" class="size-4 animate-spin mr-1.5" />
            <Save v-else class="size-4 mr-1.5" />
            {{
              saveMutation.isPending.value
                ? 'Salvando…'
                : editando
                  ? 'Salvar alterações'
                  : 'Salvar produto'
            }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>

  <GroupModal v-model:open="modalGrupoAberto" @created="grupoCriado" @salvo="grupoCriado" />
  <SupplierModal
    v-model:open="modalFornecedorAberto"
    @created="fornecedorCriado"
    @salvo="fornecedorCriado"
  />
</template>
