import { createRouter, createWebHistory } from 'vue-router'
import routeDefs from './routes.js'
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
import CssAnimation from './views/CssAnimation.vue'
import CodeScreenshot from './views/CodeScreenshot.vue'
import PatchViewer from './views/PatchViewer.vue'
import CliFormat from './views/CliFormat.vue'
import KvCache from './views/KvCache.vue'

const components = {
  '/': Home,
  '/base64': Base64,
  '/gzip': Gzip,
  '/diff': Diff,
  '/watermark': Watermark,
  '/aes-encrypt': AesEncrypt,
  '/hash-hmac': HashHmac,
  '/json': Json,
  '/file-base64': FileBase64,
  '/rsa': Rsa,
  '/url-encode': UrlEncode,
  '/case': Case,
  '/timestamp': Timestamp,
  '/md-html': MdHtml,
  '/qr-code': QrCode,
  '/regex': Regex,
  '/uuid': Uuid,
  '/html-entity': HtmlEntity,
  '/password': Password,
  '/color-picker': ColorPicker,
  '/ip-lookup': IpLookup,
  '/image-compress': ImageCompress,
  '/http-status': HttpStatus,
  '/unicode': Unicode,
  '/url-parse': UrlParse,
  '/jwt-decode': JwtDecode,
  '/cron': Cron,
  '/radix': Radix,
  '/lorem': Lorem,
  '/mime-types': MimeTypes,
  '/box-shadow': BoxShadow,
  '/gradient': Gradient,
  '/border-radius': BorderRadius,
  '/triangle': Triangle,
  '/css-animation': CssAnimation,
  '/code-screenshot': CodeScreenshot,
  '/patch-viewer': PatchViewer,
  '/cli-format': CliFormat,
  '/kv-cache': KvCache,
}

const routes = routeDefs.map(r => ({
  ...r,
  component: components[r.path],
}))

export { routeDefs }

export default createRouter({
  history: createWebHistory(),
  routes,
})
