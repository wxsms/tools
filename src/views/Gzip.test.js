import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import Gzip from './Gzip.vue'

// Mock the gzip utils to avoid browser-only CompressionStream/DecompressionStream
vi.mock('../utils/gzip.js', () => ({
  uint8ToBase64: (bytes) => btoa(String.fromCharCode(...bytes)),
  base64ToUint8: (b64) => {
    const binary = atob(b64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return bytes
  },
  gzipEncode: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
  gzipDecode: vi.fn().mockResolvedValue('decoded'),
}))

function mountComponent() {
  return mount(Gzip)
}

describe('Gzip', () => {
  it('renders title', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('Gzip 压缩 / 解压')
  })

  it('encodes input and shows result', async () => {
    const wrapper = mountComponent()
    const textareas = wrapper.findAll('textarea')
    await textareas[0].setValue('hello')
    await textareas[0].trigger('input')
    expect(textareas[1].element.value).toBe('AQID')
  })

  it('shows error for invalid Gzip Base64 input', async () => {
    const { gzipDecode } = await import('../utils/gzip.js')
    gzipDecode.mockRejectedValueOnce(new Error('invalid'))
    const wrapper = mountComponent()
    const textareas = wrapper.findAll('textarea')
    await textareas[1].setValue('!!!invalid!!!')
    await textareas[1].trigger('input')
    expect(wrapper.text()).toContain('无效的 Gzip Base64 字符串')
  })

  it('clears output when input is emptied', async () => {
    const wrapper = mountComponent()
    const textareas = wrapper.findAll('textarea')
    await textareas[0].setValue('hello')
    await textareas[0].trigger('input')
    await textareas[0].setValue('')
    await textareas[0].trigger('input')
    expect(textareas[1].element.value).toBe('')
  })

  it('clears input when output is emptied', async () => {
    const wrapper = mountComponent()
    const textareas = wrapper.findAll('textarea')
    await textareas[1].setValue('AQID')
    await textareas[1].trigger('input')
    await textareas[1].setValue('')
    await textareas[1].trigger('input')
    expect(textareas[0].element.value).toBe('')
  })

  it('clears all fields', async () => {
    const wrapper = mountComponent()
    const textareas = wrapper.findAll('textarea')
    await textareas[0].setValue('hello')
    const clearBtn = wrapper.findAll('button').find(b => b.text().includes('清空'))
    await clearBtn.trigger('click')
    expect(textareas[0].element.value).toBe('')
    expect(textareas[1].element.value).toBe('')
  })
})
