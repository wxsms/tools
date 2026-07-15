import { createRouter, createWebHistory } from 'vue-router'
import routeDefs from './routes.js'
import Home from './tools/home/Home.vue'
import { lazy } from './lazy.js'

const components = {
  '/': Home,
  '/base64': lazy(() => import('./tools/base64/Base64.vue')),
  '/gzip': lazy(() => import('./tools/gzip/Gzip.vue')),
  '/diff': lazy(() => import('./tools/diff/Diff.vue')),
  '/watermark': lazy(() => import('./tools/watermark/Watermark.vue')),
  '/aes-encrypt': lazy(() => import('./tools/aes-encrypt/AesEncrypt.vue')),
  '/hash-hmac': lazy(() => import('./tools/hash-hmac/HashHmac.vue')),
  '/json': lazy(() => import('./tools/json/Json.vue')),
  '/file-base64': lazy(() => import('./tools/file-base64/FileBase64.vue')),
  '/rsa': lazy(() => import('./tools/rsa/Rsa.vue')),
  '/url-encode': lazy(() => import('./tools/url-encode/UrlEncode.vue')),
  '/case': lazy(() => import('./tools/case/Case.vue')),
  '/timestamp': lazy(() => import('./tools/timestamp/Timestamp.vue')),
  '/md-html': lazy(() => import('./tools/md-html/MdHtml.vue')),
  '/qr-code': lazy(() => import('./tools/qr-code/QrCode.vue')),
  '/regex': lazy(() => import('./tools/regex/Regex.vue')),
  '/uuid': lazy(() => import('./tools/uuid/Uuid.vue')),
  '/html-entity': lazy(() => import('./tools/html-entity/HtmlEntity.vue')),
  '/password': lazy(() => import('./tools/password/Password.vue')),
  '/color-picker': lazy(() => import('./tools/color-picker/ColorPicker.vue')),
  '/ip-lookup': lazy(() => import('./tools/ip-lookup/IpLookup.vue')),
  '/image-compress': lazy(() => import('./tools/image-compress/ImageCompress.vue')),
  '/http-status': lazy(() => import('./tools/http-status/HttpStatus.vue')),
  '/unicode': lazy(() => import('./tools/unicode/Unicode.vue')),
  '/url-parse': lazy(() => import('./tools/url-parse/UrlParse.vue')),
  '/jwt-decode': lazy(() => import('./tools/jwt-decode/JwtDecode.vue')),
  '/cron': lazy(() => import('./tools/cron/Cron.vue')),
  '/radix': lazy(() => import('./tools/radix/Radix.vue')),
  '/lorem': lazy(() => import('./tools/lorem/Lorem.vue')),
  '/mime-types': lazy(() => import('./tools/mime-types/MimeTypes.vue')),
  '/box-shadow': lazy(() => import('./tools/box-shadow/BoxShadow.vue')),
  '/gradient': lazy(() => import('./tools/gradient/Gradient.vue')),
  '/border-radius': lazy(() => import('./tools/border-radius/BorderRadius.vue')),
  '/triangle': lazy(() => import('./tools/triangle/Triangle.vue')),
  '/css-animation': lazy(() => import('./tools/css-animation/CssAnimation.vue')),
  '/cubic-bezier': lazy(() => import('./tools/cubic-bezier/CubicBezier.vue')),
  '/code-screenshot': lazy(() => import('./tools/code-screenshot/CodeScreenshot.vue')),
  '/patch-viewer': lazy(() => import('./tools/patch-viewer/PatchViewer.vue')),
  '/cli-format': lazy(() => import('./tools/cli-format/CliFormat.vue')),
  '/kv-cache': lazy(() => import('./tools/kv-cache/KvCache.vue')),
  '/token-counter': lazy(() => import('./tools/token-counter/TokenCounter.vue')),
  '/csv': lazy(() => import('./tools/csv/CsvPreview.vue')),
  '/svg-preview': lazy(() => import('./tools/svg-preview/SvgPreview.vue')),
  '/keyboard-tester': lazy(() => import('./tools/keyboard-tester/KeyboardTester.vue')),
  '/emoji': lazy(() => import('./tools/emoji/Emoji.vue')),
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
