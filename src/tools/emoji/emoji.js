import { GROUPS } from './emoji-data.js'

export function getEmojiGroups(emojis) {
  return GROUPS.map(g => ({
    id: g.id,
    name: g.name,
    items: emojis.filter(e => e.group === g.id),
  }))
}

export function searchEmojis(items, query) {
  const q = (query || '').trim().toLowerCase()
  if (!q) return items
  return items.filter(e => {
    if (e.label.toLowerCase().includes(q)) return true
    if (e.shortcodes.some(sc => sc.toLowerCase().includes(q))) return true
    if (e.tags.some(t => t.toLowerCase().includes(q))) return true
    return false
  })
}

export function copyFormats(emoji) {
  const parts = emoji.hexcode.split('-')
  return {
    char: emoji.char,
    shortcode: emoji.shortcodes.length ? ':' + emoji.shortcodes[0] + ':' : '',
    codepoint: parts.map(p => 'U+' + p).join(' '),
    htmlEntity: parts.map(p => '&#' + parseInt(p, 16) + ';').join(''),
    urlEncoded: encodeURIComponent(emoji.char),
  }
}

export async function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return
    } catch {
      // 降级到 execCommand
    }
  }
  return fallbackCopy(text)
}

function fallbackCopy(text) {
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    if (!ok) throw new Error('execCommand returned false')
  } catch (err) {
    throw new Error('copy failed', { cause: err })
  }
}
