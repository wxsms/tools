import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import UrlParse from './UrlParse.vue'

function mountComponent() {
  return mount(UrlParse)
}

describe('UrlParse', () => {
  it('renders title', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('URL 解析')
  })

  it('shows colored preview bar for valid URL', () => {
    const wrapper = mountComponent()
    const preview = wrapper.find('.bg-base-200.font-mono')
    expect(preview.exists()).toBe(true)
    const spans = preview.findAll('span')
    expect(spans.length).toBeGreaterThan(0)
  })

  it('colors component values in the table', () => {
    const wrapper = mountComponent()
    const valueSpans = wrapper.findAll('.card-body .flex-1')
    expect(valueSpans.length).toBeGreaterThan(0)
    // Protocol value should have text-blue-400
    const protocolSpan = valueSpans[0]
    expect(protocolSpan.classes()).toContain('text-blue-400')
  })

  it('colors query param keys in rose', () => {
    const wrapper = mountComponent()
    // The default URL has query params
    const roseElements = wrapper.findAll('.text-rose-400')
    expect(roseElements.length).toBeGreaterThan(0)
  })
})
