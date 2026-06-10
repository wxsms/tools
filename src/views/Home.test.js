import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import Home from './Home.vue'

// Create a minimal router for testing
function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: Home },
      { path: '/base64', component: { template: '<div />' } },
      { path: '/gzip', component: { template: '<div />' } },
      { path: '/diff', component: { template: '<div />' } },
      { path: '/crypto', component: { template: '<div />' } },
      { path: '/json', component: { template: '<div />' } },
      { path: '/watermark', component: { template: '<div />' } },
    ],
  })
}

async function mountComponent() {
  const router = createTestRouter()
  router.push('/')
  await router.isReady()
  return mount(Home, {
    global: { plugins: [router] },
  })
}

describe('Home', () => {
  it('renders hero title', async () => {
    const wrapper = await mountComponent()
    expect(wrapper.text()).toContain("wxsm's Kit")
  })

  it('renders tool group headings', async () => {
    const wrapper = await mountComponent()
    expect(wrapper.text()).toContain('Text')
    expect(wrapper.text()).toContain('Image')
  })

  it('renders tool cards with names and descriptions', async () => {
    const wrapper = await mountComponent()
    expect(wrapper.text()).toContain('Base64')
    expect(wrapper.text()).toContain('Gzip')
    expect(wrapper.text()).toContain('Crypto')
    expect(wrapper.text()).toContain('Diff')
    expect(wrapper.text()).toContain('JSON')
    expect(wrapper.text()).toContain('Watermark')
  })

  it('renders links to tool pages', async () => {
    const wrapper = await mountComponent()
    const links = wrapper.findAll('a')
    const hrefs = links.map(a => a.attributes('href'))
    expect(hrefs).toContain('/base64')
    expect(hrefs).toContain('/gzip')
    expect(hrefs).toContain('/crypto')
    expect(hrefs).toContain('/json')
  })
})
