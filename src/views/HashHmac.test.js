import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import HashHmac from './HashHmac.vue'

vi.mock('../utils/crypto.js', () => ({
  computeHash: vi.fn((algo, input) => `${algo}-hash-of-${input}`),
  computeHmac: vi.fn((algo, key, input) => `hmac-${algo}-${key}-${input}`),
  HASH_ALGORITHMS: ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512', 'MD5', 'RIPEMD160'],
}))

function mountComponent() {
  return mount(HashHmac)
}

describe('HashHmac', () => {
  it('renders title', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('哈希 / 散列')
  })

  it('computes hash on input', async () => {
    const wrapper = mountComponent()
    const textarea = wrapper.find('textarea')
    await textarea.setValue('hello')
    await textarea.trigger('input')
    const { computeHash } = await import('../utils/crypto.js')
    expect(computeHash).toHaveBeenCalled()
  })

  it('shows HMAC key input when mode is HMAC', async () => {
    const wrapper = mountComponent()
    const hmacBtn = wrapper.findAll('button').find(b => b.text().trim() === 'HMAC')
    await hmacBtn.trigger('click')
    expect(wrapper.text()).toContain('HMAC 密钥')
  })

  it('clears hash fields', async () => {
    const wrapper = mountComponent()
    const textarea = wrapper.find('textarea')
    await textarea.setValue('hello')
    const clearBtn = wrapper.findAll('button').find(b => b.text().includes('清空'))
    await clearBtn.trigger('click')
    expect(textarea.element.value).toBe('')
  })
})
