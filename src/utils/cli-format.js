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
            // 注意:不把 \<newline> 计入 raw(等价于空白分隔)
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

/**
 * 多行 → 单行:解析 tokens,用单空格重新拼接(原引号保留)。
 * @param {string} input
 * @returns {string}
 */
export function toSingleLine(input) {
  const tokens = tokenize(input)
  return tokens.map(t => t.raw).join(' ')
}

/**
 * 单行 → 多行:解析 tokens,按 flag+值 启发式分组,生成多行字符串。
 *
 * 分组规则:
 * - 第 0 个 token(命令)单独一行,无缩进无续行符
 * - 后续 token:
 *   - 若以 - 开头,视为 flag;若下一个 token 不以 - 开头,则两 token 同行,否则单独成行
 *   - 不以 - 开头(位置参数)单独成行
 * - 每行(除命令行)前加 indent 个空格
 * - 若 continuation=true,每行(除最后一行)末尾追加 ' \'
 *
 * @param {string} input
 * @param {{indent?: number, continuation?: boolean}} [opts]
 * @returns {string}
 */
export function toMultiLine(input, opts = {}) {
  const indent = opts.indent ?? 2
  const continuation = opts.continuation ?? true
  const tokens = tokenize(input)
  if (tokens.length === 0) return ''
  if (tokens.length === 1) return tokens[0].raw

  const pad = ' '.repeat(indent)
  const lines = [tokens[0].raw]
  let i = 1
  while (i < tokens.length) {
    const t = tokens[i].raw
    if (t.startsWith('-')) {
      const next = tokens[i + 1]?.raw
      if (next !== undefined && !next.startsWith('-')) {
        lines.push(pad + t + ' ' + next)
        i += 2
      } else {
        lines.push(pad + t)
        i += 1
      }
    } else {
      lines.push(pad + t)
      i += 1
    }
  }

  if (!continuation) {
    return lines.join('\n')
  }
  return lines.map((ln, idx) => (idx < lines.length - 1 ? ln + ' \\' : ln)).join('\n')
}
