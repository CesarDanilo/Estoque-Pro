<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { z } from 'zod'
import {
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Moon,
  Package,
  Sun,
} from 'lucide-vue-next'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import AuthBrandPanel from '@/components/auth/AuthBrandPanel.vue'
import { useFeedback } from '@/composables/useFeedBack'
import { redefinirSenha } from '@/services/auth'

const route = useRoute()
const router = useRouter()
const { sucesso } = useFeedback()

// Token e e-mail vêm do link enviado por e-mail (?token=...&email=...)
const token = computed(() => String(route.query.token ?? '').trim())
const email = computed(() => String(route.query.email ?? '').trim())
const linkValido = computed(() => token.value.length > 0 && email.value.length > 0)

// ---------- Tema (dark/light com persistência) ----------
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

// ---------- Formulário ----------
const SENHA_MIN = 8

const schema = z
  .object({
    senha: z
      .string()
      .min(1, 'Informe a nova senha.')
      .min(SENHA_MIN, `A senha deve ter pelo menos ${SENHA_MIN} caracteres.`),
    confirmarSenha: z.string().min(1, 'Confirme a nova senha.'),
  })
  .refine((dados) => dados.senha === dados.confirmarSenha, {
    message: 'As senhas não coincidem.',
    path: ['confirmarSenha'],
  })

const form = reactive({
  senha: '',
  confirmarSenha: '',
})

const erros = reactive({
  senha: '',
  confirmarSenha: '',
})

const mostrarSenha = ref(false)
const carregando = ref(false)
const erroRedefinicao = ref('')

const podeEnviar = computed(
  () => form.senha.length > 0 && form.confirmarSenha.length > 0 && !carregando.value,
)

function limparErro(campo) {
  erros[campo] = ''
  erroRedefinicao.value = ''
}

function validar() {
  const resultado = schema.safeParse({ senha: form.senha, confirmarSenha: form.confirmarSenha })
  erros.senha = ''
  erros.confirmarSenha = ''

  if (!resultado.success) {
    for (const issue of resultado.error.issues) {
      erros[issue.path[0]] = issue.message
    }
    return false
  }
  return true
}

async function redefinir() {
  if (!linkValido.value || !validar() || carregando.value) return

  carregando.value = true
  erroRedefinicao.value = ''
  try {
    await redefinirSenha({ token: token.value, email: email.value, senha: form.senha })

    sucesso('Senha redefinida', 'Faça login com sua nova senha.')
    router.push({ name: 'login' })
  } catch (erro) {
    if (erro.response?.status === 422) {
      erroRedefinicao.value =
        'Este link é inválido ou expirou. Solicite um novo link de recuperação.'
    } else {
      erroRedefinicao.value = 'Não foi possível redefinir sua senha. Tente novamente em instantes.'
    }
  } finally {
    carregando.value = false
  }
}

onMounted(() => {
  document.title = 'Redefinir senha — Estoque Pro'

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
      titulo="Crie uma nova senha<br /> para sua conta."
      descricao="Escolha uma senha forte, com pelo menos 8 caracteres, e volte a acessar o painel do seu estoque."
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
          <h2 class="text-2xl font-semibold tracking-tight">Redefinir senha</h2>
          <p class="text-sm text-muted-foreground">Defina a sua nova senha de acesso.</p>
        </div>

        <div
          v-if="!linkValido"
          class="space-y-5"
        >
          <div
            class="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-400"
            role="alert"
          >
            <AlertCircle class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>Link de redefinição inválido ou incompleto. Solicite um novo link.</span>
          </div>
          <RouterLink
            to="/recuperar-senha"
            class="block text-center text-sm font-medium text-emerald-500 hover:text-emerald-400"
          >
            Solicitar novo link de recuperação
          </RouterLink>
        </div>

        <form v-else class="space-y-5" novalidate @submit.prevent="redefinir">
          <div class="space-y-1.5">
            <Label for="senha">Nova senha</Label>
            <div class="relative">
              <Lock class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                id="senha"
                v-model="form.senha"
                :type="mostrarSenha ? 'text' : 'password'"
                autocomplete="new-password"
                placeholder="••••••••"
                class="px-9 transition-colors"
                :class="erros.senha && 'border-red-500 focus-visible:ring-red-500/40'"
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
            <p v-else class="text-xs text-muted-foreground">Mínimo de {{ SENHA_MIN }} caracteres.</p>
          </div>

          <div class="space-y-1.5">
            <Label for="confirmarSenha">Confirmar nova senha</Label>
            <div class="relative">
              <Lock class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                id="confirmarSenha"
                v-model="form.confirmarSenha"
                :type="mostrarSenha ? 'text' : 'password'"
                autocomplete="new-password"
                placeholder="••••••••"
                class="px-9 transition-colors"
                :class="erros.confirmarSenha && 'border-red-500 focus-visible:ring-red-500/40'"
                :aria-invalid="!!erros.confirmarSenha"
                @input="limparErro('confirmarSenha')"
              />
            </div>
            <p v-if="erros.confirmarSenha" class="text-xs text-red-500">{{ erros.confirmarSenha }}</p>
          </div>

          <div
            v-if="erroRedefinicao"
            class="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-400"
            role="alert"
          >
            <AlertCircle class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{{ erroRedefinicao }}</span>
          </div>

          <Button
            type="submit"
            class="w-full cursor-pointer bg-emerald-500 text-black transition-transform hover:bg-emerald-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100"
            :disabled="!podeEnviar"
          >
            <Loader2 v-if="carregando" class="size-4 animate-spin" aria-hidden="true" />
            {{ carregando ? 'Salvando…' : 'Redefinir senha' }}
          </Button>
        </form>

        <p class="mt-8 text-center text-sm text-muted-foreground">
          Lembrou a senha?
          <RouterLink to="/login" class="font-medium text-emerald-500 hover:text-emerald-400">Entrar</RouterLink>
        </p>
      </div>
    </main>
  </div>
</template>
