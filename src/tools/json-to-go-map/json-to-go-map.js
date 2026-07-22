/**
 * 把 JSON 字符串转换为 Go `map[string]interface{}` 字面量表达式。
 *
 * @param {string} jsonString
 * @param {{ useAny?: boolean }} [options]
 * @returns {{ ok: true, code: string } | { ok: false, error: string }}
 *
 * 行为：
 * - 空字符串 / 全空白输入 → `{ ok: true, code: '' }`
 * - JSON parse 失败 → `{ ok: false, error: 'JSON 解析失败：' + e.message }`
 * - 对象 → `map[string]<T>{ "key": <value>, ... }`（含尾逗号、tab 缩进）
 * - 数组 → `[]<T>{ <item>, ... }`
 * - null → `nil`
 * - 标量 → `JSON.stringify(value)`；顶层标量原样输出不包裹
 * - `<T>` 由 useAny 在 `interface{}` / `any` 之间切换，默认 `interface{}`
 */
export function jsonToGoMap(jsonString, { useAny = false } = {}) {
  if (!jsonString || jsonString.trim() === '') {
    return { ok: true, code: '' }
  }

  let parsed
  try {
    parsed = JSON.parse(jsonString)
  } catch (e) {
    return { ok: false, error: 'JSON 解析失败：' + e.message }
  }

  const typeToken = useAny ? 'any' : 'interface{}'
  return { ok: true, code: convert(parsed, 1, typeToken) }
}

function getTabs(n) {
  let s = ''
  for (let i = 0; i < n; i++) s += '\t'
  return s
}

function convert(value, tabLevel, typeToken) {
  if (value === null || value === undefined) return 'nil'

  if (Array.isArray(value)) {
    if (value.length === 0) return `[]${typeToken}{}`
    const items = value
      .map(v => `${getTabs(tabLevel)}${convert(v, tabLevel + 1, typeToken)},`)
      .join('\n')
    return `[]${typeToken}{\n${items}\n${getTabs(tabLevel - 1)}}`
  }

  if (typeof value === 'object') {
    const keys = Object.keys(value)
    if (keys.length === 0) return `map[string]${typeToken}{}`
    const entries = keys
      .map(k => `${getTabs(tabLevel)}${JSON.stringify(k)}: ${convert(value[k], tabLevel + 1, typeToken)},`)
      .join('\n')
    return `map[string]${typeToken}{\n${entries}\n${getTabs(tabLevel - 1)}}`
  }

  return JSON.stringify(value)
}
