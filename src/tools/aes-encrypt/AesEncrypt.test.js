import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import AesEncrypt from './AesEncrypt.vue'

vi.mock('./crypto.js', () => ({
  aesEncrypt: vi.fn().mockResolvedValue('encrypted-hex'),
  aesDecrypt: vi.fn().mockResolvedValue('decrypted-text'),
  aesEncryptRaw: vi.fn(() => 'raw-encrypted-hex'),
  aesDecryptRaw: vi.fn(() => 'raw-decrypted-text'),
  deriveKey: vi.fn().mockResolvedValue(new Uint8Array(32)),
  generateIv: vi.fn(() => new Uint8Array(16).fill(0xab)),
  generateSalt: vi.fn(() => new Uint8Array(16).fill(0xcd)),
  bytesToHex: vi.fn((bytes) => Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')),
  hexToBytes: vi.fn((hex) => {
    const bytes = new Uint8Array(hex.length / 2)
    for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.substr(i, 2), 16)
    return bytes
  }),
  randomBytes: vi.fn((len) => new Uint8Array(len).fill(0x42)),
  SYMMETRIC_ALGORITHMS: ['AES-CBC', 'AES-GCM', 'AES-CTR', 'ChaCha20-Poly1305'],
  AES_KEY_SIZES: [128, 192, 256],
  IV_LENGTHS: { 'AES-CBC': 16, 'AES-GCM': 12, 'AES-CTR': 16, 'ChaCha20-Poly1305': 12 },
  DEFAULT_ITERATIONS: 100000,
}))

function mountComponent() {
  return mount(AesEncrypt)
}

describe('AesEncrypt', () => {
  it('renders title', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('对称加密')
  })

  it('renders all algorithm selection buttons', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('AES-CBC')
    expect(wrapper.text()).toContain('AES-GCM')
    expect(wrapper.text()).toContain('AES-CTR')
    expect(wrapper.text()).toContain('ChaCha20-Poly1305')
  })

  it('renders password and plaintext inputs', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('密码')
    expect(wrapper.text()).toContain('明文')
  })

  it('clears encrypt fields', async () => {
    const wrapper = mountComponent()
    const clearBtn = wrapper.findAll('button').find(b => b.text().includes('清空'))
    await clearBtn.trigger('click')
    const textareas = wrapper.findAll('textarea')
    expect(textareas[0].element.value).toBe('')
    expect(textareas[1].element.value).toBe('')
  })

  it('has key generation next to password input', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('生成')
    expect(wrapper.find('input[name="keygenSize"]').exists()).toBe(true)
  })
})
