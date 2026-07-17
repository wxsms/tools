import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import CommandPalette from './CommandPalette.vue'

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:rest(.*)*', component: { template: '<div />' } }],
  })
}

async function mountComponent() {
  const router = createTestRouter()
  router.push('/')
  await router.isReady()
  return mount(CommandPalette, {
    global: { plugins: [router] },
  })
}

describe('CommandPalette', () => {
  it('does not render the dialog when closed', async () => {
    const wrapper = await mountComponent()
    expect(wrapper.find('dialog').exists()).toBe(false)
  })

  it('renders the dialog after open() is called', async () => {
    const wrapper = await mountComponent()
    wrapper.vm.open()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('dialog').exists()).toBe(true)
    expect(wrapper.find('input[type="text"]').exists()).toBe(true)
  })

  it('shows placeholder text when query is empty', async () => {
    const wrapper = await mountComponent()
    wrapper.vm.open()
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('输入关键词以搜索工具')
  })

  it('shows results after typing a query that matches', async () => {
    const wrapper = await mountComponent()
    wrapper.vm.open()
    await wrapper.vm.$nextTick()
    await wrapper.find('input[type="text"]').setValue('base64')
    expect(wrapper.text()).toContain('Base64 转换')
  })

  it('shows no-match text when query matches nothing', async () => {
    const wrapper = await mountComponent()
    wrapper.vm.open()
    await wrapper.vm.$nextTick()
    await wrapper.find('input[type="text"]').setValue('zzznotfound')
    expect(wrapper.text()).toContain('未找到匹配工具')
  })

  it('closes the dialog after close() is called', async () => {
    const wrapper = await mountComponent()
    wrapper.vm.open()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('dialog').exists()).toBe(true)
    wrapper.vm.close()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('dialog').exists()).toBe(false)
  })
})
