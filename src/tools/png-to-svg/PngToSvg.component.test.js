import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import PngToSvg from './PngToSvg.vue'

// Component tests cover the UI wiring only; the tracing itself is exercised in
// ./png-to-svg.test.js because jsdom has no canvas to decode an image into.
function mountComponent() {
  return mount(PngToSvg)
}

describe('PngToSvg view', () => {
  it('renders title', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('PNG 转 SVG')
  })

  it('asks for an image before anything is converted', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('选择 PNG 图片后自动转换')
  })

  it('offers a PNG file picker', () => {
    const wrapper = mountComponent()
    const input = wrapper.find('input[type="file"]')
    expect(input.attributes('accept')).toBe('image/png')
  })

  it('shows the four tuneable parameters with their defaults', () => {
    const wrapper = mountComponent()
    const ranges = wrapper.findAll('input[type="range"]')
    expect(ranges).toHaveLength(3)
    expect(ranges.map(r => r.element.value)).toEqual(['16', '5', '8'])
    expect(wrapper.text()).toContain('颜色数量')
    expect(wrapper.text()).toContain('平滑度')
    expect(wrapper.text()).toContain('噪点过滤')
    expect(wrapper.text()).toContain('去除背景')
  })

  it('enables background removal by default', () => {
    const wrapper = mountComponent()
    const checkbox = wrapper.find('input[type="checkbox"]')
    expect(checkbox.element.checked).toBe(true)
  })

  it('disables copy and download until something is converted', () => {
    const wrapper = mountComponent()
    const buttons = wrapper.findAll('button')
    const copy = buttons.find(b => b.text().includes('复制'))
    const download = buttons.find(b => b.text().includes('下载 SVG'))
    expect(copy.attributes('disabled')).toBeDefined()
    expect(download.attributes('disabled')).toBeDefined()
  })

  it('leaves the result textarea empty before conversion', () => {
    const wrapper = mountComponent()
    const textarea = wrapper.find('textarea')
    expect(textarea.element.value).toBe('')
    expect(textarea.attributes('readonly')).toBeDefined()
  })

  it('does not try to trace when a parameter changes with no image loaded', async () => {
    const wrapper = mountComponent()
    const colors = wrapper.findAll('input[type="range"]')[0]
    await colors.setValue('32')
    await nextTick()
    expect(wrapper.text()).toContain('选择 PNG 图片后自动转换')
    expect(wrapper.find('.text-error').exists()).toBe(false)
  })

  it('resets back to the empty state', async () => {
    const wrapper = mountComponent()
    const reset = wrapper.findAll('button').find(b => b.text().includes('重置'))
    await reset.trigger('click')
    expect(wrapper.text()).toContain('选择 PNG 图片后自动转换')
  })
})
