# SPA Prerender for SEO

## Problem

The site is a Vue 3 SPA deployed on GitHub Pages. All routes share a single `index.html` with an empty `<div id="app">`, meaning search engines see no content and no per-page meta information.

## Goal

Each tool page should have:
1. Independent `<title>` and `<meta name="description">` for search engine indexing
2. Rendered DOM content (tool names, sidebar, form elements) visible to crawlers
3. Open Graph tags for social sharing (WeChat, Twitter, etc.)

## Approach: vite-plugin-prerender

Use `vite-plugin-prerender` which launches a headless Chromium after `vite build` to render each route into a static HTML file. This is the lightest-touch solution — no architecture change, no SSR framework, just a build-time step.

Alternatives considered:
- **Vue SSR / Nuxt**: Too heavy for a static toolset. Requires restructuring the entire project.
- **Manual meta injection only**: Solves meta tags but not content indexing. Body remains empty.

## Changes

### 1. Route meta data (router.js)

Add `title` and `description` to every route's `meta` field:

```js
{ path: '/base64', component: Base64, meta: { title: 'Base64 编码/解码', description: '在线 Base64 编码与解码工具，支持文本和文件的 Base64 转换' } }
```

Home route uses site-level defaults:
```js
{ path: '/', component: Home, meta: { title: null, description: 'wxsm 的个人在线工具箱，包含编码转换、加密解密、文本处理等多种实用工具' } }
```

When `title` is null, `document.title` falls back to `"wxsm's Kit"`. Otherwise format is `"{title} - wxsm's Kit"`.

### 2. Prerender plugin (vite.config.js)

```js
import prerender from 'vite-plugin-prerender'

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    prerender({
      staticDir: path.join(__dirname, 'dist'),
      routes: routes.map(r => r.path),
      renderAfterDocumentEvent: 'x-app-rendered',
    }),
  ],
})
```

Routes are imported from `router.js` to avoid duplication.

### 3. Render completion signal (App.vue)

Dispatch `x-app-rendered` event after Vue mounts, so the prerender knows when the page is fully rendered:

```js
import { onMounted } from 'vue'

onMounted(() => {
  document.dispatchEvent(new Event('x-app-rendered'))
})
```

### 4. Runtime meta sync (App.vue)

Update `<title>`, `<meta name="description">`, and OG tags on SPA navigation using `router.afterEach`:

```js
router.afterEach((to) => {
  const title = to.meta.title ? `${to.meta.title} - wxsm's Kit` : "wxsm's Kit"
  document.title = title
  updateMeta('description', to.meta.description || '')
  updateMetaProperty('og:title', title)
  updateMetaProperty('og:description', to.meta.description || '')
  updateMetaProperty('og:url', `${siteUrl}${to.path}`)
  updateMetaProperty('og:type', 'website')
})
```

Helper functions `updateMeta` and `updateMetaProperty` create or update `<meta>` tags in `<head>`.

### 5. OG tag placeholders (index.html)

Add OG tag placeholders to `index.html` so prerender can overwrite them:

```html
<meta property="og:title" content="wxsm's Kit">
<meta property="og:description" content="wxsm 的个人在线工具箱">
<meta property="og:url" content="">
<meta property="og:type" content="website">
```

### 6. Site URL configuration

Site base URL comes from `VITE_SITE_URL` env variable (e.g. `https://tools.wxsm.me`), used for OG `og:url` assembly.

### 7. 404 fallback

After build, copy `dist/index.html` to `dist/404.html` as fallback for routes not covered by prerender or typos. Done via a build post-hook or CI step.

### 8. CI adaptation (GitHub Actions)

Add Chromium setup before the build step:

```yaml
- uses: browser-actions/setup-chromium@v1
```

No other CI changes needed. `npm run build` triggers prerender automatically.

## Output structure

```
dist/
  index.html              # Home, fully rendered DOM + meta
  404.html                # Copy of index.html for fallback
  base64/
    index.html            # Base64 page, rendered DOM + independent meta + OG
  aes-encrypt/
    index.html
  ...
  assets/                 # JS/CSS unchanged
```

## Scope

- Does not change any tool component behavior
- Does not introduce SSR or Nuxt
- Does not add sitemap generation (separate concern, can be added later)
- Local dev (`vite dev`) is unaffected — prerender only runs during `vite build`
