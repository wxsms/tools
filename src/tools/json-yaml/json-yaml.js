import { dump, load } from 'js-yaml'

/**
 * JSON 字符串 → YAML 字符串
 * @param {string} jsonStr
 * @returns {string}
 * @throws SyntaxError(JSON 解析失败) / YAMLException(序列化失败)
 */
export function jsonToYaml(jsonStr) {
  if (!jsonStr.trim()) return ''
  const obj = JSON.parse(jsonStr)
  return dump(obj, {
    indent: 2,
    lineWidth: 120,
    noRefs: true,
    quotingType: '"',
    forceQuotes: false,
  })
}

/**
 * YAML 字符串 → JSON 字符串(美化,2 空格缩进)
 * @param {string} yamlStr
 * @returns {string}
 * @throws YAMLException(语法错误)
 */
export function yamlToJson(yamlStr) {
  if (!yamlStr.trim()) return ''
  const obj = load(yamlStr)
  if (obj === undefined) return ''
  return JSON.stringify(obj, null, 2)
}
