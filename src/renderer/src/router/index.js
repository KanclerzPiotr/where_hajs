import { createRouter, createWebHashHistory } from 'vue-router'
import LandingPage from '../views/LandingPage/LandingPage.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: LandingPage
    },
    {
      path: '/categorizer',
      name: 'Categorizer',
      component: () => import('../views/Categorizer/Categorizer.vue')
    },
    {
      path: '/display-data',
      name: 'DisplayData',
      component: () => import('../views/DisplayData/DisplayData.vue')
    },
    {
      path: '/configure-headers',
      name: 'configure-headers',
      component: () => import('../views/ConfigureHeaders/ConfigureHeaders.vue')
    },
    {
      path: '/transactions',
      name: 'transactions',
      component: () => import('../views/Transactions.vue')
    }
  ]
})

export default router
