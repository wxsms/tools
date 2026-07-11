// 纯函数模块：类型推断、列统计、排序、筛选、导出。
// 解析不在此处，由组件调用 papaparse。

export const COLUMN_TYPES = ['integer', 'float', 'boolean', 'date', 'string']

const INT_RE = /^-?\d+$/
const FLOAT_RE = /^-?\d+(\.\d+)?$/
const BOOL_RE = /^(true|false)$/i

function isDateLike(s) {
  // 拒绝纯数字（Date.parse 会把纯数字当作时间戳）
  if (INT_RE.test(s) || FLOAT_RE.test(s)) return false
  const t = Date.parse(s)
  return !Number.isNaN(t)
}

export function inferColumnType(values) {
  // 仅取前 100 个非空值
  const sample = []
  for (const v of values) {
    if (v === '' || v == null) continue
    sample.push(String(v))
    if (sample.length >= 100) break
  }
  if (sample.length === 0) return 'string'

  if (sample.every(v => INT_RE.test(v))) return 'integer'
  if (sample.every(v => FLOAT_RE.test(v))) return 'float'
  if (sample.every(v => BOOL_RE.test(v))) return 'boolean'
  if (sample.every(v => isDateLike(v))) return 'date'
  return 'string'
}

function toYmd(t) {
  const d = new Date(t)
  if (Number.isNaN(d.getTime())) return null
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function columnStats(values, type) {
  const nonEmpty = values.filter(v => v !== '' && v != null)
  if (nonEmpty.length === 0) return {}

  if (type === 'integer' || type === 'float') {
    const nums = nonEmpty.map(Number)
    const min = Math.min(...nums)
    const max = Math.max(...nums)
    const avg = Number((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2))
    return { min, max, avg }
  }
  if (type === 'date') {
    // 不可解析的值视为最小 (-Infinity)，选中时回退为原始字符串。
    const stamped = nonEmpty.map(v => {
      const t = Date.parse(v)
      return { raw: v, t: Number.isNaN(t) ? -Infinity : t }
    })
    const pickMin = stamped.reduce((a, b) => a.t <= b.t ? a : b)
    const pickMax = stamped.reduce((a, b) => a.t >= b.t ? a : b)
    return {
      min: pickMin.t === -Infinity ? pickMin.raw : (toYmd(pickMin.t) ?? pickMin.raw),
      max: pickMax.t === -Infinity ? pickMax.raw : (toYmd(pickMax.t) ?? pickMax.raw),
    }
  }
  if (type === 'boolean') {
    let t = 0, f = 0
    for (const v of nonEmpty) {
      if (/^true$/i.test(v)) t++
      else if (/^false$/i.test(v)) f++
    }
    return { true: t, false: f }
  }
  // string
  const unique = new Set(nonEmpty.map(String))
  if (unique.size > 100) return { unique: '100+' }
  return { unique: unique.size }
}

function compareValues(a, b, type) {
  if (type === 'integer' || type === 'float') {
    return Number(a) - Number(b)
  }
  if (type === 'date') {
    return Date.parse(a) - Date.parse(b)
  }
  if (type === 'boolean') {
    // false < true
    const av = /^true$/i.test(a) ? 1 : 0
    const bv = /^true$/i.test(b) ? 1 : 0
    return av - bv
  }
  return String(a).localeCompare(String(b))
}

export function sortRows(rows, columnIndex, direction, types) {
  if (direction !== 'asc' && direction !== 'desc') return rows
  const type = types ? types[columnIndex] : 'string'
  const sign = direction === 'asc' ? 1 : -1
  const copy = [...rows]
  copy.sort((a, b) => {
    const aEmpty = a[columnIndex] === '' || a[columnIndex] == null
    const bEmpty = b[columnIndex] === '' || b[columnIndex] == null
    if (aEmpty && bEmpty) return 0
    if (aEmpty) return 1   // 空值始终排末尾，不受 sign 影响
    if (bEmpty) return -1
    return sign * compareValues(a[columnIndex], b[columnIndex], type)
  })
  return copy
}

export function filterRows(rows, _filters) {
  return rows
}

export function toJson(_rows, _headers) {
  return []
}

export function toMarkdown(_rows, _headers) {
  return ''
}
