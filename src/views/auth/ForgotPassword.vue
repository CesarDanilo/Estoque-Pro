<script setup>
import { onMounted, reactive, ref, computed } from 'vue'
import { z } from 'zod'
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Mail, Moon, Package, Sun } from 'lucide-vue-next'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import AuthBrandPanel from '@/components/auth/AuthBrandPanel.vue'
import { solicitarRecuperacaoSenha } from '@/services/auth'

const MENSAGEM_PADRAO =
  'Se o e-mail estiver cadastrado, você receberá as instruções para redefinir sua senha.'

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
})

const form = reactive({
  email: '',
})

const erros = reactive({
  email: '',
})

const carregando = ref(false)
const erroEnvio = ref('')
const mensagemSucesso = ref('')

const podeEnviar = computed(() => form.email.trim().length > 0 && !carregando.value)

function limparErro() {
  erros.email = ''
  erroEnvio.value = ''
}

function validar() {
  const resultado = schema.safeParse({ email: form.email.trim() })
  erros.email = ''

  if (!resultado.success) {
    erros.email = resultado.error.issues[0].message
    return false
  }
  return true
}

async function enviar() {
  if (!validar() || carregando.value) return

  carregando.value = true
  erroEnvio.value = ''
  try {
    const data = await solicitarRecuperacaoSenha({ email: form.email.trim() })
    mensagemSucesso.value = data?.message || MENSAGEM_PADRAO
  } catch (erro) {
    if (erro.response?.status === 422) {
      erroEnvio.value = 'Informe um e-mail válido.'
    } else {
      erroEnvio.value = 'Não foi possível conectar ao servidor. Tente novamente em instantes.'
    }
  } finally {
    carregando.value = false
  }
}

onMounted(() => {
  document.title = 'Recuperar senha — Estoque Pro'

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
      titulo="Recupere o acesso<br /> em poucos minutos."
      descricao="Enviaremos um link seguro para o seu e-mail. Assim que a senha for redefinida, você volta para o painel."
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
          <h2 class="text-2xl font-semibold tracking-tight">Recuperar senha</h2>
          <p class="text-sm text-muted-foreground">
            Informe o e-mail da sua conta para receber as instruções.
          </p>
        </div>

        <form v-if="!mensagemSucesso" class="space-y-5" novalidate @submit.prevent="enviar">
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
                @input="limparErro"
              />
            </div>
            <p v-if="erros.email" class="text-xs text-red-500">{{ erros.email }}</p>
          </div>

          <div
            v-if="erroEnvio"
            class="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-400"
            role="alert"
          >
            <AlertCircle class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{{ erroEnvio }}</span>
          </div>

          <Button
            type="submit"
            class="w-full cursor-pointer bg-emerald-500 text-black transition-transform hover:bg-emerald-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100"
            :disabled="!podeEnviar"
          >
            <Loader2 v-if="carregando" class="size-4 animate-spin" aria-hidden="true" />
            {{ carregando ? 'Enviando…' : 'Enviar instruções' }}
          </Button>
        </form>

        <div
          v-else
          class="flex items-start gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-400"
          role="status"
        >
          <CheckCircle2 class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{{ mensagemSucesso }}</span>
        </div>

        <p class="mt-8 text-center text-sm text-muted-foreground">
          <RouterLink to="/login" class="inline-flex items-center gap-1.5 font-medium text-emerald-500 hover:text-emerald-400">
            <ArrowLeft class="size-3.5" aria-hidden="true" />
            Voltar para o login
          </RouterLink>
        </p>
      </div>
    </main>
  </div>
</template>
