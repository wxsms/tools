import { describe, it, expect } from 'vitest'
import {
  bezierAxis,
  yAtX,
  formatCss,
  parseCss,
  DEFAULT_BEZIER,
  PRESETS,
} from './cubicBezier.js'

describe('bezierAxis', () => {
  it('returns 0 at t=0 and 1 at t=1 for any control points', () => {
    expect(bezierAxis(0, 0.5, 0.5)).toBe(0)
    expect(bezierAxis(1, 0.5, 0.5)).toBe(1)
  })

  it('matches linear (0,1) at t=0.5 -> 0.5', () => {
    expect(bezierAxis(0.5, 0, 1)).toBeCloseTo(0.5, 6)
  })

  it('matches direct cubic formula', () => {
    const t = 0.3
    const c1 = 0.42
    const c2 = 0.58
    const u = 1 - t
    const expected = 3 * u * u * t * c1 + 3 * u * t * t * c2 + t * t * t
    expect(bezierAxis(t, c1, c2)).toBeCloseTo(expected, 10)
  })
})

describe('yAtX', () => {
  it('returns 0 at x=0 and 1 at x=1', () => {
    const b = { x1: 0.42, y1: 0, x2: 0.58, y2: 1 }
    expect(yAtX(0, b)).toBe(0)
    expect(yAtX(1, b)).toBe(1)
  })

  it('returns 0.5 at x=0.5 for linear curve', () => {
    const linear = { x1: 0, y1: 0, x2: 1, y2: 1 }
    expect(yAtX(0.5, linear)).toBeCloseTo(0.5, 4)
  })

  it('is monotonic in [0,1] for ease-in-out', () => {
    const b = DEFAULT_BEZIER
    let prev = -Infinity
    for (let i = 0; i <= 20; i++) {
      const y = yAtX(i / 20, b)
      expect(y).toBeGreaterThanOrEqual(prev)
      prev = y
    }
  })

  it('can overshoot [0,1] for back curves', () => {
    const outBack = { x1: 0.175, y1: 0.885, x2: 0.32, y2: 1.275 }
    const maxY = Math.max(...Array.from({ length: 101 }, (_, i) => yAtX(i / 100, outBack)))
    expect(maxY).toBeGreaterThan(1)
  })

  it('is symmetric for ease-in-out at x=0.5 -> 0.5', () => {
    const b = { x1: 0.42, y1: 0, x2: 0.58, y2: 1 }
    expect(yAtX(0.5, b)).toBeCloseTo(0.5, 4)
  })
})

describe('formatCss', () => {
  it('formats a basic curve', () => {
    expect(formatCss({ x1: 0.42, y1: 0, x2: 0.58, y2: 1 }))
      .toBe('cubic-bezier(0.42, 0, 0.58, 1)')
  })

  it('preserves negative and >1 values for overshoot', () => {
    expect(formatCss({ x1: 0.68, y1: -0.55, x2: 0.265, y2: 1.55 }))
      .toBe('cubic-bezier(0.68, -0.55, 0.265, 1.55)')
  })

  it('trims trailing zeros', () => {
    expect(formatCss({ x1: 0.5, y1: 0.5, x2: 0.5, y2: 0.5 }))
      .toBe('cubic-bezier(0.5, 0.5, 0.5, 0.5)')
  })
})

describe('parseCss', () => {
  it('parses a well-formed string', () => {
    expect(parseCss('cubic-bezier(0.42, 0, 0.58, 1)')).toEqual({
      x1: 0.42, y1: 0, x2: 0.58, y2: 1,
    })
  })

  it('handles extra whitespace', () => {
    expect(parseCss('  cubic-bezier( 0.68 , -0.55 , 0.27 , 1.55 )  ')).toEqual({
      x1: 0.68, y1: -0.55, x2: 0.27, y2: 1.55,
    })
  })

  it('is case-insensitive', () => {
    expect(parseCss('CUBIC-BEZIER(0, 0, 1, 1)')).toEqual({
      x1: 0, y1: 0, x2: 1, y2: 1,
    })
  })

  it('returns null for non-cubic-bezier strings', () => {
    expect(parseCss('ease-in')).toBeNull()
    expect(parseCss('linear')).toBeNull()
    expect(parseCss('not even close')).toBeNull()
  })

  it('returns null for wrong arity', () => {
    expect(parseCss('cubic-bezier(0.1, 0.2, 0.3)')).toBeNull()
    expect(parseCss('cubic-bezier(0.1, 0.2, 0.3, 0.4, 0.5)')).toBeNull()
  })

  it('returns null for non-numeric values', () => {
    expect(parseCss('cubic-bezier(a, b, c, d)')).toBeNull()
  })

  it('round-trips with formatCss', () => {
    const b = { x1: 0.175, y1: 0.885, x2: 0.32, y2: 1.275 }
    expect(parseCss(formatCss(b))).toEqual(b)
  })
})

describe('PRESETS', () => {
  it('includes the standard CSS keywords', () => {
    const names = PRESETS.map(p => p.name)
    expect(names).toContain('linear')
    expect(names).toContain('ease')
    expect(names).toContain('ease-in')
    expect(names).toContain('ease-out')
    expect(names).toContain('ease-in-out')
  })

  it('every preset has valid numeric fields', () => {
    for (const p of PRESETS) {
      expect(typeof p.x1).toBe('number')
      expect(typeof p.y1).toBe('number')
      expect(typeof p.x2).toBe('number')
      expect(typeof p.y2).toBe('number')
      expect(p.x1).toBeGreaterThanOrEqual(0)
      expect(p.x1).toBeLessThanOrEqual(1)
      expect(p.x2).toBeGreaterThanOrEqual(0)
      expect(p.x2).toBeLessThanOrEqual(1)
    }
  })
})
