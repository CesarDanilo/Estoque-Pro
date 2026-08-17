<script setup>
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-vue-next'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useFeedback } from '@/composables/useFeedBack'

const { feedback, fecharFeedback } = useFeedback()

const estilos = {
  success:
    'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 [&>svg]:text-emerald-600 dark:text-emerald-400',
  info: 'border-border',
  error: 'border-destructive/40 bg-destructive/10 text-destructive [&>svg]:text-destructive',
}
</script>

<template>
  <Teleport to="body">
    <!--
      CORRIGIDO: z-50 é o mesmo z-index que o Dialog (Radix/shadcn) usa
      para o seu overlay + conteúdo. Como os dois são teleportados para
      o <body>, quem ficava por cima dependia só da ORDEM em que cada um
      entrava no DOM — e o modal, abrindo depois, acabava vencendo e
      cobrindo o alerta.

      Usando um z-index bem mais alto (z-[100]) aqui, o FeedbackAlert
      sempre fica acima de qualquer Dialog/modal da aplicação,
      independente da ordem de montagem.
    -->
    <div
      class="pointer-events-none fixed right-4 top-4 z-[100] w-[calc(100%-2rem)] max-w-sm md:right-6 md:top-6"
    >
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 translate-x-4"
        enter-to-class="opacity-100 translate-x-0"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 translate-x-0"
        leave-to-class="opacity-0 translate-x-4"
      >
        <Alert
          v-if="feedback"
          :class="[
            'pointer-events-auto relative bg-background pr-10 shadow-lg',
            estilos[feedback.tipo],
          ]"
        >
          <CheckCircle2 v-if="feedback.tipo === 'success'" class="size-4" />
          <AlertTriangle v-else-if="feedback.tipo === 'error'" class="size-4" />
          <Info v-else class="size-4" />
          <AlertTitle>{{ feedback.titulo }}</AlertTitle>
          <AlertDescription>{{ feedback.descricao }}</AlertDescription>
          <button
            type="button"
            class="absolute right-3 top-3 cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Fechar alerta"
            @click="fecharFeedback"
          >
            <X class="size-4" />
          </button>
        </Alert>
      </Transition>
    </div>
  </Teleport>
</template>
