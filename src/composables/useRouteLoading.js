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
    // 路径变化时清空 error：chunk 加载失败后用户点侧边栏其他工具（不同路径）
    // 会触发此处，清掉 error 让 router-view 恢复。vue-router 5 对 same-path
    // 导航根本不调 beforeEach，所以 error 清空只会在真实路径变化时发生。
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
