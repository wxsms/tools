import { createRouter, createWebHistory } from 'vue-router'
import Home from './views/Home.vue'
import Base64 from './views/Base64.vue'
import Gzip from './views/Gzip.vue'
import MD5 from './views/MD5.vue'
import Diff from './views/Diff.vue'
import Watermark from './views/Watermark.vue'

const routes = [
  { path: '/', component: Home },
  { path: '/base64', component: Base64 },
  { path: '/gzip', component: Gzip },
  { path: '/md5', component: MD5 },
  { path: '/diff', component: Diff },
  { path: '/watermark', component: Watermark },
]

export default createRouter({
  history: createWebHistory(),
  routes,
})
