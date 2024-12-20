import { createRouter, createWebHistory } from 'vue-router'
import CameraSetupView from '@/views/CameraSetupView.vue'
import FinalView from '@/views/FinalView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/camera-setup'
    },
    {
      path: '/camera-setup',
      name: 'camera-setup',
      component: CameraSetupView
    },
    {
      path: '/filter',
      name: 'filter',
      component: FinalView
    }
  ]
})

export default router
