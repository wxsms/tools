import { createRouter, createWebHistory } from 'vue-router'
import routeDefs from './routes.js'
import Home from './tools/home/Home.vue'

const components = {
  '/': Home,
  '/base64': () => import('./tools/base64/Base64.vue'),
  '/gzip': () => import('./tools/gzip/Gzip.vue'),
  '/diff': () => import('./tools/diff/Diff.vue'),
  '/watermark': () => import('./tools/watermark/Watermark.vue'),
  '/aes-encrypt': () => import('./tools/aes-encrypt/AesEncrypt.vue'),
  '/hash-hmac': () => import('./tools/hash-hmac/HashHmac.vue'),
  '/json': () => import('./tools/json/Json.vue'),
  '/json-to-go': () => import('./tools/json-to-go/JsonToGo.vue'),
  '/json-to-go-map': () => import('./tools/json-to-go-map/JsonToGoMap.vue'),
  '/json-to-ts': () => import('./tools/json-to-ts/JsonToTs.vue'),
  '/json-to-python': () => import('./tools/json-to-python/JsonToPython.vue'),
  '/file-base64': () => import('./tools/file-base64/FileBase64.vue'),
  '/rsa': () => import('./tools/rsa/Rsa.vue'),
  '/url-encode': () => import('./tools/url-encode/UrlEncode.vue'),
  '/case': () => import('./tools/case/Case.vue'),
  '/timestamp': () => import('./tools/timestamp/Timestamp.vue'),
  '/md-html': () => import('./tools/md-html/MdHtml.vue'),
  '/qr-code': () => import('./tools/qr-code/QrCode.vue'),
  '/regex': () => import('./tools/regex/Regex.vue'),
  '/uuid': () => import('./tools/uuid/Uuid.vue'),
  '/html-entity': () => import('./tools/html-entity/HtmlEntity.vue'),
  '/password': () => import('./tools/password/Password.vue'),
  '/color-picker': () => import('./tools/color-picker/ColorPicker.vue'),
  '/ip-lookup': () => import('./tools/ip-lookup/IpLookup.vue'),
  '/image-compress': () => import('./tools/image-compress/ImageCompress.vue'),
  '/http-status': () => import('./tools/http-status/HttpStatus.vue'),
  '/unicode': () => import('./tools/unicode/Unicode.vue'),
  '/url-parse': () => import('./tools/url-parse/UrlParse.vue'),
  '/jwt-decode': () => import('./tools/jwt-decode/JwtDecode.vue'),
  '/cron': () => import('./tools/cron/Cron.vue'),
  '/radix': () => import('./tools/radix/Radix.vue'),
  '/lorem': () => import('./tools/lorem/Lorem.vue'),
  '/mime-types': () => import('./tools/mime-types/MimeTypes.vue'),
  '/box-shadow': () => import('./tools/box-shadow/BoxShadow.vue'),
  '/gradient': () => import('./tools/gradient/Gradient.vue'),
  '/border-radius': () => import('./tools/border-radius/BorderRadius.vue'),
  '/triangle': () => import('./tools/triangle/Triangle.vue'),
  '/css-animation': () => import('./tools/css-animation/CssAnimation.vue'),
  '/cubic-bezier': () => import('./tools/cubic-bezier/CubicBezier.vue'),
  '/code-screenshot': () => import('./tools/code-screenshot/CodeScreenshot.vue'),
  '/patch-viewer': () => import('./tools/patch-viewer/PatchViewer.vue'),
  '/cli-format': () => import('./tools/cli-format/CliFormat.vue'),
  '/kv-cache': () => import('./tools/kv-cache/KvCache.vue'),
  '/token-counter': () => import('./tools/token-counter/TokenCounter.vue'),
  '/csv': () => import('./tools/csv/CsvPreview.vue'),
  '/svg-preview': () => import('./tools/svg-preview/SvgPreview.vue'),
  '/keyboard-tester': () => import('./tools/keyboard-tester/KeyboardTester.vue'),
  '/emoji': () => import('./tools/emoji/Emoji.vue'),
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
