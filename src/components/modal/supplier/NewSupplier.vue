<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { Info, Loader2, Save } from 'lucide-vue-next'

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
import { supplierService } from '@/services/supplierService'

const props = defineProps({
  open: { type: Boolean, default: false },
  fornecedor: { type: Object, default: null },
})

const emit = defineEmits(['update:open'])

const queryClient = useQueryClient()
const { sucesso, erro, info } = useFeedback()

// ---- Limites Máximos de Caracteres ----
const NOME_MAX = 100
const NOME_FANTASIA_MAX = 100
const DOCUMENTO_MAX = 18 // CNPJ Formatado: 00.000.000/0000-00
const IE_MAX = 20
const CONTATO_MAX = 60
const TELEFONE_MAX = 15 // Formatado: (00) 00000-0000
const EMAIL_MAX = 100
const CEP_MAX = 9 // Formatado: 00000-000
const LOGRADOURO_MAX = 120
const NUMERO_MAX = 15
const COMPLEMENTO_MAX = 50
const BAIRRO_MAX = 60
const CIDADE_MAX = 60
const OBS_MAX = 500

const buscandoCep = ref(false)
const erros = reactive({})

const form = reactive({
  nome: '',
  nomeFantasia: '',
  contato: '',
  email: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  uf: '',
  observacoes: '',
  ativo: true,
})

const documentoRaw = ref('')
const ieRaw = ref('')
const telefoneRaw = ref('')
const cepRaw = ref('')

// ---- Estado Inicial para Comparação (Dirty State) ----
const snapshotInicial = ref('')

function obterSnapshotAtual() {
  return JSON.stringify({
    form,
    documentoRaw: documentoRaw.value,
    ieRaw: ieRaw.value,
    telefoneRaw: telefoneRaw.value,
    cepRaw: cepRaw.value,
  })
}

const formAlterado = computed(() => {
  return obterSnapshotAtual() !== snapshotInicial.value
})

function aplicarMascaraDocumento(v) {
  const nums = (v ?? '').replace(/\D/g, '').slice(0, 14)
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
  const nums = (v ?? '').replace(/\D/g, '').slice(0, 11)
  if (nums.length <= 10) {
    return nums.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2')
  }
  return nums.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2')
}

function aplicarMascaraCep(v) {
  const nums = (v ?? '').replace(/\D/g, '').slice(0, 8)
  return nums.replace(/^(\d{5})(\d)/, '$1-$2')
}

const documentoFormatted = computed(() => aplicarMascaraDocumento(documentoRaw.value))
const telefoneFormatted = computed(() => aplicarMascaraTelefone(telefoneRaw.value))
const cepFormatted = computed(() => aplicarMascaraCep(cepRaw.value))
const ieFormatted = computed(() => ieRaw.value)

function onInputDocumento(e) {
  const digitos = (e.target.value ?? '').replace(/\D/g, '').slice(0, 14)
  documentoRaw.value = digitos
  e.target.value = aplicarMascaraDocumento(digitos)
  if (erros.documento && digitos.length >= 11) delete erros.documento
}

function onInputIe(e) {
  const digitos = (e.target.value ?? '').replace(/\D/g, '').slice(0, IE_MAX)
  ieRaw.value = digitos
  e.target.value = digitos
}

function onInputTelefone(e) {
  const digitos = (e.target.value ?? '').replace(/\D/g, '').slice(0, 11)
  telefoneRaw.value = digitos
  e.target.value = aplicarMascaraTelefone(digitos)
  if (erros.telefone && digitos.length >= 10) delete erros.telefone
}

function onInputCep(e) {
  const digitos = (e.target.value ?? '').replace(/\D/g, '').slice(0, 8)
  cepRaw.value = digitos
  e.target.value = aplicarMascaraCep(digitos)
  if (digitos.length === 8) {
    buscarEnderecoPorCep(digitos)
  }
}

const editando = computed(() => !!props.fornecedor)

// ---- TanStack Mutation: Salvar / Atualizar ----
const saveMutation = useMutation({
  mutationFn: (payload) => {
    if (editando.value) {
      return supplierService.update(props.fornecedor.id, payload)
    }
    return supplierService.create(payload)
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['suppliers'] })
    sucesso(
      editando.value ? 'Fornecedor atualizado' : 'Fornecedor cadastrado',
      editando.value ? 'Fornecedor atualizado com sucesso.' : 'Fornecedor cadastrado com sucesso.',
    )
    fechar()
  },
  onError: (err) => {
    if (err.response?.status === 422 && err.response.data?.errors) {
      const apiErrors = err.response.data.errors
      Object.keys(apiErrors).forEach((key) => {
        erros[key] = apiErrors[key][0]
      })
      erro('Verifique os campos com erro de validação.')
    } else {
      erro('Erro ao salvar', err.response?.data?.message || 'Não foi possível salvar os dados.')
    }
  },
})

const salvando = computed(() => saveMutation.isPending.value)

// ---- Validação do Formulário ----
const formPreenchido = computed(() => {
  return (
    form.nome.trim() !== '' ||
    form.nomeFantasia.trim() !== '' ||
    documentoRaw.value !== '' ||
    ieRaw.value !== '' ||
    form.contato.trim() !== '' ||
    telefoneRaw.value !== '' ||
    form.email.trim() !== '' ||
    cepRaw.value !== '' ||
    form.logradouro.trim() !== '' ||
    form.numero.trim() !== '' ||
    form.complemento.trim() !== '' ||
    form.bairro.trim() !== '' ||
    form.cidade.trim() !== '' ||
    form.uf.trim() !== '' ||
    form.observacoes.trim() !== ''
  )
})

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

const emailModel = computed({
  get: () => form.email,
  set: (v) => {
    form.email = (v ?? '').trim().slice(0, EMAIL_MAX)
  },
})

const logradouroModel = computed({
  get: () => form.logradouro,
  set: (v) => {
    form.logradouro = (v ?? '').slice(0, LOGRADOURO_MAX)
  },
})

const numeroModel = computed({
  get: () => form.numero,
  set: (v) => {
    form.numero = (v ?? '').slice(0, NUMERO_MAX)
  },
})

const complementoModel = computed({
  get: () => form.complemento,
  set: (v) => {
    form.complemento = (v ?? '').slice(0, COMPLEMENTO_MAX)
  },
})

const bairroModel = computed({
  get: () => form.bairro,
  set: (v) => {
    form.bairro = (v ?? '').slice(0, BAIRRO_MAX)
  },
})

const cidadeModel = computed({
  get: () => form.cidade,
  set: (v) => {
    form.cidade = (v ?? '').slice(0, CIDADE_MAX)
  },
})

const obsModel = computed({
  get: () => form.observacoes,
  set: (v) => {
    form.observacoes = (v ?? '').slice(0, OBS_MAX)
  },
})

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

// ---- Consulta CEP via ViaCEP ----
async function buscarEnderecoPorCep(cepLimpo) {
  buscandoCep.value = true
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`)
    const data = await res.json()

    if (data.erro) {
      erro('CEP não encontrado.')
      return
    }

    form.logradouro = (data.logradouro ?? '').slice(0, LOGRADOURO_MAX)
    form.bairro = (data.bairro ?? '').slice(0, BAIRRO_MAX)
    form.cidade = (data.localidade ?? '').slice(0, CIDADE_MAX)
    form.uf = (data.uf ?? '').toUpperCase().slice(0, 2)
    info('Endereço preenchido automaticamente.')
  } catch {
    erro('Não foi possível buscar o CEP automaticamente.')
  } finally {
    buscandoCep.value = false
  }
}

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
    form.nome = f.name || f.nome || ''
    form.nomeFantasia = f.trade_name || f.nomeFantasia || ''
    form.contato = f.contact_person || f.contato || ''
    form.email = f.email || ''
    form.logradouro = f.street || f.logradouro || ''
    form.numero = f.number || f.numero || ''
    form.complemento = f.complement || f.complemento || ''
    form.bairro = f.neighborhood || f.bairro || ''
    form.cidade = f.city || f.cidade || ''
    form.uf = f.state || f.uf || ''
    form.observacoes = f.notes || f.observacoes || ''
    form.ativo = f.active !== undefined ? f.active : f.status === 'ativo'

    // Aceita tanto o formato antigo (document) quanto o novo (cnpj/cpf)
    // vindos da API, para não quebrar ao carregar registros já existentes.
    documentoRaw.value = (f.cnpj || f.cpf || f.document || f.documento || '')
      .replace(/\D/g, '')
      .slice(0, 14)
    ieRaw.value = (f.state_registration || f.ie || '').replace(/\D/g, '').slice(0, IE_MAX)
    telefoneRaw.value = (f.phone || f.telefone || '').replace(/\D/g, '').slice(0, 11)
    cepRaw.value = (f.zip_code || f.cep || '').replace(/\D/g, '').slice(0, 8)
  } else {
    form.nome = ''
    form.nomeFantasia = ''
    form.contato = ''
    form.email = ''
    form.logradouro = ''
    form.numero = ''
    form.complemento = ''
    form.bairro = ''
    form.cidade = ''
    form.uf = ''
    form.observacoes = ''
    form.ativo = true

    documentoRaw.value = ''
    ieRaw.value = ''
    telefoneRaw.value = ''
    cepRaw.value = ''
  }

  // Captura o snapshot inicial após preencher todos os dados
  snapshotInicial.value = obterSnapshotAtual()
}

function fechar() {
  emit('update:open', false)
}

function validar() {
  Object.keys(erros).forEach((chave) => delete erros[chave])

  if (form.nome.trim().length < 3) {
    erros.nome = 'Informe a razão social ou nome do fornecedor.'
  }

  if (!documentoRaw.value) {
    erros.documento = 'Informe o CNPJ ou CPF.'
  } else if (documentoRaw.value.length !== 11 && documentoRaw.value.length !== 14) {
    erros.documento = 'Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.'
  }

  if (!telefoneRaw.value) {
    erros.telefone = 'Informe um telefone ou WhatsApp.'
  } else if (telefoneRaw.value.length < 10) {
    erros.telefone = 'Telefone inválido.'
  }

  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    erros.email = 'E-mail informado é inválido.'
  }

  return Object.keys(erros).length === 0
}

function salvar() {
  if (salvando.value || !formPreenchido.value || !formAlterado.value) return

  if (!validar()) {
    erro('Confira os campos destacados antes de salvar.')
    return
  }

  // 🔴 CORRIGIDO: o backend valida os campos "cnpj" (14 dígitos) e "cpf"
  // (11 dígitos) separadamente — não "document". Enviamos o valor no campo
  // correto de acordo com o tamanho do documento digitado.
  const ehCnpj = documentoRaw.value.length === 14
  const ehCpf = documentoRaw.value.length === 11

  const payload = {
    name: form.nome,
    trade_name: form.nomeFantasia,
    cnpj: ehCnpj ? documentoRaw.value : null,
    cpf: ehCpf ? documentoRaw.value : null,
    state_registration: ieRaw.value,
    contact_person: form.contato,
    phone: telefoneRaw.value,
    email: form.email,
    zip_code: cepRaw.value,
    street: form.logradouro,
    number: form.numero,
    complement: form.complemento,
    neighborhood: form.bairro,
    city: form.cidade,
    state: form.uf,
    notes: form.observacoes,
    active: form.ativo,
  }

  saveMutation.mutate(payload)
}
</script>

<template>
  <Dialog :open="open" @update:open="(v) => emit('update:open', v)">
    <DialogContent
      class="w-full max-w-[95vw] p-4 sm:p-6 lg:max-w-[1280px] max-h-[92vh] overflow-y-auto"
    >
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
                  :class="
                    form.nome.length >= NOME_MAX ? 'text-red-500' : 'text-muted-foreground/40'
                  "
                >
                  {{ form.nome.length }}/{{ NOME_MAX }}
                </span>
              </div>
              <p v-if="erros.nome" class="mt-0.5 text-[11px] text-destructive font-medium">
                {{ erros.nome }}
              </p>
            </div>

            <div class="col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-3">
              <label
                for="fornecedor-fantasia"
                class="mb-1 block text-xs font-medium text-foreground"
              >
                Nome Fantasia
              </label>
              <div class="relative">
                <Input
                  id="fornecedor-fantasia"
                  v-model="nomeFantasiaModel"
                  placeholder="Ex.: Distribuidora Silva"
                  :maxlength="NOME_FANTASIA_MAX"
                  class="h-9 text-xs cursor-text pr-12"
                />
                <span
                  class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 select-none text-[10px] font-medium tabular-nums transition-colors"
                  :class="
                    form.nomeFantasia.length >= NOME_FANTASIA_MAX
                      ? 'text-red-500'
                      : 'text-muted-foreground/40'
                  "
                >
                  {{ form.nomeFantasia.length }}/{{ NOME_FANTASIA_MAX }}
                </span>
              </div>
            </div>

            <div class="col-span-1 sm:col-span-1 md:col-span-2 lg:col-span-2">
              <label
                for="fornecedor-documento"
                class="mb-1 block text-xs font-medium text-foreground"
              >
                CNPJ / CPF <span class="text-destructive">*</span>
              </label>
              <div class="relative">
                <input
                  id="fornecedor-documento"
                  :value="documentoFormatted"
                  :maxlength="DOCUMENTO_MAX"
                  inputmode="numeric"
                  autocomplete="off"
                  placeholder="00.000.000/0000-00"
                  class="h-9 w-full cursor-text rounded-md border border-input bg-transparent px-3 pr-12 text-xs outline-none focus:ring-2 focus:ring-ring"
                  :aria-invalid="!!erros.documento"
                  :class="{ 'border-destructive focus-visible:ring-destructive': erros.documento }"
                  @input="onInputDocumento"
                  @keypress="
                    (e) => {
                      if (!/[0-9]/.test(e.key)) e.preventDefault()
                    }
                  "
                  @paste="
                    (e) => {
                      e.preventDefault()
                      onInputDocumento({ target: { value: e.clipboardData.getData('text') || '' } })
                    }
                  "
                />
                <span
                  class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 select-none text-[10px] font-medium tabular-nums transition-colors"
                  :class="
                    documentoFormatted.length >= DOCUMENTO_MAX
                      ? 'text-red-500'
                      : 'text-muted-foreground/40'
                  "
                >
                  {{ documentoFormatted.length }}/{{ DOCUMENTO_MAX }}
                </span>
              </div>
              <p v-if="erros.documento" class="mt-0.5 text-[11px] text-destructive font-medium">
                {{ erros.documento }}
              </p>
            </div>

            <div class="col-span-1 sm:col-span-1 md:col-span-2 lg:col-span-1.5">
              <label for="fornecedor-ie" class="mb-1 block text-xs font-medium text-foreground">
                Inscrição Estadual
              </label>
              <div class="relative">
                <input
                  id="fornecedor-ie"
                  :value="ieFormatted"
                  :maxlength="IE_MAX"
                  inputmode="numeric"
                  autocomplete="off"
                  placeholder="Nº IE"
                  class="h-9 w-full cursor-text rounded-md border border-input bg-transparent px-3 pr-10 text-xs outline-none focus:ring-2 focus:ring-ring"
                  @input="onInputIe"
                  @keypress="
                    (e) => {
                      if (!/[0-9]/.test(e.key)) e.preventDefault()
                    }
                  "
                  @paste="
                    (e) => {
                      e.preventDefault()
                      onInputIe({ target: { value: e.clipboardData.getData('text') || '' } })
                    }
                  "
                />
                <span
                  class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 select-none text-[10px] font-medium tabular-nums transition-colors"
                  :class="
                    ieFormatted.length >= IE_MAX ? 'text-red-500' : 'text-muted-foreground/40'
                  "
                >
                  {{ ieFormatted.length }}/{{ IE_MAX }}
                </span>
              </div>
            </div>

            <div class="col-span-1 sm:col-span-2 md:col-span-2 lg:col-span-1.5">
              <label
                for="fornecedor-contato"
                class="mb-1 block text-xs font-medium text-foreground"
              >
                Contato
              </label>
              <div class="relative">
                <Input
                  id="fornecedor-contato"
                  v-model="contatoModel"
                  placeholder="Ex.: Carlos (Vendas)"
                  :maxlength="CONTATO_MAX"
                  class="h-9 text-xs cursor-text pr-10"
                />
                <span
                  class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 select-none text-[10px] font-medium tabular-nums transition-colors"
                  :class="
                    form.contato.length >= CONTATO_MAX ? 'text-red-500' : 'text-muted-foreground/40'
                  "
                >
                  {{ form.contato.length }}/{{ CONTATO_MAX }}
                </span>
              </div>
            </div>
          </div>
        </section>

        <section class="space-y-2.5 border-t border-border pt-3">
          <h3 class="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Contato e Endereço
          </h3>

          <div class="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-6 lg:grid-cols-12">
            <div class="col-span-1 sm:col-span-1 md:col-span-3 lg:col-span-3">
              <label
                for="fornecedor-telefone"
                class="mb-1 block text-xs font-medium text-foreground"
              >
                Telefone / WhatsApp <span class="text-destructive">*</span>
              </label>
              <div class="relative">
                <input
                  id="fornecedor-telefone"
                  :value="telefoneFormatted"
                  :maxlength="TELEFONE_MAX"
                  inputmode="numeric"
                  autocomplete="off"
                  placeholder="(00) 00000-0000"
                  class="h-9 w-full cursor-text rounded-md border border-input bg-transparent px-3 pr-12 text-xs outline-none focus:ring-2 focus:ring-ring"
                  :aria-invalid="!!erros.telefone"
                  :class="{ 'border-destructive focus-visible:ring-destructive': erros.telefone }"
                  @input="onInputTelefone"
                  @keypress="
                    (e) => {
                      if (!/[0-9]/.test(e.key)) e.preventDefault()
                    }
                  "
                  @paste="
                    (e) => {
                      e.preventDefault()
                      onInputTelefone({ target: { value: e.clipboardData.getData('text') || '' } })
                    }
                  "
                />
                <span
                  class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 select-none text-[10px] font-medium tabular-nums transition-colors"
                  :class="
                    telefoneFormatted.length >= TELEFONE_MAX
                      ? 'text-red-500'
                      : 'text-muted-foreground/40'
                  "
                >
                  {{ telefoneFormatted.length }}/{{ TELEFONE_MAX }}
                </span>
              </div>
              <p v-if="erros.telefone" class="mt-0.5 text-[11px] text-destructive font-medium">
                {{ erros.telefone }}
              </p>
            </div>

            <div class="col-span-1 sm:col-span-1 md:col-span-3 lg:col-span-3">
              <label for="fornecedor-email" class="mb-1 block text-xs font-medium text-foreground">
                E-mail
              </label>
              <div class="relative">
                <Input
                  id="fornecedor-email"
                  v-model="emailModel"
                  type="email"
                  placeholder="vendas@fornecedor.com.br"
                  :maxlength="EMAIL_MAX"
                  class="h-9 text-xs cursor-text pr-12"
                  :aria-invalid="!!erros.email"
                  :class="{ 'border-destructive focus-visible:ring-destructive': erros.email }"
                />
                <span
                  class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 select-none text-[10px] font-medium tabular-nums transition-colors"
                  :class="
                    form.email.length >= EMAIL_MAX ? 'text-red-500' : 'text-muted-foreground/40'
                  "
                >
                  {{ form.email.length }}/{{ EMAIL_MAX }}
                </span>
              </div>
              <p v-if="erros.email" class="mt-0.5 text-[11px] text-destructive font-medium">
                {{ erros.email }}
              </p>
            </div>

            <div class="col-span-1 sm:col-span-1 md:col-span-2 lg:col-span-2">
              <label for="fornecedor-cep" class="mb-1 block text-xs font-medium text-foreground">
                CEP
              </label>
              <div class="relative">
                <input
                  id="fornecedor-cep"
                  :value="cepFormatted"
                  :maxlength="CEP_MAX"
                  inputmode="numeric"
                  autocomplete="off"
                  placeholder="00000-000"
                  class="h-9 w-full cursor-text rounded-md border border-input bg-transparent px-3 pr-12 text-xs outline-none focus:ring-2 focus:ring-ring"
                  @input="onInputCep"
                  @keypress="
                    (e) => {
                      if (!/[0-9]/.test(e.key)) e.preventDefault()
                    }
                  "
                  @paste="
                    (e) => {
                      e.preventDefault()
                      onInputCep({ target: { value: e.clipboardData.getData('text') || '' } })
                    }
                  "
                />
                <span
                  v-if="!buscandoCep"
                  class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 select-none text-[10px] font-medium tabular-nums transition-colors"
                  :class="
                    cepFormatted.length >= CEP_MAX ? 'text-red-500' : 'text-muted-foreground/40'
                  "
                >
                  {{ cepFormatted.length }}/{{ CEP_MAX }}
                </span>
                <Loader2
                  v-else
                  class="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 animate-spin text-muted-foreground"
                />
              </div>
            </div>

            <div class="col-span-1 sm:col-span-1 md:col-span-4 lg:col-span-4">
              <label
                for="fornecedor-logradouro"
                class="mb-1 block text-xs font-medium text-foreground"
              >
                Logradouro
              </label>
              <div class="relative">
                <Input
                  id="fornecedor-logradouro"
                  v-model="logradouroModel"
                  placeholder="Rua, Avenida, Alameda..."
                  :maxlength="LOGRADOURO_MAX"
                  class="h-9 text-xs cursor-text pr-12"
                />
                <span
                  class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 select-none text-[10px] font-medium tabular-nums transition-colors"
                  :class="
                    form.logradouro.length >= LOGRADOURO_MAX
                      ? 'text-red-500'
                      : 'text-muted-foreground/40'
                  "
                >
                  {{ form.logradouro.length }}/{{ LOGRADOURO_MAX }}
                </span>
              </div>
            </div>

            <div class="col-span-1 sm:col-span-1 md:col-span-2 lg:col-span-2">
              <label for="fornecedor-numero" class="mb-1 block text-xs font-medium text-foreground">
                Número
              </label>
              <div class="relative">
                <Input
                  id="fornecedor-numero"
                  v-model="numeroModel"
                  placeholder="Ex.: 1020"
                  :maxlength="NUMERO_MAX"
                  class="h-9 text-xs cursor-text pr-10"
                />
                <span
                  class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 select-none text-[10px] font-medium tabular-nums transition-colors"
                  :class="
                    form.numero.length >= NUMERO_MAX ? 'text-red-500' : 'text-muted-foreground/40'
                  "
                >
                  {{ form.numero.length }}/{{ NUMERO_MAX }}
                </span>
              </div>
            </div>

            <div class="col-span-1 sm:col-span-1 md:col-span-2 lg:col-span-3">
              <label
                for="fornecedor-complemento"
                class="mb-1 block text-xs font-medium text-foreground"
              >
                Complemento
              </label>
              <div class="relative">
                <Input
                  id="fornecedor-complemento"
                  v-model="complementoModel"
                  placeholder="Galpão 3, Sala 12"
                  :maxlength="COMPLEMENTO_MAX"
                  class="h-9 text-xs cursor-text pr-10"
                />
                <span
                  class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 select-none text-[10px] font-medium tabular-nums transition-colors"
                  :class="
                    form.complemento.length >= COMPLEMENTO_MAX
                      ? 'text-red-500'
                      : 'text-muted-foreground/40'
                  "
                >
                  {{ form.complemento.length }}/{{ COMPLEMENTO_MAX }}
                </span>
              </div>
            </div>

            <div class="col-span-1 sm:col-span-1 md:col-span-2 lg:col-span-3">
              <label for="fornecedor-bairro" class="mb-1 block text-xs font-medium text-foreground">
                Bairro
              </label>
              <div class="relative">
                <Input
                  id="fornecedor-bairro"
                  v-model="bairroModel"
                  placeholder="Ex.: Bairro Industrial"
                  :maxlength="BAIRRO_MAX"
                  class="h-9 text-xs cursor-text pr-10"
                />
                <span
                  class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 select-none text-[10px] font-medium tabular-nums transition-colors"
                  :class="
                    form.bairro.length >= BAIRRO_MAX ? 'text-red-500' : 'text-muted-foreground/40'
                  "
                >
                  {{ form.bairro.length }}/{{ BAIRRO_MAX }}
                </span>
              </div>
            </div>

            <div class="col-span-1 sm:col-span-1 md:col-span-4 lg:col-span-3">
              <label for="fornecedor-cidade" class="mb-1 block text-xs font-medium text-foreground">
                Cidade
              </label>
              <div class="relative">
                <Input
                  id="fornecedor-cidade"
                  v-model="cidadeModel"
                  placeholder="Ex.: São Paulo"
                  :maxlength="CIDADE_MAX"
                  class="h-9 text-xs cursor-text pr-10"
                />
                <span
                  class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 select-none text-[10px] font-medium tabular-nums transition-colors"
                  :class="
                    form.cidade.length >= CIDADE_MAX ? 'text-red-500' : 'text-muted-foreground/40'
                  "
                >
                  {{ form.cidade.length }}/{{ CIDADE_MAX }}
                </span>
              </div>
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
                  :class="
                    form.observacoes.length >= OBS_MAX ? 'text-red-500' : 'text-muted-foreground/40'
                  "
                >
                  {{ form.observacoes.length }}/{{ OBS_MAX }}
                </span>
              </div>
            </div>

            <div class="col-span-1 space-y-2 lg:col-span-4 lg:mt-5">
              <div
                class="flex items-center justify-between gap-3 rounded-md border border-input px-3 py-2"
              >
                <div class="space-y-0.5">
                  <label
                    for="fornecedor-ativo"
                    class="text-xs font-medium text-foreground cursor-pointer block"
                  >
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

          <div
            class="flex items-center gap-2 rounded-md border border-border bg-surface-2 px-3 py-1.5 text-[11px] text-muted-foreground"
          >
            <Info class="size-3.5 shrink-0 text-emerald-500" />
            <p class="truncate">
              Condições de pagamento, dados bancários e histórico de compras podem ser ajustados no
              módulo de Compras (Entradas).
            </p>
          </div>
        </section>

        <DialogFooter
          class="pt-2 flex flex-col-reverse sm:flex-row gap-2 justify-end border-t border-border"
        >
          <Button
            type="button"
            variant="outline"
            class="cursor-pointer h-9 text-xs w-full sm:w-auto"
            :disabled="salvando"
            @click="fechar"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            :disabled="salvando || !formPreenchido || !formAlterado"
            class="cursor-pointer h-9 text-xs bg-emerald-500 text-black hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto min-w-[130px]"
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
