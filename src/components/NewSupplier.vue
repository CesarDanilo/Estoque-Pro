<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { Info, Loader2, Save, Search } from 'lucide-vue-next'

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
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'

import { useFeedback } from '@/composables/useFeedBack'

const props = defineProps({
  open: { type: Boolean, default: false },
  fornecedor: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'salvo'])

const { sucesso, erro, info } = useFeedback()

const NOME_MAX = 100
const NOME_FANTASIA_MAX = 100
const CONTATO_MAX = 60
const OBS_MAX = 500

const salvando = ref(false)
const buscandoCep = ref(false)
const erros = reactive({})

const form = reactive({
  nome: '',
  nomeFantasia: '',
  documento: '',
  ie: '',
  contato: '',
  telefone: '',
  email: '',
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  uf: '',
  observacoes: '',
  ativo: true,
})

const editando = computed(() => !!props.fornecedor)

// ---- Models Computados ----
const nomeModel = computed({
  get: () => form.nome,
  set: (v) => {
    form.nome = (v ?? '').slice(0, NOME_MAX)
  },
})

const nomeFantasiaModel = computed({
  get: () => form.nomeFantasia,
  set: (v) => {
    form.nomeFantasia = (v ?? '').slice(0, NOME_FANTASIA_MAX)
  },
})

const contatoModel = computed({
  get: () => form.contato,
  set: (v) => {
    form.contato = (v ?? '').slice(0, CONTATO_MAX)
  },
})

const obsModel = computed({
  get: () => form.observacoes,
  set: (v) => {
    form.observacoes = (v ?? '').slice(0, OBS_MAX)
  },
})

// ---- Máscaras e Formatações ----
function aplicarMascaraDocumento(v) {
  const nums = v.replace(/\D/g, '').slice(0, 14)
  if (nums.length <= 11) {
    return nums
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
  }
  return nums
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

function aplicarMascaraTelefone(v) {
  const nums = v.replace(/\D/g, '').slice(0, 11)
  if (nums.length <= 10) {
    return nums
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2')
  }
  return nums
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
}

function aplicarMascaraCep(v) {
  const nums = v.replace(/\D/g, '').slice(0, 8)
  return nums.replace(/^(\d{5})(\d)/, '$1-$2')
}

// Watchers de formatação
watch(
  () => form.documento,
  (v) => {
    form.documento = aplicarMascaraDocumento(v)
    if (erros.documento && v.replace(/\D/g, '').length >= 11) delete erros.documento
  },
)

watch(
  () => form.telefone,
  (v) => {
    form.telefone = aplicarMascaraTelefone(v)
    if (erros.telefone && v.replace(/\D/g, '').length >= 10) delete erros.telefone
  },
)

watch(
  () => form.cep,
  (v) => {
    const cepFormatado = aplicarMascaraCep(v)
    form.cep = cepFormatado
    const limpo = cepFormatado.replace(/\D/g, '')
    if (limpo.length === 8) {
      buscarEnderecoPorCep(limpo)
    }
  },
)

watch(
  () => form.nome,
  (v) => {
    if (erros.nome && v.trim().length >= 3) delete erros.nome
  },
)

watch(
  () => form.email,
  () => {
    if (erros.email) delete erros.email
  },
)

// ---- Consulta CEP ----
async function buscarEnderecoPorCep(cepLimpo) {
  buscandoCep.value = true
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`)
    const data = await res.json()

    if (data.erro) {
      erro('CEP não encontrado.')
      return
    }

    form.logradouro = data.logradouro ?? ''
    form.bairro = data.bairro ?? ''
    form.cidade = data.localidade ?? ''
    form.uf = data.uf ?? ''
    info('Endereço preenchido automaticamente.')
  } catch {
    erro('Não foi possível buscar o CEP automaticamente.')
  } finally {
    buscandoCep.value = false
  }
}

// ---- Ciclo de Vida ----
watch(
  () => props.open,
  (aberto) => {
    if (!aberto) return
    preencherFormulario()
  },
)

function preencherFormulario() {
  const f = props.fornecedor
  Object.keys(erros).forEach((chave) => delete erros[chave])

  if (f) {
    form.nome = f.nome ?? ''
    form.nomeFantasia = f.nomeFantasia ?? ''
    form.documento = f.documento ?? ''
    form.ie = f.ie ?? ''
    form.contato = f.contato ?? ''
    form.telefone = f.telefone ?? ''
    form.email = f.email ?? ''
    form.cep = f.cep ?? ''
    form.logradouro = f.logradouro ?? ''
    form.numero = f.numero ?? ''
    form.complemento = f.complemento ?? ''
    form.bairro = f.bairro ?? ''
    form.cidade = f.cidade ?? ''
    form.uf = f.uf ?? ''
    form.observacoes = f.observacoes ?? ''
    form.ativo = f.status ? f.status === 'ativo' : true
  } else {
    form.nome = ''
    form.nomeFantasia = ''
    form.documento = ''
    form.ie = ''
    form.contato = ''
    form.telefone = ''
    form.email = ''
    form.cep = ''
    form.logradouro = ''
    form.numero = ''
    form.complemento = ''
    form.bairro = ''
    form.cidade = ''
    form.uf = ''
    form.observacoes = ''
    form.ativo = true
  }
}

function fechar() {
  emit('update:open', false)
}

function validar() {
  Object.keys(erros).forEach((chave) => delete erros[chave])

  if (form.nome.trim().length < 3) {
    erros.nome = 'Informe a razão social ou nome do fornecedor.'
  }

  const docLimpo = form.documento.replace(/\D/g, '')
  if (!docLimpo) {
    erros.documento = 'Informe o CNPJ ou CPF.'
  } else if (docLimpo.length !== 11 && docLimpo.length !== 14) {
    erros.documento = 'Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.'
  }

  const telLimpo = form.telefone.replace(/\D/g, '')
  if (!telLimpo) {
    erros.telefone = 'Informe um telefone ou WhatsApp.'
  } else if (telLimpo.length < 10) {
    erros.telefone = 'Telefone inválido.'
  }

  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    erros.email = 'E-mail informado é inválido.'
  }

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
      editando.value ? 'Fornecedor atualizado' : 'Fornecedor cadastrado',
      editando.value
        ? 'Fornecedor atualizado com sucesso.'
        : 'Fornecedor cadastrado com sucesso.',
    )
    emit('salvo', {
      ...form,
      status: form.ativo ? 'ativo' : 'inativo',
    })
    emit('update:open', false)
  }, 900)
}
</script>

<template>
  <Dialog :open="open" @update:open="(v) => emit('update:open', v)">
    <DialogContent class="w-full max-w-[95vw] p-4 sm:p-6 lg:max-w-[1280px] max-h-[92vh] overflow-y-auto">
      <DialogHeader class="space-y-0.5 pb-2 border-b border-border">
        <DialogTitle class="text-lg font-semibold tracking-tight sm:text-xl">
          {{ editando ? 'Editar fornecedor' : 'Novo fornecedor' }}
        </DialogTitle>
        <DialogDescription class="text-xs sm:text-sm text-muted-foreground">
          Os campos marcados com <span class="text-destructive">*</span> são obrigatórios.
        </DialogDescription>
      </DialogHeader>

      <form class="space-y-4 pt-3" @submit.prevent="salvar">
        <section class="space-y-2.5">
          <h3 class="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Identificação
          </h3>

          <div class="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-6 lg:grid-cols-12">
            <div class="col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-4">
              <label for="fornecedor-nome" class="mb-1 block text-xs font-medium text-foreground">
                Razão Social / Nome <span class="text-destructive">*</span>
              </label>
              <div class="relative">
                <Input
                  id="fornecedor-nome"
                  v-model="nomeModel"
                  placeholder="Ex.: Distribuidora de Alimentos Silva Ltda"
                  :maxlength="NOME_MAX"
                  class="h-9 text-xs cursor-text pr-12"
                  :aria-invalid="!!erros.nome"
                  :class="{ 'border-destructive focus-visible:ring-destructive': erros.nome }"
                />
                <span
                  class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 select-none text-[10px] font-medium tabular-nums transition-colors"
                  :class="form.nome.length >= NOME_MAX ? 'text-red-500' : 'text-muted-foreground/40'"
                >
                  {{ form.nome.length }}/{{ NOME_MAX }}
                </span>
              </div>
              <p v-if="erros.nome" class="mt-0.5 text-[11px] text-destructive font-medium">{{ erros.nome }}</p>
            </div>

            <div class="col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-3">
              <label for="fornecedor-fantasia" class="mb-1 block text-xs font-medium text-foreground">
                Nome Fantasia
              </label>
              <Input
                id="fornecedor-fantasia"
                v-model="nomeFantasiaModel"
                placeholder="Ex.: Distribuidora Silva"
                :maxlength="NOME_FANTASIA_MAX"
                class="h-9 text-xs cursor-text"
              />
            </div>

            <div class="col-span-1 sm:col-span-1 md:col-span-2 lg:col-span-2">
              <label for="fornecedor-documento" class="mb-1 block text-xs font-medium text-foreground">
                CNPJ / CPF <span class="text-destructive">*</span>
              </label>
              <Input
                id="fornecedor-documento"
                v-model="form.documento"
                placeholder="00.000.000/0000-00"
                class="h-9 text-xs cursor-text"
                :aria-invalid="!!erros.documento"
                :class="{ 'border-destructive focus-visible:ring-destructive': erros.documento }"
              />
              <p v-if="erros.documento" class="mt-0.5 text-[11px] text-destructive font-medium">{{ erros.documento }}</p>
            </div>

            <div class="col-span-1 sm:col-span-1 md:col-span-2 lg:col-span-1.5">
              <label for="fornecedor-ie" class="mb-1 block text-xs font-medium text-foreground">
                Inscrição Estadual
              </label>
              <Input
                id="fornecedor-ie"
                v-model="form.ie"
                placeholder="Isento / Nº IE"
                class="h-9 text-xs cursor-text"
              />
            </div>

            <div class="col-span-1 sm:col-span-2 md:col-span-2 lg:col-span-1.5">
              <label for="fornecedor-contato" class="mb-1 block text-xs font-medium text-foreground">
                Contato
              </label>
              <Input
                id="fornecedor-contato"
                v-model="contatoModel"
                placeholder="Ex.: Carlos (Vendas)"
                :maxlength="CONTATO_MAX"
                class="h-9 text-xs cursor-text"
              />
            </div>
          </div>
        </section>

        <section class="space-y-2.5 border-t border-border pt-3">
          <h3 class="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Contato e Endereço
          </h3>

          <div class="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-6 lg:grid-cols-12">
            <div class="col-span-1 sm:col-span-1 md:col-span-3 lg:col-span-3">
              <label for="fornecedor-telefone" class="mb-1 block text-xs font-medium text-foreground">
                Telefone / WhatsApp <span class="text-destructive">*</span>
              </label>
              <Input
                id="fornecedor-telefone"
                v-model="form.telefone"
                placeholder="(00) 00000-0000"
                class="h-9 text-xs cursor-text"
                :aria-invalid="!!erros.telefone"
                :class="{ 'border-destructive focus-visible:ring-destructive': erros.telefone }"
              />
              <p v-if="erros.telefone" class="mt-0.5 text-[11px] text-destructive font-medium">{{ erros.telefone }}</p>
            </div>

            <div class="col-span-1 sm:col-span-1 md:col-span-3 lg:col-span-3">
              <label for="fornecedor-email" class="mb-1 block text-xs font-medium text-foreground">
                E-mail
              </label>
              <Input
                id="fornecedor-email"
                v-model="form.email"
                type="email"
                placeholder="vendas@fornecedor.com.br"
                class="h-9 text-xs cursor-text"
                :aria-invalid="!!erros.email"
                :class="{ 'border-destructive focus-visible:ring-destructive': erros.email }"
              />
              <p v-if="erros.email" class="mt-0.5 text-[11px] text-destructive font-medium">{{ erros.email }}</p>
            </div>

            <div class="col-span-1 sm:col-span-1 md:col-span-2 lg:col-span-2">
              <label for="fornecedor-cep" class="mb-1 block text-xs font-medium text-foreground">
                CEP
              </label>
              <div class="relative">
                <Input
                  id="fornecedor-cep"
                  v-model="form.cep"
                  placeholder="00000-000"
                  class="h-9 text-xs cursor-text pr-8"
                />
                <Loader2 v-if="buscandoCep" class="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 animate-spin text-muted-foreground" />
                <Search v-else class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/40" />
              </div>
            </div>

            <div class="col-span-1 sm:col-span-1 md:col-span-4 lg:col-span-4">
              <label for="fornecedor-logradouro" class="mb-1 block text-xs font-medium text-foreground">
                Logradouro
              </label>
              <Input
                id="fornecedor-logradouro"
                v-model="form.logradouro"
                placeholder="Rua, Avenida, Alameda..."
                class="h-9 text-xs cursor-text"
              />
            </div>

            <div class="col-span-1 sm:col-span-1 md:col-span-2 lg:col-span-2">
              <label for="fornecedor-numero" class="mb-1 block text-xs font-medium text-foreground">
                Número
              </label>
              <Input
                id="fornecedor-numero"
                v-model="form.numero"
                placeholder="Ex.: 1020"
                class="h-9 text-xs cursor-text"
              />
            </div>

            <div class="col-span-1 sm:col-span-1 md:col-span-2 lg:col-span-3">
              <label for="fornecedor-complemento" class="mb-1 block text-xs font-medium text-foreground">
                Complemento
              </label>
              <Input
                id="fornecedor-complemento"
                v-model="form.complemento"
                placeholder="Galpão 3, Sala 12"
                class="h-9 text-xs cursor-text"
              />
            </div>

            <div class="col-span-1 sm:col-span-1 md:col-span-2 lg:col-span-3">
              <label for="fornecedor-bairro" class="mb-1 block text-xs font-medium text-foreground">
                Bairro
              </label>
              <Input
                id="fornecedor-bairro"
                v-model="form.bairro"
                placeholder="Ex.: Bairro Industrial"
                class="h-9 text-xs cursor-text"
              />
            </div>

            <div class="col-span-1 sm:col-span-1 md:col-span-4 lg:col-span-3">
              <label for="fornecedor-cidade" class="mb-1 block text-xs font-medium text-foreground">
                Cidade
              </label>
              <Input
                id="fornecedor-cidade"
                v-model="form.cidade"
                placeholder="Ex.: São Paulo"
                class="h-9 text-xs cursor-text"
              />
            </div>

            <div class="col-span-1 sm:col-span-1 md:col-span-2 lg:col-span-1">
              <label for="fornecedor-uf" class="mb-1 block text-xs font-medium text-foreground">
                UF
              </label>
              <Input
                id="fornecedor-uf"
                v-model="form.uf"
                placeholder="SP"
                maxlength="2"
                class="h-9 text-xs cursor-text uppercase"
              />
            </div>
          </div>
        </section>

        <section class="space-y-3 border-t border-border pt-3">
          <div class="grid grid-cols-1 gap-3 lg:grid-cols-12 lg:items-start">
            <div class="col-span-1 lg:col-span-8">
              <label for="fornecedor-obs" class="mb-1 block text-xs font-medium text-foreground">
                Observações Internas (opcional)
              </label>
              <div class="relative">
                <Textarea
                  id="fornecedor-obs"
                  v-model="obsModel"
                  placeholder="Anotações comerciais, dias preferenciais de entrega ou avisos…"
                  class="cursor-text pr-14 text-xs min-h-[58px]"
                  rows="2"
                  :maxlength="OBS_MAX"
                />
                <span
                  class="pointer-events-none absolute bottom-1.5 right-2.5 select-none text-[10px] font-medium tabular-nums transition-colors"
                  :class="form.observacoes.length >= OBS_MAX ? 'text-red-500' : 'text-muted-foreground/40'"
                >
                  {{ form.observacoes.length }}/{{ OBS_MAX }}
                </span>
              </div>
            </div>

            <div class="col-span-1 space-y-2 lg:col-span-4 lg:mt-5">
              <div class="flex items-center justify-between gap-3 rounded-md border border-input px-3 py-2">
                <div class="space-y-0.5">
                  <label for="fornecedor-ativo" class="text-xs font-medium text-foreground cursor-pointer block">
                    Fornecedor ativo
                  </label>
                  <p class="text-[10px] text-muted-foreground leading-none">
                    Oculto em novas compras se inativo.
                  </p>
                </div>
                <Switch
                  id="fornecedor-ativo"
                  v-model="form.ativo"
                  class="cursor-pointer data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-input scale-90"
                />
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2 rounded-md border border-border bg-surface-2 px-3 py-1.5 text-[11px] text-muted-foreground">
            <Info class="size-3.5 shrink-0 text-emerald-500" />
            <p class="truncate">
              Condições de pagamento, dados bancários e histórico de compras podem ser ajustados na página de detalhes.
            </p>
          </div>
        </section>

        <DialogFooter class="pt-2 flex flex-col-reverse sm:flex-row gap-2 justify-end border-t border-border">
          <Button type="button" variant="outline" class="cursor-pointer h-9 text-xs w-full sm:w-auto" :disabled="salvando" @click="fechar">
            Cancelar
          </Button>
          <Button
            type="submit"
            :disabled="salvando"
            class="cursor-pointer h-9 text-xs bg-emerald-500 text-black hover:bg-emerald-600 w-full sm:w-auto min-w-[130px]"
          >
            <Loader2 v-if="salvando" class="size-3.5 animate-spin mr-1.5" />
            <Save v-else class="size-3.5 mr-1.5" />
            {{ salvando ? 'Salvando…' : editando ? 'Salvar alterações' : 'Salvar fornecedor' }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>