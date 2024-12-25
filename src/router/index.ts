import { createRouter, createWebHistory } from 'vue-router'
import CameraSetupView from '@/views/CameraSetupView.vue'
import FinalView from '@/views/FinalView.vue'
import PreviewView from '@/views/PreviewView.vue'

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
      path: '/final',
      name: 'final',
      component: FinalView
    },
    {
      path: '/preview',
      name: 'preview',
      component: PreviewView
    }
  ]
})

export default router
