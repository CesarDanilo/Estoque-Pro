<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { z } from 'zod'
import {
  AlertCircle,
  Check,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Moon,
  Package,
  Sun,
  User,
  X,
} from 'lucide-vue-next'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import AuthBrandPanel from '@/components/auth/AuthBrandPanel.vue'
import { useFeedback } from '@/composables/useFeedBack'
import { registrar } from '@/services/auth'

const router = useRouter()
const { sucesso } = useFeedback()

// ---------- Tema ----------
const TEMA_KEY = 'estoquepro:tema'
const escuro = ref(true)

function aplicarTema(valor) {
  document.documentElement.classList.toggle('dark', valor)
  localStorage.setItem(TEMA_KEY, valor ? 'dark' : 'light')
}

function alternarTema() {
  escuro.value = !escuro.value
  aplicarTema(escuro.value)
}

// ---------- Limites e bloqueio de input ----------
const NOME_MAX = 60
const EMAIL_MAX = 80
const SENHA_MAX = 32

const TECLAS_PERMITIDAS = new Set([
  'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
  'Tab', 'Home', 'End', 'Enter', 'Escape', 'Shift', 'Control', 'Alt', 'Meta',
])

function bloquearExcedente(evento, valorAtual, maximo) {
  if (TECLAS_PERMITIDAS.has(evento.key) || evento.ctrlKey || evento.metaKey || evento.altKey) return
  if ((valorAtual ?? '').length >= maximo) evento.preventDefault()
}

// ---------- Formulário ----------
const form = reactive({
  nome: '',
  email: '',
  senha: '',
  confirmarSenha: '',
  aceitaTermos: false,
})

const erros = reactive({
  nome: '',
  email: '',
  senha: '',
  confirmarSenha: '',
  aceitaTermos: '',
})

const mostrarSenha = ref(false)
const mostrarConfirmarSenha = ref(false)
const carregando = ref(false)
const erroCadastro = ref('')

// ---------- Força e critérios da senha (mesmo padrão do modal de usuário) ----------
const criteriosSenha = computed(() => {
  const val = form.senha || ''
  return {
    tamanho: val.length >= 8,
    maiuscula: /[A-Z]/.test(val),
    minuscula: /[a-z]/.test(val),
    numero: /[0-9]/.test(val),
    especial: /[^A-Za-z0-9]/.test(val),
  }
})

const pontosSenha = computed(() => (form.senha ? Object.values(criteriosSenha.value).filter(Boolean).length : 0))

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

const statusCoincidenciaSenhas = computed(() => {
  if (!form.confirmarSenha) return null
  if (form.senha === form.confirmarSenha) return { ok: true, texto: 'As senhas coincidem' }
  return { ok: false, texto: 'As senhas não coincidem' }
})

// ---------- Validação (Zod) ----------
const schema = z
  .object({
    nome: z.string().min(3, 'Nome muito curto (mínimo 3 caracteres).'),
    email: z.string().min(1, 'Informe seu e-mail.').email('Informe um e-mail válido.'),
    senha: z.string().min(1, 'Informe uma senha.'),
    confirmarSenha: z.string().min(1, 'Confirme sua senha.'),
    aceitaTermos: z.boolean(),
  })
  .superRefine((data, ctx) => {
    const c = {
      tamanho: data.senha.length >= 8,
      maiuscula: /[A-Z]/.test(data.senha),
      minuscula: /[a-z]/.test(data.senha),
      numero: /[0-9]/.test(data.senha),
      especial: /[^A-Za-z0-9]/.test(data.senha),
    }
    if (!Object.values(c).every(Boolean)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Senha fraca ou inválida.', path: ['senha'] })
    }
    if (data.senha !== data.confirmarSenha) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'As senhas não coincidem.', path: ['confirmarSenha'] })
    }
    if (!data.aceitaTermos) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Você precisa aceitar os termos.', path: ['aceitaTermos'] })
    }
  })

const podeEnviar = computed(
  () => form.nome && form.email && form.senha && form.confirmarSenha && form.aceitaTermos && !carregando.value
)

function limparErro(campo) {
  erros[campo] = ''
  erroCadastro.value = ''
}

function validar() {
  const resultado = schema.safeParse(form)
  Object.keys(erros).forEach((k) => (erros[k] = ''))

  if (!resultado.success) {
    for (const issue of resultado.error.issues) {
      erros[issue.path[0]] = issue.message
    }
    return false
  }
  return true
}

async function cadastrar() {
  if (!validar() || carregando.value) return

  carregando.value = true
  erroCadastro.value = ''
  try {
    await registrar({ nome: form.nome, email: form.email, senha: form.senha })

    sucesso('Conta criada', 'Seu cadastro foi realizado com sucesso.')
    router.push('/')
  } catch (erro) {
    if (erro.response?.status === 422) {
      const primeiroErro = Object.values(erro.response.data.errors ?? {})[0]?.[0]
      console.log('Erro de validação do backend:', primeiroErro)
      if (primeiroErro == "The email has already been taken.") {
        erroCadastro.value = 'Este e-mail já está em uso. Tente outro ou faça login.'
      }else {
        erroCadastro.value = primeiroErro || 'Verifique os dados informados e tente novamente.'
      }
    } else {
      erroCadastro.value = 'Não foi possível criar sua conta. Tente novamente em instantes.'
    }
  } finally {
    carregando.value = false
  }
}

onMounted(() => {
  document.title = 'Criar conta — Estoque Pro'
  const salvo = localStorage.getItem(TEMA_KEY)
  escuro.value = salvo ? salvo === 'dark' : true
  aplicarTema(escuro.value)
})
</script>

<template>
  <div class="grid min-h-screen grid-cols-1 bg-background text-foreground lg:grid-cols-[1fr_1.15fr]">
    <Button
      type="button"
      variant="ghost"
      size="icon"
      class="fixed right-4 top-4 z-50 cursor-pointer text-muted-foreground hover:text-foreground lg:right-6 lg:top-6"
      :aria-label="escuro ? 'Ativar tema claro' : 'Ativar tema escuro'"
      @click="alternarTema"
    >
      <Sun v-if="escuro" class="size-4" aria-hidden="true" />
      <Moon v-else class="size-4" aria-hidden="true" />
    </Button>

    <AuthBrandPanel
      titulo="Comece a organizar<br /> seu estoque hoje."
      descricao="Leva menos de dois minutos para criar sua conta e ter vendas, compras e estoque sob controle."
    />

    <main class="flex flex-col justify-center px-6 py-10 sm:px-10 md:px-16 lg:px-24">
      <div class="mx-auto w-full max-w-md">
        <div class="mb-8 flex items-center gap-2.5 lg:hidden">
          <span class="grid size-8 place-items-center rounded-lg bg-emerald-500/15 text-emerald-500">
            <Package class="size-4" aria-hidden="true" />
          </span>
          <span class="text-base font-semibold tracking-tight">Estoque Pro</span>
        </div>

        <div class="mb-8 space-y-1.5">
          <h2 class="text-2xl font-semibold tracking-tight">Criar conta</h2>
          <p class="text-sm text-muted-foreground">Preencha os dados abaixo para começar.</p>
        </div>

        <form class="space-y-5" novalidate @submit.prevent="cadastrar">
          <div class="space-y-1.5">
            <Label for="nome">Nome completo</Label>
            <div class="relative" @keydown="(e) => bloquearExcedente(e, form.nome, NOME_MAX)">
              <User class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                id="nome"
                v-model="form.nome"
                type="text"
                autocomplete="name"
                placeholder="Ex: João da Silva"
                class="pl-9 transition-colors"
                :class="erros.nome && 'border-red-500 focus-visible:ring-red-500/40'"
                :maxlength="NOME_MAX"
                :aria-invalid="!!erros.nome"
                @input="limparErro('nome')"
              />
            </div>
            <p v-if="erros.nome" class="text-xs text-red-500">{{ erros.nome }}</p>
          </div>

          <div class="space-y-1.5">
            <Label for="email">E-mail</Label>
            <div class="relative" @keydown="(e) => bloquearExcedente(e, form.email, EMAIL_MAX)">
              <Mail class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                id="email"
                v-model="form.email"
                type="email"
                autocomplete="email"
                placeholder="voce@empresa.com"
                class="pl-9 transition-colors"
                :class="erros.email && 'border-red-500 focus-visible:ring-red-500/40'"
                :maxlength="EMAIL_MAX"
                :aria-invalid="!!erros.email"
                @input="limparErro('email')"
              />
            </div>
            <p v-if="erros.email" class="text-xs text-red-500">{{ erros.email }}</p>
          </div>

          <div class="space-y-1.5">
            <Label for="senha">Senha</Label>
            <div class="relative" @keydown="(e) => bloquearExcedente(e, form.senha, SENHA_MAX)">
              <Lock class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                id="senha"
                v-model="form.senha"
                :type="mostrarSenha ? 'text' : 'password'"
                autocomplete="new-password"
                placeholder="••••••••"
                class="px-9 transition-colors"
                :class="erros.senha && 'border-red-500 focus-visible:ring-red-500/40'"
                :maxlength="SENHA_MAX"
                :aria-invalid="!!erros.senha"
                @input="limparErro('senha')"
              />
              <button
                type="button"
                class="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
                :aria-label="mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'"
                @click="mostrarSenha = !mostrarSenha"
              >
                <EyeOff v-if="mostrarSenha" class="size-4" aria-hidden="true" />
                <Eye v-else class="size-4" aria-hidden="true" />
              </button>
            </div>
            <p v-if="erros.senha" class="text-xs text-red-500">{{ erros.senha }}</p>

            <!-- Medidor de força + critérios -->
            <div v-if="form.senha" class="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
              <div class="flex items-center justify-between text-xs">
                <span class="text-muted-foreground">Força da senha:</span>
                <span
                  class="font-medium"
                  :class="{
                    'text-red-500': pontosSenha <= 2,
                    'text-amber-500': pontosSenha > 2 && pontosSenha <= 4,
                    'text-emerald-500': pontosSenha === 5,
                  }"
                >
                  {{ forcaSenhaTexto }}
                </span>
              </div>

              <div class="grid h-1.5 w-full grid-cols-5 gap-1">
                <div
                  v-for="i in 5"
                  :key="i"
                  class="h-full rounded-full transition-all duration-300"
                  :class="i <= pontosSenha ? forcaSenhaCor : 'bg-muted-foreground/20'"
                />
              </div>

              <ul class="grid grid-cols-2 gap-x-2 gap-y-1 pt-1 text-[11px]">
                <li class="flex items-center gap-1.5" :class="criteriosSenha.tamanho ? 'font-medium text-emerald-500' : 'text-muted-foreground'">
                  <component :is="criteriosSenha.tamanho ? Check : X" class="size-3 shrink-0" />
                  Mínimo 8 caracteres
                </li>
                <li class="flex items-center gap-1.5" :class="criteriosSenha.maiuscula ? 'font-medium text-emerald-500' : 'text-muted-foreground'">
                  <component :is="criteriosSenha.maiuscula ? Check : X" class="size-3 shrink-0" />
                  Letra maiúscula (A-Z)
                </li>
                <li class="flex items-center gap-1.5" :class="criteriosSenha.minuscula ? 'font-medium text-emerald-500' : 'text-muted-foreground'">
                  <component :is="criteriosSenha.minuscula ? Check : X" class="size-3 shrink-0" />
                  Letra minúscula (a-z)
                </li>
                <li class="flex items-center gap-1.5" :class="criteriosSenha.numero ? 'font-medium text-emerald-500' : 'text-muted-foreground'">
                  <component :is="criteriosSenha.numero ? Check : X" class="size-3 shrink-0" />
                  Número (0-9)
                </li>
                <li class="col-span-2 flex items-center gap-1.5" :class="criteriosSenha.especial ? 'font-medium text-emerald-500' : 'text-muted-foreground'">
                  <component :is="criteriosSenha.especial ? Check : X" class="size-3 shrink-0" />
                  Caractere especial (!@#$%^&amp;*)
                </li>
              </ul>
            </div>
          </div>

          <div class="space-y-1.5">
            <Label for="confirmarSenha">Confirmar senha</Label>
            <div class="relative" @keydown="(e) => bloquearExcedente(e, form.confirmarSenha, SENHA_MAX)">
              <Lock class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                id="confirmarSenha"
                v-model="form.confirmarSenha"
                :type="mostrarConfirmarSenha ? 'text' : 'password'"
                autocomplete="new-password"
                placeholder="••••••••"
                class="px-9 transition-colors"
                :class="erros.confirmarSenha && 'border-red-500 focus-visible:ring-red-500/40'"
                :maxlength="SENHA_MAX"
                :aria-invalid="!!erros.confirmarSenha"
                @input="limparErro('confirmarSenha')"
              />
              <button
                type="button"
                class="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
                :aria-label="mostrarConfirmarSenha ? 'Ocultar senha' : 'Mostrar senha'"
                @click="mostrarConfirmarSenha = !mostrarConfirmarSenha"
              >
                <EyeOff v-if="mostrarConfirmarSenha" class="size-4" aria-hidden="true" />
                <Eye v-else class="size-4" aria-hidden="true" />
              </button>
            </div>
            <p v-if="erros.confirmarSenha" class="text-xs text-red-500">{{ erros.confirmarSenha }}</p>
            <div v-else-if="statusCoincidenciaSenhas" class="flex items-center gap-1.5 text-xs font-medium">
              <component :is="statusCoincidenciaSenhas.ok ? Check : X" class="size-3.5" :class="statusCoincidenciaSenhas.ok ? 'text-emerald-500' : 'text-amber-500'" />
              <span :class="statusCoincidenciaSenhas.ok ? 'text-emerald-500' : 'text-amber-500'">{{ statusCoincidenciaSenhas.texto }}</span>
            </div>
          </div>

          <div class="space-y-1">
            <div class="flex items-start gap-2">
              <Checkbox id="termos" v-model="form.aceitaTermos" class="mt-0.5 cursor-pointer" @update:model-value="limparErro('aceitaTermos')" />
              <Label for="termos" class="cursor-pointer text-sm font-normal leading-snug text-muted-foreground">
                Li e aceito os
                <a href="/termos" class="text-emerald-500 hover:text-emerald-400">Termos de uso</a>
                e a
                <a href="/privacidade" class="text-emerald-500 hover:text-emerald-400">Política de privacidade</a>
              </Label>
            </div>
            <p v-if="erros.aceitaTermos" class="text-xs text-red-500">{{ erros.aceitaTermos }}</p>
          </div>

          <div
            v-if="erroCadastro"
            class="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-400"
            role="alert"
          >
            <AlertCircle class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{{ erroCadastro }}</span>
          </div>

          <Button
            type="submit"
            class="w-full cursor-pointer bg-emerald-500 text-black transition-transform hover:bg-emerald-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100"
            :disabled="!podeEnviar"
          >
            <Loader2 v-if="carregando" class="size-4 animate-spin" aria-hidden="true" />
            {{ carregando ? 'Criando conta…' : 'Criar conta' }}
          </Button>
        </form>

        <p class="mt-8 text-center text-sm text-muted-foreground">
          Já tem uma conta?
          <RouterLink to="/login" class="font-medium text-emerald-500 hover:text-emerald-400">Entrar</RouterLink>
        </p>
      </div>
    </main>
  </div>
</template>