import { createRouter, createWebHistory } from 'vue-router'
import Home from './views/Home.vue'
import Base64 from './views/Base64.vue'
import Gzip from './views/Gzip.vue'
import MD5 from './views/MD5.vue'

const routes = [
  { path: '/', component: Home },
  { path: '/base64', component: Base64 },
  { path: '/gzip', component: Gzip },
  { path: '/md5', component: MD5 },
]

export default createRouter({
  history: createWebHistory(),
  routes,
})
