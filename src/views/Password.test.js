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
    const textarea = wrapper.find('textarea')
    expect(textarea.element.value.length).toBe(16)
  })

  it('respects length setting', async () => {
    const wrapper = mountComponent()
    const rangeInput = wrapper.find('input[type="range"]')
    await rangeInput.setValue(8)
    const btn = wrapper.findAll('button').find(b => b.text().includes('生成'))
    await btn.trigger('click')
    const textarea = wrapper.find('textarea')
    expect(textarea.element.value.length).toBe(8)
  })

  it('generates multiple passwords', async () => {
    const wrapper = mountComponent()
    const numInput = wrapper.find('input[type="number"]')
    await numInput.setValue(3)
    const btn = wrapper.findAll('button').find(b => b.text().includes('生成'))
    await btn.trigger('click')
    const textarea = wrapper.find('textarea')
    const lines = textarea.element.value.split('\n')
    expect(lines).toHaveLength(3)
  })
})
