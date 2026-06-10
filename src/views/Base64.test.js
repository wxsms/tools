import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Base64 from './Base64.vue'

function mountComponent() {
  return mount(Base64)
}

describe('Base64', () => {
  it('renders title', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('Base64 Converter')
  })

  it('encodes input to Base64', async () => {
    const wrapper = mountComponent()
    const textareas = wrapper.findAll('textarea')
    await textareas[0].setValue('hello')
    await textareas[0].trigger('input')
    expect(textareas[1].element.value).toBe('aGVsbG8=')
  })

  it('decodes Base64 to text', async () => {
    const wrapper = mountComponent()
    const textareas = wrapper.findAll('textarea')
    await textareas[1].setValue('aGVsbG8=')
    await textareas[1].trigger('input')
    expect(textareas[0].element.value).toBe('hello')
  })

  it('shows error for invalid Base64', async () => {
    const wrapper = mountComponent()
    const textareas = wrapper.findAll('textarea')
    await textareas[1].setValue('!!!invalid!!!')
    await textareas[1].trigger('input')
    expect(wrapper.text()).toContain('Invalid Base64 string')
  })

  it('clears all fields', async () => {
    const wrapper = mountComponent()
    const textareas = wrapper.findAll('textarea')
    await textareas[0].setValue('hello')
    await textareas[0].trigger('input')
    const clearBtn = wrapper.findAll('button').find(b => b.text().includes('Clear'))
    await clearBtn.trigger('click')
    expect(textareas[0].element.value).toBe('')
    expect(textareas[1].element.value).toBe('')
  })

  it('clears output when input is emptied', async () => {
    const wrapper = mountComponent()
    const textareas = wrapper.findAll('textarea')
    await textareas[0].setValue('hello')
    await textareas[0].trigger('input')
    expect(textareas[1].element.value).toBe('aGVsbG8=')
    await textareas[0].setValue('')
    await textareas[0].trigger('input')
    expect(textareas[1].element.value).toBe('')
  })
})
