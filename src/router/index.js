import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: () => import('@/views/DashboardView.vue'),
    },
    {
      path: '/pessoas',
      name: 'pessoas',
      component: () => import('@/views/PersonView.vue'),
    },
    {
      path: '/produtos',
      name: 'produtos',
      component: () => import('@/views/ProductView.vue'),
    },
    {
      path: '/vendas',
      name: 'vendas',
      component: () => import('@/views/SaleView.vue'),
    },
    {
      path: '/usuarios',
      name: 'usuarios',
      component: () => import('@/views/UserView.vue'),
    },
    {
      path: '/grupos',
      name: 'grupos',
      component: () => import('@/views/GroupsView.vue'),
    },
    {
      path: '/fornecedores',
      name: 'fornecedores',
      component: () => import('@/views/SuppliersView.vue'),
    },
    {
      path: '/compras',
      name: 'compras',
      component: () => import('@/views/PurchasesView.vue'),
    },
    {
      path: '/compras/nova',
      name: 'compras-nova',
      component: () => import('@/views/NewPurchaseView.vue'),
    },
    {
      path: '/relatorios',
      name: 'relatorios',
      component: () => import('@/views/ReportsView.vue'),
    },
    // Rotas públicas (não exigem login) ficam com meta.public: true
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/auth/Login.vue'),
      meta: { public: true },
    },
    {
      path: '/cadastro',
      name: 'cadastro',
      component: () => import('@/views/auth/Register.vue'),
      meta: { public: true },
    },
  ],
})

// 🔴 AQUI: troque pela checagem real de sessão quando integrar a API de auth
router.beforeEach((to) => {
  const autenticado = !!localStorage.getItem('estoquepro:token')

  if (!to.meta.public && !autenticado) {
    return { name: 'login' }
  }
  if (to.name === 'login' && autenticado) {
    return '/'
  }
})

export default router