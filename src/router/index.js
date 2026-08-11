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
    }

  ],
})

export default router
