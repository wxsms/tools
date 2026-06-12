import { createRouter, createWebHistory } from 'vue-router'
import Home from './views/Home.vue'
import Base64 from './views/Base64.vue'
import Gzip from './views/Gzip.vue'
import Diff from './views/Diff.vue'
import Watermark from './views/Watermark.vue'
import AesEncrypt from './views/AesEncrypt.vue'
import HashHmac from './views/HashHmac.vue'
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
import HttpStatus from './views/HttpStatus.vue'
import Unicode from './views/Unicode.vue'
import UrlParse from './views/UrlParse.vue'
import JwtDecode from './views/JwtDecode.vue'
import Cron from './views/Cron.vue'
import Radix from './views/Radix.vue'
import Lorem from './views/Lorem.vue'
import MimeTypes from './views/MimeTypes.vue'
import BoxShadow from './views/BoxShadow.vue'
import Gradient from './views/Gradient.vue'
import BorderRadius from './views/BorderRadius.vue'
import Triangle from './views/Triangle.vue'

const routes = [
  { path: '/', component: Home },
  { path: '/base64', component: Base64 },
  { path: '/gzip', component: Gzip },
  { path: '/diff', component: Diff },
  { path: '/watermark', component: Watermark },
  { path: '/aes-encrypt', component: AesEncrypt },
  { path: '/hash-hmac', component: HashHmac },
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
  { path: '/http-status', component: HttpStatus },
  { path: '/unicode', component: Unicode },
  { path: '/url-parse', component: UrlParse },
  { path: '/cron', component: Cron },
  { path: '/jwt-decode', component: JwtDecode },
  { path: '/radix', component: Radix },
  { path: '/lorem', component: Lorem },
  { path: '/mime-types', component: MimeTypes },
  { path: '/box-shadow', component: BoxShadow, meta: { wide: true } },
  { path: '/gradient', component: Gradient, meta: { wide: true } },
  { path: '/border-radius', component: BorderRadius, meta: { wide: true } },
  { path: '/triangle', component: Triangle, meta: { wide: true } },
]

export default createRouter({
  history: createWebHistory(),
  routes,
})
