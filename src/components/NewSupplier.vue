<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { Loader2, Save } from 'lucide-vue-next'

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

import { useFeedback } from '@/composables/useFeedBack'

const props = defineProps({
  open: { type: Boolean, default: false },
  fornecedor: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'salvo'])

const { sucesso, erro } = useFeedback()

const NOME_MAX = 100
const DOCUMENTO_MAX = 18 // CNPJ ou CPF formatado
const TELEFONE_MAX = 15
const CIDADE_MAX = 60

const salvando = ref(false)
const erros = reactive({})

const form = reactive({
  nome: '',
  documento: '',
  telefone: '',
  cidade: '',
  ativo: true,
})

const editando = computed(() => !!props.fornecedor)

// Modeles com restrição de caracteres
const nomeModel = computed({
  get: () => form.nome,
  set: (v) => {
    form.nome = (v ?? '').slice(0, NOME_MAX)
  },
})

const documentoModel = computed({
  get: () => form.documento,
  set: (v) => {
    form.documento = (v ?? '').slice(0, DOCUMENTO_MAX)
  },
})

const telefoneModel = computed({
  get: () => form.telefone,
  set: (v) => {
    form.telefone = (v ?? '').slice(0, TELEFONE_MAX)
  },
})

const cidadeModel = computed({
  get: () => form.cidade,
  set: (v) => {
    form.cidade = (v ?? '').slice(0, CIDADE_MAX)
  },
})

watch(
  () => props.open,
  (aberto) => {
    if (!aberto) return
    preencherFormulario()
  },
)

// Limpeza automatizada de erros ao digitar
watch(
  () => form.nome,
  (v) => {
    if (erros.nome && v.trim().length >= 3) delete erros.nome
  },
)

function preencherFormulario() {
  const f = props.fornecedor

  Object.keys(erros).forEach((chave) => delete erros[chave])

  if (f) {
    form.nome = f.nome ?? ''
    form.documento = f.documento ?? ''
    form.telefone = f.telefone ?? ''
    form.cidade = f.cidade ?? ''
    form.ativo = f.status ? f.status === 'ativo' : true
  } else {
    form.nome = ''
    form.documento = ''
    form.telefone = ''
    form.cidade = ''
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

    fechar()
  }, 700)
}
</script>

<template>
  <Dialog :open="open" @update:open="(v) => emit('update:open', v)">
    <DialogContent class="w-[650px] max-w-[95vw] overflow-y-auto p-6 sm:p-8">
      <DialogHeader class="space-y-1">
        <DialogTitle class="text-xl font-semibold tracking-tight">
          {{ editando ? 'Editar fornecedor' : 'Novo fornecedor' }}
        </DialogTitle>
        <DialogDescription class="text-sm text-muted-foreground">
          Os campos marcados com <span class="text-destructive">*</span> são obrigatórios.
        </DialogDescription>
      </DialogHeader>

      <form class="space-y-6 pt-2" @submit.prevent="salvar">
        <section class="space-y-4">
          <h3 class="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Dados principais
          </h3>

          <div>
            <label for="fornecedor-nome" class="mb-1.5 block text-sm font-medium text-foreground">
              Razão social / Nome <span class="text-destructive">*</span>
            </label>
            <div class="relative">
              <Input
                id="fornecedor-nome"
                v-model="nomeModel"
                placeholder="Ex.: Distribuidora de Alimentos Silva Ltda"
                :maxlength="NOME_MAX"
                class="h-10 cursor-text pr-14"
                :class="{ 'border-destructive focus-visible:ring-destructive': erros.nome }"
                :aria-invalid="!!erros.nome"
              />
              <span
                class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 select-none text-[11px] font-medium tabular-nums transition-colors"
                :class="form.nome.length >= NOME_MAX ? 'text-red-500' : 'text-muted-foreground/40'"
              >
                {{ form.nome.length }}/{{ NOME_MAX }}
              </span>
            </div>
            <p v-if="erros.nome" class="mt-1 text-xs text-destructive font-medium">{{ erros.nome }}</p>
          </div>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label for="fornecedor-documento" class="mb-1.5 block text-sm font-medium text-foreground">
                CNPJ / CPF
              </label>
              <div class="relative">
                <Input
                  id="fornecedor-documento"
                  v-model="documentoModel"
                  placeholder="00.000.000/0000-00"
                  :maxlength="DOCUMENTO_MAX"
                  class="h-10 cursor-text"
                />
              </div>
            </div>

            <div>
              <label for="fornecedor-telefone" class="mb-1.5 block text-sm font-medium text-foreground">
                Telefone / WhatsApp
              </label>
              <div class="relative">
                <Input
                  id="fornecedor-telefone"
                  v-model="telefoneModel"
                  placeholder="(00) 00000-0000"
                  :maxlength="TELEFONE_MAX"
                  class="h-10 cursor-text"
                />
              </div>
            </div>
          </div>

          <div>
            <label for="fornecedor-cidade" class="mb-1.5 block text-sm font-medium text-foreground">
              Cidade / UF
            </label>
            <div class="relative">
              <Input
                id="fornecedor-cidade"
                v-model="cidadeModel"
                placeholder="Ex.: São Paulo — SP"
                :maxlength="CIDADE_MAX"
                class="h-10 cursor-text"
              />
            </div>
          </div>
        </section>

        <section class="space-y-4 border-t border-border pt-5">
          <div class="flex items-center justify-between gap-3 rounded-lg border border-input px-4 py-3">
            <div class="space-y-0.5">
              <label for="fornecedor-ativo" class="text-sm font-medium text-foreground cursor-pointer">
                Fornecedor ativo
              </label>
              <p class="text-xs text-muted-foreground">
                Fornecedores inativos ficam ocultos ao registrar novas compras.
              </p>
            </div>
            <Switch
              id="fornecedor-ativo"
              v-model="form.ativo"
              class="cursor-pointer data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-input"
            />
          </div>
        </section>

        <DialogFooter class="pt-2 flex gap-2 justify-end border-t border-border mt-6">
          <Button
            type="button"
            variant="outline"
            class="cursor-pointer"
            :disabled="salvando"
            @click="fechar"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            :disabled="salvando"
            class="cursor-pointer bg-emerald-500 text-black hover:bg-emerald-600 disabled:opacity-50 min-w-[140px]"
          >
            <Loader2 v-if="salvando" class="size-4 animate-spin mr-1.5" />
            <Save v-else class="size-4 mr-1.5" />
            {{ salvando ? 'Salvando…' : editando ? 'Salvar alterações' : 'Salvar fornecedor' }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>