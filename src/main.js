import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'

import App from './App.vue'
import router from './router'
import './assets/main.css'
import '@/lib/chartSetup'

import { useThemeStore } from '@/stores/theme'

const app = createApp(App)

// 1. Instala as dependências base (Pinia precisa ser instalado ANTES de usar qualquer store)
app.use(createPinia())
app.use(router)

// 2. Registra o TanStack Query com configurações de cache
app.use(VueQueryPlugin, {
  queryClientConfig: {
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // Mantém os dados no cache por 5 minutos
        refetchOnWindowFocus: false, // Evita requisições extras ao trocar de aba no navegador
        retry: 1, // Tenta reexecutar a requisição 1 vez em caso de falha
      },
    },
  },
})

// 3. Inicializa a store do tema (agora que o Pinia já está ativo)
useThemeStore().iniciar()

// 4. Monta a aplicação
app.mount('#app')
