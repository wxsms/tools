import { describe, it, expect } from 'vitest'
import { computeMd5 } from './md5.js'

describe('computeMd5', () => {
  it('computes MD5 of empty string', () => {
    expect(computeMd5('')).toBe('d41d8cd98f00b204e9800998ecf8427e')
  })

  it('computes MD5 of ASCII text', () => {
    expect(computeMd5('hello')).toBe('5d41402abc4b2a76b9719d911017c592')
  })

  it('computes MD5 of known string', () => {
    expect(computeMd5('The quick brown fox jumps over the lazy dog')).toBe('9e107d9d372bb6826bd81d3542a419d6')
  })

  it('computes MD5 of Unicode text', () => {
    expect(computeMd5('你好')).toBe('7eca689f0d3389d9dea66ae112e5cfd7')
  })

  it('returns 32-character hex string', () => {
    const result = computeMd5('test')
    expect(result).toHaveLength(32)
    expect(result).toMatch(/^[0-9a-f]+$/)
  })
})
