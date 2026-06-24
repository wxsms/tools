import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CliFormat from './CliFormat.vue'

function mountComponent() {
  return mount(CliFormat)
}

describe('CliFormat', () => {
  it('renders title', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('命令行格式转换')
  })

  it('converts single-line to multi-line by default (direction = to-multi)', async () => {
    const wrapper = mountComponent()
    const textareas = wrapper.findAll('textarea')
    await textareas[0].setValue('cmd --a 1 --b 2')
    await textareas[0].trigger('input')
    expect(textareas[1].element.value).toBe('cmd \\\n  --a 1 \\\n  --b 2')
  })

  it('converts multi-line to single-line (bidirectional auto-sync)', async () => {
    const wrapper = mountComponent()
    const textareas = wrapper.findAll('textarea')
    await textareas[1].setValue('cmd \\\n  --a 1 \\\n  --b 2')
    await textareas[1].trigger('input')
    expect(textareas[0].element.value).toBe('cmd --a 1 --b 2')
  })

  it('clears both fields', async () => {
    const wrapper = mountComponent()
    const textareas = wrapper.findAll('textarea')
    await textareas[0].setValue('cmd --a 1')
    await textareas[0].trigger('input')
    const clearBtn = wrapper.findAll('button').find(b => b.text().includes('清空'))
    await clearBtn.trigger('click')
    expect(textareas[0].element.value).toBe('')
    expect(textareas[1].element.value).toBe('')
  })

  it('shows error on unterminated quote', async () => {
    const wrapper = mountComponent()
    const textareas = wrapper.findAll('textarea')
    await textareas[0].setValue("echo 'unterminated")
    await textareas[0].trigger('input')
    expect(wrapper.text()).toContain('解析失败')
  })

  it('respects indent option (to-multi)', async () => {
    const wrapper = mountComponent()
    const indentBtn = wrapper.findAll('button').find(b => b.text().includes('4 空格'))
    await indentBtn.trigger('click')
    const textareas = wrapper.findAll('textarea')
    await textareas[0].setValue('cmd --a 1')
    await textareas[0].trigger('input')
    expect(textareas[1].element.value).toBe('cmd \\\n    --a 1')
  })

  it('respects continuation=false option (to-multi)', async () => {
    const wrapper = mountComponent()
    const noContBtn = wrapper.findAll('button').find(b => b.text().includes('无 \\'))
    await noContBtn.trigger('click')
    const textareas = wrapper.findAll('textarea')
    await textareas[0].setValue('cmd --a 1')
    await textareas[0].trigger('input')
    expect(textareas[1].element.value).toBe('cmd\n  --a 1')
  })
})
