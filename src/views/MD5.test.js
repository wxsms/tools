import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import MD5 from './MD5.vue'

function mountComponent() {
  return mount(MD5)
}

describe('MD5', () => {
  it('renders title', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('MD5 Hash')
  })

  it('computes MD5 hash on input', async () => {
    const wrapper = mountComponent()
    const textarea = wrapper.find('textarea')
    const input = wrapper.find('input')
    await textarea.setValue('hello')
    await textarea.trigger('input')
    expect(input.element.value).toBe('5d41402abc4b2a76b9719d911017c592')
  })

  it('clears output when input is emptied', async () => {
    const wrapper = mountComponent()
    const textarea = wrapper.find('textarea')
    const input = wrapper.find('input')
    await textarea.setValue('hello')
    await textarea.trigger('input')
    await textarea.setValue('')
    await textarea.trigger('input')
    expect(input.element.value).toBe('')
  })

  it('clears all fields', async () => {
    const wrapper = mountComponent()
    const textarea = wrapper.find('textarea')
    const input = wrapper.find('input')
    await textarea.setValue('hello')
    await textarea.trigger('input')
    const clearBtn = wrapper.findAll('button').find(b => b.text().includes('Clear'))
    await clearBtn.trigger('click')
    expect(textarea.element.value).toBe('')
    expect(input.element.value).toBe('')
  })
})
