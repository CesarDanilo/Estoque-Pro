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
import { Textarea } from '@/components/ui/textarea'

import { useFeedback } from '@/composables/useFeedBack'
import { useGroups } from '@/composables/useGroups'

const props = defineProps({
  open: { type: Boolean, default: false },
  grupo: { type: Object, default: null },
})

// 🔴 CORRIGIDO: faltavam 'created' e 'updated' — era por isso que o
// NewProduct.vue (e qualquer outro lugar que use este modal) nunca recebia
// aviso nenhum de que um grupo tinha sido criado/atualizado.
const emit = defineEmits(['update:open', 'created', 'updated'])

const { createMutation, updateMutation } = useGroups()
const { sucesso, erro } = useFeedback()

const NOME_MAX = 60
const DESCRICAO_MAX = 250

const erros = reactive({})
const form = reactive({
  nome: '',
  descricao: '',
  ativo: true,
})

const editando = computed(() => !!props.grupo?.id)
const salvando = computed(() => createMutation.isPending.value || updateMutation.isPending.value)

const nomeModel = computed({
  get: () => form.nome,
  set: (v) => {
    form.nome = (v ?? '').slice(0, NOME_MAX)
  },
})

const descricaoModel = computed({
  get: () => form.descricao,
  set: (v) => {
    form.descricao = (v ?? '').slice(0, DESCRICAO_MAX)
  },
})

watch(
  () => props.open,
  (aberto) => {
    if (!aberto) return
    preencherFormulario()
  },
)

function preencherFormulario() {
  const g = props.grupo
  Object.keys(erros).forEach((chave) => delete erros[chave])

  if (g) {
    form.nome = g.name ?? ''
    form.descricao = g.description ?? ''
    form.ativo = typeof g.active !== 'undefined' ? Boolean(g.active) : true
  } else {
    form.nome = ''
    form.descricao = ''

    // Todo grupo novo nasce ativo. Como o campo "Grupo ativo" só é
    // exibido em modo de edição (ver template), não faz sentido
    // perguntar isso na criação — o usuário ativa/desativa depois,
    // se precisar.
    form.ativo = true
  }
}

function fechar() {
  emit('update:open', false)
}

function validar() {
  Object.keys(erros).forEach((chave) => delete erros[chave])

  if (form.nome.trim().length < 3) {
    erros.nome = 'Informe o nome do grupo (mínimo 3 caracteres).'
  }

  return Object.keys(erros).length === 0
}

function salvar() {
  if (salvando.value) return

  if (!validar()) {
    erro('Confira os campos destacados antes de salvar.')
    return
  }

  const payload = {
    name: form.nome,
    description: form.descricao || null,
    active: form.ativo,
  }

  if (editando.value) {
    updateMutation.mutate(
      { id: props.grupo.id, payload },
      {
        // 🔴 CORRIGIDO: agora recebe o retorno da mutation (res) e emite
        // 'updated' com o grupo atualizado, desembrulhando `res.data` caso
        // a API retorne no formato { data: {...} } (padrão Laravel Resource).
        onSuccess: (res) => {
          const grupoSalvo = res?.data ?? res
          sucesso('Grupo atualizado', 'Grupo atualizado com sucesso.')
          emit('updated', grupoSalvo)
          fechar()
        },
        onError: (err) => {
          erro('Erro ao salvar', err.response?.data?.message || 'Erro ao atualizar grupo.')
        },
      },
    )
  } else {
    createMutation.mutate(payload, {
      // 🔴 CORRIGIDO: mesma coisa aqui — é ESTE emit que faltava e que
      // fazia o grupo novo nunca chegar até o NewProduct.vue.
      onSuccess: (res) => {
        const grupoSalvo = res?.data ?? res
        sucesso('Grupo cadastrado', 'Grupo cadastrado com sucesso.')
        emit('created', grupoSalvo)
        fechar()
      },
      onError: (err) => {
        erro('Erro ao salvar', err.response?.data?.message || 'Erro ao cadastrar grupo.')
      },
    })
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="(v) => emit('update:open', v)">
    <DialogContent class="w-[560px] max-w-[95vw] overflow-y-auto p-6 sm:p-8">
      <DialogHeader class="space-y-1">
        <DialogTitle class="text-xl font-semibold tracking-tight">
          {{ editando ? 'Editar grupo' : 'Novo grupo' }}
        </DialogTitle>
        <DialogDescription class="text-sm text-muted-foreground">
          Os campos marcados com <span class="text-destructive">*</span> são obrigatórios.
        </DialogDescription>
      </DialogHeader>

      <form class="space-y-6 pt-2" @submit.prevent="salvar">
        <section class="space-y-4">
          <h3 class="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Informações do grupo
          </h3>

          <div>
            <label for="grupo-nome" class="mb-1.5 block text-sm font-medium text-foreground">
              Nome do grupo <span class="text-destructive">*</span>
            </label>
            <div class="relative">
              <Input
                id="grupo-nome"
                v-model="nomeModel"
                placeholder="Ex.: Bebidas, Mercearia, Limpeza..."
                :maxlength="NOME_MAX"
                class="h-10 cursor-text pr-14"
                :class="{ 'border-destructive focus-visible:ring-destructive': erros.nome }"
              />
              <span
                class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 select-none text-[11px] font-medium tabular-nums text-muted-foreground/40"
              >
                {{ form.nome.length }}/{{ NOME_MAX }}
              </span>
            </div>
            <p v-if="erros.nome" class="mt-1 text-xs text-destructive font-medium">
              {{ erros.nome }}
            </p>
          </div>

          <div>
            <label for="grupo-descricao" class="mb-1.5 block text-sm font-medium text-foreground">
              Descrição (opcional)
            </label>
            <div class="relative">
              <Textarea
                id="grupo-descricao"
                v-model="descricaoModel"
                placeholder="Descreva quais tipos de produtos pertencem a esta categoria..."
                class="cursor-text pr-16"
                rows="3"
                :maxlength="DESCRICAO_MAX"
              />
              <span
                class="pointer-events-none absolute bottom-2 right-3 select-none text-[11px] font-medium tabular-nums text-muted-foreground/40"
              >
                {{ form.descricao.length }}/{{ DESCRICAO_MAX }}
              </span>
            </div>
          </div>
        </section>

        <!--
          "Grupo ativo" só aparece quando estamos EDITANDO um grupo
          já existente. Na criação, todo grupo novo já nasce ativo
          por padrão (form.ativo = true), então não faz sentido
          perguntar isso nesse momento.
        -->
        <section v-if="editando" class="space-y-4 border-t border-border pt-5">
          <div
            class="flex items-center justify-between gap-3 rounded-lg border border-input px-4 py-3"
          >
            <div class="space-y-0.5">
              <label for="grupo-ativo" class="text-sm font-medium text-foreground cursor-pointer">
                Grupo ativo
              </label>
              <p class="text-xs text-muted-foreground">
                Grupos inativos ficam ocultos na seleção de novos cadastros de produtos.
              </p>
            </div>
            <Switch
              id="grupo-ativo"
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
            class="cursor-pointer bg-emerald-500 text-black hover:bg-emerald-600 disabled:opacity-50 min-w-[130px]"
          >
            <Loader2 v-if="salvando" class="size-4 animate-spin mr-1.5" />
            <Save v-else class="size-4 mr-1.5" />
            {{ salvando ? 'Salvando…' : editando ? 'Salvar alterações' : 'Salvar grupo' }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
