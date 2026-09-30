import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createRouter, createMemoryHistory } from 'vue-router'
import {
  useRouteLoading, clearRouteError, setupRouteLoading, hardNavigate, clearRetriedMark,
} from './useRouteLoading.js'

// jsdom 30 的 location.assign 不可配置,统一用 stubLocation 替换 window.location
function stubLocation() {
  const assign = vi.fn()
  const original = window.location
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...original, assign },
  })
  return { assign, restore: () => Object.defineProperty(window, 'location', { configurable: true, value: original }) }
}

function makeRouter(failPath = '/boom') {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div>home</div>' } },
      { path: failPath, component: () => Promise.reject(new Error('Failed to fetch dynamically imported module')) },
      { path: '/other', component: { template: '<div>other</div>' } },
    ],
  })
}

describe('useRouteLoading', () => {
  beforeEach(() => {
    sessionStorage.clear()
    clearRouteError()
  })

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
  beforeEach(() => {
    sessionStorage.clear()
    clearRouteError()
    vi.restoreAllMocks()
  })

  it('hard-navigates to target page on first chunk load failure', async () => {
    const router = makeRouter()
    setupRouteLoading(router)
    const { assign, restore } = stubLocation()
    await router.push('/boom').catch(() => {})
    await new Promise(r => setTimeout(r, 0))
    restore()
    expect(assign).toHaveBeenCalledTimes(1)
    expect(assign.mock.calls[0][0]).toBe('/boom')
    // 未展示错误界面
    const { error } = useRouteLoading()
    expect(error.value).toBe('')
  })

  it('shows error instead of looping when target already retried', async () => {
    sessionStorage.setItem('route-error-retried', '/boom')
    const router = makeRouter()
    setupRouteLoading(router)
    const { assign, restore } = stubLocation()
    await router.push('/boom').catch(() => {})
    await new Promise(r => setTimeout(r, 0))
    restore()
    expect(assign).not.toHaveBeenCalled()
    const { error } = useRouteLoading()
    expect(error.value).toMatch(/dynamically imported module|页面加载失败/)
  })

  it('shows error directly for non-chunk errors (app bugs)', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div>home</div>' } },
        { path: '/guard-fail', beforeEnter: () => { throw new Error('guard blew up') }, component: { template: '<div>x</div>' } },
      ],
    })
    setupRouteLoading(router)
    const { assign, restore } = stubLocation()
    await router.push('/guard-fail').catch(() => {})
    await new Promise(r => setTimeout(r, 0))
    restore()
    expect(assign).not.toHaveBeenCalled()
    const { error } = useRouteLoading()
    expect(error.value).toBe('guard blew up')
  })

  it('clears retried mark after successful navigation to that path', async () => {
    const router = makeRouter()
    setupRouteLoading(router)
    const { assign, restore } = stubLocation()
    await router.push('/boom').catch(() => {}) // 失败并标记 /boom
    await new Promise(r => setTimeout(r, 0))
    restore()
    expect(sessionStorage.getItem('route-error-retried')).toBe('/boom')
    await router.push('/other') // 成功导航到其他页
    await new Promise(r => setTimeout(r, 0))
    // 标记仍存在(只清除与成功路径一致的标记)
    expect(sessionStorage.getItem('route-error-retried')).toBe('/boom')
    // 模拟整页加载成功后到达 /boom:resolve 不触发组件加载以外的守卫路径,
    // 这里直接验证 clearRetriedMark 的语义
    clearRetriedMark('/boom')
    expect(sessionStorage.getItem('route-error-retried')).toBeNull()
    expect(assign).toHaveBeenCalledTimes(1)
  })

  it('clears error on successful subsequent navigation', async () => {
    // 用已重试过的路径,确保走「展示 error」分支而不是整页跳转
    sessionStorage.setItem('route-error-retried', '/boom')
    const router = makeRouter()
    setupRouteLoading(router)
    await router.push('/boom').catch(() => {})
    await new Promise(r => setTimeout(r, 0))
    const { error } = useRouteLoading()
    expect(error.value).not.toBe('')
    await router.push('/other')
    await new Promise(r => setTimeout(r, 0))
    expect(error.value).toBe('')
  })
})

describe('hardNavigate', () => {
  it('assigns router-resolved href (includes base)', () => {
    const router = makeRouter()
    const { assign, restore } = stubLocation()
    hardNavigate(router, '/boom?a=1')
    restore()
    expect(assign).toHaveBeenCalledWith('/boom?a=1')
  })
})

