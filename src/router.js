import { createRouter, createWebHistory } from 'vue-router'
import Home from './views/Home.vue'
import Base64 from './views/Base64.vue'
import Gzip from './views/Gzip.vue'
import Diff from './views/Diff.vue'
import Watermark from './views/Watermark.vue'
import Crypto from './views/Crypto.vue'
import Json from './views/Json.vue'
import FileBase64 from './views/FileBase64.vue'
import Rsa from './views/Rsa.vue'

const routes = [
  { path: '/', component: Home },
  { path: '/base64', component: Base64 },
  { path: '/gzip', component: Gzip },
  { path: '/diff', component: Diff },
  { path: '/watermark', component: Watermark },
  { path: '/crypto', component: Crypto },
  { path: '/json', component: Json },
  { path: '/file-base64', component: FileBase64 },
  { path: '/rsa', component: Rsa },
]

export default createRouter({
  history: createWebHistory(),
  routes,
})
