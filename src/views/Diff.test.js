import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Diff from './Diff.vue'

function mountComponent() {
  return mount(Diff)
}

describe('Diff', () => {
  it('renders title', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('Text Diff')
  })

  it('shows identical message for same text', async () => {
    const wrapper = mountComponent()
    const textareas = wrapper.findAll('textarea')
    await textareas[0].setValue('hello')
    await textareas[1].setValue('hello')
    const compareBtn = wrapper.findAll('button').find(b => b.text().includes('Compare'))
    await compareBtn.trigger('click')
    expect(wrapper.text()).toContain('The two texts are identical')
  })

  it('shows diff result for different text', async () => {
    const wrapper = mountComponent()
    const textareas = wrapper.findAll('textarea')
    await textareas[0].setValue('hello')
    await textareas[1].setValue('world')
    const compareBtn = wrapper.findAll('button').find(b => b.text().includes('Compare'))
    await compareBtn.trigger('click')
    expect(wrapper.text()).toContain('Comparison Result')
    expect(wrapper.text()).toContain('Deleted')
    expect(wrapper.text()).toContain('Added')
  })

  it('disables compare button when both inputs are empty', () => {
    const wrapper = mountComponent()
    const compareBtn = wrapper.findAll('button').find(b => b.text().includes('Compare'))
    expect(compareBtn.element.disabled).toBe(true)
  })

  it('enables compare button when input has text', async () => {
    const wrapper = mountComponent()
    const textareas = wrapper.findAll('textarea')
    await textareas[0].setValue('hello')
    const compareBtn = wrapper.findAll('button').find(b => b.text().includes('Compare'))
    expect(compareBtn.element.disabled).toBe(false)
  })

  it('clears all fields', async () => {
    const wrapper = mountComponent()
    const textareas = wrapper.findAll('textarea')
    await textareas[0].setValue('hello')
    await textareas[1].setValue('world')
    const clearBtn = wrapper.findAll('button').find(b => b.text().includes('Clear'))
    await clearBtn.trigger('click')
    expect(textareas[0].element.value).toBe('')
    expect(textareas[1].element.value).toBe('')
  })

  it('shows stats after comparison', async () => {
    const wrapper = mountComponent()
    const textareas = wrapper.findAll('textarea')
    await textareas[0].setValue('line1')
    await textareas[1].setValue('line2')
    const compareBtn = wrapper.findAll('button').find(b => b.text().includes('Compare'))
    await compareBtn.trigger('click')
    expect(wrapper.text()).toContain('unchanged')
    expect(wrapper.text()).toContain('added')
    expect(wrapper.text()).toContain('deleted')
  })
})
