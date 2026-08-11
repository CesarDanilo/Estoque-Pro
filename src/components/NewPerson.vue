<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { Loader2, Save } from 'lucide-vue-next'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { useDocumentMask } from '@/composables/useDocumentMask'
import { usePhoneMask } from '@/composables/usePhoneMask'
import { useCepMask } from '@/composables/useCepMask'
import { useEmailValidation } from '@/composables/useEmailValidation'
import { pessoaSchema } from '@/schemas/pessoaSchema'
import { useFeedback } from '@/composables/useFeedBack'

const props = defineProps({
  open: { type: Boolean, default: false },
})

const emit = defineEmits(['update:open', 'created'])

const { sucesso, erro } = useFeedback()

const NOME_MAX = 120
const EMAIL_MAX = 120

// aceita apenas dígitos (0-9) — usado para validar documento, telefone e cep
const SOMENTE_DIGITOS = /^\d+$/

const documento = useDocumentMask()
const telefone = usePhoneMask()
const cep = useCepMask()
const email = useEmailValidation()

const salvando = ref(false)
const erros = reactive({})

const form = reactive({
  nome: '',
  grupo: 'Cliente',
  genero: 'Não informado',
  nascimento: '',
  cidade: '',
  endereco: '',
  ativo: true,
  observacoes: '',
})

function dataLocalHoje() {
  const agora = new Date()
  const ano = agora.getFullYear()
  const mes = String(agora.getMonth() + 1).padStart(2, '0')
  const dia = String(agora.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

const hoje = dataLocalHoje()

const emailModel = computed({
  get: () => email.value,
  set: (v) => {
    email.value = (v ?? '').slice(0, EMAIL_MAX)
  },
})

const documentoBadge = computed(() => {
  if (!documento.raw.value) {
    return { texto: 'CPF ou CNPJ', classe: 'bg-muted text-muted-foreground' }
  }
  return documento.tipo.value === 'CPF'
    ? { texto: 'CPF', classe: 'bg-sky-500/15 text-sky-600 dark:text-sky-400' }
    : { texto: 'CNPJ', classe: 'bg-violet-500/15 text-violet-600 dark:text-violet-400' }
})

watch(
  () => props.open,
  (aberto) => {
    if (aberto) resetar()
  },
)

// remove o erro de nascimento assim que o usuário corrige a data,
// sem precisar esperar um novo submit
watch(
  () => form.nascimento,
  (valor) => {
    if (erros.nascimento && (!valor || valor <= hoje)) {
      delete erros.nascimento
    }
  },
)

// remove o erro de e-mail assim que o usuário preenche
watch(
  () => email.value,
  (valor) => {
    if (erros.email && valor) {
      delete erros.email
    }
  },
)

// remove o erro de endereço assim que o usuário preenche
watch(
  () => form.endereco,
  (valor) => {
    if (erros.endereco && valor) {
      delete erros.endereco
    }
  },
)

// remove o erro de cidade assim que o usuário preenche
watch(
  () => form.cidade,
  (valor) => {
    if (erros.cidade && valor) {
      delete erros.cidade
    }
  },
)

// remove o erro de documento assim que o valor voltar a ser só dígitos
watch(
  () => documento.raw.value,
  (valor) => {
    if (erros.documento && (!valor || SOMENTE_DIGITOS.test(valor))) {
      delete erros.documento
    }
  },
)

// remove o erro de telefone assim que o valor voltar a ser só dígitos
watch(
  () => telefone.raw.value,
  (valor) => {
    if (erros.telefone && (!valor || SOMENTE_DIGITOS.test(valor))) {
      delete erros.telefone
    }
  },
)

// remove o erro de cep assim que o valor voltar a ser só dígitos
watch(
  () => cep.raw.value,
  (valor) => {
    if (erros.cep && (!valor || SOMENTE_DIGITOS.test(valor))) {
      delete erros.cep
    }
  },
)

function resetar() {
  form.nome = ''
  form.grupo = 'Cliente'
  form.genero = 'Não informado'
  form.nascimento = ''
  form.cidade = ''
  form.endereco = ''
  form.ativo = true
  form.observacoes = ''
  documento.setValue('')
  telefone.setValue('')
  cep.setValue('')
  email.value = ''
  email.status = 'idle'
  Object.keys(erros).forEach((chave) => delete erros[chave])
}

function fechar() {
  emit('update:open', false)
}

function validar() {
  Object.keys(erros).forEach((chave) => delete erros[chave])

  const payload = {
    nome: form.nome,
    documento: documento.raw.value,
    telefone: telefone.raw.value,
    email: email.value,
    grupo: form.grupo,
    genero: form.genero,
    nascimento: form.nascimento,
    cep: cep.raw.value,
    cidade: form.cidade,
    endereco: form.endereco,
    ativo: form.ativo,
    observacoes: form.observacoes,
  }

  const resultado = pessoaSchema.safeParse(payload)

  if (!resultado.success) {
    resultado.error.issues.forEach((issue) => {
      erros[issue.path[0]] = issue.message
    })
  }

  // documento: obrigatório numérico — só dígitos, sem letras ou símbolos soltos
  if (!documento.raw.value) {
    erros.documento = 'Informe o CPF ou CNPJ.'
  } else if (!SOMENTE_DIGITOS.test(documento.raw.value)) {
    erros.documento = 'Documento deve conter apenas números.'
  } else if (!documento.isValid.value) {
    erros.documento = `${documento.tipo.value} inválido.`
  }

  // telefone: obrigatório numérico — só dígitos
  if (!telefone.raw.value) {
    erros.telefone = 'Informe o telefone.'
  } else if (!SOMENTE_DIGITOS.test(telefone.raw.value)) {
    erros.telefone = 'Telefone deve conter apenas números.'
  }

  // cep: opcional, mas se preenchido precisa ser só dígitos
  if (cep.raw.value && !SOMENTE_DIGITOS.test(cep.raw.value)) {
    erros.cep = 'CEP deve conter apenas números.'
  }

  // ninguém nasce no futuro — bloqueio de segurança além do `max` do input,
  // cobrindo digitação manual ou colagem de data
  if (form.nascimento && form.nascimento > hoje) {
    erros.nascimento = 'Data de nascimento não pode ser no futuro.'
  }

  // e-mail agora é obrigatório
  if (!email.value.trim()) {
    erros.email = 'Informe o e-mail.'
  } else if (email.status === 'invalid') {
    erros.email = 'Informe um e-mail válido.'
  }

  // endereço agora é obrigatório
  if (!form.endereco.trim()) {
    erros.endereco = 'Informe o endereço.'
  }

  // cidade agora é obrigatória
  if (!form.cidade.trim()) {
    erros.cidade = 'Informe a cidade.'
  }

  if (Object.keys(erros).length > 0) {
    return null
  }

  return resultado.data ?? payload
}

async function salvar() {
  if (salvando.value) return

  const payload = validar()
  if (!payload) {
    erro('Confira os campos destacados antes de salvar.')
    return
  }

  salvando.value = true
  try {
    await new Promise((resolve) => setTimeout(resolve, 900))
    sucesso('Pessoa cadastrada com sucesso.')
    emit('created', payload)
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
        <DialogTitle class="text-xl font-semibold tracking-tight">Nova pessoa</DialogTitle>
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
              <label for="nome" class="mb-1.5 block text-sm font-medium text-foreground">
                Nome completo ou razão social <span class="text-destructive">*</span>
              </label>
              <div class="relative">
                <Input
                  id="nome"
                  v-model="form.nome"
                  placeholder="Ex.: Ana Beatriz Souza"
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
                <label for="documento" class="mb-1.5 flex items-center gap-2 text-sm font-medium text-foreground">
                  <span
                    class="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-colors"
                    :class="documentoBadge.classe"
                  >
                    {{ documentoBadge.texto }}
                  </span><span class="text-destructive">*</span>
                </label>
                <input
                  id="documento"
                  :value="documento.formatted.value"
                  :maxlength="18"
                  inputmode="numeric"
                  placeholder="000.000.000-00"
                  class="h-10 w-full cursor-text rounded-md border border-input bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  :aria-invalid="!!erros.documento"
                  @input="documento.onInput"
                />
                <p v-if="erros.documento" class="mt-1 text-xs text-destructive">{{ erros.documento }}</p>
                <p v-else class="mt-1 text-xs text-muted-foreground">CPF ou CNPJ, automático.</p>
              </div>

              <div>
                <label for="grupo" class="mb-1.5 block text-sm font-medium text-foreground">Grupo</label>
                <Select v-model="form.grupo">
                  <SelectTrigger id="grupo" class="h-10 w-full cursor-pointer">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cliente" class="cursor-pointer">Cliente</SelectItem>
                    <SelectItem value="Fornecedor" class="cursor-pointer">Fornecedor</SelectItem>
                    <SelectItem value="Colaborador" class="cursor-pointer">Colaborador</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label for="genero" class="mb-1.5 block text-sm font-medium text-foreground">Gênero</label>
                <Select v-model="form.genero">
                  <SelectTrigger id="genero" class="h-10 w-full cursor-pointer">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Feminino" class="cursor-pointer">Feminino</SelectItem>
                    <SelectItem value="Masculino" class="cursor-pointer">Masculino</SelectItem>
                    <SelectItem value="Não informado" class="cursor-pointer">Prefiro não informar</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label for="nascimento" class="mb-1.5 block text-sm font-medium text-foreground">
                  Nascimento
                </label>
                <Input
                  id="nascimento"
                  v-model="form.nascimento"
                  type="date"
                  :max="hoje"
                  class="h-10 cursor-text"
                  :aria-invalid="!!erros.nascimento"
                />
                <p v-if="erros.nascimento" class="mt-1 text-xs text-destructive">{{ erros.nascimento }}</p>
              </div>
            </div>
          </div>
        </section>

        <!-- Contato e endereço -->
        <section class="space-y-4 border-t border-border pt-6">
          <h3 class="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Contato e endereço
          </h3>

          <div class="grid grid-cols-5 gap-x-6 gap-y-4">
            <div class="col-span-2">
              <label for="telefone" class="mb-1.5 block text-sm font-medium text-foreground">
                Telefone <span class="text-destructive">*</span>
              </label>
              <input
                id="telefone"
                :value="telefone.formatted.value"
                :maxlength="15"
                inputmode="numeric"
                placeholder="(67) 99999-0000"
                class="h-10 w-full cursor-text rounded-md border border-input bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                :aria-invalid="!!erros.telefone"
                @input="telefone.onInput"
              />
              <p v-if="erros.telefone" class="mt-1 text-xs text-destructive">{{ erros.telefone }}</p>
            </div>

            <div class="col-span-3">
              <label for="email" class="mb-1.5 block text-sm font-medium text-foreground">
                E-mail <span class="text-destructive">*</span>
              </label>
              <div class="relative">
                <input
                  id="email"
                  v-model="emailModel"
                  :maxlength="EMAIL_MAX"
                  type="email"
                  placeholder="nome@email.com"
                  class="h-10 w-full cursor-text rounded-md border bg-transparent px-3 pr-16 text-sm outline-none focus:ring-2 focus:ring-ring"
                  :aria-invalid="email.status === 'invalid' || !!erros.email"
                  :class="{
                    'border-destructive': email.status === 'invalid' || erros.email,
                    'border-emerald-500': email.status === 'valid' && !erros.email,
                    'border-input': email.status === 'idle' && !erros.email,
                  }"
                />
                <span
                  class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 select-none text-[11px] font-medium tabular-nums transition-colors"
                  :class="email.value.length >= EMAIL_MAX ? 'text-red-500' : 'text-muted-foreground/40'"
                >
                  {{ email.value.length }}/{{ EMAIL_MAX }}
                </span>
              </div>
              <p v-if="email.status === 'invalid' || erros.email" class="mt-1 text-xs text-destructive">
                {{ erros.email || 'Informe um e-mail válido.' }}
              </p>
            </div>

            <div>
              <label for="cep" class="mb-1.5 block text-sm font-medium text-foreground">CEP</label>
              <input
                id="cep"
                :value="cep.formatted.value"
                :maxlength="9"
                inputmode="numeric"
                placeholder="79000-000"
                class="h-10 w-full cursor-text rounded-md border border-input bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                :aria-invalid="!!erros.cep"
                @input="cep.onInput"
              />
              <p v-if="erros.cep" class="mt-1 text-xs text-destructive">{{ erros.cep }}</p>
            </div>
            <div>
              <label for="cidade" class="mb-1.5 block text-sm font-medium text-foreground">
                Cidade <span class="text-destructive">*</span>
              </label>
              <Input
                id="cidade"
                v-model="form.cidade"
                placeholder="Campo Grande"
                :maxlength="80"
                class="h-10 cursor-text"
                :aria-invalid="!!erros.cidade"
              />
              <p v-if="erros.cidade" class="mt-1 text-xs text-destructive">{{ erros.cidade }}</p>
            </div>
            <div class="col-span-3">
              <label for="endereco" class="mb-1.5 block text-sm font-medium text-foreground">
                Endereço <span class="text-destructive">*</span>
              </label>
              <Input
                id="endereco"
                v-model="form.endereco"
                placeholder="Rua, número, bairro"
                :maxlength="160"
                class="h-10 cursor-text"
                :aria-invalid="!!erros.endereco"
              />
              <p v-if="erros.endereco" class="mt-1 text-xs text-destructive">{{ erros.endereco }}</p>
            </div>
          </div>
        </section>

        <!-- Situação -->
        <section class="space-y-4 border-t border-border pt-6">
          <h3 class="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Situação
          </h3>

          <div class="flex items-center justify-between gap-3 rounded-md border border-input px-4 py-3">
            <div class="space-y-0.5">
              <label for="ativo" class="text-sm font-medium text-foreground">Pessoa ativa</label>
              <p class="text-xs text-muted-foreground">Inativas não aparecem em novas vendas.</p>
            </div>
            <Switch
              id="ativo"
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
            {{ salvando ? 'Salvando…' : 'Salvar pessoa' }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>