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

  it('opens on Cmd+K and closes on Cmd+K again', async () => {
    const wrapper = await mountComponent()
    expect(wrapper.find('dialog').exists()).toBe(false)
    wrapper.vm.handleKeydown(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))
    await wrapper.vm.$nextTick()
    expect(wrapper.find('dialog').exists()).toBe(true)
    wrapper.vm.handleKeydown(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))
    await wrapper.vm.$nextTick()
    expect(wrapper.find('dialog').exists()).toBe(false)
  })

  it('opens on Ctrl+K', async () => {
    const wrapper = await mountComponent()
    wrapper.vm.handleKeydown(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }))
    await wrapper.vm.$nextTick()
    expect(wrapper.find('dialog').exists()).toBe(true)
  })

  it('closes on Esc', async () => {
    const wrapper = await mountComponent()
    wrapper.vm.open()
    await wrapper.vm.$nextTick()
    wrapper.vm.handleKeydown(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await wrapper.vm.$nextTick()
    expect(wrapper.find('dialog').exists()).toBe(false)
  })

  it('ArrowDown moves activeIndex forward', async () => {
    const wrapper = await mountComponent()
    wrapper.vm.open()
    await wrapper.vm.$nextTick()
    await wrapper.find('input[type="text"]').setValue('css')
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.results.length).toBeGreaterThan(1)
    expect(wrapper.vm.activeIndex).toBe(0)
    wrapper.vm.handleKeydown(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.activeIndex).toBe(1)
  })

  it('ArrowUp wraps from 0 to last index', async () => {
    const wrapper = await mountComponent()
    wrapper.vm.open()
    await wrapper.vm.$nextTick()
    await wrapper.find('input[type="text"]').setValue('css')
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.activeIndex).toBe(0)
    wrapper.vm.handleKeydown(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }))
    await wrapper.vm.$nextTick()
    const lastIndex = wrapper.vm.results.length - 1
    expect(wrapper.vm.activeIndex).toBe(lastIndex)
  })

  it('Enter pushes the active path to the router and closes', async () => {
    const wrapper = await mountComponent()
    const router = wrapper.vm.$router
    const pushSpy = vi.spyOn(router, 'push')
    wrapper.vm.open()
    await wrapper.vm.$nextTick()
    await wrapper.find('input[type="text"]').setValue('base64')
    wrapper.vm.handleKeydown(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    await wrapper.vm.$nextTick()
    expect(pushSpy).toHaveBeenCalledWith('/base64')
    expect(wrapper.find('dialog').exists()).toBe(false)
  })
})
