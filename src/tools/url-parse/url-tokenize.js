export const COMPONENT_COLORS = {
  protocol: 'text-blue-400',
  hostname: 'text-green-400',
  port: 'text-cyan-400',
  pathname: 'text-amber-400',
  search: 'text-rose-400',
  hash: 'text-violet-400',
}

/**
 * Tokenize a raw URL string into colored segments based on URL components.
 * Separators (://, :, ?, &) are emitted with default color so that
 * colored segments match the parsed values shown in the table.
 * Returns an array of { text, color } objects whose concatenated text equals `raw`.
 */
export function tokenizeUrl(raw, url) {
  if (!raw) return []

  const segments = []
  let pos = 0

  // 1. Protocol: only the scheme name (e.g. "https") is colored, "://" is default
  const protocolEnd = raw.indexOf('://')
  if (protocolEnd !== -1) {
    segments.push({ text: raw.slice(0, protocolEnd), color: COMPONENT_COLORS.protocol })
    segments.push({ text: '://', color: '' })
    pos = protocolEnd + 3
  }

  // 2. Hostname
  const hostnameEndMatch = raw.slice(pos).match(/^[^:/?#]+/)
  if (hostnameEndMatch) {
    segments.push({ text: hostnameEndMatch[0], color: COMPONENT_COLORS.hostname })
    pos += hostnameEndMatch[0].length
  }

  // 3. Port: color only the number, ":" is default
  if (url.port) {
    segments.push({ text: ':', color: '' })
    segments.push({ text: url.port, color: COMPONENT_COLORS.port })
    pos += 1 + url.port.length
  }

  // 4. Find ? and # positions
  const searchStart = raw.indexOf('?', pos)
  const hashStart = raw.indexOf('#', searchStart !== -1 ? searchStart + 1 : pos)

  // Pathname
  const pathEnd = searchStart !== -1 ? searchStart : (hashStart !== -1 ? hashStart : raw.length)
  if (pathEnd > pos) {
    segments.push({ text: raw.slice(pos, pathEnd), color: COMPONENT_COLORS.pathname })
    pos = pathEnd
  }

  // 5. Search: color each key=value pair, leave ? and & default
  if (searchStart !== -1) {
    const searchEnd = hashStart !== -1 ? hashStart : raw.length
    const searchStr = raw.slice(searchStart, searchEnd)
    // Split by ? and & but keep the delimiters
    const parts = searchStr.split(/([?&])/)
    for (const part of parts) {
      if (part === '?' || part === '&') {
        segments.push({ text: part, color: '' })
      } else if (part) {
        segments.push({ text: part, color: COMPONENT_COLORS.search })
      }
    }
    pos = searchEnd
  }

  // 6. Hash: only the fragment name is colored, "#" is default
  if (hashStart !== -1) {
    segments.push({ text: '#', color: '' })
    segments.push({ text: raw.slice(hashStart + 1), color: COMPONENT_COLORS.hash })
    pos = raw.length
  }

  // Trailing text
  if (pos < raw.length) {
    segments.push({ text: raw.slice(pos), color: '' })
  }

  return segments
}
