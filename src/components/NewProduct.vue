<script setup>
import { computed, ref, watch } from 'vue'
import { Loader2, Save } from 'lucide-vue-next'

import FieldLabel from '@/components/ui-kit/FieldLabel.vue'
import { useFeedback } from '@/composables/useFeedBack'

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'

import { brl, grupos, marcas, subgrupos } from '@/lib/mockDataProdutos'

const props = defineProps({
  open: { type: Boolean, default: false },
  produto: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'salvo'])

const { sucesso, info } = useFeedback()

const salvando = ref(false)
const erros = ref({})

function estadoInicial() {
  return {
    nome: '',
    sku: '',
    grupo: '',
    subgrupo: '',
    marca: '',
    custo: '',
    preco: '',
    estoque: '0',
    minimo: '0',
    ativo: true,
    descricao: '',
  }
}

const f = ref(estadoInicial())
const editando = computed(() => !!props.produto)

watch(
  () => props.open,
  (aberto) => {
    if (!aberto) return
    erros.value = {}
    f.value = props.produto
      ? {
          nome: props.produto.nome ?? '',
          sku: props.produto.sku ?? '',
          grupo: props.produto.grupo ?? '',
          subgrupo: props.produto.subgrupo ?? '',
          marca: props.produto.marca ?? '',
          custo: String(props.produto.custo ?? ''),
          preco: String(props.produto.preco ?? ''),
          estoque: String(props.produto.estoque ?? '0'),
          minimo: String(props.produto.minimo ?? '0'),
          ativo: props.produto.status ? props.produto.status === 'ativo' : true,
          descricao: props.produto.descricao ?? '',
        }
      : estadoInicial()
  },
)

const subgruposFiltrados = computed(() => subgrupos.filter((s) => s.grupo === f.value.grupo))

const margem = computed(() => {
  const preco = Number(f.value.preco)
  const custo = Number(f.value.custo)
  return preco > 0 && custo > 0 ? ((preco - custo) / preco) * 100 : null
})

function onGrupoChange(v) {
  f.value.grupo = v
  f.value.subgrupo = ''
}

function fechar() {
  emit('update:open', false)
}

function salvar() {
  if (salvando.value) return

  const e = {}
  if (f.value.nome.trim().length < 3) e.nome = 'Informe o nome do produto.'
  if (!f.value.sku.trim()) e.sku = 'Informe um código para identificar o produto.'
  if (!f.value.grupo) e.grupo = 'Escolha um grupo.'
  if (!(Number(f.value.preco) > 0)) e.preco = 'Informe o preço de venda.'
  erros.value = e

  if (Object.keys(e).length > 0) {
    info('Campos incompletos', 'Confira os campos destacados antes de salvar.')
    return
  }

  salvando.value = true
  setTimeout(() => {
    salvando.value = false
    sucesso(
      editando.value ? 'Produto atualizado' : 'Produto cadastrado',
      editando.value ? 'Produto atualizado com sucesso.' : 'Produto cadastrado com sucesso.',
    )
    emit('salvo', { ...f.value })
    emit('update:open', false)
  }, 900)
}
</script>

<template>
  <Dialog :open="open" @update:open="(v) => emit('update:open', v)">
    <DialogContent class="max-h-[90vh] max-w-2xl overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{{ editando ? 'Editar produto' : 'Novo produto' }}</DialogTitle>
        <DialogDescription>
          {{
            editando
              ? 'Atualize as informações do produto.'
              : 'Preencha as informações básicas. Você pode ajustar tudo depois.'
          }}
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-5 py-2">
        <div class="grid gap-4 md:grid-cols-2">
          <div class="md:col-span-2">
            <FieldLabel for="modal-nome" obrigatorio>Nome do produto</FieldLabel>
            <Input
              id="modal-nome"
              v-model="f.nome"
              placeholder="Ex.: Arroz Branco Tipo 1 — 5kg"
              :aria-invalid="!!erros.nome"
              class="h-10 bg-surface"
            />
            <p v-if="erros.nome" class="mt-1 text-xs text-destructive">{{ erros.nome }}</p>
          </div>

          <div>
            <FieldLabel for="modal-sku" obrigatorio dica="Usado na busca rápida da venda.">
              Código (SKU)
            </FieldLabel>
            <Input
              id="modal-sku"
              v-model="f.sku"
              placeholder="MER-0101"
              :aria-invalid="!!erros.sku"
              class="h-10 bg-surface"
            />
            <p v-if="erros.sku" class="mt-1 text-xs text-destructive">{{ erros.sku }}</p>
          </div>

          <div>
            <FieldLabel for="modal-marca">Marca</FieldLabel>
            <Select v-model="f.marca">
              <SelectTrigger id="modal-marca" class="h-10 cursor-pointer bg-surface">
                <SelectValue placeholder="Selecione a marca" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="m in marcas"
                  :key="m.id"
                  :value="m.nome"
                  class="cursor-pointer"
                >
                  {{ m.nome }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <div>
            <FieldLabel for="modal-grupo" obrigatorio>Grupo</FieldLabel>
            <Select :model-value="f.grupo" @update:model-value="onGrupoChange">
              <SelectTrigger
                id="modal-grupo"
                class="h-10 cursor-pointer bg-surface"
                :aria-invalid="!!erros.grupo"
              >
                <SelectValue placeholder="Selecione o grupo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="g in grupos"
                  :key="g.id"
                  :value="g.nome"
                  class="cursor-pointer"
                >
                  {{ g.nome }}
                </SelectItem>
              </SelectContent>
            </Select>
            <p v-if="erros.grupo" class="mt-1 text-xs text-destructive">{{ erros.grupo }}</p>
          </div>

          <div>
            <FieldLabel for="modal-subgrupo" :dica="!f.grupo ? 'Escolha um grupo primeiro.' : undefined">
              Subgrupo
            </FieldLabel>
            <Select v-model="f.subgrupo" :disabled="!f.grupo">
              <SelectTrigger id="modal-subgrupo" class="h-10 cursor-pointer bg-surface">
                <SelectValue placeholder="Selecione o subgrupo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="s in subgruposFiltrados"
                  :key="s.id"
                  :value="s.nome"
                  class="cursor-pointer"
                >
                  {{ s.nome }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <div>
            <FieldLabel for="modal-custo">Custo de compra (R$)</FieldLabel>
            <Input id="modal-custo" v-model="f.custo" type="number" min="0" step="0.01" class="h-10 bg-surface" />
          </div>

          <div>
            <FieldLabel for="modal-preco" obrigatorio>Preço de venda (R$)</FieldLabel>
            <Input
              id="modal-preco"
              v-model="f.preco"
              type="number"
              min="0"
              step="0.01"
              :aria-invalid="!!erros.preco"
              class="h-10 bg-surface"
            />
            <p v-if="erros.preco" class="mt-1 text-xs text-destructive">{{ erros.preco }}</p>
          </div>

          <div>
            <FieldLabel for="modal-estoque" dica="Entradas futuras vêm das compras.">
              Estoque inicial
            </FieldLabel>
            <Input id="modal-estoque" v-model="f.estoque" type="number" min="0" class="h-10 bg-surface" />
          </div>

          <div>
            <FieldLabel for="modal-minimo" dica="Avisamos quando o estoque chegar nesse número.">
              Estoque mínimo
            </FieldLabel>
            <Input id="modal-minimo" v-model="f.minimo" type="number" min="0" class="h-10 bg-surface" />
          </div>

          <div
            v-if="margem !== null"
            class="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm md:col-span-2"
          >
            Margem estimada:
            <span class="font-semibold text-primary">{{ margem.toFixed(1) }}%</span>
            · lucro de {{ brl(Number(f.preco) - Number(f.custo)) }} por unidade
          </div>
        </div>

        <div class="space-y-4">
          <div>
            <FieldLabel for="modal-descricao">Descrição (opcional)</FieldLabel>
            <Textarea
              id="modal-descricao"
              v-model="f.descricao"
              placeholder="Informações que ajudam quem vende: tamanho, sabor, embalagem…"
              class="bg-surface"
              rows="3"
            />
          </div>
          <div class="flex items-center justify-between gap-4">
            <div>
              <p class="text-label">Produto ativo</p>
              <p class="text-meta mt-0.5">Produtos inativos não aparecem em novas vendas.</p>
            </div>
            <Switch v-model:checked="f.ativo" aria-label="Produto ativo" />
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" class="cursor-pointer" @click="fechar">Cancelar</Button>
        <Button class="cursor-pointer" :disabled="salvando" @click="salvar">
          <Loader2 v-if="salvando" class="size-4 animate-spin" />
          <Save v-else class="size-4" />
          {{ salvando ? 'Salvando…' : editando ? 'Salvar alterações' : 'Salvar produto' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>