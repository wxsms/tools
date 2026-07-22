# Router Lazy-Loading 重构 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `defineAsyncComponent` 包过的路由 lazy 加载改成裸 `() => import(...)`，引入 nprogress 顶部进度条 + `router.onError` 兜底 `RouteError`，消除 vue-router 5 的 R0029 warning。

**Architecture:** 新增 `src/composables/useRouteLoading.js` 封装 nprogress 配置 + 全局 error 状态 + `setupRouteLoading(router)` 钩子注册。`main.js` 调 `setupRouteLoading(router)`。`router.js` 44 处 `lazy(() => import(...))` 改裸 `() => import(...)`。`App.vue` 用 `v-if` 包 `<router-view>`。删 `lazy.js` + `RouteLoading.vue`。

**Tech Stack:** Vue 3 + vue-router 5 + nprogress + DaisyUI 5 + Vitest

---

## File Structure

**Create:**
- `src/composables/useRouteLoading.js` — 封装 nprogress + error 状态 + setup 函数
- `src/composables/useRouteLoading.test.js` — Vitest 单元 + 集成测试

**Modify:**
- `package.json` — 加 `nprogress` 运行时依赖
- `src/main.js` — 调 `setupRouteLoading(router)`
- `src/router.js` — 44 处 `lazy(...)` 改裸 `() => import(...)`,删 `import { lazy }`
- `src/App.vue` — `<router-view>` 外面包 `v-if` + import `RouteError` + `useRouteLoading`
- `src/style.css` — 加 `#nprogress .bar` 颜色覆盖

**Delete:**
- `src/lazy.js`
- `src/components/RouteLoading.vue`

**Reference (read-only):**
- `src/composables/useTheme.js` — 既有 composable 风格参考
- `src/components/RouteError.vue` — 兜底 UI 组件（保留不变）

---

## Task 1: 安装 nprogress

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 安装 nprogress**

Run:
```bash
cd E:/githome-windows/tools && npm install nprogress
```

Expected: `package.json` 的 `dependencies` 多出 `"nprogress": "^<version>"`,`package-lock.json` 更新。

- [ ] **Step 2: 验证 import 能成功**

Run:
```bash
cd E:/githome-windows/tools && node -e "import('nprogress').then(m => console.log(typeof m.default.start, typeof m.default.configure))"
```

Expected: 打印 `function function`,无报错。

- [ ] **Step 3: 验证 CSS 文件存在**

Run:
```bash
ls E:/githome-windows/tools/node_modules/nprogress/nprogress.css
```

Expected: 文件存在,无 `No such file` 错误。

- [ ] **Step 4: 提交**

Run:
```bash
git -C E:/githome-windows/tools add package.json package-lock.json
git -C E:/githome-windows/tools commit -m "chore(deps): add nprogress for route loading progress bar"
```

Expected: 一个新 commit。

---

## Task 2: 写 `useRouteLoading.js` 的失败测试

**Files:**
- Create: `src/composables/useRouteLoading.test.js`

- [ ] **Step 1: 创建测试文件**

Create `src/composables/useRouteLoading.test.js`:
```js
import { describe, it, expect, beforeEach } from 'vitest'
import { createRouter, createMemoryHistory } from 'vue-router'
import { useRouteLoading, clearRouteError, setupRouteLoading } from './useRouteLoading.js'

describe('useRouteLoading', () => {
  beforeEach(() => clearRouteError())

  it('returns a reactive error ref initially empty', () => {
    const { error } = useRouteLoading()
    expect(error.value).toBe('')
  })

  it('clearRouteError resets the error to empty', () => {
    const { error } = useRouteLoading()
    error.value = 'something failed'
    clearRouteError()
    expect(error.value).toBe('')
  })
})

describe('setupRouteLoading', () => {
  beforeEach(() => clearRouteError())

  it('sets error when route component fails to load', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div>home</div>' } },
        { path: '/boom', component: () => Promise.reject(new Error('chunk missing')) },
      ],
    })
    setupRouteLoading(router)
    await router.push('/boom')
    // 等 navigation 的 microtask 链走完
    await new Promise(r => setTimeout(r, 0))
    const { error } = useRouteLoading()
    expect(error.value).toMatch(/chunk missing|页面加载失败/)
  })

  it('clears error on successful subsequent navigation', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div>home</div>' } },
        { path: '/boom', component: () => Promise.reject(new Error('chunk missing')) },
      ],
    })
    setupRouteLoading(router)
    await router.push('/boom')
    await new Promise(r => setTimeout(r, 0))
    await router.push('/')
    await new Promise(r => setTimeout(r, 0))
    const { error } = useRouteLoading()
    expect(error.value).toBe('')
  })
})
```

- [ ] **Step 2: 运行测试确认它们 fail(模块还不存在)**

Run:
```bash
cd E:/githome-windows/tools && npx vitest run src/composables/useRouteLoading.test.js
```

Expected: FAIL,错误信息类似 `Failed to resolve import "./useRouteLoading.js"`。

---

## Task 3: 实现 `useRouteLoading.js`

**Files:**
- Create: `src/composables/useRouteLoading.js`

- [ ] **Step 1: 写实现让测试通过**

Create `src/composables/useRouteLoading.js`:
```js
import { ref } from 'vue'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'

NProgress.configure({ showSpinner: false, trickleSpeed: 200 })

const error = ref('')

export function useRouteLoading() {
  return { error }
}

export function clearRouteError() {
  error.value = ''
}

export function setupRouteLoading(router) {
  router.beforeEach((to, from) => {
    if (to.path === from.path) return
    error.value = ''
    NProgress.start()
  })
  router.afterEach(() => {
    NProgress.done()
  })
  router.onError((e) => {
    NProgress.done()
    error.value = e?.message || '页面加载失败'
  })
}
```

- [ ] **Step 2: 运行测试确认通过**

Run:
```bash
cd E:/githome-windows/tools && npx vitest run src/composables/useRouteLoading.test.js
```

Expected: PASS。所有 4 个测试通过。

若 `sets error when route component fails to load` 测试 fail(error 仍为空),可能是 vue-router 5 在 `push` reject 时不调 `onError` 而是直接 reject promise。改成 `await router.push('/boom').catch(() => {})` 重试。如果还 fail,在测试里把 `await new Promise(r => setTimeout(r, 0))` 改成 `await nextTick()` 或加一个小的 `setTimeout(50)`。

- [ ] **Step 3: 跑全量测试确认没破坏其他**

Run:
```bash
cd E:/githome-windows/tools && npm run test
```

Expected: 全绿,新增的 4 个 useRouteLoading 测试 + 既有 1031 个测试全过。

- [ ] **Step 4: 提交**

Run:
```bash
git -C E:/githome-windows/tools add src/composables/useRouteLoading.js src/composables/useRouteLoading.test.js
git -C E:/githome-windows/tools commit -m "feat(router): add useRouteLoading composable with nprogress + error state"
```

Expected: 一个新 commit,所有测试通过。

---

## Task 4: 接线 `main.js`

**Files:**
- Modify: `src/main.js`

- [ ] **Step 1: 改 main.js 调 setupRouteLoading**

打开 `src/main.js`,当前内容是:
```js
import { createApp } from 'vue'
import App from './App.vue'
import router from './router.js'
import './style.css'

createApp(App).use(router).mount('#app')
```

改为:
```js
import { createApp } from 'vue'
import App from './App.vue'
import router from './router.js'
import { setupRouteLoading } from './composables/useRouteLoading.js'
import './style.css'

setupRouteLoading(router)
createApp(App).use(router).mount('#app')
```

`setupRouteLoading` 必须在 `mount` 之前调,确保钩子在第一次导航前注册好。

- [ ] **Step 2: 暂不提交,等 Task 5-7 改完一起验证再提交**

---

## Task 5: 改 `router.js` 用裸 dynamic import

**Files:**
- Modify: `src/router.js`

- [ ] **Step 1: 删除 `import { lazy }`**

打开 `src/router.js`,删除第 4 行:
```js
import { lazy } from './lazy.js'
```

- [ ] **Step 2: 把 44 处 `lazy(() => import(...))` 改成 `() => import(...)`**

`src/router.js` 第 8-52 行,44 个条目,每行都是这个模式:
```js
  '/base64': lazy(() => import('./tools/base64/Base64.vue')),
```
改成:
```js
  '/base64': () => import('./tools/base64/Base64.vue'),
```

44 行全部改。`'/'` 路由(第 7 行 `Home`)保持不动(它是 eager import)。

可以用 sed 批量替换,也可以手改。手改的话注意每一行的 `lazy(() => import(...))` 模式是统一的,只是路径不同。替换规则:
- `lazy(() => import(` → `() => import(`
- 行尾 `))` → `)` (因为去掉了 `lazy(` 的开括号,对应的闭括号也要去掉)

如果用 sed:
```bash
cd E:/githome-windows/tools && sed -i "s/lazy(() => import(/() => import(/g; s/))$/)/g" src/router.js
```

**注意:** sed 替换 `))$` 可能误伤其他行。改完一定要 diff 检查。

- [ ] **Step 3: 验证 router.js 改动正确**

Run:
```bash
cd E:/githome-windows/tools && git diff src/router.js | head -20
```

Expected: 每个改动行从 `lazy(() => import(...))` 变成 `() => import(...)`,无遗漏、无误伤。

Run:
```bash
cd E:/githome-windows/tools && grep -c "lazy" src/router.js
```

Expected: `0`(完全删除了 lazy 引用)。

Run:
```bash
cd E:/githome-windows/tools && grep -c "() => import" src/router.js
```

Expected: `44`(44 个路由都用了裸 dynamic import)。

- [ ] **Step 4: 暂不提交,等 Task 6-7 改完一起验证**

---

## Task 6: 改 `App.vue` 包 v-if

**Files:**
- Modify: `src/App.vue`

- [ ] **Step 1: 找到 `<router-view />` 所在行**

打开 `src/App.vue`,在 template 里找到 `<router-view />`(大约第 87 行,在 `<main>` 标签内)。

- [ ] **Step 2: 把 `<router-view />` 改成条件渲染**

把:
```vue
          <router-view />
```
改成:
```vue
          <RouteError v-if="routeError" />
          <router-view v-else />
```

- [ ] **Step 3: 在 `<script setup>` 加 import 和 composable**

在 `src/App.vue` 的 `<script setup>` 里,已有的 import 块之后(大约第 167 行 `import CommandPalette from './components/CommandPalette.vue'` 之后),加:
```js
import RouteError from './components/RouteError.vue'
import { useRouteLoading } from './composables/useRouteLoading.js'
```

然后在已有的 composable 调用附近(大约第 176 行 `const { theme, toggleTheme } = useTheme()` 之后),加:
```js
const { error: routeError } = useRouteLoading()
```

- [ ] **Step 4: 暂不提交,等 Task 7 改完一起验证**

---

## Task 7: 改 `style.css` 加进度条颜色覆盖

**Files:**
- Modify: `src/style.css`

- [ ] **Step 1: 在 style.css 末尾追加颜色覆盖**

打开 `src/style.css`,当前内容只有:
```css
@import "tailwindcss";
@plugin "daisyui";
```

末尾追加:
```css

#nprogress .bar {
  background: var(--color-primary) !important;
}
```

**注意:** DaisyUI 5 已确认用 `--color-primary` 作为主色 CSS var(实测 `node_modules/daisyui/base/rootcolor.css` 等多处使用)。该 var 会随 `data-theme` 属性自动切换,无需 JS 监听主题。

- [ ] **Step 2: 暂不提交,进入 Task 8 一起验证**

---

## Task 8: 删 `lazy.js` 和 `RouteLoading.vue`

**Files:**
- Delete: `src/lazy.js`
- Delete: `src/components/RouteLoading.vue`

- [ ] **Step 1: 删 lazy.js**

Run:
```bash
git -C E:/githome-windows/tools rm src/lazy.js
```

- [ ] **Step 2: 删 RouteLoading.vue**

Run:
```bash
git -C E:/githome-windows/tools rm src/components/RouteLoading.vue
```

- [ ] **Step 3: 验证无遗留 import**

Run:
```bash
cd E:/githome-windows/tools && grep -rn "from.*lazy\|RouteLoading" src/ 2>/dev/null
```

Expected: 无输出(或只匹配到不相关的代码注释,需人工确认)。

如果 grep 报告任何 `.vue` / `.js` 文件还在 import `lazy` 或 `RouteLoading`,需要先清理那些 import 再继续。

- [ ] **Step 4: 暂不提交,Task 9 一起验证**

---

## Task 9: 全量验证 + 提交

**Files:** 无

- [ ] **Step 1: lint**

Run:
```bash
cd E:/githome-windows/tools && npm run lint
```

Expected: 0 errors(既有 SvgPreview.vue v-html warning 不算)。

若有 error,根据提示修复(最可能是 App.vue 的 import 顺序或 unused import)。

- [ ] **Step 2: test**

Run:
```bash
cd E:/githome-windows/tools && npm run test
```

Expected: 全绿,新增 4 个 useRouteLoading 测试 + 既有 1031 测试全过。

- [ ] **Step 3: build**

Run:
```bash
cd E:/githome-windows/tools && npm run build
```

Expected: 构建成功,无 nprogress 相关打包错误。prerender 把所有 45 个路由(含 `/json-to-go`)都渲染成功。

- [ ] **Step 4: 手动验证(dev server)**

Run(后台):
```bash
cd E:/githome-windows/tools && npm run dev
```

在浏览器打开 `http://localhost:<port>/`,然后:
- 点侧边栏任意一个没加载过的工具,确认顶部出现蓝色(或主题色)进度条,加载完消失
- 切换 dark/light 主题,确认进度条颜色跟随主题变化
- 打开 DevTools → Network → throttle 到 Slow 3G,切路由,确认进度条明显可见
- DevTools → Console 不应再有 R0029 warning

- [ ] **Step 5: 提交所有改动**

Run:
```bash
git -C E:/githome-windows/tools add -A
git -C E:/githome-windows/tools status
```

Expected: 看到 main.js / router.js / App.vue / style.css 改动,lazy.js / RouteLoading.vue 删除。

Run:
```bash
git -C E:/githome-windows/tools commit -m "$(cat <<'EOF'
refactor(router): replace defineAsyncComponent lazy with nprogress

- Drop src/lazy.js and RouteLoading.vue (defineAsyncComponent wrapping
  was ineffective under vue-router 5 per posva's explanation in
  vuejs/router#1469 — loading/error/timeout configs were silently
  ignored).
- Switch all 44 routes to bare () => import(...) — eliminates R0029
  warning.
- Add nprogress top progress bar with theme-aware color via
  var(--color-primary).
- Preserve RouteError fallback via router.onError + App.vue v-if.
- Add useRouteLoading composable + tests.

Co-Authored-By: zhipu/glm-5.2 <zai-org@claude-code-best.win>
EOF
)"
```

Expected: 一个新 commit,所有改动一起落盘。

---

## Task 10: 最终确认

**Files:** 无

- [ ] **Step 1: 看分支提交历史**

Run:
```bash
git -C E:/githome-windows/tools log master..HEAD --oneline
```

Expected: 看到 3 个 commit:
- `chore(deps): add nprogress for route loading progress bar`
- `feat(router): add useRouteLoading composable with nprogress + error state`
- `refactor(router): replace defineAsyncComponent lazy with nprogress`

- [ ] **Step 2: 不创建 PR、不合并**

**重要:到此为止。** 用户会自己跑 `/code-review` 审查这个分支。**不要 `git push`、不要开 PR、不要 merge 到 master。**

向用户报告:feature 分支 `refactor/router-lazy-loading` 已就绪,3 个 commit 已落,lint + test + build 全绿,等待用户 `/code-review` 审查。

---

## Self-Review 检查

**Spec 覆盖:**
- ✅ nprogress 依赖 → Task 1
- ✅ useRouteLoading composable(state + setupRouteLoading + clearRouteError) → Task 3
- ✅ useRouteLoading 测试(state + 集成) → Task 2
- ✅ main.js 调 setupRouteLoading → Task 4
- ✅ router.js 44 处 lazy → 裸 import → Task 5
- ✅ App.vue 包 v-if + import RouteError + useRouteLoading → Task 6
- ✅ style.css 加 #nprogress .bar 颜色覆盖 → Task 7
- ✅ 删 lazy.js + RouteLoading.vue → Task 8
- ✅ 验证无遗留 import → Task 8 Step 3
- ✅ lint + test + build → Task 9
- ✅ 手动验证进度条 + 主题 + R0029 消失 → Task 9 Step 4
- ✅ 不 push/不 merge → Task 10

**Placeholder scan:** 无 TBD / "add appropriate error handling" / 含糊引用。Task 3 Step 2 对 `onError` 不触发的 fallback 处理是诚实的工程 note(给了具体改法:加 `.catch` / `nextTick` / `setTimeout`),不是 placeholder。Task 5 的 sed 命令有"改完一定要 diff 检查"的明确警告。

**Type consistency:** `setupRouteLoading(router)` / `useRouteLoading()` / `clearRouteError()` 三个导出名在 Task 2 测试、Task 3 实现、Task 4 main.js 调用中一致。`error` ref 名在 Task 3 实现、Task 6 App.vue(`const { error: routeError }`)中一致(解构重命名为 routeError 避免和 route meta 的 error 混淆)。
