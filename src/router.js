import { createRouter, createWebHistory } from 'vue-router'
import routeDefs from './routes.js'
import Home from './tools/home/Home.vue'
import Base64 from './tools/base64/Base64.vue'
import Gzip from './tools/gzip/Gzip.vue'
import Diff from './tools/diff/Diff.vue'
import Watermark from './tools/watermark/Watermark.vue'
import AesEncrypt from './tools/aes-encrypt/AesEncrypt.vue'
import HashHmac from './tools/hash-hmac/HashHmac.vue'
import Json from './tools/json/Json.vue'
import FileBase64 from './tools/file-base64/FileBase64.vue'
import Rsa from './tools/rsa/Rsa.vue'
import UrlEncode from './tools/url-encode/UrlEncode.vue'
import Case from './tools/case/Case.vue'
import Timestamp from './tools/timestamp/Timestamp.vue'
import MdHtml from './tools/md-html/MdHtml.vue'
import QrCode from './tools/qr-code/QrCode.vue'
import Regex from './tools/regex/Regex.vue'
import Uuid from './tools/uuid/Uuid.vue'
import HtmlEntity from './tools/html-entity/HtmlEntity.vue'
import Password from './tools/password/Password.vue'
import ColorPicker from './tools/color-picker/ColorPicker.vue'
import IpLookup from './tools/ip-lookup/IpLookup.vue'
import ImageCompress from './tools/image-compress/ImageCompress.vue'
import HttpStatus from './tools/http-status/HttpStatus.vue'
import Unicode from './tools/unicode/Unicode.vue'
import UrlParse from './tools/url-parse/UrlParse.vue'
import JwtDecode from './tools/jwt-decode/JwtDecode.vue'
import Cron from './tools/cron/Cron.vue'
import Radix from './tools/radix/Radix.vue'
import Lorem from './tools/lorem/Lorem.vue'
import MimeTypes from './tools/mime-types/MimeTypes.vue'
import BoxShadow from './tools/box-shadow/BoxShadow.vue'
import Gradient from './tools/gradient/Gradient.vue'
import BorderRadius from './tools/border-radius/BorderRadius.vue'
import Triangle from './tools/triangle/Triangle.vue'
import CssAnimation from './tools/css-animation/CssAnimation.vue'
import CodeScreenshot from './tools/code-screenshot/CodeScreenshot.vue'
import PatchViewer from './tools/patch-viewer/PatchViewer.vue'
import CliFormat from './tools/cli-format/CliFormat.vue'
import KvCache from './tools/kv-cache/KvCache.vue'
import TokenCounter from './tools/token-counter/TokenCounter.vue'

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
  '/token-counter': TokenCounter,
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
