/**
 * 图片占位图生成纯函数:输出 SVG 字符串与 Data URI。
 */

/**
 * XML 文本转义。
 * @param {string} s
 * @returns {string}
 */
export function xmlEscape(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

/**
 * 把任意颜色值规整为 CSS 可用形式;非法输入回退为 fallback。
 * @param {string} color 用户输入的颜色(#abc / #aabbcc / red / rgb(...))
 * @param {string} fallback 非法时的回退值
 * @returns {string}
 */
export function normalizeColor(color, fallback) {
  const s = String(color ?? '').trim()
  if (/^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(s)) return s
  if (/^(rgb|rgba|hsl|hsla)\(/i.test(s) && s.endsWith(')')) return s
  const named = new Set([
    'transparent', 'currentcolor', 'white', 'black', 'red', 'green', 'blue',
    'gray', 'grey', 'silver', 'orange', 'yellow', 'purple', 'pink', 'navy',
    'teal', 'aqua', 'cyan', 'fuchsia', 'magenta', 'lime', 'maroon', 'olive',
    'tomato', 'coral', 'gold', 'indigo', 'violet', 'brown', 'beige', 'ivory',
    'khaki', 'lavender', 'salmon', 'tan', 'plum', 'orchid', 'snow', 'azure',
  ])
  if (named.has(s.toLowerCase())) return s
  return fallback
}

/**
 * 计算占位文字:未提供时使用 "宽 × 高"。
 * @param {string} text 自定义文字(可含 {w} {h} 占位符)
 * @param {number} width
 * @param {number} height
 * @returns {string}
 */
export function displayText(text, width, height) {
  const t = String(text ?? '').trim()
  if (t === '') return `${width} × ${height}`
  return t.replaceAll('{w}', String(width)).replaceAll('{h}', String(height))
}

/**
 * 计算文字字号:随容器尺寸缩放,按最长行限制,避免溢出。
 * 经验规则与 placehold.co 类似:基础字号为短边的 0.2 倍,上限 120。
 * @param {string} text
 * @param {number} width
 * @param {number} height
 * @returns {number}
 */
export function fontSizeFor(text, width, height) {
  const lines = String(text ?? '').split('\n')
  const longest = Math.max(...lines.map(l => l.length), 1)
  const byShortSide = Math.min(width, height) * 0.2
  const byLineLength = Math.min(width, height) * 1.6 / longest
  return Math.max(8, Math.floor(Math.min(byShortSide, byLineLength, 120)))
}

/**
 * 生成占位图 SVG 字符串。
 * @param {{
 *   width: number,
 *   height: number,
 *   background: string,
 *   foreground: string,
 *   text?: string,
 *   font?: string,
 * }} opts
 * @returns {string}
 */
export function buildSvg({ width, height, background, foreground, text, font }) {
  const lines = displayText(text, width, height).split('\n')
  const fontSize = fontSizeFor(lines.join('\n'), width, height)
  const lineHeight = fontSize * 1.25
  const startY = height / 2 - ((lines.length - 1) * lineHeight) / 2
  const fontFamily = font || 'system-ui, -apple-system, sans-serif'
  const tspans = lines
    .map((l, i) => `    <tspan x="50%" y="${(startY + i * lineHeight).toFixed(1)}">${xmlEscape(l)}</tspan>`)
    .join('\n')
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `  <rect width="100%" height="100%" fill="${xmlEscape(background)}"/>`,
    `  <text fill="${xmlEscape(foreground)}" font-family="${xmlEscape(fontFamily)}" font-size="${fontSize}" text-anchor="middle" dominant-baseline="central">`,
    tspans,
    '  </text>',
    '</svg>',
    '',
  ].join('\n')
}

/**
 * SVG 字符串 → Data URI(encodeURIComponent 风格,可直接用于 img src)。
 * @param {string} svg
 * @returns {string}
 */
export function svgToDataUri(svg) {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

/**
 * SVG 字符串 → Base64 Data URI。
 * @param {string} svg
 * @returns {string}
 */
export function svgToBase64Uri(svg) {
  // TextEncoder 输出 UTF-8 字节流,逐字节映射到 Latin1 字符串供 btoa 使用
  const bytes = new TextEncoder().encode(String(svg))
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return `data:image/svg+xml;base64,${btoa(binary)}`
}
