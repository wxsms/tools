import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Diff from './Diff.vue'

function mountComponent() {
  return mount(Diff)
}

describe('Diff', () => {
  it('renders title', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('文本对比')
  })

  it('shows identical message for same text', async () => {
    const wrapper = mountComponent()
    const textareas = wrapper.findAll('textarea')
    await textareas[0].setValue('hello')
    await textareas[1].setValue('hello')
    const compareBtn = wrapper.findAll('button').find(b => b.text().includes('对比'))
    await compareBtn.trigger('click')
    expect(wrapper.text()).toContain('两段文本完全相同')
  })

  it('shows diff result for different text', async () => {
    const wrapper = mountComponent()
    const textareas = wrapper.findAll('textarea')
    await textareas[0].setValue('hello')
    await textareas[1].setValue('world')
    const compareBtn = wrapper.findAll('button').find(b => b.text().includes('对比'))
    await compareBtn.trigger('click')
    expect(wrapper.text()).toContain('对比结果')
    expect(wrapper.text()).toContain('删除')
    expect(wrapper.text()).toContain('新增')
  })

  it('disables compare button when both inputs are empty', () => {
    const wrapper = mountComponent()
    const compareBtn = wrapper.findAll('button').find(b => b.text().includes('对比'))
    expect(compareBtn.element.disabled).toBe(true)
  })

  it('enables compare button when input has text', async () => {
    const wrapper = mountComponent()
    const textareas = wrapper.findAll('textarea')
    await textareas[0].setValue('hello')
    const compareBtn = wrapper.findAll('button').find(b => b.text().includes('对比'))
    expect(compareBtn.element.disabled).toBe(false)
  })

  it('clears all fields', async () => {
    const wrapper = mountComponent()
    const textareas = wrapper.findAll('textarea')
    await textareas[0].setValue('hello')
    await textareas[1].setValue('world')
    const clearBtn = wrapper.findAll('button').find(b => b.text().includes('清空'))
    await clearBtn.trigger('click')
    expect(textareas[0].element.value).toBe('')
    expect(textareas[1].element.value).toBe('')
  })

  it('shows stats after comparison', async () => {
    const wrapper = mountComponent()
    const textareas = wrapper.findAll('textarea')
    await textareas[0].setValue('line1')
    await textareas[1].setValue('line2')
    const compareBtn = wrapper.findAll('button').find(b => b.text().includes('对比'))
    await compareBtn.trigger('click')
    expect(wrapper.text()).toContain('行未变')
    expect(wrapper.text()).toContain('行新增')
    expect(wrapper.text()).toContain('行删除')
  })
})
