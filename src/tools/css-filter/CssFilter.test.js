import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CssFilter from './CssFilter.vue'

function mountComponent() {
  return mount(CssFilter)
}

describe('CssFilter', () => {
  it('renders title', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('滤镜')
  })

  it('shows default blur filter in list', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('blur(')
  })

  it('has filter type selector', () => {
    const wrapper = mountComponent()
    const selects = wrapper.findAll('select')
    expect(selects.length).toBeGreaterThanOrEqual(1)
  })

  it('shows add filter button', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('添加滤镜')
  })

  it('generates CSS code with filter', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('filter:')
  })

  it('shows preview image', () => {
    const wrapper = mountComponent()
    const preview = wrapper.find('img')
    expect(preview.exists()).toBe(true)
  })

  it('renders preset buttons', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('预设')
    expect(wrapper.text()).toContain('复古')
    expect(wrapper.text()).toContain('黑白')
  })
})
