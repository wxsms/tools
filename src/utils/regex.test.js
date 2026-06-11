import { describe, it, expect } from 'vitest'
import { testRegex, buildHighlightedSegments } from './regex.js'

describe('testRegex', () => {
  it('returns empty matches and no error for empty pattern', () => {
    const result = testRegex('', '', 'hello')
    expect(result.matches).toEqual([])
    expect(result.error).toBe('')
  })

  it('returns empty matches for empty test string', () => {
    const result = testRegex('\\d+', '', '')
    expect(result.matches).toEqual([])
    expect(result.error).toBe('')
  })

  it('returns error for invalid regex', () => {
    const result = testRegex('[invalid', '', 'test')
    expect(result.matches).toEqual([])
    expect(result.error).toBeTruthy()
  })

  it('finds a single match without g flag', () => {
    const result = testRegex('\\d+', '', 'abc123def')
    expect(result.matches).toHaveLength(1)
    expect(result.matches[0].match).toBe('123')
    expect(result.matches[0].index).toBe(3)
  })

  it('finds all matches with g flag', () => {
    const result = testRegex('\\d+', 'g', 'a1b23c456')
    expect(result.matches).toHaveLength(3)
    expect(result.matches[0].match).toBe('1')
    expect(result.matches[0].index).toBe(1)
    expect(result.matches[1].match).toBe('23')
    expect(result.matches[1].index).toBe(3)
    expect(result.matches[2].match).toBe('456')
    expect(result.matches[2].index).toBe(6)
  })

  it('extracts numbered capture groups', () => {
    const result = testRegex('(\\w+)@(\\w+)', '', 'admin@example')
    expect(result.matches).toHaveLength(1)
    expect(result.matches[0].groups).toEqual({ 1: 'admin', 2: 'example' })
  })

  it('extracts named capture groups', () => {
    const result = testRegex('(?<user>\\w+)@(?<domain>\\w+)', '', 'admin@example')
    expect(result.matches).toHaveLength(1)
    expect(result.matches[0].groups.user).toBe('admin')
    expect(result.matches[0].groups.domain).toBe('example')
  })

  it('returns null groups when no capture groups exist', () => {
    const result = testRegex('\\d+', '', 'abc123')
    expect(result.matches[0].groups).toBeNull()
  })

  it('respects case-insensitive flag', () => {
    const result = testRegex('hello', 'i', 'HELLO world')
    expect(result.matches).toHaveLength(1)
    expect(result.matches[0].match).toBe('HELLO')
  })

  it('handles zero-length matches with g flag', () => {
    const result = testRegex('^', 'gm', 'line1\nline2')
    expect(result.matches).toHaveLength(2)
  })

  it('returns no matches when pattern does not match', () => {
    const result = testRegex('xyz', '', 'hello world')
    expect(result.matches).toEqual([])
  })
})

describe('buildHighlightedSegments', () => {
  it('returns full string as unmatched when no matches', () => {
    const segments = buildHighlightedSegments('hello', [])
    expect(segments).toEqual([{ text: 'hello', isMatch: false, matchIndex: -1 }])
  })

  it('returns empty array for empty string with no matches', () => {
    const segments = buildHighlightedSegments('', [])
    expect(segments).toEqual([])
  })

  it('splits into matched and unmatched segments', () => {
    const matches = [
      { match: '123', index: 3 },
    ]
    const segments = buildHighlightedSegments('abc123def', matches)
    expect(segments).toEqual([
      { text: 'abc', isMatch: false, matchIndex: -1 },
      { text: '123', isMatch: true, matchIndex: 0 },
      { text: 'def', isMatch: false, matchIndex: -1 },
    ])
  })

  it('handles multiple matches', () => {
    const matches = [
      { match: 'a', index: 0 },
      { match: 'a', index: 4 },
    ]
    const segments = buildHighlightedSegments('a bca bc', matches)
    expect(segments).toEqual([
      { text: 'a', isMatch: true, matchIndex: 0 },
      { text: ' bc', isMatch: false, matchIndex: -1 },
      { text: 'a', isMatch: true, matchIndex: 1 },
      { text: ' bc', isMatch: false, matchIndex: -1 },
    ])
  })

  it('handles match at the beginning', () => {
    const matches = [{ match: 'hello', index: 0 }]
    const segments = buildHighlightedSegments('hello world', matches)
    expect(segments).toEqual([
      { text: 'hello', isMatch: true, matchIndex: 0 },
      { text: ' world', isMatch: false, matchIndex: -1 },
    ])
  })

  it('handles match at the end', () => {
    const matches = [{ match: 'world', index: 6 }]
    const segments = buildHighlightedSegments('hello world', matches)
    expect(segments).toEqual([
      { text: 'hello ', isMatch: false, matchIndex: -1 },
      { text: 'world', isMatch: true, matchIndex: 0 },
    ])
  })
})
