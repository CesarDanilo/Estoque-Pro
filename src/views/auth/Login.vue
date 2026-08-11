<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { z } from 'zod'
import {
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Moon,
  Package,
  ShieldCheck,
  Sun,
} from 'lucide-vue-next'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { useFeedback } from '@/composables/useFeedBack'

const router = useRouter()
const { sucesso } = useFeedback()

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
const schema = z.object({
  email: z.string().min(1, 'Informe seu e-mail.').email('Informe um e-mail válido.'),
  senha: z
    .string()
    .min(1, 'Informe sua senha.')
    .min(6, 'A senha deve ter pelo menos 6 caracteres.'),
})

const form = reactive({
  email: '',
  senha: '',
  lembrar: true,
})

const erros = reactive({
  email: '',
  senha: '',
})

const mostrarSenha = ref(false)
const carregando = ref(false)
const erroLogin = ref('') // mensagem amigável exibida acima do botão

const podeEnviar = computed(() => form.email.length > 0 && form.senha.length > 0 && !carregando.value)

function limparErro(campo) {
  erros[campo] = ''
  erroLogin.value = ''
}

function validar() {
  const resultado = schema.safeParse({ email: form.email, senha: form.senha })
  erros.email = ''
  erros.senha = ''

  if (!resultado.success) {
    for (const issue of resultado.error.issues) {
      erros[issue.path[0]] = issue.message
    }
    return false
  }
  return true
}

async function entrar() {
  if (!validar() || carregando.value) return

  carregando.value = true
  erroLogin.value = ''
  try {
    // 🔴 AQUI: substitua pela chamada real de autenticação, ex:
    // const { data } = await api.post('/auth/login', { email: form.email, senha: form.senha })
    // localStorage.setItem('estoquepro:token', data.token)
    await new Promise((resolve, reject) =>
      setTimeout(() => {
        if (form.senha.length >= 6) resolve()
        else reject(new Error('credenciais'))
      }, 900)
    )

    if (form.lembrar) {
      localStorage.setItem('estoquepro:email', form.email)
    } else {
      localStorage.removeItem('estoquepro:email')
    }

    sucesso('Bem-vindo de volta', 'Login realizado com sucesso.')
    router.push('/')
  } catch (e) {
    // Mensagem amigável — ajuste conforme os códigos de erro reais da sua API
    erroLogin.value = 'E-mail ou senha incorretos. Verifique os dados e tente novamente.'
  } finally {
    carregando.value = false
  }
}

// 🔴 AQUI: implemente a integração real com o provedor OAuth (ex: Google Identity Services)
// Remova o botão no template caso o sistema não tenha suporte a login social.
function entrarComGoogle() {
  erroLogin.value = ''
  sucesso('Em breve', 'Login com Google ainda não está disponível.')
}

// ---------- Textura decorativa do painel de marca ----------
const barras = [30, 50, 38, 65, 45, 72, 55, 80, 60]

onMounted(() => {
  document.title = 'Entrar — Estoque Pro'

  const salvo = localStorage.getItem(TEMA_KEY)
  escuro.value = salvo ? salvo === 'dark' : true
  aplicarTema(escuro.value)

  const emailSalvo = localStorage.getItem('estoquepro:email')
  if (emailSalvo) form.email = emailSalvo
})
</script>

<template>
  <div class="grid min-h-screen grid-cols-1 bg-background text-foreground lg:grid-cols-[1fr_1.15fr]">
    <!-- Seletor de tema — discreto, fora do fluxo do formulário -->
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

    <!-- Painel de marca -->
    <aside class="relative hidden flex-col justify-between overflow-hidden bg-[#06120d] p-12 lg:flex">
      <div
        class="pointer-events-none absolute inset-0"
        style="background-image: radial-gradient(circle at 15% 10%, rgba(0,188,125,0.18), transparent 45%), radial-gradient(circle at 85% 90%, rgba(0,188,125,0.12), transparent 40%);"
      />
      <div
        class="pointer-events-none absolute inset-x-0 bottom-0 flex h-40 items-end gap-3 px-12 opacity-[0.08]"
      >
        <div
          v-for="(altura, i) in barras"
          :key="i"
          class="flex-1 rounded-t-sm bg-emerald-400"
          :style="{ height: altura + '%' }"
        />
      </div>

      <div class="relative flex items-center gap-2.5">
        <span class="grid size-9 place-items-center rounded-lg bg-emerald-500/15 text-emerald-400">
          <Package class="size-5" aria-hidden="true" />
        </span>
        <span class="text-lg font-semibold tracking-tight text-white">Estoque Pro</span>
      </div>

      <div class="relative max-w-md space-y-5">
        <h1 class="text-3xl font-semibold leading-tight text-white">
          Estoque sob controle,<br /> decisões mais rápidas.
        </h1>
        <p class="text-sm leading-relaxed text-white/60">
          Centralize vendas, compras e reposição em um único painel — sem planilha, sem
          retrabalho e sem surpresa no fim do mês.
        </p>

        <div class="flex items-center gap-2.5 pt-2 text-xs text-white/50">
          <ShieldCheck class="size-4 shrink-0 text-emerald-400" aria-hidden="true" />
          Acesso individual por usuário, com seus dados protegidos.
        </div>
      </div>

      <p class="relative text-xs text-white/30">© {{ new Date().getFullYear() }} Estoque Pro. Todos os direitos reservados.</p>
    </aside>

    <!-- Painel do formulário -->
    <main class="flex flex-col justify-center px-6 py-10 sm:px-10 md:px-16 lg:px-24">
      <div class="mx-auto w-full max-w-md">
        <div class="mb-8 flex items-center gap-2.5 lg:hidden">
          <span class="grid size-8 place-items-center rounded-lg bg-emerald-500/15 text-emerald-500">
            <Package class="size-4" aria-hidden="true" />
          </span>
          <span class="text-base font-semibold tracking-tight">Estoque Pro</span>
        </div>

        <div class="mb-8 space-y-1.5">
          <h2 class="text-2xl font-semibold tracking-tight">Acesse sua conta</h2>
          <p class="text-sm text-muted-foreground">
            Entre com suas credenciais para continuar.
          </p>
        </div>

        <form class="space-y-5" novalidate @submit.prevent="entrar">
          <div class="space-y-1.5">
            <Label for="email">E-mail</Label>
            <div class="relative">
              <Mail class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                id="email"
                v-model="form.email"
                type="email"
                autocomplete="email"
                placeholder="voce@empresa.com"
                class="pl-9 transition-colors"
                :class="erros.email && 'border-red-500 focus-visible:ring-red-500/40'"
                :aria-invalid="!!erros.email"
                @input="limparErro('email')"
              />
            </div>
            <p v-if="erros.email" class="text-xs text-red-500">{{ erros.email }}</p>
          </div>

          <div class="space-y-1.5">
            <div class="flex items-center justify-between">
              <Label for="senha">Senha</Label>
              <RouterLink to="/recuperar-senha" class="text-xs font-medium text-emerald-500 hover:text-emerald-400">
                Esqueceu a senha?
              </RouterLink>
            </div>
            <div class="relative">
              <Lock class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                id="senha"
                v-model="form.senha"
                :type="mostrarSenha ? 'text' : 'password'"
                autocomplete="current-password"
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
          </div>

          <div class="flex items-center gap-2">
            <Checkbox id="lembrar" v-model:checked="form.lembrar" class="cursor-pointer" />
            <Label for="lembrar" class="cursor-pointer text-sm font-normal text-muted-foreground">
              Lembrar meu e-mail
            </Label>
          </div>

          <!-- Erro de autenticação -->
          <div
            v-if="erroLogin"
            class="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-400"
            role="alert"
          >
            <AlertCircle class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{{ erroLogin }}</span>
          </div>

          <Button
            type="submit"
            class="w-full cursor-pointer bg-emerald-500 text-black transition-transform hover:bg-emerald-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100"
            :disabled="!podeEnviar"
          >
            <Loader2 v-if="carregando" class="size-4 animate-spin" aria-hidden="true" />
            {{ carregando ? 'Entrando…' : 'Entrar' }}
          </Button>
        </form>

        <!-- Login social — remova se o sistema não tiver suporte a OAuth -->
        <div class="my-6 flex items-center gap-3">
          <span class="h-px flex-1 bg-border" />
          <span class="text-xs text-muted-foreground">ou continue com</span>
          <span class="h-px flex-1 bg-border" />
        </div>

        <Button
          type="button"
          variant="outline"
          class="w-full cursor-pointer"
          @click="entrarComGoogle"
        >
          <svg class="size-4" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.87c2.27-2.09 3.58-5.17 3.58-8.82Z" />
            <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.95H1.28v3.1A11.998 11.998 0 0 0 12 24Z" />
            <path fill="#FBBC05" d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58v-3.1H1.28a12 12 0 0 0 0 10.78l3.99-3.1Z" />
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.28 6.61l3.99 3.1C6.22 6.86 8.87 4.75 12 4.75Z" />
          </svg>
          Continuar com Google
        </Button>

        <div class="mt-8 space-y-2 text-center">
          <p class="text-xs text-muted-foreground">
            Precisa de acesso? Solicite ao administrador da sua empresa.
          </p>
          <p class="text-xs text-muted-foreground">
            <a href="mailto:suporte@estoquepro.com" class="hover:text-foreground">Precisa de ajuda? Fale com o suporte</a>
          </p>
          <p class="text-[11px] text-muted-foreground/70">
            <a href="/termos" class="hover:text-foreground">Termos de uso</a>
            <span class="mx-1.5">·</span>
            <a href="/privacidade" class="hover:text-foreground">Política de privacidade</a>
          </p>
        </div>
      </div>
    </main>
  </div>
</template>