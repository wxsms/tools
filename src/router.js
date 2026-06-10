import { createRouter, createWebHistory } from 'vue-router'
import Home from './views/Home.vue'
import Base64 from './views/Base64.vue'
import Gzip from './views/Gzip.vue'
import Diff from './views/Diff.vue'
import Watermark from './views/Watermark.vue'
import Crypto from './views/Crypto.vue'

const routes = [
  { path: '/', component: Home },
  { path: '/base64', component: Base64 },
  { path: '/gzip', component: Gzip },
  { path: '/diff', component: Diff },
  { path: '/watermark', component: Watermark },
  { path: '/crypto', component: Crypto },
]

export default createRouter({
  history: createWebHistory(),
  routes,
})
