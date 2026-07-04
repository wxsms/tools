import { describe, it, expect } from 'vitest'
import { convertRadix, isValidForBase } from './radix.js'

describe('isValidForBase', () => {
  it('accepts valid binary digits', () => {
    expect(isValidForBase('1010', 2)).toBe(true)
  })

  it('rejects invalid binary digits', () => {
    expect(isValidForBase('2', 2)).toBe(false)
  })

  it('accepts valid hex digits (lowercase)', () => {
    expect(isValidForBase('ff', 16)).toBe(true)
  })

  it('accepts valid hex digits (uppercase)', () => {
    expect(isValidForBase('FF', 16)).toBe(true)
  })

  it('rejects invalid hex digits', () => {
    expect(isValidForBase('gg', 16)).toBe(false)
  })

  it('accepts valid decimal', () => {
    expect(isValidForBase('12345', 10)).toBe(true)
  })

  it('rejects negative numbers', () => {
    expect(isValidForBase('-1', 10)).toBe(false)
  })

  it('accepts empty string as valid', () => {
    expect(isValidForBase('', 10)).toBe(true)
  })

  it('rejects whitespace in input', () => {
    expect(isValidForBase('1 0', 2)).toBe(false)
  })
})

describe('convertRadix', () => {
  it('converts decimal 255 to hex', () => {
    expect(convertRadix('255', 10, 16)).toBe('FF')
  })

  it('converts decimal 255 to binary', () => {
    expect(convertRadix('255', 10, 2)).toBe('11111111')
  })

  it('converts decimal 8 to octal', () => {
    expect(convertRadix('8', 10, 8)).toBe('10')
  })

  it('converts hex FF to decimal', () => {
    expect(convertRadix('FF', 16, 10)).toBe('255')
  })

  it('converts binary 1010 to decimal', () => {
    expect(convertRadix('1010', 2, 10)).toBe('10')
  })

  it('converts octal 77 to hex', () => {
    expect(convertRadix('77', 8, 16)).toBe('3F')
  })

  it('converts to base 36', () => {
    expect(convertRadix('35', 10, 36)).toBe('Z')
  })

  it('returns empty string for empty input', () => {
    expect(convertRadix('', 10, 16)).toBe('')
  })

  it('returns null for invalid input for the given base', () => {
    expect(convertRadix('gg', 16, 10)).toBeNull()
  })

  it('converts 0 correctly', () => {
    expect(convertRadix('0', 10, 2)).toBe('0')
  })

  it('strips leading zeros', () => {
    expect(convertRadix('007', 10, 10)).toBe('7')
  })

  it('handles large safe integer', () => {
    expect(convertRadix('9007199254740991', 10, 16)).toBe('1FFFFFFFFFFFFF')
  })
})
