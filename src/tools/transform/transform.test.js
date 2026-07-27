import { describe, it, expect } from 'vitest'
import { parseLength, parseAngle } from './transform.js'

describe('parseLength', () => {
  it('parses px', () => {
    expect(parseLength('10px')).toEqual({ n: 10, unit: 'px' })
  })
  it('parses %', () => {
    expect(parseLength('50%')).toEqual({ n: 50, unit: '%' })
  })
  it('parses em', () => {
    expect(parseLength('1.5em')).toEqual({ n: 1.5, unit: 'em' })
  })
  it('parses rem', () => {
    expect(parseLength('2rem')).toEqual({ n: 2, unit: 'rem' })
  })
  it('defaults unit to px when missing', () => {
    expect(parseLength('10')).toEqual({ n: 10, unit: 'px' })
  })
  it('throws on non-numeric', () => {
    expect(() => parseLength('abc')).toThrow(/无法解析数值/)
  })
  it('throws on unknown unit', () => {
    expect(() => parseLength('10vw')).toThrow(/未知单位/)
  })
})

describe('parseAngle', () => {
  it('parses deg', () => {
    expect(parseAngle('45deg')).toBe(45)
  })
  it('parses turn → deg', () => {
    expect(parseAngle('0.25turn')).toBeCloseTo(90, 5)
  })
  it('parses grad → deg', () => {
    expect(parseAngle('100grad')).toBeCloseTo(90, 5)
  })
  it('defaults to deg when missing', () => {
    expect(parseAngle('45')).toBe(45)
  })
  it('throws on non-numeric', () => {
    expect(() => parseAngle('abc')).toThrow(/无法解析数值/)
  })
  // NOTE: task spec asserted `360deg` -> `-180`, but 360° is geometrically 0°
  // and the documented interval is (-180, 180]; every standard normalization
  // scheme yields 0 here, never -180. Corrected expectation below; the 270°
  // -> -90 case (also from the spec) is kept as-is since it is correct.
  it('normalizes to (-180, 180]', () => {
    expect(parseAngle('360deg')).toBe(0)
    expect(parseAngle('270deg')).toBeCloseTo(-90, 5)
  })
})
