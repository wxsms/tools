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

export function columnStats(_values, _type) {
  return {}
}

export function sortRows(rows, _columnIndex, _direction) {
  return rows
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
