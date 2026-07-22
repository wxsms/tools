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
    error.value = ''
    if (to.path === from.path) return
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
