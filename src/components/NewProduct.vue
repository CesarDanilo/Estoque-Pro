<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { Loader2, Save } from 'lucide-vue-next'

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
import { brl, grupos, marcas, subgrupos } from '@/lib/mockDataProdutos'

const props = defineProps({
  open: { type: Boolean, default: false },
  produto: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'salvo'])

const { sucesso, erro } = useFeedback()

const NOME_MAX = 120
const SKU_MAX = 30
const DESCRICAO_MAX = 500

const salvando = ref(false)
const erros = reactive({})

const form = reactive({
  nome: '',
  sku: '',
  grupo: '',
  subgrupo: '',
  marca: '',
  ativo: true,
  descricao: '',
})

const editando = computed(() => !!props.produto)

// ---- Máscara monetária (centavos) — usada em custo e preço ----
function criarMascaraMoeda(limiteDigitos = 8) {
  const raw = ref('') // dígitos puros, representando centavos

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

// ---- Máscara numérica inteira — usada em estoque e estoque mínimo ----
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

// SKU: só letras, números, hífen e underscore — maiúsculas automáticas
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
  get: () => form.nome,
  set: (v) => {
    form.nome = (v ?? '').slice(0, NOME_MAX)
  },
})

const descricaoModel = computed({
  get: () => form.descricao,
  set: (v) => {
    form.descricao = (v ?? '').slice(0, DESCRICAO_MAX)
  },
})

const subgruposFiltrados = computed(() => subgrupos.filter((s) => s.grupo === form.grupo))

const margem = computed(() => {
  const p = preco.valorNumerico.value
  const c = custo.valorNumerico.value
  return p > 0 && c > 0 ? ((p - c) / p) * 100 : null
})

function onGrupoChange(v) {
  form.grupo = v
  form.subgrupo = ''
}

watch(
  () => props.open,
  (aberto) => {
    if (!aberto) return
    preencherFormulario()
  },
)

// limpa os erros assim que o usuário corrige cada campo
watch(() => form.nome, (v) => { if (erros.nome && v.trim().length >= 3) delete erros.nome })
watch(skuModel, (v) => { if (erros.sku && v.trim()) delete erros.sku })
watch(() => form.grupo, (v) => { if (erros.grupo && v) delete erros.grupo })
watch(preco.raw, (v) => { if (erros.preco && Number(v) > 0) delete erros.preco })

function preencherFormulario() {
  const p = props.produto

  erros && Object.keys(erros).forEach((chave) => delete erros[chave])

  if (p) {
    form.nome = p.nome ?? ''
    form.sku = p.sku ?? ''
    form.grupo = p.grupo ?? ''
    form.subgrupo = p.subgrupo ?? ''
    form.marca = p.marca ?? ''
    form.ativo = p.status ? p.status === 'ativo' : true
    form.descricao = p.descricao ?? ''
    custo.setValue(p.custo)
    preco.setValue(p.preco)
    estoque.setValue(p.estoque)
    minimo.setValue(p.minimo)
  } else {
    form.nome = ''
    form.sku = ''
    form.grupo = ''
    form.subgrupo = ''
    form.marca = ''
    form.ativo = true
    form.descricao = ''
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

  if (form.nome.trim().length < 3) erros.nome = 'Informe o nome do produto.'
  if (!form.sku.trim()) erros.sku = 'Informe um código para identificar o produto.'
  if (!form.grupo) erros.grupo = 'Escolha um grupo.'
  if (!(preco.valorNumerico.value > 0)) erros.preco = 'Informe o preço de venda.'

  return Object.keys(erros).length === 0
}

function salvar() {
  if (salvando.value) return

  if (!validar()) {
    erro('Confira os campos destacados antes de salvar.')
    return
  }

  salvando.value = true
  setTimeout(() => {
    salvando.value = false
    sucesso(
      editando.value ? 'Produto atualizado' : 'Produto cadastrado',
      editando.value ? 'Produto atualizado com sucesso.' : 'Produto cadastrado com sucesso.',
    )
    emit('salvo', {
      ...form,
      custo: custo.valorNumerico.value,
      preco: preco.valorNumerico.value,
      estoque: Number(estoque.raw.value),
      minimo: Number(minimo.raw.value),
    })
    emit('update:open', false)
  }, 900)
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
        <!-- Identificação -->
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
                  placeholder="Ex.: Arroz Branco Tipo 1 — 5kg"
                  :maxlength="NOME_MAX"
                  class="h-10 cursor-text pr-14"
                  :aria-invalid="!!erros.nome"
                />
                <span
                  class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 select-none text-[11px] font-medium tabular-nums transition-colors"
                  :class="form.nome.length >= NOME_MAX ? 'text-red-500' : 'text-muted-foreground/40'"
                >
                  {{ form.nome.length }}/{{ NOME_MAX }}
                </span>
              </div>
              <p v-if="erros.nome" class="mt-1 text-xs text-destructive">{{ erros.nome }}</p>
            </div>

            <div class="grid grid-cols-4 gap-x-6">
              <div>
                <label for="produto-sku" class="mb-1.5 block text-sm font-medium text-foreground">
                  Código (SKU) <span class="text-destructive">*</span>
                </label>
                <div class="relative">
                  <Input
                    id="produto-sku"
                    v-model="skuModel"
                    placeholder="MER-0101"
                    :maxlength="SKU_MAX"
                    class="h-10 cursor-text pr-12 uppercase"
                    :aria-invalid="!!erros.sku"
                  />
                  <span
                    class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 select-none text-[10px] font-medium tabular-nums transition-colors"
                    :class="form.sku.length >= SKU_MAX ? 'text-red-500' : 'text-muted-foreground/40'"
                  >
                    {{ form.sku.length }}/{{ SKU_MAX }}
                  </span>
                </div>
                <p v-if="erros.sku" class="mt-1 text-xs text-destructive">{{ erros.sku }}</p>
                <p v-else class="mt-1 text-xs text-muted-foreground">Usado na busca rápida da venda.</p>
              </div>

              <div>
                <label for="produto-marca" class="mb-1.5 block text-sm font-medium text-foreground">
                  Marca
                </label>
                <Select v-model="form.marca">
                  <SelectTrigger id="produto-marca" class="h-10 w-full cursor-pointer">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="m in marcas" :key="m.id" :value="m.nome" class="cursor-pointer">
                      {{ m.nome }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label for="produto-grupo" class="mb-1.5 block text-sm font-medium text-foreground">
                  Grupo <span class="text-destructive">*</span>
                </label>
                <Select :model-value="form.grupo" @update:model-value="onGrupoChange">
                  <SelectTrigger id="produto-grupo" class="h-10 w-full cursor-pointer" :aria-invalid="!!erros.grupo">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="g in grupos" :key="g.id" :value="g.nome" class="cursor-pointer">
                      {{ g.nome }}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p v-if="erros.grupo" class="mt-1 text-xs text-destructive">{{ erros.grupo }}</p>
              </div>

              <div>
                <label for="produto-subgrupo" class="mb-1.5 block text-sm font-medium text-foreground">
                  Subgrupo
                </label>
                <Select v-model="form.subgrupo" :disabled="!form.grupo">
                  <SelectTrigger id="produto-subgrupo" class="h-10 w-full cursor-pointer">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      v-for="s in subgruposFiltrados"
                      :key="s.id"
                      :value="s.nome"
                      class="cursor-pointer"
                    >
                      {{ s.nome }}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p v-if="!form.grupo" class="mt-1 text-xs text-muted-foreground">Escolha um grupo primeiro.</p>
              </div>
            </div>
          </div>
        </section>

        <!-- Preços e estoque -->
        <section class="space-y-4 border-t border-border pt-6">
          <h3 class="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Preços e estoque
          </h3>

          <div class="grid grid-cols-4 gap-x-6 gap-y-4">
            <div>
              <label for="produto-custo" class="mb-1.5 block text-sm font-medium text-foreground">
                Custo de compra
              </label>
              <div class="relative">
                <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
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
                <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  R$
                </span>
                <input
                  id="produto-preco"
                  :value="preco.formatted.value"
                  inputmode="decimal"
                  placeholder="0,00"
                  class="h-10 w-full cursor-text rounded-md border border-input bg-transparent py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  :aria-invalid="!!erros.preco"
                  :class="{ 'border-destructive': erros.preco }"
                  @input="preco.onInput"
                  @keypress="(e) => !/[0-9]/.test(e.key) && e.preventDefault()"
                />
              </div>
              <p v-if="erros.preco" class="mt-1 text-xs text-destructive">{{ erros.preco }}</p>
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
              <p class="mt-1 text-xs text-muted-foreground">Entradas futuras vêm das compras.</p>
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
              <p class="mt-1 text-xs text-muted-foreground">Avisamos quando chegar nesse número.</p>
            </div>

            <div
              v-if="margem !== null"
              class="col-span-4 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
            >
              Margem estimada:
              <span class="font-semibold text-primary">{{ margem.toFixed(1) }}%</span>
              · lucro de {{ brl(preco.valorNumerico.value - custo.valorNumerico.value) }} por unidade
            </div>
          </div>
        </section>

        <!-- Descrição e situação -->
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
                placeholder="Informações que ajudam quem vende: tamanho, sabor, embalagem…"
                class="cursor-text pr-16"
                rows="3"
                :maxlength="DESCRICAO_MAX"
              />
              <span
                class="pointer-events-none absolute bottom-2 right-3 select-none text-[11px] font-medium tabular-nums transition-colors"
                :class="form.descricao.length >= DESCRICAO_MAX ? 'text-red-500' : 'text-muted-foreground/40'"
              >
                {{ form.descricao.length }}/{{ DESCRICAO_MAX }}
              </span>
            </div>
          </div>

          <div class="flex items-center justify-between gap-3 rounded-md border border-input px-4 py-3">
            <div class="space-y-0.5">
              <label for="produto-ativo" class="text-sm font-medium text-foreground">Produto ativo</label>
              <p class="text-xs text-muted-foreground">Produtos inativos não aparecem em novas vendas.</p>
            </div>
            <Switch
              id="produto-ativo"
              v-model="form.ativo"
              class="cursor-pointer data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-input"
            />
          </div>
        </section>

        <DialogFooter class="pt-3">
          <Button type="button" variant="outline" class="cursor-pointer" @click="fechar">Cancelar</Button>
          <Button
            type="submit"
            :disabled="salvando"
            class="cursor-pointer bg-emerald-500 text-black hover:bg-emerald-600"
          >
            <Loader2 v-if="salvando" class="size-4 animate-spin" />
            <Save v-else class="size-4" />
            {{ salvando ? 'Salvando…' : editando ? 'Salvar alterações' : 'Salvar produto' }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>