import { createRouter, createWebHistory } from 'vue-router'
import Home from './views/Home.vue'
import Base64 from './views/Base64.vue'
import Gzip from './views/Gzip.vue'

const routes = [
  { path: '/', component: Home },
  { path: '/base64', component: Base64 },
  { path: '/gzip', component: Gzip },
]

export default createRouter({
  history: createWebHistory(),
  routes,
})
