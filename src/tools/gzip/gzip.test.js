import { describe, it, expect } from 'vitest'
import { uint8ToBase64, base64ToUint8 } from './gzip.js'

describe('uint8ToBase64', () => {
  it('converts empty Uint8Array', () => {
    expect(uint8ToBase64(new Uint8Array([]))).toBe('')
  })

  it('converts simple bytes', () => {
    // "hello" -> [104, 101, 108, 108, 111]
    expect(uint8ToBase64(new Uint8Array([104, 101, 108, 108, 111]))).toBe('aGVsbG8=')
  })

  it('converts single byte', () => {
    expect(uint8ToBase64(new Uint8Array([65]))).toBe('QQ==')
  })
})

describe('base64ToUint8', () => {
  it('converts empty string', () => {
    expect(base64ToUint8('')).toEqual(new Uint8Array([]))
  })

  it('converts simple Base64', () => {
    expect(base64ToUint8('aGVsbG8=')).toEqual(new Uint8Array([104, 101, 108, 108, 111]))
  })
})

describe('uint8ToBase64 / base64ToUint8 roundtrip', () => {
  it('roundtrips random bytes', () => {
    const bytes = new Uint8Array([0, 127, 255, 1, 42, 100, 200])
    expect(base64ToUint8(uint8ToBase64(bytes))).toEqual(bytes)
  })

  it('roundtrips empty', () => {
    expect(base64ToUint8(uint8ToBase64(new Uint8Array([])))).toEqual(new Uint8Array([]))
  })
})
