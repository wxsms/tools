import { stringify, parse } from 'smol-toml'

/**
 * JSON 字符串 → TOML 字符串
 * @param {string} jsonStr
 * @returns {string}
 * @throws SyntaxError(JSON 解析失败) / Error(TOML 序列化失败,如 null 值或顶层非对象)
 */
export function jsonToToml(jsonStr) {
  if (!jsonStr.trim()) return ''
  const obj = JSON.parse(jsonStr)
  return stringify(obj)
}

/**
 * TOML 字符串 → JSON 字符串(美化,2 空格缩进)
 * @param {string} tomlStr
 * @returns {string}
 * @throws Error(语法错误)
 */
export function tomlToJson(tomlStr) {
  if (!tomlStr.trim()) return ''
  const obj = parse(tomlStr)
  return JSON.stringify(obj, null, 2)
}
