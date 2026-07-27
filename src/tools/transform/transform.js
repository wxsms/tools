// Length parsing for translate family + perspective
const LENGTH_UNITS = ['px', '%', 'em', 'rem']

export function parseLength(s) {
  // Capture a number + any trailing unit token (alpha or %). Validate the unit
  // against LENGTH_UNITS below so unknown units throw 未知单位 (rather than
  // falling through to 无法解析数值, which the regex-only form would do).
  const m = String(s).trim().match(/^(-?\d*\.?\d+)\s*([a-zA-Z%]*)$/)
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

// Radians → degrees, normalized to (-180, 180]
function radToDegNormalized(rad) {
  let deg = (rad * 180) / Math.PI
  while (deg > 180) deg -= 360
  while (deg <= -180) deg += 360
  return deg
}

// QR decomposition of a 2D matrix() into [translate, rotate, scale, skew].
// Input: m = [a, b, c, d, e, f] (CSS matrix column-major: [[a, c, e], [b, d, f]]).
// Throws when the linear part is singular (sx ≈ 0).
export function decomposeMatrix2D(m) {
  const [a, b, c, d, e, f] = m
  const tx = e
  const ty = f
  // 2x2 linear part [[a, c], [b, d]]
  const sx = Math.sqrt(a * a + b * b)
  if (sx < 1e-10) throw new Error('matrix 含 0 缩放,无法分解')
  const theta = Math.atan2(b, a)  // radians
  const cos = Math.cos(theta)
  const sin = Math.sin(theta)
  // Entries of R(-θ) · M: [[sx, cy], [0, sy]]
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
