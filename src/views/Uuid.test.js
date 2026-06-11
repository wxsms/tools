import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Uuid from './Uuid.vue'

function mountComponent() {
  return mount(Uuid)
}

describe('Uuid', () => {
  it('renders title', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('UUID 生成器')
  })

  it('generates a UUID on mount', () => {
    const wrapper = mountComponent()
    const textarea = wrapper.find('textarea')
    expect(textarea.element.value).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
  })

  it('generates UUID without dashes when checkbox checked', async () => {
    const wrapper = mountComponent()
    const checkboxes = wrapper.findAll('input[type="checkbox"]')
    await checkboxes[1].setValue(true)
    const btn = wrapper.findAll('button').find(b => b.text().includes('生成'))
    await btn.trigger('click')
    const textarea = wrapper.find('textarea')
    expect(textarea.element.value).not.toContain('-')
    expect(textarea.element.value).toMatch(/^[0-9a-f]{32}$/i)
  })

  it('generates uppercase UUID when checkbox checked', async () => {
    const wrapper = mountComponent()
    const checkboxes = wrapper.findAll('input[type="checkbox"]')
    await checkboxes[0].setValue(true)
    const btn = wrapper.findAll('button').find(b => b.text().includes('生成'))
    await btn.trigger('click')
    const textarea = wrapper.find('textarea')
    expect(textarea.element.value).toMatch(/^[0-9A-F-]+$/)
  })

  it('generates multiple UUIDs', async () => {
    const wrapper = mountComponent()
    const numInput = wrapper.find('input[type="number"]')
    await numInput.setValue(5)
    const btn = wrapper.findAll('button').find(b => b.text().includes('生成'))
    await btn.trigger('click')
    const textarea = wrapper.find('textarea')
    const lines = textarea.element.value.split('\n')
    expect(lines).toHaveLength(5)
  })
})
