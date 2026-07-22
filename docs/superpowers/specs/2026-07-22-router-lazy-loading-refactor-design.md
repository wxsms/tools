# Router Lazy-Loading 重构设计

## 背景

项目当前用 `src/lazy.js` 把所有 44 个路由组件用 `defineAsyncComponent` 包一层，目的是带上 `RouteLoading` / `RouteError` 作为 chunk 加载/失败时的兜底 UI，以及 30s 超时。

vue-router 5 明确禁止用 async 组件作为路由组件（"Do not use async components as route components"），并触发 R0029 warning。vue-router 维护者 posva 在 [vuejs/router#1469](https://github.com/vuejs/router/issues/1469) 解释：vue-router 在导航过程中自己会等 lazy 组件的 Promise resolve，`defineAsyncComponent` 的 `loadingComponent` / `errorComponent` / `timeout` 配置**不会生效** —— 它们是 `defineAsyncComponent` 的渲染路径，router 不走这条路径。

也就是说：项目里 `RouteLoading` / `RouteError` 在 vue-router 5 下**根本没生效**，30s 超时也没生效。warning 不只是噪音，是真实问题。

## 目标

1. 消除 R0029 warning，符合 vue-router 5 约定。
2. 让 chunk 加载反馈**真正生效** —— 用顶部进度条（`nprogress`）替代失效的中央 spinner。
3. 保留加载失败的兜底 —— 用 `router.onError` + 全局 error 状态 + `RouteError` 组件实现。
4. 不引入 30s 超时（生产环境 chunk 加载基本不会卡，dev 下 vite 编译慢进度条一直显示也合理）。
5. 进度条颜色跟随 DaisyUI 主题（dark/light 自动适配）。

## 范围

**In scope**

- 新增 `src/composables/useRouteLoading.js`，封装 nprogress + 全局 error 状态 + `setupRouteLoading(router)` 钩子注册。
- `main.js` 调用 `setupRouteLoading(router)`。
- `router.js` 44 个 `lazy(() => import(...))` 改为裸 `() => import(...)`，删除 `import { lazy }`。
- 删除 `src/lazy.js` 和 `src/components/RouteLoading.vue`（无消费者）。
- 保留 `src/components/RouteError.vue`，由 `App.vue` 条件渲染。
- `App.vue` 增加 `routeError` 状态读取，`<router-view>` 外面包一层 `v-if/v-else`。
- 全局 `style.css` 增加 nprogress bar 颜色覆盖（`var(--color-primary)`）。
- 新增 `nprogress` 运行时依赖。
- 新增 `src/composables/useRouteLoading.test.js`。

**Out of scope**

- 30s 超时（已决策放弃）。
- per-route loading 组件（被全局进度条取代）。
- nprogress 的高级样式定制（自定义模板、动画速度调优等），只做颜色覆盖。
- `App.vue` 除此 `v-if` 之外的其他重构。
- 触碰 44 个路由组件本身。

## 架构

### 文件布局

```
src/
├── composables/
│   ├── useRouteLoading.js         # 新增
│   └── useRouteLoading.test.js    # 新增
├── components/
│   ├── RouteLoading.vue           # 删除
│   └── RouteError.vue             # 保留
├── App.vue                        # 修改：包 v-if
├── main.js                        # 修改：调 setupRouteLoading
├── router.js                      # 修改：44 行 lazy → 裸 import
├── lazy.js                        # 删除
└── style.css                      # 修改：增加 #nprogress .bar 颜色覆盖
```

### 为什么用 composable 而不是直接在 `router.js` 里挂钩子

如果 `useRouteLoading.js` 在 import 时自动注册钩子，需要 import `router`，而 `router.js` 又会 import `useRouteLoading`（如果 router.js 想用它）—— 形成循环依赖。

显式 `setupRouteLoading(router)` 函数从 `main.js` 调用，由 `main.js` 把已经创建好的 `router` 实例传进去，避免循环。这也符合项目既有 composable 风格（参考 `useTheme.js` 的 module-level ref + exported function 模式）。

### 为什么 error 状态放在 composable 里而不是 App.vue

`router.onError` 钩子在 `setupRouteLoading` 里注册，需要一个地方写 error。模块级 ref 放 composable 里，App.vue 通过 `useRouteLoading()` 读，是 Vue 3 共享状态的标准模式。放 App.vue 会让 `setupRouteLoading` 反过来 import App.vue 的内部状态，耦合更差。

## 组件设计

### `src/composables/useRouteLoading.js`

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

**行为说明：**

- `beforeEach` 在路径变化时启动进度条 + 清空之前的 error。同路径（仅 hash/query 变）跳转不显示进度条，避免 URL 微调时的闪烁。
- `afterEach` 总是调用 `NProgress.done()`，即使导航失败也调（`onError` 也会调，但 nprogress `done()` 是幂等的，多次调用无害）。
- `onError` 设置 error 为失败原因。`App.vue` 读这个 ref 决定渲染 `RouteError` 还是 `router-view`。
- `RouteError` 组件已有的"重新加载"按钮调用 `window.location.reload()`，重新加载会重跑 `main.js`，error ref 自动重置为 `''`（模块状态重建）。**无需 `clearRouteError` 接按钮**。
- `clearRouteError` 仍导出，用于测试和潜在的未来需求（比如"忽略错误继续导航"）。

### `src/App.vue` 改动

`<router-view />` 外面包一层条件：

```vue
<RouteError v-if="routeError" />
<router-view v-else />
```

`<script setup>` 增加：
```js
import RouteError from './components/RouteError.vue'
import { useRouteLoading } from './composables/useRouteLoading.js'
const { error: routeError } = useRouteLoading()
```

`RouteError` 不需要 props。

### `src/router.js` 改动

机械替换。44 处 `lazy(() => import('./tools/...'))` → `() => import('./tools/...')`。删除 `import { lazy } from './lazy.js'`。`Home.vue` 的 `'/'` 路由保持 eager import（本来就是）。`routeDefs` 不动。

### `src/style.css` 改动

追加：
```css
#nprogress .bar {
  background: var(--color-primary) !important;
}
```

DaisyUI 5 通过 `--color-primary` CSS var 暴露主题主色，会随 `data-theme` 自动切换。无需 JS 监听主题变化。

**实现时需验证：** DaisyUI 5 实际的 CSS var 名以实测为准（候选为 `--color-primary`、`--p`、`--primary`）。若 var 名不同，按实测调整；若 var 不存在，降级为硬编码颜色（暗色 `#fff`，亮色 `#000`）通过 `data-theme` 选择器覆盖。

### `src/main.js` 改动

```js
import { createApp } from 'vue'
import App from './App.vue'
import router from './router.js'
import { setupRouteLoading } from './composables/useRouteLoading.js'
import './style.css'

setupRouteLoading(router)
createApp(App).use(router).mount('#app')
```

`setupRouteLoading` 必须在 `mount` 之前调，确保钩子在第一次导航前注册好。

## 测试策略

`src/composables/useRouteLoading.test.js` 分两层：

**层 1：composable 状态**（不需要 router）：
- `useRouteLoading()` 返回的 `error` ref 初始为空字符串。
- `clearRouteError()` 把 error 清空。

**层 2：`setupRouteLoading(router)`**（用真实 `createRouter` + `createMemoryHistory`）：
- 路由组件抛错时（`() => Promise.reject(new Error('chunk missing'))`），`error.value` 变成包含错误信息的字符串。
- 后续成功导航时，`error.value` 被清空。
- 同路径导航不触发进度条副作用（这条很难断言，可跳过或用 spy 验证 NProgress.start 调用次数）。

NProgress 本身的副作用（DOM 操作）不参与断言 —— 它是实现细节，测试应锁定**契约**（error ref 反映加载失败、成功时清空），而非实现（nprogress 进度条是否真的显示）。

不为 `App.vue` 写组件测试 —— 集成只是一个 `v-if`，且 `RouteError` 组件本身不变。

## 错误处理

三种失败模式：

1. **chunk 加载失败**（404、网络断、新版本部署后旧 hash 失效） —— `router.onError` 触发，`error.value` 被设置，`App.vue` 渲染 `RouteError`，用户看到"页面加载失败" + 重新加载按钮。点击重新加载会拉取最新 HTML（拿到新 chunk hash），问题解决。

2. **路由组件内部抛错**（不是 lazy 加载失败，是组件 setup 错误） —— `router.onError` 也会捕获。显示同样的 `RouteError`。这是 vue-router 5 的内置行为。

3. **nprogress 自身失败**（理论上不可能，纯 JS） —— 静默，进度条不显示，不影响功能。

无重试逻辑、无超时。错误状态下用户唯一的出路是"重新加载"按钮。

## 风险与回滚

**风险 1：nprogress CSS 加载失败** —— `import 'nprogress/nprogress.css'` 在 Vite 下应即用即灵。若失败，进度条不显示（无崩溃），其他功能不受影响。可接受降级。

**风险 2：DaisyUI 5 的 CSS var 名不对** —— 实现时验证。若 `--color-primary` 不存在，降级为 `data-theme` 选择器 + 硬编码颜色。不影响功能，只影响视觉。

**风险 3：`router.onError` 不触发 chunk 加载失败** —— vue-router 5 文档保证会触发。若不触发，`RouteError` 不显示，用户看到空白页 —— 这与当前 `defineAsyncComponent` 模式下失效的 `RouteError` 行为一致，**不比现状更差**。

**回滚：** 单 PR revert，无数据迁移、无 API 破坏、无用户可见的行为回归（除了进度条出现/消失）。

## 实现 note

- `nprogress` 包体积约 2KB，对整体 bundle 影响可忽略。
- `RouteLoading.vue` 和 `lazy.js` 删除后，确保无遗留 import（用 grep 验证）。
- 验证 `--color-primary` var 名以实测为准；本设计的 API 形态（`setupRouteLoading(router)` + `useRouteLoading()` 返回 `{ error }`）固定不变。
