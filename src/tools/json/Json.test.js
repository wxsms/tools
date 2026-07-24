import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import Json from './Json.vue'

// Mock vue-json-pretty — it's a third-party component that doesn't need testing here
vi.mock('vue-json-pretty', () => ({
  default: {
    name: 'VueJsonPretty',
    template: '<div class="mock-json-pretty" />',
  },
}))
vi.mock('vue-json-pretty/lib/styles.css', () => ({ default: {} }))

// Mock useTheme
vi.mock('../../composables/useTheme.js', () => ({
  useTheme: () => ({ theme: { value: 'light' } }),
}))

function mountComponent() {
  return mount(Json)
}

describe('Json', () => {
  it('renders title', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('JSON 校验器')
  })

  it('renders toolbar buttons', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('格式化')
    expect(wrapper.text()).toContain('压缩')
    expect(wrapper.text()).toContain('中文 → Unicode')
    expect(wrapper.text()).toContain('Unicode → 中文')
  })
})
