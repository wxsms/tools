import { describe, it, expect } from 'vitest'
import {
  computeHash,
  computeHmac,
  aesEncrypt,
  aesDecrypt,
  aesEncryptRaw,
  aesDecryptRaw,
  deriveKey,
  generateIv,
  generateSalt,
  HASH_ALGORITHMS,
  SYMMETRIC_ALGORITHMS,
  AES_KEY_SIZES,
  IV_LENGTHS,
} from './crypto.js'

describe('computeHash', () => {
  it('computes SHA-256 of empty string', () => {
    expect(computeHash('SHA-256', '')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
  })

  it('computes SHA-256 of ASCII text', () => {
    expect(computeHash('SHA-256', 'hello')).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824')
  })

  it('computes SHA-1 of known string', () => {
    expect(computeHash('SHA-1', 'hello')).toBe('aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d')
  })

  it('computes SHA-384', () => {
    const result = computeHash('SHA-384', 'hello')
    expect(result).toHaveLength(96)
    expect(result).toMatch(/^[0-9a-f]+$/)
  })

  it('computes SHA-512', () => {
    const result = computeHash('SHA-512', 'hello')
    expect(result).toHaveLength(128)
    expect(result).toMatch(/^[0-9a-f]+$/)
  })

  it('computes MD5', () => {
    expect(computeHash('MD5', 'hello')).toBe('5d41402abc4b2a76b9719d911017c592')
  })

  it('computes RIPEMD160', () => {
    expect(computeHash('RIPEMD160', 'hello')).toBe('108f07b8382412612c048d07d13f814118445acd')
  })

  it('computes hash of Unicode text', () => {
    const result = computeHash('SHA-256', '你好')
    expect(result).toMatch(/^[0-9a-f]{64}$/)
  })

  it('throws for unsupported algorithm', () => {
    expect(() => computeHash('BAD', 'test')).toThrow('Unsupported hash algorithm')
  })
})

describe('computeHmac', () => {
  it('computes HMAC-SHA256', () => {
    const result = computeHmac('SHA-256', 'key', 'message')
    expect(result).toMatch(/^[0-9a-f]{64}$/)
  })

  it('produces different results for different keys', () => {
    const a = computeHmac('SHA-256', 'key1', 'message')
    const b = computeHmac('SHA-256', 'key2', 'message')
    expect(a).not.toBe(b)
  })

  it('produces different results for different messages', () => {
    const a = computeHmac('SHA-256', 'key', 'msg1')
    const b = computeHmac('SHA-256', 'key', 'msg2')
    expect(a).not.toBe(b)
  })
})

// Use low iterations for AES tests to avoid CI timeout
const TEST_ITERATIONS = 1000

describe('AES encrypt/decrypt', () => {
  it('AES-CBC roundtrip', async () => {
    const ciphertext = await aesEncrypt('AES-CBC', 'mypassword', 'Hello, World!', TEST_ITERATIONS)
    const decrypted = await aesDecrypt('AES-CBC', 'mypassword', ciphertext, TEST_ITERATIONS)
    expect(decrypted).toBe('Hello, World!')
  })

  it('AES-GCM roundtrip', async () => {
    const ciphertext = await aesEncrypt('AES-GCM', 'mypassword', 'Hello, World!', TEST_ITERATIONS)
    const decrypted = await aesDecrypt('AES-GCM', 'mypassword', ciphertext, TEST_ITERATIONS)
    expect(decrypted).toBe('Hello, World!')
  })

  it('AES-CBC roundtrip with Unicode', async () => {
    const ciphertext = await aesEncrypt('AES-CBC', '密码', '你好世界 🌍', TEST_ITERATIONS)
    const decrypted = await aesDecrypt('AES-CBC', '密码', ciphertext, TEST_ITERATIONS)
    expect(decrypted).toBe('你好世界 🌍')
  })

  it('AES-GCM roundtrip with empty string', async () => {
    const ciphertext = await aesEncrypt('AES-GCM', 'pass', '', TEST_ITERATIONS)
    const decrypted = await aesDecrypt('AES-GCM', 'pass', ciphertext, TEST_ITERATIONS)
    expect(decrypted).toBe('')
  })

  it('wrong passphrase fails to decrypt', async () => {
    const ciphertext = await aesEncrypt('AES-GCM', 'correct', 'secret', TEST_ITERATIONS)
    await expect(aesDecrypt('AES-GCM', 'wrong', ciphertext, TEST_ITERATIONS)).rejects.toThrow()
  })

  it('each encryption produces different ciphertext (random salt+iv)', async () => {
    const a = await aesEncrypt('AES-CBC', 'pass', 'same text', TEST_ITERATIONS)
    const b = await aesEncrypt('AES-CBC', 'pass', 'same text', TEST_ITERATIONS)
    expect(a).not.toBe(b)
  })

  it('ciphertext hex string has expected minimum length', async () => {
    // AES-CBC: salt(16) + iv(16) + at least one block(16) = 48 bytes = 96 hex chars
    const ciphertext = await aesEncrypt('AES-CBC', 'pass', 'hi', TEST_ITERATIONS)
    expect(ciphertext.length).toBeGreaterThanOrEqual(96)
  })
})

describe('generateIv', () => {
  it('generates 16 bytes for AES-CBC', () => {
    const iv = generateIv('AES-CBC')
    expect(iv).toBeInstanceOf(Uint8Array)
    expect(iv).toHaveLength(16)
  })

  it('generates 12 bytes for AES-GCM', () => {
    const iv = generateIv('AES-GCM')
    expect(iv).toBeInstanceOf(Uint8Array)
    expect(iv).toHaveLength(12)
  })

  it('generates different values each call', () => {
    const a = generateIv('AES-CBC')
    const b = generateIv('AES-CBC')
    expect(a).not.toEqual(b)
  })
})

describe('generateSalt', () => {
  it('generates 16 bytes', () => {
    const salt = generateSalt()
    expect(salt).toBeInstanceOf(Uint8Array)
    expect(salt).toHaveLength(16)
  })

  it('generates different values each call', () => {
    const a = generateSalt()
    const b = generateSalt()
    expect(a).not.toEqual(b)
  })
})

describe('deriveKey', () => {
  it('derives a key of specified length', async () => {
    const salt = generateSalt()
    const key = await deriveKey('password', salt, 32)
    expect(key).toBeInstanceOf(Uint8Array)
    expect(key).toHaveLength(32)
  })

  it('derives different keys for different passwords', async () => {
    const salt = generateSalt()
    const a = await deriveKey('pass1', salt, 32)
    const b = await deriveKey('pass2', salt, 32)
    expect(a).not.toEqual(b)
  })

  it('derives same key for same inputs', async () => {
    const salt = generateSalt()
    const a = await deriveKey('password', salt, 32)
    const b = await deriveKey('password', salt, 32)
    expect(a).toEqual(b)
  })
})

describe('aesEncryptRaw / aesDecryptRaw', () => {
  it('AES-CBC raw roundtrip', async () => {
    const salt = generateSalt()
    const key = await deriveKey('password', salt, 32)
    const iv = generateIv('AES-CBC')
    const ciphertext = aesEncryptRaw('AES-CBC', key, iv, 'Hello raw!')
    const decrypted = aesDecryptRaw('AES-CBC', key, iv, ciphertext)
    expect(decrypted).toBe('Hello raw!')
  })

  it('AES-GCM raw roundtrip', async () => {
    const salt = generateSalt()
    const key = await deriveKey('password', salt, 32)
    const iv = generateIv('AES-GCM')
    const ciphertext = aesEncryptRaw('AES-GCM', key, iv, 'Hello GCM!')
    const decrypted = aesDecryptRaw('AES-GCM', key, iv, ciphertext)
    expect(decrypted).toBe('Hello GCM!')
  })

  it('wrong key fails to decrypt (AES-GCM)', async () => {
    const salt = generateSalt()
    const key1 = await deriveKey('correct', salt, 32)
    const key2 = await deriveKey('wrong', salt, 32)
    const iv = generateIv('AES-GCM')
    const ciphertext = aesEncryptRaw('AES-GCM', key1, iv, 'secret')
    expect(() => aesDecryptRaw('AES-GCM', key2, iv, ciphertext)).toThrow()
  })
})

describe('constants', () => {
  it('HASH_ALGORITHMS has expected entries', () => {
    expect(HASH_ALGORITHMS).toEqual(['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512', 'MD5', 'RIPEMD160'])
  })

  it('SYMMETRIC_ALGORITHMS has expected entries', () => {
    expect(SYMMETRIC_ALGORITHMS).toEqual(['AES-CBC', 'AES-GCM', 'AES-CTR', 'ChaCha20-Poly1305'])
  })

  it('IV_LENGTHS has correct values', () => {
    expect(IV_LENGTHS).toEqual({ 'AES-CBC': 16, 'AES-GCM': 12, 'AES-CTR': 16, 'ChaCha20-Poly1305': 12 })
  })

  it('AES_KEY_SIZES has expected entries', () => {
    expect(AES_KEY_SIZES).toEqual([128, 192, 256])
  })
})
