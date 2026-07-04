import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BorderRadius from './BorderRadius.vue'

function mountComponent() {
  return mount(BorderRadius)
}

describe('BorderRadius', () => {
  it('renders title', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('圆角')
  })

  it('shows link mode checkbox', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('联动')
  })

  it('shows unit radios', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('px')
    expect(wrapper.text()).toContain('%')
    expect(wrapper.text()).toContain('rem')
  })

  it('generates CSS code with border-radius', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('border-radius:')
  })

  it('shows default 16px value', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('16px')
  })

  it('shows preview square', () => {
    const wrapper = mountComponent()
    const preview = wrapper.find('.border-dashed')
    expect(preview.exists()).toBe(true)
  })
})
