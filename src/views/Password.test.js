import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Password from './Password.vue'

function mountComponent() {
  return mount(Password)
}

describe('Password', () => {
  it('renders title', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('密码生成器')
  })

  it('generates a password on mount', () => {
    const wrapper = mountComponent()
    const codes = wrapper.findAll('code')
    expect(codes).toHaveLength(1)
    expect(codes[0].text().length).toBe(16)
  })

  it('respects length setting', async () => {
    const wrapper = mountComponent()
    const rangeInput = wrapper.find('input[type="range"]')
    await rangeInput.setValue(8)
    const codes = wrapper.findAll('code')
    expect(codes).toHaveLength(1)
    expect(codes[0].text().length).toBe(8)
  })

  it('generates multiple passwords', async () => {
    const wrapper = mountComponent()
    const numInput = wrapper.find('input[type="number"]')
    await numInput.setValue(3)
    const codes = wrapper.findAll('code')
    expect(codes).toHaveLength(3)
  })
})
