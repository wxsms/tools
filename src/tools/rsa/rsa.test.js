import { describe, it, expect } from 'vitest'
import {
  arrayBufferToPem,
  pemToArrayBuffer,
  generateKeyPair,
  encrypt,
  decrypt,
  RSA_KEY_SIZES,
} from './rsa.js'

// Use 1024-bit keys for RSA tests to avoid CI timeout

describe('arrayBufferToPem / pemToArrayBuffer', () => {
  it('roundtrips a 256-byte Uint8Array through PEM', () => {
    const bytes = new Uint8Array(256)
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = (i * 7 + 13) & 0xff
    }
    const pem = arrayBufferToPem(bytes.buffer, 'PUBLIC KEY')
    const restored = new Uint8Array(pemToArrayBuffer(pem))
    expect(restored).toHaveLength(256)
    for (let i = 0; i < bytes.length; i++) {
      expect(restored[i]).toBe(bytes[i])
    }
  })

  it('PEM has correct header and footer', () => {
    const bytes = new Uint8Array(16)
    for (let i = 0; i < bytes.length; i++) bytes[i] = i
    const pem = arrayBufferToPem(bytes.buffer, 'PUBLIC KEY')
    expect(pem.startsWith('-----BEGIN PUBLIC KEY-----')).toBe(true)
    expect(pem.endsWith('-----END PUBLIC KEY-----')).toBe(true)
  })

  it('PEM base64 body is split into 64-char lines', () => {
    const bytes = new Uint8Array(200)
    for (let i = 0; i < bytes.length; i++) bytes[i] = (i * 3 + 1) & 0xff
    const pem = arrayBufferToPem(bytes.buffer, 'PUBLIC KEY')
    const lines = pem.split('\n')
    // first line is header, last is footer
    const body = lines.slice(1, lines.length - 1)
    expect(body.length).toBeGreaterThan(1)
    // all lines except the last (possibly partial) are 64 chars
    for (const line of body.slice(0, body.length - 1)) {
      expect(line).toHaveLength(64)
    }
    expect(body[body.length - 1].length).toBeLessThanOrEqual(64)
  })
})

describe('generateKeyPair / encrypt / decrypt roundtrip', () => {
  it('roundtrips "Hello, World!" with 1024-bit key', async () => {
    const { publicKeyPem, privateKeyPem } = await generateKeyPair(1024)
    const ct = await encrypt('Hello, World!', publicKeyPem)
    const pt = await decrypt(ct, privateKeyPem)
    expect(pt).toBe('Hello, World!')
  })

  it('roundtrips Unicode text with 1024-bit key', async () => {
    const { publicKeyPem, privateKeyPem } = await generateKeyPair(1024)
    const ct = await encrypt('你好世界 🎉', publicKeyPem)
    const pt = await decrypt(ct, privateKeyPem)
    expect(pt).toBe('你好世界 🎉')
  })

  it('roundtrips empty string with 1024-bit key', async () => {
    const { publicKeyPem, privateKeyPem } = await generateKeyPair(1024)
    const ct = await encrypt('', publicKeyPem)
    const pt = await decrypt(ct, privateKeyPem)
    expect(pt).toBe('')
  })

  // 2048-bit key may be slower; kept as a single case
  it('roundtrips short text with 2048-bit key', async () => {
    const { publicKeyPem, privateKeyPem } = await generateKeyPair(2048)
    const ct = await encrypt('RSA 2048 end-to-end', publicKeyPem)
    const pt = await decrypt(ct, privateKeyPem)
    expect(pt).toBe('RSA 2048 end-to-end')
  })
})

describe('encrypt error paths', () => {
  it('throws when given a private key PEM', async () => {
    const { privateKeyPem } = await generateKeyPair(1024)
    await expect(encrypt('text', privateKeyPem)).rejects.toThrow()
  })
})

describe('decrypt error paths', () => {
  it('throws when given a public key PEM', async () => {
    const { publicKeyPem } = await generateKeyPair(1024)
    await expect(decrypt('dGVzdA==', publicKeyPem)).rejects.toThrow()
  })
})

describe('encrypt with tampered PEM', () => {
  it('throws when PEM cannot be imported as a public key', async () => {
    const { publicKeyPem } = await generateKeyPair(1024)
    // tamper with the base64 body in the middle
    const lines = publicKeyPem.split('\n')
    const body = lines.slice(1, lines.length - 1).join('')
    const tampered = body.slice(0, 20) + '!!!!' + body.slice(24)
    const badPem = `-----BEGIN PUBLIC KEY-----\n${tampered}\n-----END PUBLIC KEY-----`
    await expect(encrypt('text', badPem)).rejects.toThrow()
  })
})

describe('encrypt oversize plaintext', () => {
  it('throws for plaintext exceeding RSA-OAEP max with 2048-bit key', async () => {
    const { publicKeyPem } = await generateKeyPair(2048)
    // 250 bytes: exceeds ~190 byte limit for RSA-OAEP + SHA-256 at 2048 bits
    const longText = 'a'.repeat(250)
    await expect(encrypt(longText, publicKeyPem)).rejects.toThrow()
  })
})

describe('RSA_KEY_SIZES', () => {
  it('has expected values', () => {
    expect(RSA_KEY_SIZES).toEqual([1024, 2048, 4096])
  })
})
