import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Triangle from './Triangle.vue'

function mountComponent() {
  return mount(Triangle)
}

describe('Triangle', () => {
  it('renders title', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('三角形')
  })

  it('shows direction radios', () => {
    const wrapper = mountComponent()
    const radios = wrapper.findAll('input[type="radio"][name="triangle-direction"]')
    expect(radios.length).toBe(4)
  })

  it('shows width and height sliders', () => {
    const wrapper = mountComponent()
    const ranges = wrapper.findAll('input[type="range"]')
    expect(ranges.length).toBe(2)
  })

  it('generates CSS code with border properties', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('border-bottom')
    expect(wrapper.text()).toContain('solid transparent')
  })

  it('shows default color #6366f1', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('#6366f1')
  })
})
