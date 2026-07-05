export const IMAGE_MIMES = ['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml', 'image/webp', 'image/bmp', 'image/x-icon']

export function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

export function mimeToExt(mime) {
  const map = {
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/gif': '.gif',
    'image/svg+xml': '.svg',
    'image/webp': '.webp',
    'image/bmp': '.bmp',
    'image/x-icon': '.ico',
    'application/pdf': '.pdf',
    'text/plain': '.txt',
    'application/json': '.json',
  }
  return map[mime] || '.bin'
}

export function parseDataUrl(raw) {
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (trimmed.startsWith('data:')) {
    const match = trimmed.match(/^data:([^;]+);base64,(.+)$/)
    if (!match) return null
    return { base64: match[2], mime: match[1] }
  }
  return { base64: trimmed, mime: 'application/octet-stream' }
}

export function buildImageSrc(raw, mime) {
  if (!raw) return ''
  if (raw.startsWith('data:image/')) return raw
  if (IMAGE_MIMES.includes(mime)) {
    return `data:${mime};base64,${raw}`
  }
  return ''
}
