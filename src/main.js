import { createApp } from 'vue'
import App from './App.vue'
import router from './router.js'
import { setupRouteLoading } from './composables/useRouteLoading.js'
import './style.css'

setupRouteLoading(router)
createApp(App).use(router).mount('#app')
