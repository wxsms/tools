import { createRouter, createWebHistory } from 'vue-router'
import Home from './views/Home.vue'
import Base64 from './views/Base64.vue'

const routes = [
  { path: '/', component: Home },
  { path: '/base64', component: Base64 },
]

export default createRouter({
  history: createWebHistory(),
  routes,
})
