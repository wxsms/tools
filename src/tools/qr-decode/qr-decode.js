/**
 * Parse a WIFI:... string into fields.
 * Format: WIFI:T:<type>;S:<ssid>;P:<password>;H:<hidden>;;
 * @param {string} text
 * @returns {{ type: 'wifi', title: string, fields: Array }}
 */
function parseWifi(text) {
  const body = text.slice(text.indexOf(':') + 1)
  // Protect escaped separators: replace \\; \\: \\, \\\\ with placeholders
  // so they are not treated as field/segment delimiters, then split on raw ; and :
  const PLACEHOLDERS = ['\x00', '\x01', '\x02', '\x03']
  const ESCAPES = [';', ':', ',', '\\']
  let protectedBody = body
  for (let i = 0; i < ESCAPES.length; i++) {
    protectedBody = protectedBody.replace(
      new RegExp('\\\\' + ESCAPES[i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
      PLACEHOLDERS[i],
    )
  }
  const parts = protectedBody.split(';')
  const map = {}
  for (const part of parts) {
    const idx = part.indexOf(':')
    if (idx === -1) continue
    const key = part.slice(0, idx).toUpperCase()
    // Restore placeholders in the value
    let val = part.slice(idx + 1)
    for (let i = 0; i < ESCAPES.length; i++) {
      val = val.split(PLACEHOLDERS[i]).join(ESCAPES[i])
    }
    map[key] = val
  }
  const encType = (map.T || 'nopass').toUpperCase()
  const encLabel = encType === 'NOPASS' ? '无密码' : encType
  const fields = [
    { label: 'SSID', value: map.S || '', action: 'copy' },
    { label: '密码', value: map.P || '', action: 'copy' },
    { label: '加密类型', value: encLabel },
  ]
  return { type: 'wifi', title: 'WiFi', fields }
}

/**
 * Parse a vCard (BEGIN:VCARD ... END:VCARD) into common fields.
 * Only extracts FN/N, TEL, EMAIL, ORG, URL, ADR; ignores the rest.
 * @param {string} text
 * @returns {{ type: 'vcard', title: string, fields: Array }}
 */
function parseVCard(text) {
  const lines = text.split(/\r?\n/)
  const fields = []
  const seen = new Set()
  const push = (label, value) => {
    if (!value || seen.has(label)) return
    seen.add(label)
    fields.push({ label, value, action: 'copy' })
  }
  for (const line of lines) {
    const idx = line.indexOf(':')
    if (idx === -1) continue
    const key = line.slice(0, idx).toUpperCase()
    const val = line.slice(idx + 1)
    if (key.startsWith('FN')) push('姓名', val)
    else if (key.startsWith('N') && !key.startsWith('NICKNAME')) {
      if (!seen.has('姓名')) push('姓名', val.split(';').filter(Boolean).join(' '))
    }
    else if (key.startsWith('TEL')) push('电话', val)
    else if (key.startsWith('EMAIL')) push('邮箱', val)
    else if (key.startsWith('ORG')) push('组织', val)
    else if (key.startsWith('URL')) push('网址', val)
    else if (key.startsWith('ADR')) push('地址', val.split(';').filter(Boolean).join(' '))
  }
  return { type: 'vcard', title: 'vCard 名片', fields }
}

/**
 * Parse mailto: scheme.
 * @param {string} text
 */
function parseMailto(text) {
  const rest = text.slice(text.indexOf(':') + 1)
  const [addr, query] = rest.split('?')
  const fields = [{ label: '邮箱', value: decodeURIComponent(addr), action: 'link' }]
  if (query) {
    const params = new URLSearchParams(query)
    const subject = params.get('subject')
    const body = params.get('body')
    if (subject) fields.push({ label: '主题', value: subject })
    if (body) fields.push({ label: '正文', value: body })
  }
  return { type: 'mailto', title: '邮件', fields }
}

/**
 * Parse sms: / smsto: scheme.
 * @param {string} text
 */
function parseSms(text) {
  const rest = text.slice(text.indexOf(':') + 1)
  const [number, query] = rest.split('?')
  const fields = [{ label: '号码', value: number, action: 'link' }]
  if (query) {
    const body = new URLSearchParams(query).get('body')
    if (body) fields.push({ label: '内容', value: body })
  }
  return { type: 'sms', title: '短信', fields }
}

/**
 * Parse geo: scheme.
 * @param {string} text
 */
function parseGeo(text) {
  const rest = text.slice(text.indexOf(':') + 1)
  const [lat, lon] = rest.split(',')
  const fields = [
    { label: '纬度', value: lat },
    { label: '经度', value: lon },
    { label: '地图', value: `https://maps.google.com/?q=${lat},${lon}`, action: 'link' },
  ]
  return { type: 'geo', title: '地理位置', fields }
}

/**
 * Detect the content type of a decoded QR text and return structured fields.
 * @param {string} text
 * @returns {{ type: string, title: string, fields: Array<{ label: string, value: string, action?: string }> }}
 */
export function detectType(text) {
  const trimmed = (text || '').trim()
  const lower = trimmed.toLowerCase()

  if (lower.startsWith('wifi:')) return parseWifi(trimmed)
  if (lower.startsWith('begin:vcard')) return parseVCard(trimmed)
  if (lower.startsWith('mailto:')) return parseMailto(trimmed)
  if (lower.startsWith('tel:')) {
    return { type: 'tel', title: '电话', fields: [{ label: '号码', value: trimmed.slice(4), action: 'link' }] }
  }
  if (lower.startsWith('sms:') || lower.startsWith('smsto:')) return parseSms(trimmed)
  if (lower.startsWith('geo:')) return parseGeo(trimmed)
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) {
    return { type: 'url', title: 'URL', fields: [{ label: '链接', value: trimmed, action: 'link' }] }
  }
  return { type: 'text', title: '纯文本', fields: [{ label: '内容', value: trimmed, action: 'copy' }] }
}
