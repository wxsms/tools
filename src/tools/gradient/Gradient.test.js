import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Gradient from './Gradient.vue'

function mountComponent() {
  return mount(Gradient)
}

describe('Gradient', () => {
  it('renders title', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('渐变')
  })

  it('shows gradient type radios', () => {
    const wrapper = mountComponent()
    const radios = wrapper.findAll('input[type="radio"][name="gradient-type"]')
    expect(radios.length).toBe(3)
  })

  it('shows default linear gradient code', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('linear-gradient')
  })

  it('shows two default color stops', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('#6366f1')
    expect(wrapper.text()).toContain('#ec4899')
  })

  it('has add stop button', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('添加色标')
  })

  it('shows preview bar', () => {
    const wrapper = mountComponent()
    const preview = wrapper.find('.min-h-\\[120px\\]')
    expect(preview.exists()).toBe(true)
  })
})
