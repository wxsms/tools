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
import UrlEncode from './views/UrlEncode.vue'
import Case from './views/Case.vue'
import Timestamp from './views/Timestamp.vue'
import MdHtml from './views/MdHtml.vue'
import QrCode from './views/QrCode.vue'
import Regex from './views/Regex.vue'
import Uuid from './views/Uuid.vue'
import HtmlEntity from './views/HtmlEntity.vue'
import Password from './views/Password.vue'
import ColorPicker from './views/ColorPicker.vue'
import IpLookup from './views/IpLookup.vue'
import ImageCompress from './views/ImageCompress.vue'
import ImageConvert from './views/ImageConvert.vue'

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
  { path: '/url-encode', component: UrlEncode },
  { path: '/case', component: Case },
  { path: '/timestamp', component: Timestamp },
  { path: '/md-html', component: MdHtml, meta: { wide: true } },
  { path: '/qr-code', component: QrCode },
  { path: '/regex', component: Regex },
  { path: '/uuid', component: Uuid },
  { path: '/html-entity', component: HtmlEntity },
  { path: '/password', component: Password },
  { path: '/color-picker', component: ColorPicker },
  { path: '/ip-lookup', component: IpLookup },
  { path: '/image-compress', component: ImageCompress },
  { path: '/image-convert', component: ImageConvert },
]

export default createRouter({
  history: createWebHistory(),
  routes,
})
