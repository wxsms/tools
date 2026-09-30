/**
 * cURL 命令生成纯函数。
 */

/**
 * Unix shell 风格引用:用单引号包裹,内部单引号写成 '\''。
 * 空字符串返回 ''。
 * @param {string} s
 * @returns {string}
 */
export function shellQuote(s) {
  return `'${String(s ?? '').replace(/'/g, `'\\''`)}'`
}

/**
 * raw 模式下,按语言推断 Content-Type(用户未手写时追加)。
 */
const RAW_CONTENT_TYPES = {
  json: 'application/json',
  xml: 'application/xml',
  html: 'text/html',
  javascript: 'application/javascript',
  text: 'text/plain',
}

export function rawContentType(lang) {
  return RAW_CONTENT_TYPES[lang] || 'text/plain'
}

/**
 * 行是否参与命令:enabled !== false 且 key 非空。
 * @param {{key: string, value?: string, enabled?: boolean}} row
 */
function isActive(row) {
  return row.enabled !== false && String(row.key || '').trim() !== ''
}

/**
 * 生成 cURL 命令字符串(单行)。
 * @param {{
 *   method: string,
 *   url: string,
 *   headers: Array<{key: string, value: string, enabled?: boolean}>,
 *   queryParams: Array<{key: string, value: string, enabled?: boolean}>,
 *   bodyMode: 'none' | 'form-data' | 'urlencoded' | 'raw',
 *   rawLang: 'text' | 'json' | 'xml' | 'html' | 'javascript',
 *   rawBody: string,
 *   formPairs: Array<{key: string, value: string, enabled?: boolean}>,
 *   formEncoding: 'form-data' | 'urlencoded',
 * }} req
 * @returns {string}
 */
export function buildCurl(req) {
  const parts = ['curl']

  if (req.method && req.method !== 'GET') parts.push(`-X ${req.method}`)

  let url = (req.url || '').trim()
  const qs = (req.queryParams || [])
    .filter(isActive)
    .map(p => `${encodeURIComponent(p.key.trim())}=${encodeURIComponent(p.value ?? '')}`)
  if (qs.length > 0) {
    url += (url.includes('?') ? '&' : '?') + qs.join('&')
  }
  if (url) parts.push(shellQuote(url))

  for (const h of req.headers || []) {
    if (!isActive(h)) continue
    const key = h.key.trim()
    const value = (h.value ?? '').trim()
    parts.push(value === '' ? `-H ${shellQuote(key)}` : `-H ${shellQuote(`${key}: ${value}`)}`)
  }

  if (req.bodyMode === 'form-data' && req.formEncoding === 'form-data') {
    for (const p of req.formPairs || []) {
      if (!isActive(p)) continue
      parts.push(`-F ${shellQuote(`${p.key.trim()}=${p.value ?? ''}`)}`)
    }
  } else if (req.bodyMode === 'urlencoded' && req.formEncoding === 'urlencoded') {
    for (const p of req.formPairs || []) {
      if (!isActive(p)) continue
      parts.push(`--data-urlencode ${shellQuote(`${p.key.trim()}=${p.value ?? ''}`)}`)
    }
  } else if (req.bodyMode === 'raw') {
    const lang = req.rawLang || 'text'
    if (lang === 'json') {
      const hasCt = (req.headers || []).some(h =>
        isActive(h) && h.key.trim().toLowerCase() === 'content-type')
      if (!hasCt) parts.push(`-H ${shellQuote('Content-Type: application/json')}`)
    }
    parts.push(`--data-raw ${shellQuote(req.rawBody ?? '')}`)
  }

  return parts.join(' ')
}

/**
 * 拆分 URL 的路径部分与 query 部分,用于表单初始化。
 * @param {string} url
 * @returns {{ base: string, queryParams: Array<{key: string, value: string}> }}
 */
export function splitUrlQuery(url) {
  const s = (url || '').trim()
  const qIndex = s.indexOf('?')
  if (qIndex === -1) return { base: s, queryParams: [] }
  const base = s.slice(0, qIndex)
  const query = s.slice(qIndex + 1)
  const queryParams = query
    .split('&')
    .filter(Boolean)
    .map(pair => {
      const eq = pair.indexOf('=')
      return eq === -1
        ? { key: decodeURIComponent(pair), value: '' }
        : { key: decodeURIComponent(pair.slice(0, eq)), value: decodeURIComponent(pair.slice(eq + 1)) }
    })
  return { base, queryParams }
}
