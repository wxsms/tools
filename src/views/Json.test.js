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
vi.mock('../composables/useTheme.js', () => ({
  useTheme: () => ({ theme: { value: 'light' } }),
}))

function mountComponent() {
  return mount(Json)
}

describe('Json', () => {
  it('renders title', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('JSON Validator')
  })

  it('renders toolbar buttons', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('Format')
    expect(wrapper.text()).toContain('Minify')
    expect(wrapper.text()).toContain('中文 → Unicode')
    expect(wrapper.text()).toContain('Unicode → 中文')
  })

  it('shows valid JSON indicator for valid input', async () => {
    const wrapper = mountComponent()
    // Component starts with valid sample JSON
    const textarea = wrapper.find('textarea')
    await textarea.trigger('input')
    expect(wrapper.text()).toContain('Valid JSON')
  })

  it('shows invalid JSON indicator for invalid input', async () => {
    const wrapper = mountComponent()
    const textarea = wrapper.find('textarea')
    await textarea.setValue('{invalid}')
    await textarea.trigger('input')
    expect(wrapper.text()).toContain('Invalid JSON')
  })

  it('formats JSON', async () => {
    const wrapper = mountComponent()
    const textarea = wrapper.find('textarea')
    await textarea.setValue('{"a":1}')
    const formatBtn = wrapper.findAll('button').find(b => b.text().includes('Format'))
    await formatBtn.trigger('click')
    // After formatting, the value should have indentation
    expect(textarea.element.value).toContain('\n')
    expect(textarea.element.value).toContain('  ')
  })

  it('minifies JSON', async () => {
    const wrapper = mountComponent()
    const textarea = wrapper.find('textarea')
    await textarea.setValue('{\n  "a": 1\n}')
    const minifyBtn = wrapper.findAll('button').find(b => b.text().includes('Minify'))
    await minifyBtn.trigger('click')
    expect(textarea.element.value).toBe('{"a":1}')
  })

  it('converts Chinese to Unicode escape sequences', async () => {
    const wrapper = mountComponent()
    const textarea = wrapper.find('textarea')
    await textarea.setValue('你好')
    const uniBtn = wrapper.findAll('button').find(b => b.text().includes('中文 → Unicode'))
    await uniBtn.trigger('click')
    expect(textarea.element.value).toContain('\\u4f60')
    expect(textarea.element.value).toContain('\\u597d')
  })

  it('converts Unicode escape sequences back to Chinese', async () => {
    const wrapper = mountComponent()
    const textarea = wrapper.find('textarea')
    await textarea.setValue('\\u4f60\\u597d')
    const uniBtn = wrapper.findAll('button').find(b => b.text().includes('Unicode → 中文'))
    await uniBtn.trigger('click')
    expect(textarea.element.value).toBe('你好')
  })

  it('adds quote escape via JSON.stringify', async () => {
    const wrapper = mountComponent()
    const textarea = wrapper.find('textarea')
    await textarea.setValue('hello "world"')
    const escapeBtn = wrapper.findAll('button').find(b => b.text().includes('添加'))
    await escapeBtn.trigger('click')
    // JSON.stringify wraps in quotes and escapes inner quotes
    expect(textarea.element.value).toContain('\\"')
  })

  it('removes quote escape via JSON.parse', async () => {
    const wrapper = mountComponent()
    const textarea = wrapper.find('textarea')
    await textarea.setValue('"hello \\"world\\""')
    const unescapeBtn = wrapper.findAll('button').find(b => b.text().includes('去除'))
    await unescapeBtn.trigger('click')
    expect(textarea.element.value).toBe('hello "world"')
  })

  it('disables toolbar buttons when input is empty', async () => {
    const wrapper = mountComponent()
    const textarea = wrapper.find('textarea')
    await textarea.setValue('')
    const formatBtn = wrapper.findAll('button').find(b => b.text().includes('Format'))
    expect(formatBtn.element.disabled).toBe(true)
  })

  it('enables toolbar buttons when input has text', async () => {
    const wrapper = mountComponent()
    const textarea = wrapper.find('textarea')
    await textarea.setValue('{"a":1}')
    const formatBtn = wrapper.findAll('button').find(b => b.text().includes('Format'))
    expect(formatBtn.element.disabled).toBe(false)
  })

  it('shows tree view placeholder when no valid JSON', async () => {
    const wrapper = mountComponent()
    const textarea = wrapper.find('textarea')
    await textarea.setValue('')
    await textarea.trigger('input')
    expect(wrapper.text()).toContain('Enter valid JSON to see the tree view')
  })
})
