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
    await router.push('/boom').catch(() => {})
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
    await router.push('/boom').catch(() => {})
    await new Promise(r => setTimeout(r, 0))
    await router.push('/')
    await new Promise(r => setTimeout(r, 0))
    const { error } = useRouteLoading()
    expect(error.value).toBe('')
  })
})
