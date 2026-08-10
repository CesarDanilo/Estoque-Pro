import { defineStore } from 'pinia'

const STORAGE_KEY = 'theme'

function prefereSistemaDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function aplicarClasse(dark) {
  document.documentElement.classList.toggle('dark', dark)
}

export const useThemeStore = defineStore('theme', {
  state: () => ({
    dark: false,
  }),
  actions: {
    iniciar() {
      const salvo = localStorage.getItem(STORAGE_KEY)
      this.dark = salvo ? salvo === 'dark' : prefereSistemaDark()
      aplicarClasse(this.dark)
    },
    alternar() {
      this.dark = !this.dark
      localStorage.setItem(STORAGE_KEY, this.dark ? 'dark' : 'light')
      aplicarClasse(this.dark)
    },
  },
})