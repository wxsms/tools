import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import Emoji from './Emoji.vue'

async function mountComponent() {
  const wrapper = mount(Emoji)
  await vi.dynamicImportSettled()
  await flushPromises()
  return wrapper
}

describe('Emoji component', () => {
  beforeEach(() => {
    vi.stubGlobal('navigator', {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })
  })

  it('renders title', async () => {
    const wrapper = await mountComponent()
    expect(wrapper.text()).toContain('Emoji 大全')
  })

  it('renders search input', async () => {
    const wrapper = await mountComponent()
    expect(wrapper.find('input[type="text"]').exists()).toBe(true)
  })

  it('renders category tabs (全部 + 9 groups = 10)', async () => {
    const wrapper = await mountComponent()
    const tabs = wrapper.findAll('[data-test="tab"]')
    expect(tabs.length).toBe(10)
    expect(tabs[0].text()).toContain('全部')
  })

  it('renders at least 100 emoji buttons under 全部', async () => {
    const wrapper = await mountComponent()
    const buttons = wrapper.findAll('[data-test="emoji-btn"]')
    expect(buttons.length).toBeGreaterThan(100)
  })

  it('filters emojis by search query', async () => {
    const wrapper = await mountComponent()
    const before = wrapper.findAll('[data-test="emoji-btn"]').length
    const input = wrapper.find('input[type="text"]')
    await input.setValue('grinning')
    await flushPromises()
    const after = wrapper.findAll('[data-test="emoji-btn"]').length
    expect(after).toBeLessThan(before)
    expect(after).toBeGreaterThan(0)
  })

  it('restores full list when search cleared', async () => {
    const wrapper = await mountComponent()
    const before = wrapper.findAll('[data-test="emoji-btn"]').length
    const input = wrapper.find('input[type="text"]')
    await input.setValue('grinning')
    await flushPromises()
    await input.setValue('')
    await flushPromises()
    const after = wrapper.findAll('[data-test="emoji-btn"]').length
    expect(after).toBe(before)
  })

  it('filters by category when tab clicked', async () => {
    const wrapper = await mountComponent()
    const before = wrapper.findAll('[data-test="emoji-btn"]').length
    const tabs = wrapper.findAll('[data-test="tab"]')
    await tabs[1].trigger('click')
    await flushPromises()
    const after = wrapper.findAll('[data-test="emoji-btn"]').length
    expect(after).toBeLessThan(before)
  })

  it('hides detail panel when selected emoji filtered out', async () => {
    const wrapper = await mountComponent()
    // 点第一个 emoji（通常是 grinning face，label 含 'grinning'）
    const btn = wrapper.find('[data-test="emoji-btn"]')
    await btn.trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-test="detail"]').exists()).toBe(true)
    // 搜索一个不会命中已选中 emoji 的词
    const input = wrapper.find('input[type="text"]')
    await input.setValue('thumbsup')
    await flushPromises()
    expect(wrapper.find('[data-test="detail"]').exists()).toBe(false)
  })

  it('keeps detail panel when selected emoji still in results', async () => {
    const wrapper = await mountComponent()
    const btn = wrapper.find('[data-test="emoji-btn"]')
    await btn.trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-test="detail"]').exists()).toBe(true)
    // 搜索一个会命中已选中 emoji 的词（第一个是 grinning face，label 含 'grinning'）
    const input = wrapper.find('input[type="text"]')
    await input.setValue('grinning')
    await flushPromises()
    expect(wrapper.find('[data-test="detail"]').exists()).toBe(true)
  })

  it('shows empty state when search has no match', async () => {
    const wrapper = await mountComponent()
    const input = wrapper.find('input[type="text"]')
    await input.setValue('xyzqwerty_nothing')
    await flushPromises()
    expect(wrapper.findAll('[data-test="emoji-btn"]').length).toBe(0)
    expect(wrapper.text()).toContain('未找到匹配的 emoji')
  })

  it('copies char when emoji clicked', async () => {
    const wrapper = await mountComponent()
    const btn = wrapper.find('[data-test="emoji-btn"]')
    await btn.trigger('click')
    await flushPromises()
    expect(navigator.clipboard.writeText).toHaveBeenCalled()
    const arg = navigator.clipboard.writeText.mock.calls[0][0]
    expect(typeof arg).toBe('string')
    expect(arg.length).toBeGreaterThan(0)
  })

  it('shows detail panel when emoji clicked', async () => {
    const wrapper = await mountComponent()
    expect(wrapper.find('[data-test="detail"]').exists()).toBe(false)
    const btn = wrapper.find('[data-test="emoji-btn"]')
    await btn.trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-test="detail"]').exists()).toBe(true)
  })

  it('renders 5 copy format buttons in detail panel', async () => {
    const wrapper = await mountComponent()
    const btn = wrapper.find('[data-test="emoji-btn"]')
    await btn.trigger('click')
    await flushPromises()
    const copyBtns = wrapper.findAll('[data-test="copy-btn"]')
    expect(copyBtns.length).toBe(5)
  })

  it('copies codepoint format when codepoint button clicked', async () => {
    const wrapper = await mountComponent()
    const btn = wrapper.find('[data-test="emoji-btn"]')
    await btn.trigger('click')
    await flushPromises()
    const copyBtns = wrapper.findAll('[data-test="copy-btn"]')
    const codepointBtn = copyBtns.find(b => b.text().includes('码点'))
    expect(codepointBtn).toBeTruthy()
    navigator.clipboard.writeText.mockClear()
    await codepointBtn.trigger('click')
    await flushPromises()
    expect(navigator.clipboard.writeText).toHaveBeenCalled()
    const arg = navigator.clipboard.writeText.mock.calls[0][0]
    expect(arg).toMatch(/^U\+[0-9A-F]+( U\+[0-9A-F]+)*$/)
  })

  it('shows loading state before data is loaded', () => {
    const wrapper = mount(Emoji)
    // 未 flushPromises，应处于 loading 状态
    expect(wrapper.find('[data-test="loading"]').exists()).toBe(true)
    expect(wrapper.find('input[type="text"]').exists()).toBe(false)
  })
})
