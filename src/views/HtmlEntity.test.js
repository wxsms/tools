import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import HtmlEntity from './HtmlEntity.vue'

function mountComponent() {
  return mount(HtmlEntity)
}

describe('HtmlEntity', () => {
  it('renders title', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('HTML 实体编码')
  })

  it('encodes HTML special characters', async () => {
    const wrapper = mountComponent()
    const textareas = wrapper.findAll('textarea')
    await textareas[0].setValue('<div class="test">&hello</div>')
    await textareas[0].trigger('input')
    expect(textareas[1].element.value).toBe('&lt;div class=&quot;test&quot;&gt;&amp;hello&lt;/div&gt;')
  })

  it('decodes HTML entities', async () => {
    const wrapper = mountComponent()
    const textareas = wrapper.findAll('textarea')
    await textareas[1].setValue('&lt;hello&gt;')
    await textareas[1].trigger('input')
    expect(textareas[0].element.value).toBe('<hello>')
  })

  it('clears all fields', async () => {
    const wrapper = mountComponent()
    const textareas = wrapper.findAll('textarea')
    await textareas[0].setValue('<test>')
    await textareas[0].trigger('input')
    const clearBtn = wrapper.findAll('button').find(b => b.text().includes('清空'))
    await clearBtn.trigger('click')
    expect(textareas[0].element.value).toBe('')
    expect(textareas[1].element.value).toBe('')
  })
})
