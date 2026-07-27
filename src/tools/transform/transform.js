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
