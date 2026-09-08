import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import vitePrerender from 'vite-plugin-prerender-k'
import iconifyOffline from 'vite-plugin-iconify-offline'
import path from 'path'
import { fileURLToPath } from 'url'
import routeDefs from './src/routes.js'
import { buildModelsJson } from './scripts/build-models-json.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// GitHub Pages 项目页部署在 https://wxsms.github.io/tools/，资源与路由
// 都需要 /tools/ 前缀。本地 dev 时 vite 会自动回退到 '/'。
const BASE = process.env.VITE_BASE || '/tools/'

export default defineConfig({
  base: BASE,
  plugins: [
    vue(),
    tailwindcss(),
    iconifyOffline({
      module: '@iconify/vue',
      files: ['./src/**/*.{vue,js}'],
    }),
    vitePrerender({
      staticDir: path.join(__dirname, 'dist'),
      // 预渲染服务器按根路径提供 dist 静态文件，而路由定义不带 base 前缀，
      // 所以渲染时用根路径访问；渲染产物写入 dist/<route>/index.html，
      // 与 GitHub Pages 的 /tools/<route>/ 结构一致。
      routes: routeDefs.map(r => r.path),
      server: {
        before(app) {
          // dist 内资源带 /tools/ 前缀（如 /tools/assets/xx.js），静态服务
          // 只认根路径，这里把前缀剥掉，让预渲染页面能加载到资源。
          app.use((req, res, next) => {
            if (req.url.startsWith('/tools/')) {
              req.url = req.url.slice('/tools'.length)
            }
            next()
          })
        },
      },
      renderer: new vitePrerender.PuppeteerRenderer({
        headless: true,
        timeout: 60000,
        navigationOptions: {
          waituntil: 'domcontentloaded',
          timeout: 60000,
        },
        renderAfterTime: 3000,
      }),
      postProcess(renderedRoute) {
        renderedRoute.route = renderedRoute.originalRoute
        return renderedRoute
      },
    }),
  ],
  buildStart() {
    buildModelsJson()
  },
})
