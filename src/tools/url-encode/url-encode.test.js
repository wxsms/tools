import { describe, it, expect } from 'vitest'
import { encodeLines, decodeLines } from './url-encode.js'

describe('encodeLines', () => {
  it('encodes URL with encodeURI: keeps reserved chars, encodes CJK', () => {
    const result = encodeLines('https://example.com/path?name=张三&lang=中文', 'uri')
    expect(result).toContain('%E5%BC%A0%E4%B8%89') // 张三
    expect(result).not.toContain('%3F') // ?
    expect(result).not.toContain('%2F') // /
    expect(result).not.toContain('%3D') // =
    expect(result).not.toContain('%26') // &
    expect(result).not.toContain('%3A') // :
  })

  it('encodes URL with encodeURIComponent: encodes reserved chars', () => {
    const result = encodeLines('a/b?c=d', 'component')
    expect(result).toContain('%2F') // /
    expect(result).toContain('%3F') // ?
    expect(result).toContain('%3D') // =
  })

  it('encodes multiline text line by line', () => {
    const result = encodeLines('a\nb', 'uri')
    expect(result.split('\n')).toHaveLength(2)
    expect(result).toContain('\n')
  })

  it('encodes empty string to empty string', () => {
    expect(encodeLines('', 'uri')).toBe('')
    expect(encodeLines('', 'component')).toBe('')
  })
})

describe('decodeLines', () => {
  it('decodes plain text without encoded chars unchanged', () => {
    expect(decodeLines('hello world', 'uri')).toBe('hello world')
  })

  it('throws on invalid percent sequence', () => {
    expect(() => decodeLines('%E0%A4', 'component')).toThrow()
  })
})

describe('encode/decode roundtrip', () => {
  it('roundtrips various strings for both methods', () => {
    const cases = ['hello', '你好', 'a/b?c=d', '🎉']
    const methods = ['uri', 'component']
    for (const text of cases) {
      for (const m of methods) {
        expect(decodeLines(encodeLines(text, m), m)).toBe(text)
      }
    }
  })
})
