/**
 * 把 Unix shell 风格的命令字符串解析成 token 数组。
 * 每个 token 形如 { raw: string },raw 是原样写法(含引号、转义)。
 * 支持:
 * - 单引号 '...'(内容原样,不可转义)
 * - 双引号 "..."(反斜杠仅转义 \" \\ \$ `)
 * - 反斜杠转义(非引号内):\X 当字面 X
 * - 行末单独的 \ 续行:吃掉换行与下一行前导空白
 * - 等号不拆分:--output=/path 是单个 token
 *
 * @param {string} input
 * @returns {Array<{raw: string}>}
 */
export function tokenize(input) {
  const tokens = []
  let i = 0
  const s = input ?? ''
  const n = s.length

  while (i < n) {
    // 跳过前导空白
    while (i < n && /\s/.test(s[i])) i++
    if (i >= n) break

    let raw = ''
    while (i < n && !/\s/.test(s[i])) {
      const c = s[i]
      if (c === '\\') {
        if (i + 1 < n) {
          if (s[i + 1] === '\n') {
            // 续行:吃掉 \ 换行,以及下一行前导空白,继续累积当前 token
            raw += '\\\n'
            i += 2
            while (i < n && /[ \t]/.test(s[i])) i++
            continue
          }
          raw += s[i] + s[i + 1]
          i += 2
        } else {
          raw += c
          i++
        }
      } else if (c === "'") {
        raw += "'"
        i++
        while (i < n && s[i] !== "'") {
          raw += s[i]
          i++
        }
        if (i < n) {
          raw += "'"
          i++
        } else {
          throw new Error("引号未闭合:缺少 '")
        }
      } else if (c === '"') {
        raw += '"'
        i++
        while (i < n && s[i] !== '"') {
          if (s[i] === '\\' && i + 1 < n) {
            raw += s[i] + s[i + 1]
            i += 2
          } else {
            raw += s[i]
            i++
          }
        }
        if (i < n) {
          raw += '"'
          i++
        } else {
          throw new Error('引号未闭合:缺少 "')
        }
      } else {
        raw += c
        i++
      }
    }
    if (raw) tokens.push({ raw })
  }
  return tokens
}
