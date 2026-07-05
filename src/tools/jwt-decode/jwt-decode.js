export function decodeBase64url(str) {
  let s = str.replace(/-/g, '+').replace(/_/g, '/')
  const pad = s.length % 4
  if (pad) {
    s += '='.repeat(4 - pad)
  }
  return atob(s)
}

// atob 返回 binary string（每个字符一个字节）；JWT 的 header/payload 是 UTF-8 编码的
// JSON，需要把 binary string 当作 UTF-8 字节序列还原成字符串才能正确解析中文等字符。
function utf8Decode(binaryString) {
  return decodeURIComponent(escape(binaryString))
}

export function annotateTimeFields(obj) {
  const timeKeys = new Set(['exp', 'iat', 'nbf'])
  for (const key of Object.keys(obj)) {
    if (timeKeys.has(key) && typeof obj[key] === 'number' && obj[key] > 1000000000 && obj[key] < 9999999999) {
      const date = new Date(obj[key] * 1000)
      const y = date.getUTCFullYear()
      const m = String(date.getUTCMonth() + 1).padStart(2, '0')
      const d = String(date.getUTCDate()).padStart(2, '0')
      const h = String(date.getUTCHours()).padStart(2, '0')
      const min = String(date.getUTCMinutes()).padStart(2, '0')
      const sec = String(date.getUTCSeconds()).padStart(2, '0')
      obj[key] = `${obj[key]} // ${y}-${m}-${d} ${h}:${min}:${sec} UTC`
    }
  }
}

export function decodeJwt(token) {
  const empty = { header: null, payload: null, signature: null, error: '' }
  const trimmed = (token || '').trim()
  if (!trimmed) return empty

  const parts = trimmed.split('.')
  if (parts.length !== 3) {
    return { header: null, payload: null, signature: null, error: '无效的 JWT：必须由 3 个以 . 分隔的部分组成' }
  }

  let header
  let payload
  let signature

  // Header
  try {
    const decoded = utf8Decode(decodeBase64url(parts[0]))
    try {
      const obj = JSON.parse(decoded)
      annotateTimeFields(obj)
      header = JSON.stringify(obj, null, 2)
    } catch {
      header = decoded
    }
  } catch (e) {
    header = '[解码失败：' + e.message + ']'
  }

  // Payload
  try {
    const decoded = utf8Decode(decodeBase64url(parts[1]))
    try {
      const obj = JSON.parse(decoded)
      annotateTimeFields(obj)
      payload = JSON.stringify(obj, null, 2)
    } catch {
      payload = decoded
    }
  } catch (e) {
    payload = '[解码失败：' + e.message + ']'
  }

  // Signature
  try {
    const raw = decodeBase64url(parts[2])
    signature = Array.from(raw, c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('')
  } catch (e) {
    signature = '[解码失败：' + e.message + ']'
  }

  return { header, payload, signature, error: '' }
}
