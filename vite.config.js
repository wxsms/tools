import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import vitePrerender from 'vite-plugin-prerender-k'
import path from 'path'
import { fileURLToPath } from 'url'
import routeDefs from './src/routes.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    vitePrerender({
      staticDir: path.join(__dirname, 'dist'),
      routes: routeDefs.map(r => r.path),
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
})
