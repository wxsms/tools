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

/**
 * 部署变更(新版本发布)导致旧 chunk 404 的特征:动态 import 失败。
 * 这类错误值得整页重试;应用自身 bug(守卫抛错等)重试也不会好。
 */
function isChunkLoadError(e) {
  const msg = String(e?.message || e || '')
  return /importing a module script|failed to fetch dynamically imported module|error loading dynamically imported module|chunk/i.test(msg)
}

/**
 * 该目标页是否已经整页重试过(会话内一次),防止失败循环。
 */
function hasRetried(fullPath) {
  try {
    return sessionStorage.getItem('route-error-retried') === fullPath
  } catch {
    return false
  }
}

function markRetried(fullPath) {
  try {
    sessionStorage.setItem('route-error-retried', fullPath)
  } catch { /* storage 不可用时放弃重试记忆,仍整页跳转 */ }
}

export function clearRetriedMark(fullPath) {
  try {
    if (!fullPath || sessionStorage.getItem('route-error-retried') === fullPath) {
      sessionStorage.removeItem('route-error-retried')
    }
  } catch { /* ignore */ }
}

/**
 * 整页跳转到目标页:让浏览器重新拉 index.html 与最新资源,
 * 等价于「直接在地址栏输入目标地址」。
 */
export function hardNavigate(router, fullPath) {
  window.location.assign(router.resolve(fullPath).href)
}

export function setupRouteLoading(router) {
  // 成功导航后清掉该路径的「已重试」标记:下次部署后同一目标还能获得一次自动重试
  router.afterEach((to) => {
    clearRetriedMark(to.fullPath)
  })
  router.beforeEach((to, from) => {
    if (to.path === from.path) return
    // 路径变化时清空 error：chunk 加载失败后用户点侧边栏其他工具（不同路径）
    // 会触发此处，清掉 error 让 router-view 恢复。vue-router 5 对 same-path
    // 导航根本不调 beforeEach，所以 error 清空只会在真实路径变化时发生。
    error.value = ''
    NProgress.start()
  })
  router.afterEach(() => {
    NProgress.done()
  })
  router.onError((e, to) => {
    NProgress.done()
    // 部署变更导致 chunk 失效:未完成的导航不会改地址栏,直接整页跳到
    // 目标页(浏览器会拿到新发布的资源)。每个目标只自动重试一次,
    // 整页加载后仍失败才展示错误界面。
    if (to && isChunkLoadError(e) && !hasRetried(to.fullPath)) {
      markRetried(to.fullPath)
      hardNavigate(router, to.fullPath)
      return
    }
    error.value = e?.message || '页面加载失败'
  })
}
