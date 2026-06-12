import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Uuid from './Uuid.vue'

function mountComponent() {
  return mount(Uuid)
}

describe('Uuid', () => {
  it('renders title', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('ID 生成器')
  })

  it('generates a UUID on mount', () => {
    const wrapper = mountComponent()
    const codes = wrapper.findAll('code')
    expect(codes).toHaveLength(1)
    expect(codes[0].text()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
  })

  it('generates UUID without dashes when checkbox checked', async () => {
    const wrapper = mountComponent()
    const checkboxes = wrapper.findAll('input[type="checkbox"]')
    await checkboxes[1].setValue(true)
    const codes = wrapper.findAll('code')
    expect(codes[0].text()).not.toContain('-')
    expect(codes[0].text()).toMatch(/^[0-9a-f]{32}$/i)
  })

  it('generates uppercase UUID when checkbox checked', async () => {
    const wrapper = mountComponent()
    const checkboxes = wrapper.findAll('input[type="checkbox"]')
    await checkboxes[0].setValue(true)
    const codes = wrapper.findAll('code')
    expect(codes[0].text()).toMatch(/^[0-9A-F-]+$/)
  })

  it('generates multiple UUIDs', async () => {
    const wrapper = mountComponent()
    const numInput = wrapper.find('input[type="number"]')
    await numInput.setValue(5)
    const codes = wrapper.findAll('code')
    expect(codes).toHaveLength(5)
  })

  it('switches to NanoID mode', async () => {
    const wrapper = mountComponent()
    const buttons = wrapper.findAll('button')
    const nanoIdBtn = buttons.find(b => b.text() === 'NanoID')
    await nanoIdBtn.trigger('click')
    const codes = wrapper.findAll('code')
    expect(codes).toHaveLength(1)
    expect(codes[0].text()).toMatch(/^[A-Za-z0-9]{21}$/)
  })
})
