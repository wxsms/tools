import { describe, it, expect } from 'vitest'
import { parseLength, parseAngle, functionToCss, stateToCss, decomposeMatrix2D } from './transform.js'

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

describe('functionToCss', () => {
  describe('translate family', () => {
    it('translateX', () => {
      expect(functionToCss({ type: 'translateX', value: { n: 10, unit: 'px' } })).toBe('translateX(10px)')
    })
    it('translateY', () => {
      expect(functionToCss({ type: 'translateY', value: { n: 20, unit: '%' } })).toBe('translateY(20%)')
    })
    it('translateZ', () => {
      expect(functionToCss({ type: 'translateZ', value: { n: 5, unit: 'px' } })).toBe('translateZ(5px)')
    })
    it('translate (two values, no simplification)', () => {
      expect(functionToCss({ type: 'translate', value: { x: { n: 10, unit: 'px' }, y: { n: 20, unit: 'px' }, z: { n: 0, unit: 'px' } } })).toBe('translate(10px, 20px)')
    })
    it('translate3d', () => {
      expect(functionToCss({ type: 'translate3d', value: { x: { n: 1, unit: 'px' }, y: { n: 2, unit: 'px' }, z: { n: 3, unit: 'px' } } })).toBe('translate3d(1px, 2px, 3px)')
    })
  })

  describe('rotate family', () => {
    it('rotate', () => {
      expect(functionToCss({ type: 'rotate', value: { deg: 45 } })).toBe('rotate(45deg)')
    })
    it('rotateX', () => {
      expect(functionToCss({ type: 'rotateX', value: { deg: 30 } })).toBe('rotateX(30deg)')
    })
    it('rotate3d', () => {
      expect(functionToCss({ type: 'rotate3d', value: { x: 1, y: 1, z: 0, deg: 45 } })).toBe('rotate3d(1, 1, 0, 45deg)')
    })
    it('rotate3d with decimal axis', () => {
      expect(functionToCss({ type: 'rotate3d', value: { x: 0.5, y: 0.5, z: 0, deg: 30 } })).toBe('rotate3d(0.5, 0.5, 0, 30deg)')
    })
  })

  describe('scale family', () => {
    it('scaleX', () => {
      expect(functionToCss({ type: 'scaleX', value: { n: 2 } })).toBe('scaleX(2)')
    })
    it('scale (two values, no simplification)', () => {
      expect(functionToCss({ type: 'scale', value: { x: 2, y: 2 } })).toBe('scale(2, 2)')
    })
    it('scale3d', () => {
      expect(functionToCss({ type: 'scale3d', value: { x: 1, y: 2, z: 3 } })).toBe('scale3d(1, 2, 3)')
    })
  })

  describe('skew family', () => {
    it('skewX', () => {
      expect(functionToCss({ type: 'skewX', value: { deg: 15 } })).toBe('skewX(15deg)')
    })
    it('skew (two values)', () => {
      expect(functionToCss({ type: 'skew', value: { x: 15, y: 0 } })).toBe('skew(15deg, 0deg)')
    })
  })

  describe('matrix family', () => {
    it('matrix', () => {
      expect(functionToCss({ type: 'matrix', value: [1, 0, 0, 1, 10, 20] })).toBe('matrix(1, 0, 0, 1, 10, 20)')
    })
    it('matrix3d', () => {
      const m = [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]
      expect(functionToCss({ type: 'matrix3d', value: m })).toBe('matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)')
    })
  })

  describe('perspective', () => {
    it('perspective', () => {
      expect(functionToCss({ type: 'perspective', value: { n: 800, unit: 'px' } })).toBe('perspective(800px)')
    })
  })

  describe('number formatting', () => {
    it('truncates to 4 decimals, trailing zeros stripped', () => {
      expect(functionToCss({ type: 'rotate', value: { deg: 45.123456 } })).toBe('rotate(45.1235deg)')
      expect(functionToCss({ type: 'rotate', value: { deg: 45.5 } })).toBe('rotate(45.5deg)')
      expect(functionToCss({ type: 'rotate', value: { deg: 45.1234 } })).toBe('rotate(45.1234deg)')
    })
    it('preserves negative zero as 0', () => {
      expect(functionToCss({ type: 'rotate', value: { deg: -0 } })).toBe('rotate(0deg)')
    })
  })
})

describe('stateToCss', () => {
  const baseState = {
    functions: [],
    origin: { x: { n: 50, unit: '%' }, y: { n: 50, unit: '%' }, z: { n: 0, unit: 'px' } },
    perspective: { n: 800, unit: 'px' },
  }

  it('empty functions → only origin + perspective', () => {
    expect(stateToCss(baseState)).toBe('transform-origin: 50% 50% 0px;\nperspective: 800px;')
  })

  it('with one function → all three lines', () => {
    const s = { ...baseState, functions: [{ type: 'translateX', value: { n: 10, unit: 'px' } }] }
    expect(stateToCss(s)).toBe('transform-origin: 50% 50% 0px;\nperspective: 800px;\ntransform: translateX(10px);')
  })

  it('multiple functions preserve order', () => {
    const s = {
      ...baseState,
      functions: [
        { type: 'translateX', value: { n: 10, unit: 'px' } },
        { type: 'rotate', value: { deg: 45 } },
        { type: 'scale', value: { x: 2, y: 2 } },
      ],
    }
    expect(stateToCss(s)).toBe('transform-origin: 50% 50% 0px;\nperspective: 800px;\ntransform: translateX(10px) rotate(45deg) scale(2, 2);')
  })

  it('origin with px units', () => {
    const s = {
      ...baseState,
      origin: { x: { n: 10, unit: 'px' }, y: { n: 20, unit: 'px' }, z: { n: 0, unit: 'px' } },
    }
    expect(stateToCss(s)).toBe('transform-origin: 10px 20px 0px;\nperspective: 800px;')
  })
})

describe('decomposeMatrix2D', () => {
  it('pure translation matrix → translate only (no rotate/scale/skew)', () => {
    // matrix(1, 0, 0, 1, 10, 20)
    const r = decomposeMatrix2D([1, 0, 0, 1, 10, 20])
    expect(r).toHaveLength(4)
    expect(functionToCss(r[0])).toBe('translate(10px, 20px)')
    expect(functionToCss(r[1])).toBe('rotate(0deg)')
    expect(functionToCss(r[2])).toBe('scale(1, 1)')
    expect(functionToCss(r[3])).toBe('skew(0deg, 0deg)')
  })

  it('pure rotation 45deg → rotate(45deg)', () => {
    const c = Math.cos(Math.PI / 4)
    const s = Math.sin(Math.PI / 4)
    // matrix(a, b, c, d, e, f) where [[a, c], [b, d]] = R(θ)
    const r = decomposeMatrix2D([c, s, -s, c, 0, 0])
    expect(functionToCss(r[1])).toMatch(/^rotate\(45(\.0+)?deg\)$/)
    expect(functionToCss(r[0])).toBe('translate(0px, 0px)')
    expect(functionToCss(r[2])).toBe('scale(1, 1)')
  })

  it('pure scale 2,2 → scale(2, 2)', () => {
    const r = decomposeMatrix2D([2, 0, 0, 2, 0, 0])
    expect(functionToCss(r[2])).toBe('scale(2, 2)')
  })

  it('combined translate + rotate + scale', () => {
    const c = Math.cos(Math.PI / 6)  // 30deg
    const s = Math.sin(Math.PI / 6)
    // scale 2 then rotate 30deg: R·S = [[2c, -2s], [2s, 2c]] → a=2c, b=2s, c=-2s, d=2c
    const r = decomposeMatrix2D([2 * c, 2 * s, -2 * s, 2 * c, 5, 10])
    expect(functionToCss(r[0])).toBe('translate(5px, 10px)')
    expect(functionToCss(r[1])).toMatch(/^rotate\(30(\.0+)?deg\)$/)
    expect(functionToCss(r[2])).toBe('scale(2, 2)')
  })

  it('throws on singular matrix (sx ≈ 0)', () => {
    // matrix(0, 0, 0, 0, 5, 10) — zero linear part
    expect(() => decomposeMatrix2D([0, 0, 0, 0, 5, 10])).toThrow(/0 缩放/)
  })

  it('handles negative sy (reflection via scale)', () => {
    // matrix(1, 0, 0, -1, 0, 0) — flip Y
    const r = decomposeMatrix2D([1, 0, 0, -1, 0, 0])
    expect(functionToCss(r[2])).toBe('scale(1, -1)')
  })
})
