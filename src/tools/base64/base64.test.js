import { describe, it, expect } from 'vitest'
import { encodeBase64, decodeBase64 } from './base64.js'

describe('encodeBase64', () => {
  it('encodes ASCII text', () => {
    expect(encodeBase64('hello')).toBe('aGVsbG8=')
  })

  it('encodes empty string', () => {
    expect(encodeBase64('')).toBe('')
  })

  it('encodes Unicode text', () => {
    expect(encodeBase64('你好')).toBe('5L2g5aW9')
  })

  it('encodes mixed content', () => {
    const result = encodeBase64('hello 你好')
    expect(decodeBase64(result)).toBe('hello 你好')
  })
})

describe('decodeBase64', () => {
  it('decodes ASCII Base64', () => {
    expect(decodeBase64('aGVsbG8=')).toBe('hello')
  })

  it('decodes empty string', () => {
    expect(decodeBase64('')).toBe('')
  })

  it('decodes Unicode Base64', () => {
    expect(decodeBase64('5L2g5aW9')).toBe('你好')
  })

  it('trims whitespace before decoding', () => {
    expect(decodeBase64('  aGVsbG8=  ')).toBe('hello')
  })

  it('throws on invalid Base64', () => {
    expect(() => decodeBase64('!!!invalid!!!')).toThrow()
  })
})

describe('encode/decode roundtrip', () => {
  it('roundtrips various strings', () => {
    const cases = ['hello', '你好世界', '', 'a\nb\nc', '🎉🚀', '  spaces  ']
    for (const text of cases) {
      expect(decodeBase64(encodeBase64(text))).toBe(text)
    }
  })
})
