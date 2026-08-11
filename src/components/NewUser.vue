<script setup>
import { computed, ref, watch } from 'vue'
import { z } from 'zod'
import { Check, X } from 'lucide-vue-next'
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

// ---- Limites de Caracteres ----
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

// ---- Formulário ----
const formUsuario = ref({
  id: null,
  nome: '',
  email: '',
  cargo: 'Vendedor',
  senha: '',
  confirmarSenha: '',
  ativo: true,
})

// Maxlength dinâmico via computed com setters
const nomeBruto = computed({
  get: () => formUsuario.value.nome,
  set: (val) => { formUsuario.value.nome = (val ?? '').slice(0, NOME_MAX) },
})

const emailBruto = computed({
  get: () => formUsuario.value.email,
  set: (val) => { formUsuario.value.email = (val ?? '').slice(0, EMAIL_MAX) },
})

const senhaBruta = computed({
  get: () => formUsuario.value.senha,
  set: (val) => { formUsuario.value.senha = (val ?? '').slice(0, SENHA_MAX) },
})

const confirmarSenhaBruta = computed({
  get: () => formUsuario.value.confirmarSenha,
  set: (val) => { formUsuario.value.confirmarSenha = (val ?? '').slice(0, SENHA_MAX) },
})

// ---- Validação de Senha Forte em Tempo Real ----
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

// ---- Schema Zod ----
const usuarioSchema = z.object({
  nome: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres.'),
  email: z.string().email('Informe um e-mail válido.'),
  cargo: z.string().min(1, 'Selecione um cargo.'),
  senha: z.string().optional(),
  confirmarSenha: z.string().optional(),
}).superRefine((data, ctx) => {
  const IS_NOVO = !props.usuario

  // Se for novo usuário ou se digitou senha na edição
  if (IS_NOVO || data.senha) {
    if (!data.senha) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Informe uma senha.',
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
        message: 'A senha deve atender a todos os requisitos de segurança.',
        path: ['senha'],
      })
    }

    if (data.senha !== data.confirmarSenha) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'As senhas não coincidem.',
        path: ['confirmarSenha'],
      })
    }
  }
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
      } else {
        resetarFormulario()
      }
    }
  }
)

function fecharModal() {
  emit('update:open', false)
}

function salvarUsuario() {
  // Validação via Zod
  const resultado = usuarioSchema.safeParse(formUsuario.value)

  if (!resultado.success) {
    const primeiraMensagem = resultado.error.issues[0]?.message || 'Verifique os campos do formulário.'
    erro(primeiraMensagem)
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
  }, 500)
}
</script>

<template>
  <Dialog :open="open" @update:open="(v) => emit('update:open', v)">
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
              required
              class="pr-14"
            />
            <span
              class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 select-none text-[11px] font-medium tabular-nums transition-colors"
              :class="nomeBruto.length >= NOME_MAX ? 'text-red-500' : 'text-muted-foreground/40'"
            >
              {{ nomeBruto.length }}/{{ NOME_MAX }}
            </span>
          </div>
        </div>

        <div class="space-y-1.5">
          <Label for="email">E-mail <span class="text-destructive">*</span></Label>
          <div class="relative" @keydown="(e) => bloquearExcedente(e, emailBruto, EMAIL_MAX)">
            <Input
              id="email"
              v-model="emailBruto"
              type="email"
              placeholder="joao@empresa.com"
              required
              class="pr-14"
            />
            <span
              class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 select-none text-[11px] font-medium tabular-nums transition-colors"
              :class="emailBruto.length >= EMAIL_MAX ? 'text-red-500' : 'text-muted-foreground/40'"
            >
              {{ emailBruto.length }}/{{ EMAIL_MAX }}
            </span>
          </div>
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
                type="password"
                placeholder="••••••••"
                :required="!usuario"
                class="pr-14"
              />
              <span
                class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 select-none text-[11px] font-medium tabular-nums transition-colors"
                :class="senhaBruta.length >= SENHA_MAX ? 'text-red-500' : 'text-muted-foreground/40'"
              >
                {{ senhaBruta.length }}/{{ SENHA_MAX }}
              </span>
            </div>
          </div>

          <div class="space-y-1.5">
            <Label for="confirmarSenha">
              Confirmar senha <span v-if="!usuario" class="text-destructive">*</span>
            </Label>
            <div class="relative" @keydown="(e) => bloquearExcedente(e, confirmarSenhaBruta, SENHA_MAX)">
              <Input
                id="confirmarSenha"
                v-model="confirmarSenhaBruta"
                type="password"
                placeholder="••••••••"
                :required="!usuario"
                class="pr-14"
              />
              <span
                class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 select-none text-[11px] font-medium tabular-nums transition-colors"
                :class="confirmarSenhaBruta.length >= SENHA_MAX ? 'text-red-500' : 'text-muted-foreground/40'"
              >
                {{ confirmarSenhaBruta.length }}/{{ SENHA_MAX }}
              </span>
            </div>
          </div>
        </div>

        <div v-if="formUsuario.senha" class="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
          <div class="flex items-center justify-between text-xs">
            <span class="text-muted-foreground">Força da senha:</span>
            <span class="font-medium" :class="{
              'text-red-500': pontosSenha <= 2,
              'text-amber-500': pontosSenha > 2 && pontosSenha <= 4,
              'text-emerald-500': pontosSenha === 5
            }">
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
          <Button type="button" variant="outline" class="cursor-pointer" @click="fecharModal">
            Cancelar
          </Button>
          <Button
            type="submit"
            :disabled="salvando"
            class="cursor-pointer bg-emerald-500 text-black hover:bg-emerald-600 disabled:cursor-not-allowed"
          >
            {{ salvando ? 'Salvando...' : usuario ? 'Salvar alterações' : 'Cadastrar usuário' }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>