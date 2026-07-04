import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BoxShadow from './BoxShadow.vue'

function mountComponent() {
  return mount(BoxShadow)
}

describe('BoxShadow', () => {
  it('renders title', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('盒阴影')
  })

  it('shows default shadow in list', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('5px 5px 15px')
  })

  it('has range sliders for shadow params', () => {
    const wrapper = mountComponent()
    const ranges = wrapper.findAll('input[type="range"]')
    expect(ranges.length).toBeGreaterThanOrEqual(5)
  })

  it('shows add shadow button', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('添加阴影')
  })

  it('generates CSS code with box-shadow', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('box-shadow:')
  })

  it('shows preview card', () => {
    const wrapper = mountComponent()
    const preview = wrapper.find('.bg-white.rounded-lg')
    expect(preview.exists()).toBe(true)
  })
})
