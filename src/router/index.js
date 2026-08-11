import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: () => import('@/views/DashboardView.vue')
    },
    {
      path: '/pessoas',
      name: 'pessoas',
      component: () => import('@/views/PersonView.vue')
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
    }



  ],
})

export default router
