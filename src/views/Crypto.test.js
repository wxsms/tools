import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import Crypto from './Crypto.vue'

// Mock crypto utils — heavy crypto operations don't need real execution in component tests
vi.mock('../utils/crypto.js', () => ({
  computeHash: vi.fn((algo, input) => `${algo}-hash-of-${input}`),
  computeHmac: vi.fn((algo, key, input) => `hmac-${algo}-${key}-${input}`),
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
  HASH_ALGORITHMS: ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512', 'MD5', 'RIPEMD160'],
  AES_ALGORITHMS: ['AES-CBC', 'AES-GCM'],
  AES_KEY_SIZES: [128, 192, 256],
  DEFAULT_ITERATIONS: 100000,
}))

function mountComponent() {
  return mount(Crypto)
}

describe('Crypto', () => {
  it('renders title', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('Crypto')
  })

  it('renders encrypt tab by default', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('Password')
    expect(wrapper.text()).toContain('Plaintext')
  })

  it('switches to hash tab', async () => {
    const wrapper = mountComponent()
    const tabs = wrapper.findAll('[role="tab"]')
    await tabs[1].trigger('click')
    expect(wrapper.text()).toContain('Input')
    expect(wrapper.text()).toContain('Hash')
  })

  it('switches to keygen tab', async () => {
    const wrapper = mountComponent()
    const tabs = wrapper.findAll('[role="tab"]')
    await tabs[2].trigger('click')
    expect(wrapper.text()).toContain('Key Length')
    expect(wrapper.text()).toContain('Generate')
  })

  describe('Hash / HMAC tab', () => {
    async function mountHashTab() {
      const wrapper = mountComponent()
      const tabs = wrapper.findAll('[role="tab"]')
      await tabs[1].trigger('click')
      return wrapper
    }

    it('computes hash on input', async () => {
      const wrapper = await mountHashTab()
      const textarea = wrapper.find('textarea')
      await textarea.setValue('hello')
      await textarea.trigger('input')
      const { computeHash } = await import('../utils/crypto.js')
      expect(computeHash).toHaveBeenCalled()
    })

    it('shows HMAC key input when mode is HMAC', async () => {
      const wrapper = await mountHashTab()
      // Find the HMAC mode button (the one inside the hash tab)
      const buttons = wrapper.findAll('button')
      const hmacBtn = buttons.find(b => b.text().trim() === 'HMAC')
      await hmacBtn.trigger('click')
      expect(wrapper.text()).toContain('HMAC Key')
    })

    it('clears hash fields', async () => {
      const wrapper = await mountHashTab()
      const textarea = wrapper.find('textarea')
      await textarea.setValue('hello')
      const clearBtn = wrapper.findAll('button').find(b => b.text().includes('Clear'))
      await clearBtn.trigger('click')
      expect(textarea.element.value).toBe('')
    })
  })

  describe('KeyGen tab', () => {
    async function mountKeygenTab() {
      const wrapper = mountComponent()
      const tabs = wrapper.findAll('[role="tab"]')
      await tabs[2].trigger('click')
      return wrapper
    }

    it('generates a key when button is clicked', async () => {
      const wrapper = await mountKeygenTab()
      const genBtn = wrapper.findAll('button').find(b => b.text().includes('Generate'))
      await genBtn.trigger('click')
      const { randomBytes, bytesToHex } = await import('../utils/crypto.js')
      expect(randomBytes).toHaveBeenCalled()
      expect(bytesToHex).toHaveBeenCalled()
      // Result should be shown
      expect(wrapper.find('textarea[readonly]').exists()).toBe(true)
    })

    it('renders key length options', async () => {
      const wrapper = await mountKeygenTab()
      expect(wrapper.text()).toContain('256-bit')
      expect(wrapper.text()).toContain('512-bit')
    })
  })

  describe('Encrypt / Decrypt tab', () => {
    it('renders algorithm selection buttons', () => {
      const wrapper = mountComponent()
      expect(wrapper.text()).toContain('AES-CBC')
      expect(wrapper.text()).toContain('AES-GCM')
    })

    it('clears encrypt fields', async () => {
      const wrapper = mountComponent()
      const clearBtn = wrapper.findAll('button').find(b => b.text().includes('Clear'))
      await clearBtn.trigger('click')
      // After clear, textarea values should be empty
      const textareas = wrapper.findAll('textarea')
      expect(textareas[0].element.value).toBe('')
      expect(textareas[1].element.value).toBe('')
    })
  })
})
