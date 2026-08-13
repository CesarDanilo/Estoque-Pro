import { defineStore, getActivePinia } from 'pinia'
import * as authService from '@/services/auth'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    usuario: null,
    carregandoUsuario: false,
  }),

  getters: {
    logado: (state) => !!state.usuario,
    iniciais: (state) => {
      if (!state.usuario?.name) return '??'
      return state.usuario.name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((parte) => parte[0].toUpperCase())
        .join('')
    },
  },

  actions: {
    async buscarUsuarioLogado() {
      this.carregandoUsuario = true
      try {
        this.usuario = await authService.usuarioLogado()
      } catch {
        this.usuario = null
      } finally {
        this.carregandoUsuario = false
      }
    },

    async logout() {
      try {
        await authService.logout()
      } finally {
        // 1. Limpa o Cache Storage (Cache API)
        if ('caches' in window) {
          const cacheNames = await caches.keys()
          await Promise.all(cacheNames.map((name) => caches.delete(name)))
        }

        // 2. Desregistra Service Workers (se houver PWA / cache de rede ativos)
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations()
          for (const registration of registrations) {
            await registration.unregister()
          }
        }

        // 3. Limpa Web Storage local
        localStorage.clear()
        sessionStorage.clear()

        // 4. (Opcional) Limpa os bancos de dados do IndexedDB
        if (window.indexedDB && indexedDB.databases) {
          const dbs = await indexedDB.databases()
          dbs.forEach((db) => {
            if (db.name) indexedDB.deleteDatabase(db.name)
          })
        }

        // 5. Reseta todos os Stores do Pinia ativos
        const pinia = getActivePinia()
        if (pinia) {
          Object.values(pinia._s).forEach((store) => store.$reset())
        }

        // 6. Redireciona forçando o recarregamento total da página
        window.location.href = '/login'
      }
    },
  },
})
