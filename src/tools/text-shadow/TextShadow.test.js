import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TextShadow from './TextShadow.vue'

function mountComponent() {
  return mount(TextShadow)
}

describe('TextShadow', () => {
  it('renders title', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('文字阴影')
  })

  it('shows default shadow in list', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('2px 2px 4px')
  })

  it('has range sliders for shadow params', () => {
    const wrapper = mountComponent()
    const ranges = wrapper.findAll('input[type="range"]')
    expect(ranges.length).toBeGreaterThanOrEqual(4)
  })

  it('shows add shadow button', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('添加阴影')
  })

  it('generates CSS code with text-shadow', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('text-shadow:')
  })

  it('shows preview text', () => {
    const wrapper = mountComponent()
    const preview = wrapper.find('span.font-bold')
    expect(preview.exists()).toBe(true)
  })
})
