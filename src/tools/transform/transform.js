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

// Partial decomposition of a CSS matrix3d (column-major, 16 elements) into
// [translate3d, rotateZ, rotateY, rotateX]. Only translation and rotation are
// extracted; scale and skew are dropped silently. Rotation is recovered via
// Shepperd's method (matrix → quaternion → ZYX Euler).
export function extractMatrix3D(m) {
  // m is column-major 4x4. Translation = m[12], m[13], m[14].
  const tx = m[12], ty = m[13], tz = m[14]
  // 3x3 rotation part: row-major access R[row][col] = m[col * 4 + row].
  // Scale is dropped by normalizing each column to unit length before the
  // quaternion extraction (column-major → columns are the images of the basis
  // vectors, so their norms are the per-axis scale factors).
  const c0x = m[0], c0y = m[1], c0z = m[2]
  const c1x = m[4], c1y = m[5], c1z = m[6]
  const c2x = m[8], c2y = m[9], c2z = m[10]
  const n0 = Math.sqrt(c0x * c0x + c0y * c0y + c0z * c0z) || 1
  const n1 = Math.sqrt(c1x * c1x + c1y * c1y + c1z * c1z) || 1
  const n2 = Math.sqrt(c2x * c2x + c2y * c2y + c2z * c2z) || 1
  const R = [
    [c0x / n0, c1x / n1, c2x / n2],
    [c0y / n0, c1y / n1, c2y / n2],
    [c0z / n0, c1z / n1, c2z / n2],
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
