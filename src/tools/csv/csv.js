// 纯函数模块：类型推断、列统计、排序、筛选、导出。
// 解析不在此处，由组件调用 papaparse。

export const COLUMN_TYPES = ['integer', 'float', 'boolean', 'date', 'string']

export function inferColumnType(_values) {
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
