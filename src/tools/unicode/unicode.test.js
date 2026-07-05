import { describe, it, expect } from 'vitest'
import { encodeUnicode, decodeUnicode, autoDetectDirection } from './unicode.js'

describe('encodeUnicode', () => {
  it('encodes ASCII to JS \\uXXXX', () => {
    expect(encodeUnicode('A', 'js')).toBe('\\u0041')
  })

  it('encodes ASCII to HTML entity', () => {
    expect(encodeUnicode('A', 'html')).toBe('&#x41;')
  })

  it('encodes surrogate-pair emoji to JS', () => {
    expect(encodeUnicode('😀', 'js')).toBe('\\ud83d\\ude00')
  })

  it('encodes emoji to HTML entity', () => {
    expect(encodeUnicode('😀', 'html')).toBe('&#x1f600;')
  })

  it('encodes CJK to JS', () => {
    expect(encodeUnicode('你好', 'js')).toBe('\\u4f60\\u597d')
  })

  it('encodes CJK to HTML entity', () => {
    expect(encodeUnicode('你好', 'html')).toBe('&#x4f60;&#x597d;')
  })

  it('encodes empty string to empty string (js)', () => {
    expect(encodeUnicode('', 'js')).toBe('')
  })

  it('encodes empty string to empty string (html)', () => {
    expect(encodeUnicode('', 'html')).toBe('')
  })
})

describe('decodeUnicode', () => {
  it('decodes JS \\uXXXX to ASCII', () => {
    expect(decodeUnicode('\\u0041', 'js')).toBe('A')
  })

  it('decodes JS surrogate pair to emoji', () => {
    expect(decodeUnicode('\\ud83d\\ude00', 'js')).toBe('😀')
  })

  it('decodes HTML entity to emoji', () => {
    expect(decodeUnicode('&#x1f600;', 'html')).toBe('😀')
  })

  it('decodes HTML entity to ASCII', () => {
    expect(decodeUnicode('&#x41;', 'html')).toBe('A')
  })

  it('decodes mixed JS text', () => {
    expect(decodeUnicode('hello \\u4f60', 'js')).toBe('hello 你')
  })

  it('decodes empty string to empty string (js)', () => {
    expect(decodeUnicode('', 'js')).toBe('')
  })

  it('decodes empty string to empty string (html)', () => {
    expect(decodeUnicode('', 'html')).toBe('')
  })
})

describe('encode/decode roundtrip', () => {
  it('roundtrips various strings across both formats', () => {
    const cases = ['A', '你好', '😀', '🎉地球', '']
    for (const s of cases) {
      for (const f of ['js', 'html']) {
        expect(decodeUnicode(encodeUnicode(s, f), f)).toBe(s)
      }
    }
  })
})

describe('autoDetectDirection', () => {
  it('detects JS-encoded string as true', () => {
    expect(autoDetectDirection('\\u0041', 'js')).toBe(true)
  })

  it('detects plain text as false (js)', () => {
    expect(autoDetectDirection('普通文本', 'js')).toBe(false)
  })

  it('detects HTML-encoded string as true', () => {
    expect(autoDetectDirection('&#x41;', 'html')).toBe(true)
  })

  it('detects plain text as false (html)', () => {
    expect(autoDetectDirection('普通文本', 'html')).toBe(false)
  })
})
