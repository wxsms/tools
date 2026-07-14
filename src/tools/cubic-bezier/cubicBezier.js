/**
 * Cubic-bezier easing utilities.
 *
 * P0 = (0, 0) and P3 = (1, 1) are fixed. The user controls P1 = (x1, y1)
 * and P2 = (x2, y2). x is clamped to [0, 1] (CSS rule), y may exceed [0, 1]
 * to produce overshoot / bounce.
 */

export const DEFAULT_BEZIER = { x1: 0.42, y1: 0, x2: 0.58, y2: 1 }

export const PRESETS = [
  { name: 'linear', x1: 0, y1: 0, x2: 1, y2: 1 },
  { name: 'ease', x1: 0.25, y1: 0.1, x2: 0.25, y2: 1 },
  { name: 'ease-in', x1: 0.42, y1: 0, x2: 1, y2: 1 },
  { name: 'ease-out', x1: 0, y1: 0, x2: 0.58, y2: 1 },
  { name: 'ease-in-out', x1: 0.42, y1: 0, x2: 0.58, y2: 1 },
  { name: 'in-cubic', x1: 0.55, y1: 0.055, x2: 0.675, y2: 0.19 },
  { name: 'out-cubic', x1: 0.215, y1: 0.61, x2: 0.355, y2: 1 },
  { name: 'in-back', x1: 0.6, y1: -0.28, x2: 0.735, y2: 0.045 },
  { name: 'out-back', x1: 0.175, y1: 0.885, x2: 0.32, y2: 1.275 },
  { name: 'in-out-back', x1: 0.68, y1: -0.55, x2: 0.265, y2: 1.55 },
]

/**
 * Evaluate the cubic bezier at parameter t (0..1) for one axis
 * defined by its two control coordinates c1, c2 (c0 = 0, c3 = 1).
 */
export function bezierAxis(t, c1, c2) {
  const u = 1 - t
  return 3 * u * u * t * c1 + 3 * u * t * t * c2 + t * t * t
}

/**
 * Evaluate the y progress for a given x (time progress 0..1).
 * Solves for t such that bezierAxis(t, x1, x2) = x via Newton-Raphson
 * with bisection fallback, matching browser behavior.
 */
export function yAtX(x, { x1, y1, x2, y2 }) {
  const cx = Math.max(0, Math.min(1, x))
  if (cx <= 0) return 0
  if (cx >= 1) return 1

  let lo = 0
  let hi = 1
  let t = cx

  for (let i = 0; i < 8; i++) {
    const xt = bezierAxis(t, x1, x2)
    if (Math.abs(xt - cx) < 1e-6) return bezierAxis(t, y1, y2)
    if (xt < cx) lo = t
    else hi = t
    t = (lo + hi) / 2
  }

  // bisection refinement
  for (let i = 0; i < 30; i++) {
    const xt = bezierAxis(t, x1, x2)
    if (Math.abs(xt - cx) < 1e-6) break
    if (xt < cx) lo = t
    else hi = t
    t = (lo + hi) / 2
  }
  return bezierAxis(t, y1, y2)
}

/**
 * Format a cubic-bezier as a CSS value string.
 * Numbers are trimmed to 3 decimals and stripped of trailing zeros.
 */
export function formatCss({ x1, y1, x2, y2 }) {
  const f = n => {
    const r = Math.round(n * 1000) / 1000
    return String(r)
  }
  return `cubic-bezier(${f(x1)}, ${f(y1)}, ${f(x2)}, ${f(y2)})`
}

/**
 * Parse a cubic-bezier(...) CSS string into { x1, y1, x2, y2 }.
 * Returns null on failure.
 */
export function parseCss(input) {
  if (typeof input !== 'string') return null
  const m = input.match(/^\s*cubic-bezier\s*\(\s*([^)]+?)\s*\)\s*$/i)
  if (!m) return null
  const parts = m[1].split(',').map(s => s.trim())
  if (parts.length !== 4) return null
  const nums = parts.map(Number)
  if (nums.some(n => !Number.isFinite(n))) return null
  const [x1, y1, x2, y2] = nums
  return { x1, y1, x2, y2 }
}
