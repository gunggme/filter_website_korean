import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

// Material Icons 스타일시트 추가
const link = document.createElement('link')
link.rel = 'stylesheet'
link.href = 'https://fonts.googleapis.com/icon?family=Material+Icons'
document.head.appendChild(link)

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
