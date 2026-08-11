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
    }
  ],
})

export default router
