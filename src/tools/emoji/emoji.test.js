import { describe, it, expect } from 'vitest'
import { EMOJIS, GROUPS } from './emoji-data.js'
import { getEmojiGroups, searchEmojis, copyFormats } from './emoji.js'

describe('emoji-data integrity', () => {
  it('has more than 1500 emojis', () => {
    expect(EMOJIS.length).toBeGreaterThan(1500)
  })

  it('every entry has required fields', () => {
    EMOJIS.forEach(e => {
      expect(e.hexcode).toBeTruthy()
      expect(e.char).toBeTruthy()
      expect(e.label).toBeTruthy()
      expect(typeof e.group).toBe('number')
    })
  })

  it('has no group === 2 (skin tone component)', () => {
    expect(EMOJIS.filter(e => e.group === 2)).toHaveLength(0)
  })

  it('GROUPS has 9 entries', () => {
    expect(GROUPS).toHaveLength(9)
  })

  it('every group has at least one emoji', () => {
    GROUPS.forEach(g => {
      const count = EMOJIS.filter(e => e.group === g.id).length
      expect(count).toBeGreaterThan(0)
    })
  })
})

describe('getEmojiGroups', () => {
  it('returns groups in GROUPS order', () => {
    const groups = getEmojiGroups(EMOJIS)
    expect(groups).toHaveLength(GROUPS.length)
    groups.forEach((g, i) => {
      expect(g.id).toBe(GROUPS[i].id)
      expect(g.name).toBe(GROUPS[i].name)
    })
  })

  it('every group has non-empty items', () => {
    const groups = getEmojiGroups(EMOJIS)
    groups.forEach(g => {
      expect(g.items.length).toBeGreaterThan(0)
    })
  })
})

describe('searchEmojis', () => {
  it('returns original array for empty query', () => {
    const result = searchEmojis(EMOJIS, '')
    expect(result.length).toBe(EMOJIS.length)
  })

  it('returns original array for whitespace-only query', () => {
    const result = searchEmojis(EMOJIS, '   ')
    expect(result.length).toBe(EMOJIS.length)
  })

  it('is case-insensitive', () => {
    const upper = searchEmojis(EMOJIS, 'THUMB')
    const lower = searchEmojis(EMOJIS, 'thumb')
    expect(upper.map(e => e.hexcode)).toEqual(lower.map(e => e.hexcode))
  })

  it('matches label', () => {
    const result = searchEmojis(EMOJIS, 'grinning')
    expect(result.some(e => e.label === 'grinning face')).toBe(true)
  })

  it('matches shortcode', () => {
    const byPlus1 = searchEmojis(EMOJIS, '+1')
    const byThumbsup = searchEmojis(EMOJIS, 'thumbsup')
    expect(byPlus1.some(e => e.hexcode === '1F44D')).toBe(true)
    expect(byThumbsup.some(e => e.hexcode === '1F44D')).toBe(true)
  })

  it('matches tags', () => {
    const result = searchEmojis(EMOJIS, 'happy')
    expect(result.some(e => e.tags.includes('happy'))).toBe(true)
  })

  it('returns empty array for no match', () => {
    const result = searchEmojis(EMOJIS, 'xyzqwerty_nothing')
    expect(result).toHaveLength(0)
  })

  it('only searches within provided items', () => {
    const subset = EMOJIS.slice(0, 10)
    const result = searchEmojis(subset, 'grinning')
    result.forEach(r => {
      expect(subset).toContain(r)
    })
  })
})

describe('copyFormats', () => {
  it('formats single-codepoint emoji correctly', () => {
    const thumbsUp = EMOJIS.find(e => e.hexcode === '1F44D')
    expect(thumbsUp).toBeTruthy()
    const fmt = copyFormats(thumbsUp)
    expect(fmt.char).toBe('👍')
    expect(fmt.shortcode).toBe(':thumbsup:')
    expect(fmt.codepoint).toBe('U+1F44D')
    expect(fmt.htmlEntity).toBe('&#128077;')
    expect(fmt.urlEncoded).toBe(encodeURIComponent('👍'))
  })

  it('returns empty shortcode when no shortcodes', () => {
    const noShortcode = EMOJIS.find(e => e.shortcodes.length === 0)
    if (!noShortcode) return
    const fmt = copyFormats(noShortcode)
    expect(fmt.shortcode).toBe('')
  })

  it('formats multi-codepoint emoji (flags) correctly', () => {
    const flag = EMOJIS.find(e => e.hexcode.includes('-'))
    expect(flag).toBeTruthy()
    const fmt = copyFormats(flag)
    const parts = flag.hexcode.split('-')
    const expectedCodepoint = parts.map(p => 'U+' + p).join(' ')
    const expectedHtmlEntity = parts.map(p => '&#' + parseInt(p, 16) + ';').join('')
    expect(fmt.codepoint).toBe(expectedCodepoint)
    expect(fmt.htmlEntity).toBe(expectedHtmlEntity)
  })
})
