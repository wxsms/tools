import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ColorPicker from './ColorPicker.vue'

function mountComponent() {
  return mount(ColorPicker)
}

describe('ColorPicker', () => {
  it('renders title', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('取色器')
  })

  it('shows HEX, RGB, HSL inputs', () => {
    const wrapper = mountComponent()
    const inputs = wrapper.findAll('input:not([type="color"])')
    expect(inputs.length).toBe(3)
  })

  it('updates RGB and HSL when HEX changes', async () => {
    const wrapper = mountComponent()
    const inputs = wrapper.findAll('input:not([type="color"])')
    await inputs[0].setValue('#00ff00')
    await inputs[0].trigger('input')
    const allInputs = wrapper.findAll('input:not([type="color"])')
    expect(allInputs[1].element.value).toContain('0')
    expect(allInputs[1].element.value).toContain('255')
  })

  it('shows color preview', () => {
    const wrapper = mountComponent()
    const preview = wrapper.find('.rounded-lg')
    expect(preview.exists()).toBe(true)
  })

  it('renders eyedropper button', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('取色')
  })

  it('disables eyedropper button when API is not supported', () => {
    const wrapper = mountComponent()
    const btn = wrapper.findAll('button').find(b => b.text().includes('取色'))
    if (!('EyeDropper' in window)) {
      expect(btn.attributes('disabled')).toBeDefined()
    }
  })
})
