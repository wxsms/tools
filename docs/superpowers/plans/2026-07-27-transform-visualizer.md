# transform 可视化工具 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new tool at `/transform` that lets users build CSS `transform` strings visually with 2D/3D functions, fixed-angle 3D cube preview, and reverse-parsing of existing transform strings (including `matrix()` QR decomposition and `matrix3d()` partial extraction).

**Architecture:** One Vue component (`Transform.vue`) maintains an ordered list of transform functions as state. Pure functions in `transform.js` handle CSS generation (`stateToCss`), reverse parsing (`parseTransform`), `matrix()` QR decomposition, and `matrix3d()` partial extraction. The view uses the existing `BoxShadow.vue` dual-column layout pattern: left column = function list + per-type parameter form + transform-origin/perspective; right column = fixed-angle CSS 3D cube preview + code area + reverse-parse input.

**Tech Stack:** Vue 3 (script setup), Vitest, DaisyUI (existing), Iconify (`@iconify/vue`, existing). No new dependencies.

**Spec:** `docs/superpowers/specs/2026-07-27-transform-visualizer-design.md`

---

## File Structure

| File | Responsibility |
|---|---|
| `src/tools/transform/transform.js` | Pure functions: `functionToCss`, `stateToCss`, `parseTransform`, `decomposeMatrix2D`, `extractMatrix3D`, plus small helpers. No Vue, no DOM. |
| `src/tools/transform/transform.test.js` | Vitest unit tests for the pure functions. |
| `src/tools/transform/Transform.vue` | Vue view. Function list, per-type parameter form, transform-origin/perspective sliders, 3D cube preview, code area, reverse-parse textarea. |
| `src/router.js` | Add one entry to `components` map: `'/transform': () => import('./tools/transform/Transform.vue')` |
| `src/routes.js` | Add one route meta object (path, name). |
| `src/tools.js` | Add sidebar entry in "CSS" group. |

---

## Task 1: Pure function module skeleton + length/angle parsers (TDD)

**Files:**
- Create: `src/tools/transform/transform.js`
- Test: `src/tools/transform/transform.test.js`

This task creates the module, exports empty stubs, and implements two low-level parsers (`parseLength`, `parseAngle`) with TDD. Later tasks build on these.

- [ ] **Step 1: Write the failing tests for parsers**

Create `src/tools/transform/transform.test.js` with:

```js
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
  it('normalizes to (-180, 180]', () => {
    expect(parseAngle('360deg')).toBe(-180)
    expect(parseAngle('270deg')).toBeCloseTo(-90, 5)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd E:/githome-windows/tools && npx vitest run src/tools/transform/transform.test.js`
Expected: FAIL with `parseLength is not a function` or import error (module exports nothing yet).

- [ ] **Step 3: Write minimal implementation**

Create `src/tools/transform/transform.js`:

```js
// Length parsing for translate family + perspective
const LENGTH_UNITS = ['px', '%', 'em', 'rem']

export function parseLength(s) {
  const m = String(s).trim().match(/^(-?\d*\.?\d+)\s*(px|%|em|rem)?$/)
  if (!m) throw new Error(`无法解析数值: ${s}`)
  const n = parseFloat(m[1])
  const unit = m[2] || 'px'
  if (!LENGTH_UNITS.includes(unit)) throw new Error(`未知单位: ${unit}`)
  return { n, unit }
}

// Angle parsing for rotate / skew; returns degrees as number
export function parseAngle(s) {
  const m = String(s).trim().match(/^(-?\d*\.?\d+)\s*(deg|turn|grad)?$/)
  if (!m) throw new Error(`无法解析数值: ${s}`)
  const n = parseFloat(m[1])
  const unit = m[2] || 'deg'
  let deg
  if (unit === 'deg') deg = n
  else if (unit === 'turn') deg = n * 360
  else if (unit === 'grad') deg = n * 0.9
  // normalize to (-180, 180]
  while (deg > 180) deg -= 360
  while (deg <= -180) deg += 360
  return deg
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd E:/githome-windows/tools && npx vitest run src/tools/transform/transform.test.js`
Expected: PASS, all 13 tests green.

- [ ] **Step 5: Commit**

```bash
git -C E:/githome-windows/tools add src/tools/transform/transform.js src/tools/transform/transform.test.js
git -C E:/githome-windows/tools commit -m "feat(transform): add length/angle parsers with TDD"
```

---

## Task 2: functionToCss — single function → CSS fragment (TDD)

**Files:**
- Modify: `src/tools/transform/transform.js`
- Modify: `src/tools/transform/transform.test.js`

This task implements `functionToCss(fn)` which converts one function-state object to its CSS string form. Covers all 21 types. Per spec convention 8/9: no simplification (`scale(2)` → `scale(2, 2)`, `translate(10px)` → `translate(10px, 10px)`).

- [ ] **Step 1: Add failing tests for each function family**

Append to `src/tools/transform/transform.test.js` (above the final closing if any; just append at end):

```js
import { functionToCss } from './transform.js'

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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd E:/githome-windows/tools && npx vitest run src/tools/transform/transform.test.js`
Expected: FAIL with `functionToCss is not a function`.

- [ ] **Step 3: Implement functionToCss**

Append to `src/tools/transform/transform.js`:

```js
// Format a number: 4 decimal places, trailing zeros stripped, -0 → 0
function fmt(n) {
  if (!Number.isFinite(n)) return '0'
  let s = Number(n).toFixed(4)
  // strip trailing zeros
  if (s.indexOf('.') >= 0) {
    s = s.replace(/0+$/, '').replace(/\.$/, '')
  }
  // normalize -0
  if (s === '-0') s = '0'
  return s
}

function len({ n, unit }) {
  return `${fmt(n)}${unit}`
}

export function functionToCss(fn) {
  const { type, value } = fn
  switch (type) {
    case 'translateX':
    case 'translateY':
    case 'translateZ':
      return `${type}(${len(value)})`
    case 'translate':
      return `translate(${len(value.x)}, ${len(value.y)})`
    case 'translate3d':
      return `translate3d(${len(value.x)}, ${len(value.y)}, ${len(value.z)})`
    case 'rotate':
    case 'rotateX':
    case 'rotateY':
    case 'rotateZ':
      return `${type}(${fmt(value.deg)}deg)`
    case 'rotate3d':
      return `rotate3d(${fmt(value.x)}, ${fmt(value.y)}, ${fmt(value.z)}, ${fmt(value.deg)}deg)`
    case 'scaleX':
    case 'scaleY':
    case 'scaleZ':
      return `${type}(${fmt(value.n)})`
    case 'scale':
      return `scale(${fmt(value.x)}, ${fmt(value.y)})`
    case 'scale3d':
      return `scale3d(${fmt(value.x)}, ${fmt(value.y)}, ${fmt(value.z)})`
    case 'skewX':
    case 'skewY':
      return `${type}(${fmt(value.deg)}deg)`
    case 'skew':
      return `skew(${fmt(value.x)}deg, ${fmt(value.y)}deg)`
    case 'matrix':
      return `matrix(${value.map(fmt).join(', ')})`
    case 'matrix3d':
      return `matrix3d(${value.map(fmt).join(', ')})`
    case 'perspective':
      return `perspective(${len(value)})`
    default:
      throw new Error(`未知函数: ${type}`)
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd E:/githome-windows/tools && npx vitest run src/tools/transform/transform.test.js`
Expected: PASS, all tests green (Task 1 + Task 2).

- [ ] **Step 5: Commit**

```bash
git -C E:/githome-windows/tools add src/tools/transform/transform.js src/tools/transform/transform.test.js
git -C E:/githome-windows/tools commit -m "feat(transform): add functionToCss for all 21 types"
```

---

## Task 3: stateToCss — full state → CSS 3 lines (TDD)

**Files:**
- Modify: `src/tools/transform/transform.js`
- Modify: `src/tools/transform/transform.test.js`

Per spec: output `transform-origin` / `perspective` / `transform` three lines. `perspective` is always emitted (preview container needs it). `transform` line omitted when `functions` is empty.

- [ ] **Step 1: Add failing tests**

Append to `src/tools/transform/transform.test.js`:

```js
import { stateToCss } from './transform.js'

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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd E:/githome-windows/tools && npx vitest run src/tools/transform/transform.test.js`
Expected: FAIL with `stateToCss is not a function`.

- [ ] **Step 3: Implement stateToCss**

Append to `src/tools/transform/transform.js`:

```js
export function stateToCss(state) {
  const { origin, perspective, functions } = state
  const lines = []
  lines.push(`transform-origin: ${len(origin.x)} ${len(origin.y)} ${len(origin.z)};`)
  lines.push(`perspective: ${len(perspective)};`)
  if (functions && functions.length > 0) {
    lines.push(`transform: ${functions.map(functionToCss).join(' ')};`)
  }
  return lines.join('\n')
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd E:/githome-windows/tools && npx vitest run src/tools/transform/transform.test.js`
Expected: PASS, all tests green.

- [ ] **Step 5: Commit**

```bash
git -C E:/githome-windows/tools add src/tools/transform/transform.js src/tools/transform/transform.test.js
git -C E:/githome-windows/tools commit -m "feat(transform): add stateToCss for full state → CSS"
```

---

## Task 4: decomposeMatrix2D — QR decomposition (TDD)

**Files:**
- Modify: `src/tools/transform/transform.js`
- Modify: `src/tools/transform/transform.test.js`

Per spec §matrix QR: `matrix(a,b,c,d,e,f)` → `translate(tx, ty) rotate(θ) scale(sx, sy) skew(φ, 0)`. Returns an array of 4 function-state objects (or fewer if degenerate). Caller can decide whether to push as-is. Throwing is fine when singular; the orchestrator catches and falls back to keeping the matrix item as-is.

- [ ] **Step 1: Add failing tests**

Append to `src/tools/transform/transform.test.js`:

```js
import { decomposeMatrix2D } from './transform.js'

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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd E:/githome-windows/tools && npx vitest run src/tools/transform/transform.test.js`
Expected: FAIL with `decomposeMatrix2D is not a function`.

- [ ] **Step 3: Implement decomposeMatrix2D**

Append to `src/tools/transform/transform.js`:

```js
export function decomposeMatrix2D(m) {
  // m = [a, b, c, d, e, f]
  const [a, b, c, d, e, f] = m
  const tx = e
  const ty = f
  // 2x2 linear part [[a, c], [b, d]]
  const sx = Math.sqrt(a * a + b * b)
  if (sx < 1e-10) throw new Error('matrix 含 0 缩放,无法分解')
  const theta = Math.atan2(b, a)  // radians
  const cos = Math.cos(theta)
  const sin = Math.sin(theta)
  // cy, sy are entries of R(-θ) · M
  const cy = c * cos + d * sin
  const sy = -c * sin + d * cos
  const phi = Math.atan2(cy, sy)  // skew angle, radians
  const thetaDeg = radToDegNormalized(theta)
  const phiDeg = radToDegNormalized(phi)
  return [
    { type: 'translate', value: { x: { n: tx, unit: 'px' }, y: { n: ty, unit: 'px' }, z: { n: 0, unit: 'px' } } },
    { type: 'rotate', value: { deg: thetaDeg } },
    { type: 'scale', value: { x: sx, y: sy } },
    { type: 'skew', value: { x: phiDeg, y: 0 } },
  ]
}

// Radians → degrees, normalized to (-180, 180]
function radToDegNormalized(rad) {
  let deg = (rad * 180) / Math.PI
  while (deg > 180) deg -= 360
  while (deg <= -180) deg += 360
  return deg
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd E:/githome-windows/tools && npx vitest run src/tools/transform/transform.test.js`
Expected: PASS, all tests green.

- [ ] **Step 5: Commit**

```bash
git -C E:/githome-windows/tools add src/tools/transform/transform.js src/tools/transform/transform.test.js
git -C E:/githome-windows/tools commit -m "feat(transform): add matrix() QR decomposition"
```

---

## Task 5: extractMatrix3D — partial extraction (TDD)

**Files:**
- Modify: `src/tools/transform/transform.js`
- Modify: `src/tools/transform/transform.test.js`

Per spec: `matrix3d(...16)` (column-major) → `translate3d + rotateZ + rotateY + rotateX`. Only translation + rotation extracted; scale/skew dropped. Uses Shepperd's method for quaternion → ZYX Euler.

- [ ] **Step 1: Add failing tests**

Append to `src/tools/transform/transform.test.js`:

```js
import { extractMatrix3D } from './transform.js'

describe('extractMatrix3D', () => {
  // Helper: build column-major identity
  const identity = [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]

  it('identity → translate3d(0,0,0) + three rotate 0', () => {
    const r = extractMatrix3D(identity)
    expect(r).toHaveLength(4)
    expect(functionToCss(r[0])).toBe('translate3d(0px, 0px, 0px)')
    expect(functionToCss(r[1])).toBe('rotateZ(0deg)')
    expect(functionToCss(r[2])).toBe('rotateY(0deg)')
    expect(functionToCss(r[3])).toBe('rotateX(0deg)')
  })

  it('pure translation → translate3d + zero rotations', () => {
    // matrix3d column-major: m[12]=tx, m[13]=ty, m[14]=tz
    const m = [1,0,0,0, 0,1,0,0, 0,0,1,0, 5,10,15,1]
    const r = extractMatrix3D(m)
    expect(functionToCss(r[0])).toBe('translate3d(5px, 10px, 15px)')
    expect(functionToCss(r[1])).toBe('rotateZ(0deg)')
    expect(functionToCss(r[2])).toBe('rotateY(0deg)')
    expect(functionToCss(r[3])).toBe('rotateX(0deg)')
  })

  it('pure rotateZ 90deg → rotateZ(90deg), others 0', () => {
    // Rz(90): [[0,-1,0],[1,0,0],[0,0,1]] → column-major: m[0]=0, m[1]=1, m[2]=0, m[4]=-1, m[5]=0, m[6]=0, m[8]=0, m[9]=0, m[10]=1
    const m = [0,1,0,0, -1,0,0,0, 0,0,1,0, 0,0,0,1]
    const r = extractMatrix3D(m)
    expect(functionToCss(r[1])).toMatch(/^rotateZ\(90(\.0+)?deg\)$/)
    expect(functionToCss(r[2])).toBe('rotateY(0deg)')
    expect(functionToCss(r[3])).toBe('rotateX(0deg)')
  })

  it('pure rotateX 90deg → rotateX(90deg), others 0', () => {
    // Rx(90): [[1,0,0],[0,0,-1],[0,1,0]] → m[5]=0, m[6]=1, m[9]=-1, m[10]=0
    const m = [1,0,0,0, 0,0,1,0, 0,-1,0,0, 0,0,0,1]
    const r = extractMatrix3D(m)
    expect(functionToCss(r[3])).toMatch(/^rotateX\(90(\.0+)?deg\)$/)
    expect(functionToCss(r[1])).toBe('rotateZ(0deg)')
    expect(functionToCss(r[2])).toBe('rotateY(0deg)')
  })

  it('pure scale (2,2,2) → rotations still 0, scale dropped silently', () => {
    // S(2,2,2) → m[0]=2, m[5]=2, m[10]=2
    const m = [2,0,0,0, 0,2,0,0, 0,0,2,0, 0,0,0,1]
    const r = extractMatrix3D(m)
    expect(functionToCss(r[0])).toBe('translate3d(0px, 0px, 0px)')
    expect(functionToCss(r[1])).toBe('rotateZ(0deg)')
    expect(functionToCss(r[2])).toBe('rotateY(0deg)')
    expect(functionToCss(r[3])).toBe('rotateX(0deg)')
  })

  it('rotation + scale combined → rotation extracted, scale dropped', () => {
    // Rz(45) * S(2) — scale and rotate
    const c = Math.cos(Math.PI / 4)
    const s = Math.sin(Math.PI / 4)
    // R = [[c,-s,0],[s,c,0],[0,0,1]], S=diag(2,2,2), R·S = [[2c,-2s,0],[2s,2c,0],[0,0,2]]
    const m = [2*c, 2*s, 0, 0, -2*s, 2*c, 0, 0, 0, 0, 2, 0, 0, 0, 0, 1]
    const r = extractMatrix3D(m)
    expect(functionToCss(r[1])).toMatch(/^rotateZ\(45(\.0+)?deg\)$/)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd E:/githome-windows/tools && npx vitest run src/tools/transform/transform.test.js`
Expected: FAIL with `extractMatrix3D is not a function`.

- [ ] **Step 3: Implement extractMatrix3D**

Append to `src/tools/transform/transform.js`:

```js
export function extractMatrix3D(m) {
  // m is column-major 4x4. Translation = m[12], m[13], m[14].
  const tx = m[12], ty = m[13], tz = m[14]
  // 3x3 rotation part: row-major access R[row][col] = m[col * 4 + row]
  const R = [
    [m[0], m[4], m[8]],
    [m[1], m[5], m[9]],
    [m[2], m[6], m[10]],
  ]
  // Shepperd's method → quaternion (qw, qx, qy, qz)
  const trace = R[0][0] + R[1][1] + R[2][2]
  let qw, qx, qy, qz
  if (trace > 0) {
    const S = Math.sqrt(trace + 1) * 2  // S = 4 * qw
    qw = 0.25 * S
    qx = (R[2][1] - R[1][2]) / S
    qy = (R[0][2] - R[2][0]) / S
    qz = (R[1][0] - R[0][1]) / S
  } else if (R[0][0] > R[1][1] && R[0][0] > R[2][2]) {
    const S = Math.sqrt(1 + R[0][0] - R[1][1] - R[2][2]) * 2  // S = 4 * qx
    qw = (R[2][1] - R[1][2]) / S
    qx = 0.25 * S
    qy = (R[0][1] + R[1][0]) / S
    qz = (R[0][2] + R[2][0]) / S
  } else if (R[1][1] > R[2][2]) {
    const S = Math.sqrt(1 + R[1][1] - R[0][0] - R[2][2]) * 2  // S = 4 * qy
    qw = (R[0][2] - R[2][0]) / S
    qx = (R[0][1] + R[1][0]) / S
    qy = 0.25 * S
    qz = (R[1][2] + R[2][1]) / S
  } else {
    const S = Math.sqrt(1 + R[2][2] - R[0][0] - R[1][1]) * 2  // S = 4 * qz
    qw = (R[1][0] - R[0][1]) / S
    qx = (R[0][2] + R[2][0]) / S
    qy = (R[1][2] + R[2][1]) / S
    qz = 0.25 * S
  }
  // quaternion → ZYX Euler (yaw=Z, pitch=Y, roll=X)
  const sinp = 2 * (qw * qy - qz * qx)
  let pitch
  if (Math.abs(sinp) >= 1) pitch = Math.sign(sinp) * (Math.PI / 2)
  else pitch = Math.asin(sinp)
  const roll = Math.atan2(2 * (qw * qx + qy * qz), 1 - 2 * (qx * qx + qy * qy))
  const yaw = Math.atan2(2 * (qw * qz + qx * qy), 1 - 2 * (qy * qy + qz * qz))
  return [
    { type: 'translate3d', value: { x: { n: tx, unit: 'px' }, y: { n: ty, unit: 'px' }, z: { n: tz, unit: 'px' } } },
    { type: 'rotateZ', value: { deg: radToDegNormalized(yaw) } },
    { type: 'rotateY', value: { deg: radToDegNormalized(pitch) } },
    { type: 'rotateX', value: { deg: radToDegNormalized(roll) } },
  ]
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd E:/githome-windows/tools && npx vitest run src/tools/transform/transform.test.js`
Expected: PASS, all tests green.

- [ ] **Step 5: Commit**

```bash
git -C E:/githome-windows/tools add src/tools/transform/transform.js src/tools/transform/transform.test.js
git -C E:/githome-windows/tools commit -m "feat(transform): add matrix3d partial extraction via Shepperd quaternion"
```

---

## Task 6: parseTransform — CSS string → state (TDD)

**Files:**
- Modify: `src/tools/transform/transform.js`
- Modify: `src/tools/transform/transform.test.js`

Per spec §整体反解析流程: multi-line input (`transform:` / `transform-origin:` / `perspective:`), per-line parse, line-numbered errors. matrix → decomposeMatrix2D, matrix3d → extractMatrix3D with partial-extraction warning.

Return shape: `{ ok: true, state, warnings }` or `{ ok: false, errors }` where `errors` is an array of `{ line, message }`.

- [ ] **Step 1: Add failing tests**

Append to `src/tools/transform/transform.test.js`:

```js
import { parseTransform } from './transform.js'

describe('parseTransform — function families', () => {
  it('translateX', () => {
    const r = parseTransform('translateX(10px)')
    expect(r.ok).toBe(true)
    expect(r.state.functions).toHaveLength(1)
    expect(r.state.functions[0]).toEqual({ type: 'translateX', value: { n: 10, unit: 'px' } })
  })

  it('translate with one arg → Y defaults to X', () => {
    const r = parseTransform('translate(10px)')
    expect(r.state.functions[0]).toEqual({ type: 'translate', value: { x: { n: 10, unit: 'px' }, y: { n: 10, unit: 'px' }, z: { n: 0, unit: 'px' } } })
  })

  it('translate3d', () => {
    const r = parseTransform('translate3d(1px, 2px, 3px)')
    expect(r.state.functions[0].type).toBe('translate3d')
    expect(r.state.functions[0].value.x.n).toBe(1)
  })

  it('rotate3d', () => {
    const r = parseTransform('rotate3d(1, 0.5, 0, 45deg)')
    expect(r.state.functions[0]).toEqual({ type: 'rotate3d', value: { x: 1, y: 0.5, z: 0, deg: 45 } })
  })

  it('scale with one arg → Y defaults to X', () => {
    const r = parseTransform('scale(2)')
    expect(r.state.functions[0]).toEqual({ type: 'scale', value: { x: 2, y: 2 } })
  })

  it('multiple functions preserve order', () => {
    const r = parseTransform('translateX(10px) rotate(45deg) scale(2)')
    expect(r.state.functions.map(f => f.type)).toEqual(['translateX', 'rotate', 'scale'])
  })

  it('skew with one arg → Y defaults to 0', () => {
    const r = parseTransform('skew(15deg)')
    expect(r.state.functions[0]).toEqual({ type: 'skew', value: { x: 15, y: 0 } })
  })
})

describe('parseTransform — matrix decomposition (2D)', () => {
  it('pure translation matrix', () => {
    const r = parseTransform('matrix(1, 0, 0, 1, 10, 20)')
    expect(r.ok).toBe(true)
    expect(r.state.functions.map(f => f.type)).toEqual(['translate', 'rotate', 'scale', 'skew'])
    expect(r.state.functions[0].value.x.n).toBe(10)
  })

  it('rotation matrix → rotate(45deg)', () => {
    const c = Math.cos(Math.PI / 4)
    const s = Math.sin(Math.PI / 4)
    const r = parseTransform(`matrix(${c}, ${s}, ${-s}, ${c}, 0, 0)`)
    expect(r.ok).toBe(true)
    const rotate = r.state.functions.find(f => f.type === 'rotate')
    expect(Math.abs(rotate.value.deg - 45)).toBeLessThan(0.01)
  })

  it('singular matrix → kept as matrix item with warning', () => {
    const r = parseTransform('matrix(0, 0, 0, 0, 5, 10)')
    expect(r.ok).toBe(true)
    expect(r.state.functions[0].type).toBe('matrix')
    expect(r.warnings).toEqual(expect.arrayContaining([expect.stringMatching(/0 缩放/)]))
  })
})

describe('parseTransform — matrix3d partial extraction', () => {
  it('identity matrix3d', () => {
    const r = parseTransform('matrix3d(1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1)')
    expect(r.ok).toBe(true)
    expect(r.state.functions.map(f => f.type)).toEqual(['translate3d', 'rotateZ', 'rotateY', 'rotateX'])
    expect(r.warnings).toEqual(expect.arrayContaining([expect.stringMatching(/matrix3d 仅提取/)]))
  })

  it('matrix3d with translation', () => {
    const r = parseTransform('matrix3d(1,0,0,0, 0,1,0,0, 0,0,1,0, 5,10,15,1)')
    expect(r.state.functions[0].value.x.n).toBe(5)
    expect(r.state.functions[0].value.z.n).toBe(15)
  })
})

describe('parseTransform — multi-line', () => {
  it('parses transform + origin + perspective', () => {
    const r = parseTransform('transform: rotate(45deg);\ntransform-origin: 0% 0% 0px;\nperspective: 1200px;')
    expect(r.ok).toBe(true)
    expect(r.state.functions).toHaveLength(1)
    expect(r.state.origin.x).toEqual({ n: 0, unit: '%' })
    expect(r.state.perspective).toEqual({ n: 1200, unit: 'px' })
  })

  it('bare function string (no transform: prefix) is allowed', () => {
    const r = parseTransform('rotate(45deg)')
    expect(r.ok).toBe(true)
    expect(r.state.functions).toHaveLength(1)
  })

  it('multiple transform lines concatenate', () => {
    const r = parseTransform('transform: translateX(10px);\ntransform: rotate(45deg)')
    expect(r.state.functions).toHaveLength(2)
  })
})

describe('parseTransform — errors', () => {
  it('unknown function', () => {
    const r = parseTransform('foo(10px)')
    expect(r.ok).toBe(false)
    expect(r.errors[0].line).toBe(1)
    expect(r.errors[0].message).toMatch(/未知函数 foo/)
  })

  it('unclosed paren', () => {
    const r = parseTransform('translateX(10px')
    expect(r.ok).toBe(false)
    expect(r.errors[0].message).toMatch(/括号未闭合/)
  })

  it('wrong arg count for translate3d', () => {
    const r = parseTransform('translate3d(1px, 2px)')
    expect(r.ok).toBe(false)
    expect(r.errors[0].message).toMatch(/期望 3 个参数/)
  })

  it('scale rejects unit', () => {
    const r = parseTransform('scale(2px)')
    expect(r.ok).toBe(false)
    expect(r.errors[0].message).toMatch(/不接受单位/)
  })

  it('error on second line reports line 2', () => {
    const r = parseTransform('translateX(10px)\nfoo(20px)')
    expect(r.ok).toBe(false)
    expect(r.errors[0].line).toBe(2)
  })

  it('empty input → ok with empty functions', () => {
    const r = parseTransform('')
    expect(r.ok).toBe(true)
    expect(r.state.functions).toEqual([])
  })

  it('whitespace-only input → ok', () => {
    const r = parseTransform('   \n  ')
    expect(r.ok).toBe(true)
    expect(r.state.functions).toEqual([])
  })
})

describe('parseTransform — round-trip', () => {
  it('stateToCss → parseTransform produces equivalent state', () => {
    const original = {
      functions: [
        { type: 'translateX', value: { n: 10, unit: 'px' } },
        { type: 'rotate', value: { deg: 45 } },
        { type: 'scale', value: { x: 2, y: 2 } },
      ],
      origin: { x: { n: 50, unit: '%' }, y: { n: 50, unit: '%' }, z: { n: 0, unit: 'px' } },
      perspective: { n: 800, unit: 'px' },
    }
    const css = stateToCss(original)
    const r = parseTransform(css)
    expect(r.ok).toBe(true)
    expect(r.state.functions.map(f => f.type)).toEqual(['translateX', 'rotate', 'scale'])
    expect(r.state.functions[0].value.n).toBeCloseTo(10, 5)
    expect(r.state.functions[1].value.deg).toBeCloseTo(45, 5)
    expect(r.state.perspective.n).toBe(800)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd E:/githome-windows/tools && npx vitest run src/tools/transform/transform.test.js`
Expected: FAIL with `parseTransform is not a function`.

- [ ] **Step 3: Implement parseTransform**

Append to `src/tools/transform/transform.js`:

```js
const KNOWN_TYPES = new Set([
  'translateX', 'translateY', 'translateZ', 'translate', 'translate3d',
  'rotate', 'rotateX', 'rotateY', 'rotateZ', 'rotate3d',
  'scale', 'scaleX', 'scaleY', 'scaleZ', 'scale3d',
  'skew', 'skewX', 'skewY',
  'matrix', 'matrix3d', 'perspective',
])

// Split "name(args)" tokens out of a single line's transform string.
// Returns array of { name, argsRaw } or throws Error("括号未闭合").
function tokenizeFunctions(str) {
  const tokens = []
  let i = 0
  while (i < str.length) {
    while (i < str.length && /[\s,]/.test(str[i])) i++
    if (i >= str.length) break
    const nameStart = i
    while (i < str.length && /[a-zA-Z0-9]/.test(str[i])) i++
    const name = str.slice(nameStart, i)
    if (!name) throw new Error('括号未闭合')
    while (i < str.length && str[i] === ' ') i++
    if (i >= str.length || str[i] !== '(') throw new Error('括号未闭合')
    i++
    const argStart = i
    let depth = 1
    while (i < str.length && depth > 0) {
      if (str[i] === '(') depth++
      else if (str[i] === ')') depth--
      if (depth > 0) i++
    }
    if (depth !== 0) throw new Error('括号未闭合')
    const argsRaw = str.slice(argStart, i)
    i++
    tokens.push({ name, argsRaw })
  }
  return tokens
}

function splitArgs(argsRaw) {
  return argsRaw.split(',').map(s => s.trim()).filter(s => s.length > 0)
}

function parseNum(s) {
  const n = parseFloat(s)
  if (!Number.isFinite(n)) throw new Error(`无法解析数值: ${s}`)
  return n
}

function expectArgs(name, args, expected) {
  let min, max
  if (Array.isArray(expected)) { [min, max] = expected }
  else { min = max = expected }
  const actual = args.length
  if (actual < min || actual > max) {
    const expStr = min === max ? `${min} 个参数` : `${min}-${max} 个参数`
    throw new Error(`${name} 期望 ${expStr},实际 ${actual} 个`)
  }
  if (name.startsWith('scale')) {
    args.forEach((a, i) => {
      if (/[a-zA-Z%]/.test(a)) throw new Error(`${name} 不接受单位(参数 ${i + 1}: ${a})`)
    })
  }
}

function parseFunctionToken(token) {
  const { name, argsRaw } = token
  if (!KNOWN_TYPES.has(name)) throw new Error(`未知函数 ${name}`)
  const args = splitArgs(argsRaw)
  switch (name) {
    case 'translateX':
    case 'translateY':
    case 'translateZ': {
      expectArgs(name, args, 1)
      return { type: name, value: parseLength(args[0]) }
    }
    case 'translate': {
      expectArgs(name, args, [1, 2])
      const x = parseLength(args[0])
      const y = args[1] ? parseLength(args[1]) : { ...x }
      return { type: 'translate', value: { x, y, z: { n: 0, unit: 'px' } } }
    }
    case 'translate3d': {
      expectArgs(name, args, 3)
      return { type: 'translate3d', value: { x: parseLength(args[0]), y: parseLength(args[1]), z: parseLength(args[2]) } }
    }
    case 'rotate':
    case 'rotateX':
    case 'rotateY':
    case 'rotateZ': {
      expectArgs(name, args, 1)
      return { type: name, value: { deg: parseAngle(args[0]) } }
    }
    case 'rotate3d': {
      expectArgs(name, args, 4)
      return { type: 'rotate3d', value: { x: parseNum(args[0]), y: parseNum(args[1]), z: parseNum(args[2]), deg: parseAngle(args[3]) } }
    }
    case 'scale': {
      expectArgs(name, args, [1, 2])
      const x = parseNum(args[0])
      const y = args[1] ? parseNum(args[1]) : x
      return { type: 'scale', value: { x, y } }
    }
    case 'scale3d': {
      expectArgs(name, args, 3)
      return { type: 'scale3d', value: { x: parseNum(args[0]), y: parseNum(args[1]), z: parseNum(args[2]) } }
    }
    case 'scaleX':
    case 'scaleY':
    case 'scaleZ': {
      expectArgs(name, args, 1)
      return { type: name, value: { n: parseNum(args[0]) } }
    }
    case 'skewX':
    case 'skewY': {
      expectArgs(name, args, 1)
      return { type: name, value: { deg: parseAngle(args[0]) } }
    }
    case 'skew': {
      expectArgs(name, args, [1, 2])
      const x = parseAngle(args[0])
      const y = args[1] ? parseAngle(args[1]) : 0
      return { type: 'skew', value: { x, y } }
    }
    case 'perspective': {
      expectArgs(name, args, 1)
      return { type: 'perspective', value: parseLength(args[0]) }
    }
    case 'matrix': {
      expectArgs(name, args, 6)
      return { type: 'matrix', value: args.map(parseNum) }
    }
    case 'matrix3d': {
      expectArgs(name, args, 16)
      return { type: 'matrix3d', value: args.map(parseNum) }
    }
    default:
      throw new Error(`未知函数 ${name}`)
  }
}

// Parse a single token; matrix/matrix3d decompose into multiple functions.
function parseTokenOrDecompose(token) {
  if (token.name === 'matrix') {
    const args = splitArgs(token.argsRaw)
    expectArgs('matrix', args, 6)
    const nums = args.map(parseNum)
    try {
      return { functions: decomposeMatrix2D(nums), warnings: [] }
    } catch (e) {
      return { functions: [{ type: 'matrix', value: nums }], warnings: ['matrix 含 0 缩放,无法分解,保留原 matrix 项'] }
    }
  }
  if (token.name === 'matrix3d') {
    const args = splitArgs(token.argsRaw)
    expectArgs('matrix3d', args, 16)
    const nums = args.map(parseNum)
    const fns = extractMatrix3D(nums)
    return { functions: fns, warnings: ['matrix3d 仅提取平移与旋转,缩放与斜切分量已丢弃'] }
  }
  return { functions: [parseFunctionToken(token)], warnings: [] }
}

export function parseTransform(rawStr) {
  const functions = []
  const warnings = []
  const errors = []
  let origin = null
  let perspective = null

  const lines = rawStr.split('\n')
  lines.forEach((line, idx) => {
    const lineNo = idx + 1
    const trimmed = line.trim()
    if (trimmed === '') return

    const propMatch = trimmed.match(/^([a-zA-Z-]+)\s*:\s*(.+)$/)
    if (propMatch) {
      const prop = propMatch[1]
      const value = propMatch[2]
      if (prop === 'transform') {
        try {
          const tokens = tokenizeFunctions(value)
          for (const tok of tokens) {
            const r = parseTokenOrDecompose(tok)
            functions.push(...r.functions)
            warnings.push(...r.warnings)
          }
        } catch (e) {
          errors.push({ line: lineNo, message: e.message })
        }
      } else if (prop === 'transform-origin') {
        const parts = value.trim().split(/\s+/)
        if (parts.length === 2) parts.push('0px')
        if (parts.length !== 3) {
          errors.push({ line: lineNo, message: 'transform-origin 期望 2-3 个值' })
          return
        }
        try {
          const x = parseLength(parts[0])
          const y = parseLength(parts[1])
          const z = parseLength(parts[2])
          if (z.unit !== 'px') {
            errors.push({ line: lineNo, message: 'transform-origin Z 必须为 px' })
            return
          }
          origin = { x, y, z }
        } catch (e) {
          errors.push({ line: lineNo, message: e.message })
        }
      } else if (prop === 'perspective') {
        try {
          perspective = parseLength(value.trim())
        } catch (e) {
          errors.push({ line: lineNo, message: e.message })
        }
      } else {
        errors.push({ line: lineNo, message: `未知属性 ${prop}` })
      }
      return
    }

    try {
      const tokens = tokenizeFunctions(trimmed)
      for (const tok of tokens) {
        const r = parseTokenOrDecompose(tok)
        functions.push(...r.functions)
        warnings.push(...r.warnings)
      }
    } catch (e) {
      errors.push({ line: lineNo, message: e.message })
    }
  })

  if (errors.length > 0) return { ok: false, errors }

  const state = {
    functions,
    origin: origin || { x: { n: 50, unit: '%' }, y: { n: 50, unit: '%' }, z: { n: 0, unit: 'px' } },
    perspective: perspective || { n: 800, unit: 'px' },
  }
  return { ok: true, state, warnings }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd E:/githome-windows/tools && npx vitest run src/tools/transform/transform.test.js`
Expected: PASS, all tests green.

- [ ] **Step 5: Commit**

```bash
git -C E:/githome-windows/tools add src/tools/transform/transform.js src/tools/transform/transform.test.js
git -C E:/githome-windows/tools commit -m "feat(transform): add parseTransform with multi-line + matrix decomposition"
```

---

## Task 7: Register route + sidebar entry

**Files:**
- Modify: `src/router.js`
- Modify: `src/routes.js`
- Modify: `src/tools.js`

Wire the not-yet-created `Transform.vue` into routing and sidebar. (We create the .vue in Task 8; registering first is fine because the route lazy-loads.)

- [ ] **Step 1: Add component mapping in `src/router.js`**

In the `components` object, after the `'/cubic-bezier': ...` line, add:

```js
  '/transform': () => import('./tools/transform/Transform.vue'),
```

- [ ] **Step 2: Add route meta in `src/routes.js`**

Open `src/routes.js` and find the existing CSS-group entries (e.g. `/cubic-bezier`). Append after the cubic-bezier entry:

```js
  { path: '/transform', meta: { title: '变换 transform', description: 'CSS transform 可视化生成,支持 2D/3D 函数、matrix 反解析' } },
```

Run: `cd E:/githome-windows/tools && grep -n "transform" src/routes.js`
Expected: at least one line with `/transform`.

- [ ] **Step 3: Add sidebar entry in `src/tools.js`**

In the `CSS` group array (the one starting with `name: 'CSS'`), after the `cubic-bezier` entry, add:

```js
      {
        name: '变换 transform',
        path: '/transform',
        desc: 'CSS transform 可视化生成,支持 2D/3D 函数、matrix 反解析',
        icon: 'lucide:move-3d',
      },
```

- [ ] **Step 4: Verify lint passes**

Run: `cd E:/githome-windows/tools && npm run lint`
Expected: PASS (no errors in the three modified files).

- [ ] **Step 5: Commit**

```bash
git -C E:/githome-windows/tools add src/router.js src/routes.js src/tools.js
git -C E:/githome-windows/tools commit -m "feat(transform): register route and sidebar entry"
```

---

## Task 8: Transform.vue — skeleton + state + function list

**Files:**
- Create: `src/tools/transform/Transform.vue`

Build the view in three sub-steps. This task creates the skeleton: state, function list (with add/remove/move), per-type parameter form, and CSS code area. No preview, no reverse-parse yet — those land in Task 9 and Task 10.

Default state: `functions: [{ type: 'rotate', value: { deg: 15 } }]` so the preview shows something on first load (Task 9 adds preview).

- [ ] **Step 1: Create the .vue with state + function list + param form + code area**

Create `src/tools/transform/Transform.vue`:

```vue
<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">
      变换 transform
    </h1>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Left: Controls -->
      <div class="flex flex-col gap-4">
        <!-- Function list -->
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">函数列表(顺序敏感)</span></label>
          <ul class="flex flex-col gap-1">
            <li
              v-for="(fn, i) in state.functions"
              :key="i"
              class="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer"
              :class="i === selectedIndex ? 'bg-primary/10 border border-primary' : 'bg-base-200 border border-transparent hover:bg-base-300'"
              @click="selectedIndex = i"
            >
              <span class="font-mono text-xs flex-1 break-all">{{ functionToCss(fn) }}</span>
              <button
                class="btn btn-ghost btn-xs btn-square"
                :disabled="i === 0"
                title="上移"
                @click.stop="moveUp(i)"
              >
                <Icon icon="lucide:chevron-left" class="w-3 h-3" />
              </button>
              <button
                class="btn btn-ghost btn-xs btn-square"
                :disabled="i === state.functions.length - 1"
                title="下移"
                @click.stop="moveDown(i)"
              >
                <Icon icon="lucide:chevron-right" class="w-3 h-3" />
              </button>
              <button
                class="btn btn-ghost btn-xs btn-square"
                title="删除"
                @click.stop="removeFn(i)"
              >
                <Icon icon="lucide:x" class="w-3 h-3" />
              </button>
            </li>
          </ul>
          <details class="mt-2">
            <summary class="btn btn-outline btn-sm cursor-pointer gap-1 w-fit">
              <Icon icon="lucide:plus" class="w-4 h-4" />
              添加函数
            </summary>
            <div class="mt-2 p-3 bg-base-200 rounded-lg flex flex-col gap-2">
              <div v-for="group in addGroups" :key="group.label">
                <div class="text-xs font-semibold opacity-70 mb-1">{{ group.label }}</div>
                <div class="flex flex-wrap gap-1">
                  <button
                    v-for="t in group.types"
                    :key="t"
                    class="btn btn-xs btn-ghost font-mono"
                    @click="addFn(t)"
                  >{{ t }}</button>
                </div>
              </div>
            </div>
          </details>
        </div>

        <!-- Selected function params -->
        <div v-if="selected" class="form-control">
          <label class="label"><span class="label-text font-semibold">参数 ({{ selected.type }})</span></label>
          <component :is="paramComponent" v-bind="paramComponentProps" @update="updateSelected" />
        </div>

        <!-- transform-origin -->
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">transform-origin</span></label>
          <div class="flex flex-col gap-2">
            <div v-for="axis in ['x', 'y', 'z']" :key="axis" class="flex items-center gap-2">
              <span class="text-sm w-4 uppercase">{{ axis }}</span>
              <input
                :value="state.origin[axis].n"
                type="range"
                :min="axis === 'z' ? -100 : -50"
                :max="axis === 'z' ? 100 : 150"
                step="1"
                class="range range-sm flex-1"
                @input="updateOrigin(axis, $event.target.value)"
              >
              <input
                :value="state.origin[axis].n"
                type="number"
                class="input input-bordered input-sm w-20 font-mono text-sm"
                @input="updateOrigin(axis, $event.target.value)"
              >
              <select
                v-if="axis !== 'z'"
                v-model="state.origin[axis].unit"
                class="select select-bordered select-sm w-16"
              >
                <option value="%">%</option>
                <option value="px">px</option>
              </select>
              <span v-else class="text-xs w-8">px</span>
            </div>
          </div>
        </div>

        <!-- perspective (preview container) -->
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">perspective (预览容器)</span></label>
          <div class="flex items-center gap-2">
            <input
              v-model.number="state.perspective.n"
              type="range"
              min="100"
              max="2000"
              step="10"
              class="range range-sm flex-1"
            >
            <span class="text-sm w-16 text-right">{{ state.perspective.n }}px</span>
          </div>
        </div>
      </div>

      <!-- Right: Code (preview + reverse-parse come later) -->
      <div class="flex flex-col gap-4">
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">CSS 代码</span></label>
          <div class="relative">
            <pre class="bg-base-200 rounded-lg p-4 font-mono text-sm break-all whitespace-pre-wrap">{{ cssCode }}</pre>
            <button
              class="btn btn-ghost btn-xs btn-square absolute right-2 top-2"
              :title="copied ? '已复制!' : '复制'"
              @click="copyCode"
            >
              <Icon v-if="copied" icon="lucide:check" class="w-4 h-4 text-success" />
              <Icon v-else icon="lucide:clipboard" class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Icon } from '@iconify/vue'
import { ref, reactive, computed } from 'vue'
import { functionToCss, stateToCss, parseTransform } from './transform.js'

const addGroups = [
  { label: '平移', types: ['translateX', 'translateY', 'translateZ', 'translate', 'translate3d'] },
  { label: '旋转', types: ['rotate', 'rotateX', 'rotateY', 'rotateZ', 'rotate3d'] },
  { label: '缩放', types: ['scaleX', 'scaleY', 'scaleZ', 'scale', 'scale3d'] },
  { label: '斜切', types: ['skew', 'skewX', 'skewY'] },
  { label: '矩阵', types: ['matrix', 'matrix3d'] },
  { label: '透视', types: ['perspective'] },
]

function defaultFn(type) {
  switch (type) {
    case 'translateX':
    case 'translateY':
    case 'translateZ':
      return { type, value: { n: 0, unit: 'px' } }
    case 'translate':
      return { type, value: { x: { n: 0, unit: 'px' }, y: { n: 0, unit: 'px' }, z: { n: 0, unit: 'px' } } }
    case 'translate3d':
      return { type, value: { x: { n: 0, unit: 'px' }, y: { n: 0, unit: 'px' }, z: { n: 0, unit: 'px' } } }
    case 'rotate':
    case 'rotateX':
    case 'rotateY':
    case 'rotateZ':
      return { type, value: { deg: 0 } }
    case 'rotate3d':
      return { type, value: { x: 0, y: 1, z: 0, deg: 0 } }
    case 'scale':
      return { type, value: { x: 1, y: 1 } }
    case 'scale3d':
      return { type, value: { x: 1, y: 1, z: 1 } }
    case 'scaleX':
    case 'scaleY':
    case 'scaleZ':
      return { type, value: { n: 1 } }
    case 'skewX':
    case 'skewY':
      return { type, value: { deg: 0 } }
    case 'skew':
      return { type, value: { x: 0, y: 0 } }
    case 'matrix':
      return { type, value: [1, 0, 0, 1, 0, 0] }
    case 'matrix3d':
      return { type, value: [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1] }
    case 'perspective':
      return { type, value: { n: 800, unit: 'px' } }
    default:
      throw new Error(`未知 type: ${type}`)
  }
}

const state = reactive({
  functions: [
    { type: 'rotate', value: { deg: 15 } },
    { type: 'translateZ', value: { n: 30, unit: 'px' } },
  ],
  origin: { x: { n: 50, unit: '%' }, y: { n: 50, unit: '%' }, z: { n: 0, unit: 'px' } },
  perspective: { n: 800, unit: 'px' },
})

const selectedIndex = ref(0)
const copied = ref(false)

const selected = computed(() => state.functions[selectedIndex.value])

const cssCode = computed(() => stateToCss({ ...state, functions: state.functions }))

// Per-type param form: render inline as a function returning vdom would be cleaner,
// but inline template branching is fine for one component.
const paramComponent = computed(() => 'param-form-' + selected.value.type.replace(/[A-Z]/g, m => '-' + m.toLowerCase()).replace('3d', '3d'))
const paramComponentProps = computed(() => ({ fn: selected.value }))

function updateSelected() { /* placeholder, replaced by inline template below */ }

function addFn(type) {
  state.functions.push(defaultFn(type))
  selectedIndex.value = state.functions.length - 1
}
function removeFn(i) {
  state.functions.splice(i, 1)
  if (selectedIndex.value >= state.functions.length) {
    selectedIndex.value = Math.max(0, state.functions.length - 1)
  }
}
function moveUp(i) {
  if (i === 0) return
  const arr = state.functions
  const tmp = arr[i - 1]
  arr[i - 1] = arr[i]
  arr[i] = tmp
}
function moveDown(i) {
  if (i === state.functions.length - 1) return
  const arr = state.functions
  const tmp = arr[i + 1]
  arr[i + 1] = arr[i]
  arr[i] = tmp
}
function updateOrigin(axis, v) {
  const n = Number(v)
  if (Number.isFinite(n)) state.origin[axis].n = n
}

async function copyCode() {
  try {
    await navigator.clipboard.writeText(cssCode.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 1500)
  } catch { /* clipboard not available */ }
}
</script>
```

Note: The `paramComponent` / `paramComponentProps` placeholders above are stubs. We'll replace the parameter-form region with inline `<template>` branches in Task 9 Step 2 (so we don't need a sub-component file).

- [ ] **Step 2: Smoke-test the page renders**

Run: `cd E:/githome-windows/tools && npm run dev`
Open: `http://localhost:5173/transform`
Expected: page renders with title, function list showing `rotate(15deg)` and `translateZ(30px)`, code area showing three lines. No console errors.
Stop the dev server when done.

- [ ] **Step 3: Verify lint passes**

Run: `cd E:/githome-windows/tools && npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git -C E:/githome-windows/tools add src/tools/transform/Transform.vue
git -C E:/githome-windows/tools commit -m "feat(transform): add view skeleton with function list and code area"
```

---

## Task 9: Inline parameter form branches + 3D cube preview

**Files:**
- Modify: `src/tools/transform/Transform.vue`

Replace the placeholder `paramComponent` with inline `<template>` branches for each function family. Add the 3D cube preview (6 face divs in a `preserve-3d` container, fixed viewing angle).

- [ ] **Step 1: Replace placeholder parameter form with inline branches**

In `src/tools/transform/Transform.vue`, find this block:

```vue
        <!-- Selected function params -->
        <div v-if="selected" class="form-control">
          <label class="label"><span class="label-text font-semibold">参数 ({{ selected.type }})</span></label>
          <component :is="paramComponent" v-bind="paramComponentProps" @update="updateSelected" />
        </div>
```

Replace it with:

```vue
        <!-- Selected function params -->
        <div v-if="selected" class="form-control">
          <label class="label"><span class="label-text font-semibold">参数 ({{ selected.type }})</span></label>

          <!-- Single-length family: translateX / Y / Z / perspective -->
          <div v-if="isSingleLength(selected.type)" class="flex items-center gap-2">
            <input
              v-model.number="selected.value.n"
              type="range"
              min="-200"
              max="200"
              step="1"
              class="range range-sm flex-1"
            >
            <input
              v-model.number="selected.value.n"
              type="number"
              class="input input-bordered input-sm w-20 font-mono text-sm"
            >
            <select
              v-if="selected.type !== 'perspective'"
              v-model="selected.value.unit"
              class="select select-bordered select-sm w-16"
            >
              <option value="px">px</option>
              <option value="%">%</option>
              <option value="em">em</option>
              <option value="rem">rem</option>
            </select>
            <span v-else class="text-xs w-8">px</span>
          </div>

          <!-- translate / translate3d: 3 axes -->
          <div v-else-if="selected.type === 'translate' || selected.type === 'translate3d'" class="flex flex-col gap-2">
            <div v-for="axis in ['x', 'y', 'z']" :key="axis" class="flex items-center gap-2">
              <span class="text-sm w-4 uppercase">{{ axis }}</span>
              <input
                v-model.number="selected.value[axis].n"
                type="range"
                min="-200"
                max="200"
                step="1"
                class="range range-sm flex-1"
              >
              <input
                v-model.number="selected.value[axis].n"
                type="number"
                class="input input-bordered input-sm w-20 font-mono text-sm"
              >
              <select v-model="selected.value[axis].unit" class="select select-bordered select-sm w-16">
                <option value="px">px</option>
                <option value="%">%</option>
                <option value="em">em</option>
                <option value="rem">rem</option>
              </select>
            </div>
          </div>

          <!-- Single angle family: rotate / rotateX / Y / Z -->
          <div v-else-if="isSingleAngle(selected.type)" class="flex items-center gap-2">
            <input
              v-model.number="selected.value.deg"
              type="range"
              min="-180"
              max="180"
              step="1"
              class="range range-sm flex-1"
            >
            <input
              v-model.number="selected.value.deg"
              type="number"
              class="input input-bordered input-sm w-20 font-mono text-sm"
            >
            <span class="text-xs w-8">deg</span>
          </div>

          <!-- rotate3d: 4 inputs -->
          <div v-else-if="selected.type === 'rotate3d'" class="flex flex-col gap-2">
            <div v-for="axis in ['x', 'y', 'z']" :key="axis" class="flex items-center gap-2">
              <span class="text-sm w-4 uppercase">{{ axis }}</span>
              <input
                v-model.number="selected.value[axis]"
                type="number"
                step="0.1"
                class="input input-bordered input-sm w-24 font-mono text-sm"
              >
            </div>
            <div class="flex items-center gap-2">
              <span class="text-sm w-4">deg</span>
              <input
                v-model.number="selected.value.deg"
                type="range"
                min="-180"
                max="180"
                step="1"
                class="range range-sm flex-1"
              >
              <input
                v-model.number="selected.value.deg"
                type="number"
                class="input input-bordered input-sm w-20 font-mono text-sm"
              >
            </div>
          </div>

          <!-- scale / scale3d: 2 or 3 axes, no unit -->
          <div v-else-if="selected.type === 'scale' || selected.type === 'scale3d'" class="flex flex-col gap-2">
            <div v-for="axis in (selected.type === 'scale' ? ['x', 'y'] : ['x', 'y', 'z'])" :key="axis" class="flex items-center gap-2">
              <span class="text-sm w-4 uppercase">{{ axis }}</span>
              <input
                v-model.number="selected.value[axis]"
                type="range"
                min="0"
                max="3"
                step="0.05"
                class="range range-sm flex-1"
              >
              <input
                v-model.number="selected.value[axis]"
                type="number"
                step="0.05"
                class="input input-bordered input-sm w-20 font-mono text-sm"
              >
            </div>
          </div>

          <!-- scaleX / Y / Z: single value, no unit -->
          <div v-else-if="isSingleScale(selected.type)" class="flex items-center gap-2">
            <input
              v-model.number="selected.value.n"
              type="range"
              min="0"
              max="3"
              step="0.05"
              class="range range-sm flex-1"
            >
            <input
              v-model.number="selected.value.n"
              type="number"
              step="0.05"
              class="input input-bordered input-sm w-20 font-mono text-sm"
            >
          </div>

          <!-- skewX / skewY: single angle -->
          <div v-else-if="selected.type === 'skewX' || selected.type === 'skewY'" class="flex items-center gap-2">
            <input
              v-model.number="selected.value.deg"
              type="range"
              min="-90"
              max="90"
              step="1"
              class="range range-sm flex-1"
            >
            <input
              v-model.number="selected.value.deg"
              type="number"
              class="input input-bordered input-sm w-20 font-mono text-sm"
            >
            <span class="text-xs w-8">deg</span>
          </div>

          <!-- skew: 2 angles -->
          <div v-else-if="selected.type === 'skew'" class="flex flex-col gap-2">
            <div class="flex items-center gap-2">
              <span class="text-sm w-4">X</span>
              <input v-model.number="selected.value.x" type="range" min="-90" max="90" step="1" class="range range-sm flex-1">
              <input v-model.number="selected.value.x" type="number" class="input input-bordered input-sm w-20 font-mono text-sm">
              <span class="text-xs w-8">deg</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-sm w-4">Y</span>
              <input v-model.number="selected.value.y" type="range" min="-90" max="90" step="1" class="range range-sm flex-1">
              <input v-model.number="selected.value.y" type="number" class="input input-bordered input-sm w-20 font-mono text-sm">
              <span class="text-xs w-8">deg</span>
            </div>
          </div>

          <!-- matrix: 6 inputs -->
          <div v-else-if="selected.type === 'matrix'" class="grid grid-cols-3 gap-2">
            <div v-for="(label, idx) in ['a', 'b', 'c', 'd', 'e', 'f']" :key="label" class="flex items-center gap-1">
              <span class="text-xs w-4">{{ label }}</span>
              <input
                v-model.number="selected.value[idx]"
                type="number"
                step="0.1"
                class="input input-bordered input-sm w-full font-mono text-sm"
              >
            </div>
          </div>

          <!-- matrix3d: 16 inputs, collapsible -->
          <details v-else-if="selected.type === 'matrix3d'">
            <summary class="text-sm cursor-pointer">16 个数字(列主序)</summary>
            <div class="grid grid-cols-4 gap-2 mt-2">
              <input
                v-for="i in 16"
                :key="'m' + i"
                v-model.number="selected.value[i - 1]"
                type="number"
                step="0.1"
                class="input input-bordered input-xs w-full font-mono text-xs"
              >
            </div>
          </details>
        </div>
```

Then in the `<script setup>` block, replace the `paramComponent` / `paramComponentProps` / `updateSelected` stubs with helper predicates:

Find:
```js
// Per-type param form: render inline as a function returning vdom would be cleaner,
// but inline template branching is fine for one component.
const paramComponent = computed(() => 'param-form-' + selected.value.type.replace(/[A-Z]/g, m => '-' + m.toLowerCase()).replace('3d', '3d'))
const paramComponentProps = computed(() => ({ fn: selected.value }))

function updateSelected() { /* placeholder, replaced by inline template below */ }
```

Replace with:
```js
function isSingleLength(t) {
  return t === 'translateX' || t === 'translateY' || t === 'translateZ' || t === 'perspective'
}
function isSingleAngle(t) {
  return t === 'rotate' || t === 'rotateX' || t === 'rotateY' || t === 'rotateZ'
}
function isSingleScale(t) {
  return t === 'scaleX' || t === 'scaleY' || t === 'scaleZ'
}
```

- [ ] **Step 2: Add the 3D cube preview above the code area**

Find the right column block:

```vue
      <!-- Right: Code (preview + reverse-parse come later) -->
      <div class="flex flex-col gap-4">
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">CSS 代码</span></label>
```

Insert before the `<div class="form-control">` for code:

```vue
      <!-- Right: Preview + Code + Reverse-parse -->
      <div class="flex flex-col gap-4">
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">预览</span></label>
          <div
            class="rounded-lg border border-base-300 min-h-[280px] flex items-center justify-center overflow-hidden"
            :style="{ backgroundImage: checkerboard, perspective: state.perspective.n + 'px', perspectiveOrigin: 'center' }"
          >
            <div
              class="cube-scene"
              :style="{ transform: 'rotateX(-20deg) rotateY(-25deg)', transformStyle: 'preserve-3d' }"
            >
              <div
                class="cube"
                :style="{ transform: transformForPreview, transformOrigin: originForPreview, transformStyle: 'preserve-3d' }"
              >
                <div class="face face-front"></div>
                <div class="face face-back"></div>
                <div class="face face-right"></div>
                <div class="face face-left"></div>
                <div class="face face-top"></div>
                <div class="face face-bottom"></div>
              </div>
            </div>
          </div>
        </div>
```

Then add the imports + computed properties. In the `<script setup>` block, find:

```js
const cssCode = computed(() => stateToCss({ ...state, functions: state.functions }))
```

Add right after it:

```js
const transformForPreview = computed(() =>
  state.functions.map(functionToCss).join(' ')
)
const originForPreview = computed(() =>
  `${state.origin.x.n}${state.origin.x.unit} ${state.origin.y.n}${state.origin.y.unit} ${state.origin.z.n}${state.origin.z.unit}`
)

const checkerboard = `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="10" height="10" fill="%23f0f0f0"/><rect x="10" y="10" width="10" height="10" fill="%23f0f0f0"/><rect x="10" width="10" height="10" fill="%23e0e0e0"/><rect y="10" width="10" height="10" fill="%23e0e0e0"/></svg>')`
```

Finally, add the cube CSS. Append at the very end of the file (after `</script>`):

```vue
<style scoped>
.cube-scene {
  width: 120px;
  height: 120px;
  position: relative;
}
.cube {
  width: 120px;
  height: 120px;
  position: relative;
  transform-style: preserve-3d;
}
.face {
  position: absolute;
  width: 120px;
  height: 120px;
  border: 2px solid rgba(0, 0, 0, 0.3);
  opacity: 0.7;
}
.face-front  { background: #f87171; transform: translateZ(60px); }
.face-back   { background: #60a5fa; transform: translateZ(-60px) rotateY(180deg); }
.face-right  { background: #34d399; transform: translateX(60px) rotateY(90deg); }
.face-left   { background: #fbbf24; transform: translateX(-60px) rotateY(-90deg); }
.face-top    { background: #a78bfa; transform: translateY(-60px) rotateX(90deg); }
.face-bottom { background: #f472b6; transform: translateY(60px) rotateX(-90deg); }
</style>
```

- [ ] **Step 3: Smoke-test the preview**

Run: `cd E:/githome-windows/tools && npm run dev`
Open: `http://localhost:5173/transform`
Expected: cube visible with red/blue/green faces; selecting `rotate(15deg)` and bumping the slider rotates the cube; changing the empty origin shifts pivot.

- [ ] **Step 4: Verify lint passes**

Run: `cd E:/githome-windows/tools && npm run lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git -C E:/githome-windows/tools add src/tools/transform/Transform.vue
git -C E:/githome-windows/tools commit -m "feat(transform): add per-type param form and 3D cube preview"
```

---

## Task 10: Reverse-parse textarea + warnings display

**Files:**
- Modify: `src/tools/transform/Transform.vue`

Wire `parseTransform` to a `<textarea>` + Apply button. Show warnings (matrix3d partial extraction etc.) and errors (line-numbered) inline.

- [ ] **Step 1: Add the reverse-parse UI under the code area**

Find the right column block. After the code area's `</div>` (closing `form-control`), append:

```vue
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">反解析:粘贴 transform 串 → 回填表单</span></label>
          <textarea
            v-model="rawInput"
            class="textarea textarea-bordered font-mono text-sm h-28"
            placeholder="transform: translateX(10px) rotate(45deg);&#10;transform-origin: 50% 50% 0px;&#10;perspective: 800px;"
          ></textarea>
          <div class="flex items-center gap-2 mt-2">
            <button class="btn btn-primary btn-sm" @click="applyParse">应用</button>
            <button class="btn btn-ghost btn-sm" @click="rawInput = ''; parseError = ''; parseWarnings = []">清空</button>
          </div>
          <div v-if="parseError" class="text-error text-sm mt-2 whitespace-pre-wrap">{{ parseError }}</div>
          <div v-if="parseWarnings.length > 0" class="text-warning text-sm mt-2 whitespace-pre-wrap">
            <div v-for="(w, i) in parseWarnings" :key="i">⚠ {{ w }}</div>
          </div>
        </div>
```

- [ ] **Step 2: Add the apply logic to script setup**

In the `<script setup>` block, find:

```js
async function copyCode() {
  try {
    await navigator.clipboard.writeText(cssCode.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 1500)
  } catch { /* clipboard not available */ }
}
```

Add right after it:

```js
const rawInput = ref('')
const parseError = ref('')
const parseWarnings = ref([])

function applyParse() {
  if (rawInput.value.trim() === '') return
  const r = parseTransform(rawInput.value)
  if (!r.ok) {
    parseError.value = r.errors.map(e => `第 ${e.line} 行: ${e.message}`).join('\n')
    parseWarnings.value = []
    return
  }
  parseError.value = ''
  parseWarnings.value = r.warnings || []
  // Replace state
  state.functions.splice(0, state.functions.length, ...r.state.functions)
  state.origin.x = r.state.origin.x
  state.origin.y = r.state.origin.y
  state.origin.z = r.state.origin.z
  state.perspective.n = r.state.perspective.n
  state.perspective.unit = r.state.perspective.unit
  selectedIndex.value = state.functions.length > 0 ? 0 : 0
  rawInput.value = ''
}
```

- [ ] **Step 3: Smoke-test the reverse parse**

Run: `cd E:/githome-windows/tools && npm run dev`
Open: `http://localhost:5173/transform`

Test cases:
1. Paste `translateX(10px) rotate(45deg)` → Apply → function list shows 2 items, code area shows both.
2. Paste `matrix(1, 0, 0, 1, 10, 20)` → Apply → list shows `translate(10px, 20px) rotate(0deg) scale(1, 1) skew(0deg, 0deg)` (4 decomposed items).
3. Paste `matrix3d(1,0,0,0, 0,1,0,0, 0,0,1,0, 5,10,15,1)` → Apply → list shows translate3d + 3 rotates; warning shows "matrix3d 仅提取平移与旋转...".
4. Paste `foo(10px)` → Apply → red error "第 1 行: 未知函数 foo"; existing state untouched.
5. Paste multi-line `transform: rotate(45deg);\ntransform-origin: 0% 0% 0px;\nperspective: 1200px;` → Apply → all three fields update.

- [ ] **Step 4: Verify lint passes**

Run: `cd E:/githome-windows/tools && npm run lint`
Expected: PASS.

- [ ] **Step 5: Run all tests**

Run: `cd E:/githome-windows/tools && npm run test`
Expected: PASS, all transform tests + existing tests green.

- [ ] **Step 6: Commit**

```bash
git -C E:/githome-windows/tools add src/tools/transform/Transform.vue
git -C E:/githome-windows/tools commit -m "feat(transform): add reverse-parse textarea with warnings/errors"
```

---

