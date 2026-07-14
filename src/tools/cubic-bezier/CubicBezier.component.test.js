import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CubicBezier from './CubicBezier.vue'

function mountComponent() {
  return mount(CubicBezier)
}

describe('CubicBezier', () => {
  it('renders title', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('三次贝塞尔曲线')
  })

  it('shows the CSS code with cubic-bezier()', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('cubic-bezier(')
  })

  it('shows presets including standard CSS keywords', () => {
    const wrapper = mountComponent()
    const text = wrapper.text()
    expect(text).toContain('linear')
    expect(text).toContain('ease-in')
    expect(text).toContain('ease-out')
    expect(text).toContain('ease-in-out')
  })

  it('has SVG canvas for editing', () => {
    const wrapper = mountComponent()
    const svg = wrapper.find('svg')
    expect(svg.exists()).toBe(true)
  })

  it('has numeric inputs for all four control coordinates', () => {
    const wrapper = mountComponent()
    const inputs = wrapper.findAll('input[type="number"]')
    expect(inputs.length).toBe(4)
  })

  it('shows animation preview play button', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('播放')
  })

  it('shows sampled timing values', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('x=')
    expect(wrapper.text()).toContain('y=')
  })

  it('does not reset coordinate to 0 when an input is cleared', async () => {
    const wrapper = mountComponent()
    const inputs = wrapper.findAll('input[type="number"]')
    // x1 input is the first numeric input
    await inputs[0].setValue('0.5')
    expect(wrapper.text()).toContain('cubic-bezier(0.5,')
    // clearing the field should NOT snap x1 to 0
    await inputs[0].setValue('')
    expect(wrapper.text()).toContain('cubic-bezier(0.5,')
  })
})
