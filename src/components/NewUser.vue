<script setup>
import { computed, ref, watch } from 'vue'
import { z } from 'zod'
import { AlertTriangle, Check, Eye, EyeOff, Loader2, X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useFeedback } from '@/composables/useFeedBack'

const props = defineProps({
  open: {
    type: Boolean,
    required: true,
  },
  usuario: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['update:open', 'created', 'updated'])

const { erro } = useFeedback()
const salvando = ref(false)

// Visibilidade de Senhas
const mostrarSenha = ref(false)
const mostrarConfirmarSenha = ref(false)

// Limites de Caracteres
const NOME_MAX = 60
const EMAIL_MAX = 80
const SENHA_MAX = 32

const TECLAS_PERMITIDAS = new Set([
  'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
  'Tab', 'Home', 'End', 'Enter', 'Escape', 'Shift', 'Control', 'Alt', 'Meta',
])

function bloquearExcedente(evento, valorAtual, maximo) {
  if (TECLAS_PERMITIDAS.has(evento.key) || evento.ctrlKey || evento.metaKey || evento.altKey) {
    return
  }
  if ((valorAtual ?? '').length >= maximo) {
    evento.preventDefault()
  }
}

// Formulário
const formUsuario = ref({
  id: null,
  nome: '',
  email: '',
  cargo: 'Vendedor',
  senha: '',
  confirmarSenha: '',
  ativo: true,
})

// Erros de Validação por Campo
const erros = ref({
  nome: '',
  email: '',
  senha: '',
  confirmarSenha: '',
})

// Maxlength via computed com setters
const nomeBruto = computed({
  get: () => formUsuario.value.nome,
  set: (val) => {
    formUsuario.value.nome = (val ?? '').slice(0, NOME_MAX)
    validarCampo('nome')
  },
})

const emailBruto = computed({
  get: () => formUsuario.value.email,
  set: (val) => {
    formUsuario.value.email = (val ?? '').slice(0, EMAIL_MAX)
    validarCampo('email')
  },
})

const senhaBruta = computed({
  get: () => formUsuario.value.senha,
  set: (val) => {
    formUsuario.value.senha = (val ?? '').slice(0, SENHA_MAX)
    validarCampo('senha')
    if (formUsuario.value.confirmarSenha) validarCampo('confirmarSenha')
  },
})

const confirmarSenhaBruta = computed({
  get: () => formUsuario.value.confirmarSenha,
  set: (val) => {
    formUsuario.value.confirmarSenha = (val ?? '').slice(0, SENHA_MAX)
    validarCampo('confirmarSenha')
  },
})

// Validação de Senha Forte em Tempo Real
const criteriosSenha = computed(() => {
  const val = formUsuario.value.senha || ''
  return {
    tamanho: val.length >= 8,
    maiuscula: /[A-Z]/.test(val),
    minuscula: /[a-z]/.test(val),
    numero: /[0-9]/.test(val),
    especial: /[^A-Za-z0-9]/.test(val),
  }
})

const pontosSenha = computed(() => {
  if (!formUsuario.value.senha) return 0
  return Object.values(criteriosSenha.value).filter(Boolean).length
})

const forcaSenhaTexto = computed(() => {
  const pts = pontosSenha.value
  if (pts <= 2) return 'Fraca'
  if (pts <= 4) return 'Média'
  return 'Forte'
})

const forcaSenhaCor = computed(() => {
  const pts = pontosSenha.value
  if (pts <= 2) return 'bg-red-500'
  if (pts <= 4) return 'bg-amber-500'
  return 'bg-emerald-500'
})

// Feedback Visual de Coincidência de Senhas
const statusCoincidenciaSenhas = computed(() => {
  const s = formUsuario.value.senha
  const cs = formUsuario.value.confirmarSenha

  if (!cs) return null
  if (s === cs) return { ok: true, texto: 'As senhas coincidem' }
  return { ok: false, texto: 'As senhas não coincidem' }
})

// Schema Zod
const usuarioSchema = z.object({
  nome: z.string().min(3, 'Nome muito curto (mínimo 3 caracteres).'),
  email: z.string().min(1, 'E-mail é obrigatório.').email('E-mail inválido.'),
  cargo: z.string().min(1, 'Selecione um cargo.'),
  senha: z.string().optional(),
  confirmarSenha: z.string().optional(),
}).superRefine((data, ctx) => {
  const isNovo = !props.usuario

  if (isNovo || data.senha) {
    if (!data.senha) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Senha é obrigatória.',
        path: ['senha'],
      })
      return
    }

    const { tamanho, maiuscula, minuscula, numero, especial } = {
      tamanho: data.senha.length >= 8,
      maiuscula: /[A-Z]/.test(data.senha),
      minuscula: /[a-z]/.test(data.senha),
      numero: /[0-9]/.test(data.senha),
      especial: /[^A-Za-z0-9]/.test(data.senha),
    }

    if (!tamanho || !maiuscula || !minuscula || !numero || !especial) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Senha fraca ou inválida.',
        path: ['senha'],
      })
    }

    if (data.senha !== data.confirmarSenha) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Senhas diferentes.',
        path: ['confirmarSenha'],
      })
    }
  }
})

// Validação em Tempo Real de Campos Individuais
function validarCampo(campo) {
  const res = usuarioSchema.safeParse(formUsuario.value)
  if (res.success) {
    erros.value[campo] = ''
    return
  }

  const issue = res.error.issues.find((i) => i.path[0] === campo)
  erros.value[campo] = issue ? issue.message : ''
}

// Validação Geral do Formulário para Ativar/Desativar o Botão
const formularioValido = computed(() => {
  const res = usuarioSchema.safeParse(formUsuario.value)
  return res.success
})

function resetarFormulario() {
  formUsuario.value = {
    id: null,
    nome: '',
    email: '',
    cargo: 'Vendedor',
    senha: '',
    confirmarSenha: '',
    ativo: true,
  }
  erros.value = { nome: '', email: '', senha: '', confirmarSenha: '' }
  mostrarSenha.value = false
  mostrarConfirmarSenha.value = false
}

watch(
  () => props.open,
  (isAberta) => {
    if (isAberta) {
      if (props.usuario) {
        formUsuario.value = {
          id: props.usuario.id,
          nome: props.usuario.nome,
          email: props.usuario.email,
          cargo: props.usuario.cargo,
          senha: '',
          confirmarSenha: '',
          ativo: props.usuario.status === 'ativo',
        }
        erros.value = { nome: '', email: '', senha: '', confirmarSenha: '' }
      } else {
        resetarFormulario()
      }
    }
  }
)

function fecharModal() {
  if (salvando.value) return
  emit('update:open', false)
}

function salvarUsuario() {
  const res = usuarioSchema.safeParse(formUsuario.value)

  if (!res.success) {
    res.error.issues.forEach((i) => {
      if (i.path[0]) erros.value[i.path[0]] = i.message
    })
    erro('Preencha os campos corretamente.')
    return
  }

  salvando.value = true

  setTimeout(() => {
    const { id, nome, email, cargo, ativo } = formUsuario.value

    const dadosPayload = {
      id,
      nome,
      email,
      cargo,
      status: ativo ? 'ativo' : 'inativo',
    }

    if (id) {
      emit('updated', dadosPayload)
    } else {
      emit('created', dadosPayload)
    }

    salvando.value = false
    fecharModal()
  }, 600)
}
</script>

<template>
  <Dialog :open="open" @update:open="(v) => !salvando && emit('update:open', v)">
    <DialogContent class="sm:max-w-[520px] p-6">
      <DialogHeader class="space-y-1">
        <DialogTitle class="text-xl font-semibold tracking-tight">
          {{ usuario ? 'Editar usuário' : 'Cadastrar novo usuário' }}
        </DialogTitle>
        <DialogDescription class="text-sm text-muted-foreground">
          Preencha os dados abaixo para configurar o acesso ao sistema.
        </DialogDescription>
      </DialogHeader>

      <form class="space-y-4 pt-3" @submit.prevent="salvarUsuario">
        <div class="space-y-1.5">
          <Label for="nome">Nome completo <span class="text-destructive">*</span></Label>
          <div class="relative" @keydown="(e) => bloquearExcedente(e, nomeBruto, NOME_MAX)">
            <Input
              id="nome"
              v-model="nomeBruto"
              type="text"
              placeholder="Ex: João da Silva"
              :class="erros.nome ? 'border-destructive focus-visible:ring-destructive' : ''"
              required
            />
            <span
              class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 select-none text-[11px] font-medium tabular-nums transition-colors"
              :class="nomeBruto.length >= NOME_MAX ? 'text-red-500' : 'text-muted-foreground/40'"
            >
              {{ nomeBruto.length }}/{{ NOME_MAX }}
            </span>
          </div>
          <p v-if="erros.nome" class="text-xs text-destructive font-medium">{{ erros.nome }}</p>
        </div>

        <div class="space-y-1.5">
          <Label for="email">E-mail <span class="text-destructive">*</span></Label>
          <div class="relative" @keydown="(e) => bloquearExcedente(e, emailBruto, EMAIL_MAX)">
            <Input
              id="email"
              v-model="emailBruto"
              type="email"
              placeholder="joao@empresa.com"
              :class="erros.email ? 'border-destructive focus-visible:ring-destructive' : ''"
              required
            />
            <span
              class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 select-none text-[11px] font-medium tabular-nums transition-colors"
              :class="emailBruto.length >= EMAIL_MAX ? 'text-red-500' : 'text-muted-foreground/40'"
            >
              {{ emailBruto.length }}/{{ EMAIL_MAX }}
            </span>
          </div>
          <p v-if="erros.email" class="text-xs text-destructive font-medium">{{ erros.email }}</p>
        </div>

        <div class="space-y-1.5">
          <Label for="cargo">Cargo / Nível de acesso <span class="text-destructive">*</span></Label>
          <Select v-model="formUsuario.cargo">
            <SelectTrigger id="cargo" class="cursor-pointer">
              <SelectValue placeholder="Selecione um cargo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Administrador" class="cursor-pointer">Administrador</SelectItem>
              <SelectItem value="Gerente" class="cursor-pointer">Gerente</SelectItem>
              <SelectItem value="Vendedor" class="cursor-pointer">Vendedor</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1.5">
            <Label for="senha">
              Senha <span v-if="!usuario" class="text-destructive">*</span>
            </Label>
            <div class="relative" @keydown="(e) => bloquearExcedente(e, senhaBruta, SENHA_MAX)">
              <Input
                id="senha"
                v-model="senhaBruta"
                :type="mostrarSenha ? 'text' : 'password'"
                placeholder="••••••••"
                :class="['pr-10', erros.senha ? 'border-destructive focus-visible:ring-destructive' : '']"
                :required="!usuario"
              />
              <button
                type="button"
                class="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground cursor-pointer transition-colors"
                :aria-label="mostrarSenha ? 'Ocultar senha' : 'Exibir senha'"
                @click="mostrarSenha = !mostrarSenha"
              >
                <component :is="mostrarSenha ? EyeOff : Eye" class="size-4" />
              </button>
            </div>
            <p v-if="erros.senha" class="text-xs text-destructive font-medium">{{ erros.senha }}</p>
          </div>

          <div class="space-y-1.5">
            <Label for="confirmarSenha">
              Confirmar senha <span v-if="!usuario" class="text-destructive">*</span>
            </Label>
            <div class="relative" @keydown="(e) => bloquearExcedente(e, confirmarSenhaBruta, SENHA_MAX)">
              <Input
                id="confirmarSenha"
                v-model="confirmarSenhaBruta"
                :type="mostrarConfirmarSenha ? 'text' : 'password'"
                placeholder="••••••••"
                :class="['pr-10', erros.confirmarSenha ? 'border-destructive focus-visible:ring-destructive' : '']"
                :required="!usuario"
              />
              <button
                type="button"
                class="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground cursor-pointer transition-colors"
                :aria-label="mostrarConfirmarSenha ? 'Ocultar senha' : 'Exibir senha'"
                @click="mostrarConfirmarSenha = !mostrarConfirmarSenha"
              >
                <component :is="mostrarConfirmarSenha ? EyeOff : Eye" class="size-4" />
              </button>
            </div>
            <p v-if="erros.confirmarSenha" class="text-xs text-destructive font-medium">{{ erros.confirmarSenha }}</p>
          </div>
        </div>

        <div v-if="statusCoincidenciaSenhas" class="text-xs font-medium flex items-center gap-1.5 transition-all">
          <template v-if="statusCoincidenciaSenhas.ok">
            <Check class="size-3.5 text-emerald-500" />
            <span class="text-emerald-500">{{ statusCoincidenciaSenhas.texto }}</span>
          </template>
          <template v-else>
            <AlertTriangle class="size-3.5 text-amber-500" />
            <span class="text-amber-500">{{ statusCoincidenciaSenhas.texto }}</span>
          </template>
        </div>

        <div v-if="formUsuario.senha" class="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
          <div class="flex items-center justify-between text-xs">
            <span class="text-muted-foreground">Força da senha:</span>
            <span
              class="font-medium"
              :class="{
                'text-red-500': pontosSenha <= 2,
                'text-amber-500': pontosSenha > 2 && pontosSenha <= 4,
                'text-emerald-500': pontosSenha === 5
              }"
            >
              {{ forcaSenhaTexto }}
            </span>
          </div>

          <div class="grid grid-cols-5 gap-1 h-1.5 w-full">
            <div
              v-for="i in 5"
              :key="i"
              class="h-full rounded-full transition-all duration-300"
              :class="i <= pontosSenha ? forcaSenhaCor : 'bg-muted-foreground/20'"
            />
          </div>

          <ul class="grid grid-cols-2 gap-x-2 gap-y-1 pt-1 text-[11px]">
            <li class="flex items-center gap-1.5" :class="criteriosSenha.tamanho ? 'text-emerald-500 font-medium' : 'text-muted-foreground'">
              <component :is="criteriosSenha.tamanho ? Check : X" class="size-3 shrink-0" />
              Mínimo 8 caracteres
            </li>
            <li class="flex items-center gap-1.5" :class="criteriosSenha.maiuscula ? 'text-emerald-500 font-medium' : 'text-muted-foreground'">
              <component :is="criteriosSenha.maiuscula ? Check : X" class="size-3 shrink-0" />
              Letra maiúscula (A-Z)
            </li>
            <li class="flex items-center gap-1.5" :class="criteriosSenha.minuscula ? 'text-emerald-500 font-medium' : 'text-muted-foreground'">
              <component :is="criteriosSenha.minuscula ? Check : X" class="size-3 shrink-0" />
              Letra minúscula (a-z)
            </li>
            <li class="flex items-center gap-1.5" :class="criteriosSenha.numero ? 'text-emerald-500 font-medium' : 'text-muted-foreground'">
              <component :is="criteriosSenha.numero ? Check : X" class="size-3 shrink-0" />
              Número (0-9)
            </li>
            <li class="flex items-center gap-1.5 col-span-2" :class="criteriosSenha.especial ? 'text-emerald-500 font-medium' : 'text-muted-foreground'">
              <component :is="criteriosSenha.especial ? Check : X" class="size-3 shrink-0" />
              Caractere especial (!@#$%^&*)
            </li>
          </ul>
        </div>

        <DialogFooter class="pt-4 flex gap-2 justify-end border-t border-border mt-6">
          <Button type="button" variant="outline" class="cursor-pointer" :disabled="salvando" @click="fecharModal">
            Cancelar
          </Button>
          <Button
            type="submit"
            :disabled="!formularioValido || salvando"
            class="cursor-pointer bg-emerald-500 text-black hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed min-w-[140px]"
          >
            <template v-if="salvando">
              <Loader2 class="size-4 animate-spin mr-2" />
              {{ usuario ? 'Salvando...' : 'Cadastrando...' }}
            </template>
            <template v-else>
              {{ usuario ? 'Salvar alterações' : 'Cadastrar usuário' }}
            </template>
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>