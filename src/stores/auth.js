import { defineStore } from 'pinia'
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
        this.usuario = null
      }
    },
  },
})