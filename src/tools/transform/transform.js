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
    // matrix / matrix3d are handled by parseTokenOrDecompose before this
    // function is reached, so they never enter this switch.
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
    } catch {
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
    let trimmed = line.trim()
    if (trimmed === '') return
    // Strip a single trailing ';' (CSS statement terminator).
    if (trimmed.endsWith(';')) trimmed = trimmed.slice(0, -1).trimEnd()
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
