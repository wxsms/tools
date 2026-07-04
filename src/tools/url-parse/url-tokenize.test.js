import { describe, it, expect } from 'vitest'
import { tokenizeUrl, COMPONENT_COLORS } from './url-tokenize'

describe('tokenizeUrl', () => {
  it('returns empty array for empty input', () => {
    expect(tokenizeUrl('')).toEqual([])
  })

  it('tokenizes a full URL with all components', () => {
    const raw = 'https://example.com:8080/path/to/page?name=张三&lang=zh&id=42#section'
    const url = new URL(raw)
    const tokens = tokenizeUrl(raw, url)

    // Separators (://, :, ?, &, #) are separate default-color segments
    expect(tokens.map(t => t.text)).toEqual([
      'https', '://',                             // protocol + separator
      'example.com',                               // hostname
      ':', '8080',                                 // port separator + value
      '/path/to/page',                             // pathname
      '?', 'name=张三', '&', 'lang=zh', '&', 'id=42',  // query: separators + pairs
      '#', 'section',                              // hash separator + value
    ])
    expect(tokens.map(t => t.color)).toEqual([
      'text-blue-400', '',        // protocol, ://
      'text-green-400',           // hostname
      '', 'text-cyan-400',        // :, port
      'text-amber-400',           // pathname
      '', 'text-rose-400', '', 'text-rose-400', '', 'text-rose-400',  // query
      '', 'text-violet-400',      // #, hash
    ])

    // Concatenated text should equal the original
    expect(tokens.map(t => t.text).join('')).toBe(raw)
  })

  it('handles URL without port', () => {
    const raw = 'https://example.com/path?q=1#top'
    const url = new URL(raw)
    const tokens = tokenizeUrl(raw, url)

    expect(tokens.map(t => t.text).join('')).toBe(raw)
    const colors = tokens.map(t => t.color)
    expect(colors).not.toContain('text-cyan-400')
  })

  it('handles URL without query or hash', () => {
    const raw = 'https://example.com/path'
    const url = new URL(raw)
    const tokens = tokenizeUrl(raw, url)

    expect(tokens.map(t => t.text).join('')).toBe(raw)
    const colors = tokens.map(t => t.color)
    expect(colors).not.toContain('text-rose-400')
    expect(colors).not.toContain('text-violet-400')
  })

  it('handles IDN hostname', () => {
    const raw = 'https://例子.测试/path?q=1'
    const url = new URL(raw)
    const tokens = tokenizeUrl(raw, url)

    expect(tokens.map(t => t.text).join('')).toBe(raw)
    // Hostname segment should contain the original IDN characters, not punycode
    const hostnameToken = tokens.find(t => t.color === 'text-green-400')
    expect(hostnameToken.text).toBe('例子.测试')
  })

  it('handles URL with query but no hash', () => {
    const raw = 'https://example.com/?q=test'
    const url = new URL(raw)
    const tokens = tokenizeUrl(raw, url)

    expect(tokens.map(t => t.text).join('')).toBe(raw)
    const colors = tokens.map(t => t.color)
    expect(colors).not.toContain('text-violet-400')
  })

  it('handles URL with hash but no query', () => {
    const raw = 'https://example.com/path#top'
    const url = new URL(raw)
    const tokens = tokenizeUrl(raw, url)

    expect(tokens.map(t => t.text).join('')).toBe(raw)
    const colors = tokens.map(t => t.color)
    expect(colors).not.toContain('text-rose-400')
    expect(colors).toContain('text-violet-400')
  })
})

describe('COMPONENT_COLORS', () => {
  it('has color for each standard component', () => {
    const keys = ['protocol', 'hostname', 'port', 'pathname', 'search', 'hash']
    keys.forEach(k => {
      expect(COMPONENT_COLORS[k]).toBeTruthy()
    })
  })
})
