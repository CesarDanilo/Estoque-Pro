<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { z } from 'zod'
import {
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Moon,
  Package,
  ShieldCheck,
  Sun,
  TrendingUp,
} from 'lucide-vue-next'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { useFeedback } from '@/composables/useFeedBack'

const router = useRouter()
const { sucesso, erro } = useFeedback()

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

const podeEnviar = computed(() => form.email.length > 0 && form.senha.length > 0 && !carregando.value)

function limparErro(campo) {
  erros[campo] = ''
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
  try {
    // 🔴 AQUI: substitua pela chamada real de autenticação, ex:
    // const { data } = await api.post('/auth/login', { email: form.email, senha: form.senha })
    // authStore.definirSessao(data)
    await new Promise((resolve, reject) =>
      setTimeout(() => {
        if (form.senha.length >= 6) resolve()
        else reject(new Error('Credenciais inválidas'))
      }, 900)
    )

    if (form.lembrar) {
      localStorage.setItem('estoquepro:email', form.email)
    } else {
      localStorage.removeItem('estoquepro:email')
    }

    sucesso('Bem-vindo de volta', 'Login realizado com sucesso.')
    router.push('/')
  } catch {
    erro?.('Não foi possível entrar', 'Verifique seu e-mail e senha e tente novamente.')
  } finally {
    carregando.value = false
  }
}

// ---------- Barras decorativas do painel de marca ----------
const barras = [38, 62, 48, 80, 55, 90, 70]

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
  <div class="grid min-h-screen grid-cols-1 bg-background text-foreground lg:grid-cols-[1.05fr_1fr]">
    <!-- Painel de marca -->
    <aside class="relative hidden flex-col justify-between overflow-hidden bg-[#06120d] p-12 lg:flex">
      <div
        class="pointer-events-none absolute inset-0"
        style="background-image: radial-gradient(circle at 15% 10%, rgba(0,188,125,0.18), transparent 45%), radial-gradient(circle at 85% 90%, rgba(0,188,125,0.12), transparent 40%);"
      />
      <div
        class="pointer-events-none absolute inset-0 opacity-[0.07]"
        style="background-image: linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px); background-size: 32px 32px;"
      />

      <div class="relative flex items-center gap-2.5">
        <span class="grid size-9 place-items-center rounded-lg bg-emerald-500/15 text-emerald-400">
          <Package class="size-5" aria-hidden="true" />
        </span>
        <span class="text-lg font-semibold tracking-tight text-white">Estoque Pro</span>
      </div>

      <div class="relative max-w-md space-y-8">
        <div class="space-y-3">
          <h1 class="text-3xl font-semibold leading-tight text-white">
            Cada venda, cada compra,<br /> em um só painel.
          </h1>
          <p class="text-sm leading-relaxed text-white/60">
            Acompanhe estoque, vendas e reposição em tempo real — sem planilha, sem retrabalho.
          </p>
        </div>

        <!-- Visualização decorativa (eco do gráfico do Dashboard) -->
        <div class="rounded-xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
          <div class="mb-4 flex items-center justify-between">
            <span class="text-xs font-medium text-white/50">Vendas por dia</span>
            <span class="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
              <TrendingUp class="size-3.5" aria-hidden="true" />
              +18%
            </span>
          </div>
          <div class="flex h-24 items-end gap-2">
            <div
              v-for="(altura, i) in barras"
              :key="i"
              class="flex-1 rounded-t-sm bg-gradient-to-t from-emerald-500/90 to-emerald-400/60 motion-safe:transition-all motion-safe:duration-700"
              :style="{ height: altura + '%' }"
            />
          </div>
        </div>

        <div class="flex items-center gap-2.5 text-xs text-white/50">
          <ShieldCheck class="size-4 shrink-0 text-emerald-400" aria-hidden="true" />
          Seus dados protegidos com acesso individual por usuário.
        </div>
      </div>

      <p class="relative text-xs text-white/30">© {{ new Date().getFullYear() }} Estoque Pro. Todos os direitos reservados.</p>
    </aside>

    <!-- Painel do formulário -->
    <main class="flex flex-col justify-center px-6 py-10 sm:px-10 md:px-16 lg:px-20">
      <div class="mx-auto w-full max-w-sm">
        <div class="mb-8 flex items-center justify-between lg:justify-end">
          <div class="flex items-center gap-2.5 lg:hidden">
            <span class="grid size-8 place-items-center rounded-lg bg-emerald-500/15 text-emerald-500">
              <Package class="size-4" aria-hidden="true" />
            </span>
            <span class="text-base font-semibold tracking-tight">Estoque Pro</span>
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon"
            class="cursor-pointer"
            :aria-label="escuro ? 'Ativar tema claro' : 'Ativar tema escuro'"
            @click="alternarTema"
          >
            <Sun v-if="escuro" class="size-4" aria-hidden="true" />
            <Moon v-else class="size-4" aria-hidden="true" />
          </Button>
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
                class="pl-9"
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
                Esqueci minha senha
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
                class="px-9"
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

          <Button
            type="submit"
            class="w-full cursor-pointer bg-emerald-500 text-black hover:bg-emerald-600 disabled:cursor-not-allowed"
            :disabled="!podeEnviar"
          >
            <Loader2 v-if="carregando" class="size-4 animate-spin" aria-hidden="true" />
            {{ carregando ? 'Entrando…' : 'Entrar' }}
          </Button>
        </form>

        <p class="mt-8 text-center text-xs text-muted-foreground">
          Ainda não tem acesso? Fale com o administrador do sistema.
        </p>
      </div>
    </main>
  </div>
</template>