import { describe, it, expect, beforeEach } from 'vitest'
import { h } from 'vue'

import { flushPromises, mount } from '@vue/test-utils'
import App from '../App.vue'
import router from '@/router'

// O layout padrão (sidebar, header) tem dependências de stores e da API; aqui basta saber se ele foi renderizado
const AppLayoutStub = { render: () => h('div', { 'data-test': 'layout' }) }

function montarApp() {
  return mount(App, {
    global: {
      plugins: [router],
      stubs: { AppLayout: AppLayoutStub },
    },
  })
}

describe('App', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renderiza o layout padrão em rotas privadas quando há token', async () => {
    localStorage.setItem('estoquepro:token', 'token-de-teste')
    await router.push('/lixeira')
    await router.isReady()

    const wrapper = montarApp()
    await flushPromises()

    expect(wrapper.find('[data-test="layout"]').exists()).toBe(true)
  })

  it('renderiza telas públicas sem o layout padrão', async () => {
    await router.push('/login')
    await router.isReady()

    const wrapper = montarApp()
    await flushPromises()

    expect(wrapper.find('[data-test="layout"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Acesse sua conta')
  })

  it('libera a recuperação de senha como rota pública', async () => {
    await router.push('/recuperar-senha')
    await router.isReady()

    const wrapper = montarApp()
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/recuperar-senha')
    expect(wrapper.find('[data-test="layout"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Recuperar senha')
  })
})
