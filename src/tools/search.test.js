import { describe, it, expect } from 'vitest'
import { buildSearchIndex, highlightMatch, searchTools, truncateResults } from './search.js'
import { toolGroups } from '../tools.js'

describe('buildSearchIndex', () => {
  const index = buildSearchIndex(toolGroups)

  it('returns one entry per tool across all groups', () => {
    const totalTools = toolGroups.reduce((sum, g) => sum + g.tools.length, 0)
    expect(index).toHaveLength(totalTools)
  })

  it('each entry has name, desc, path, groupName, icon', () => {
    for (const entry of index) {
      expect(entry).toHaveProperty('name')
      expect(entry).toHaveProperty('desc')
      expect(entry).toHaveProperty('path')
      expect(entry).toHaveProperty('groupName')
      expect(entry).toHaveProperty('icon')
    }
  })

  it('preserves order: first entry is the first tool of the first group', () => {
    expect(index[0].name).toBe(toolGroups[0].tools[0].name)
    expect(index[0].groupName).toBe(toolGroups[0].name)
  })

  it('preserves order: last entry is the last tool of the last group', () => {
    const lastGroup = toolGroups[toolGroups.length - 1]
    const lastTool = lastGroup.tools[lastGroup.tools.length - 1]
    expect(index[index.length - 1].name).toBe(lastTool.name)
    expect(index[index.length - 1].groupName).toBe(lastGroup.name)
  })
})

describe('highlightMatch', () => {
  it('returns single unmatched segment when query is empty', () => {
    expect(highlightMatch('Base64', '')).toEqual([
      { text: 'Base64', matched: false },
    ])
  })

  it('returns single unmatched segment when no match', () => {
    expect(highlightMatch('abc', 'xyz')).toEqual([
      { text: 'abc', matched: false },
    ])
  })

  it('matches case-insensitively but preserves original case', () => {
    expect(highlightMatch('Base64', 'BASE')).toEqual([
      { text: 'Base', matched: true },
      { text: '64', matched: false },
    ])
  })

  it('handles match at start', () => {
    expect(highlightMatch('Base64 转换', 'base')).toEqual([
      { text: 'Base', matched: true },
      { text: '64 转换', matched: false },
    ])
  })

  it('handles match in the middle', () => {
    expect(highlightMatch('Base64 转换', '64')).toEqual([
      { text: 'Base', matched: false },
      { text: '64', matched: true },
      { text: ' 转换', matched: false },
    ])
  })

  it('handles multiple matches in the same text', () => {
    expect(highlightMatch('aba', 'a')).toEqual([
      { text: 'a', matched: true },
      { text: 'b', matched: false },
      { text: 'a', matched: true },
    ])
  })

  it('handles Chinese query', () => {
    expect(highlightMatch('Base64 转换', '转换')).toEqual([
      { text: 'Base64 ', matched: false },
      { text: '转换', matched: true },
    ])
  })

  it('trims query before matching', () => {
    expect(highlightMatch('Base64', '  base  ')).toEqual([
      { text: 'Base', matched: true },
      { text: '64', matched: false },
    ])
  })
})

describe('searchTools', () => {
  const index = buildSearchIndex(toolGroups)

  it('returns empty array for empty query', () => {
    expect(searchTools('', index)).toEqual([])
  })

  it('returns empty array for whitespace-only query', () => {
    expect(searchTools('   ', index)).toEqual([])
  })

  it('matches name (lowercase)', () => {
    const results = searchTools('base64', index)
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].name).toBe('Base64 转换')
    expect(results[0].matchedField).toBe('name')
  })

  it('matches name case-insensitively', () => {
    const lower = searchTools('base64', index).map(r => r.path)
    const upper = searchTools('BASE64', index).map(r => r.path)
    expect(upper).toEqual(lower)
  })

  it('matches path when name does not contain the query', () => {
    // 'jwt-decode' contains 'jwt', but the name "JWT 解码" also contains 'jwt'.
    // Use a query that only the path matches, not any name.
    const results = searchTools('-decode', index)
    expect(results.length).toBeGreaterThan(0)
    const jwtResult = results.find(r => r.path === '/jwt-decode')
    expect(jwtResult).toBeDefined()
    expect(jwtResult.matchedField).toBe('path')
  })

  it('matches groupName when name and path do not', () => {
    // '加解密' is the group name; no tool's name or path contains the exact char pair '加解密'.
    const results = searchTools('加解密', index)
    expect(results.length).toBeGreaterThan(0)
    for (const r of results) {
      expect(r.groupName).toBe('加解密')
      expect(r.matchedField).toBe('groupName')
    }
  })

  it('matches desc', () => {
    const results = searchTools('格式化', index)
    expect(results.length).toBeGreaterThan(0)
    for (const r of results) {
      expect(r.matchedField).toBe('desc')
    }
  })

  it('returns empty array when nothing matches', () => {
    expect(searchTools('xyznotfound123', index)).toEqual([])
  })

  it('sorts name matches ahead of desc matches', () => {
    const fakeIndex = [
      { name: 'Other', desc: 'json helper', path: '/a', groupName: 'G1', icon: null },
      { name: 'JSON 校验', desc: 'unrelated', path: '/b', groupName: 'G2', icon: null },
    ]
    const results = searchTools('json', fakeIndex)
    expect(results).toHaveLength(2)
    expect(results[0].name).toBe('JSON 校验')
    expect(results[0].matchedField).toBe('name')
    expect(results[1].name).toBe('Other')
    expect(results[1].matchedField).toBe('desc')
  })

  it('preserves original order within the same priority', () => {
    const fakeIndex = [
      { name: 'A json', desc: '', path: '/a', groupName: 'G', icon: null },
      { name: 'B json', desc: '', path: '/b', groupName: 'G', icon: null },
      { name: 'C json', desc: '', path: '/c', groupName: 'G', icon: null },
    ]
    const results = searchTools('json', fakeIndex)
    expect(results.map(r => r.path)).toEqual(['/a', '/b', '/c'])
  })

  it('result entry includes all original fields plus matchedField', () => {
    const results = searchTools('base64', index)
    const r = results[0]
    expect(r).toHaveProperty('name')
    expect(r).toHaveProperty('desc')
    expect(r).toHaveProperty('path')
    expect(r).toHaveProperty('groupName')
    expect(r).toHaveProperty('icon')
    expect(r).toHaveProperty('matchedField')
  })
})

describe('truncateResults', () => {
  const make = n => Array.from({ length: n }, (_, i) => ({ path: `/t${i}` }))

  it('returns all results when count is below limit', () => {
    expect(truncateResults(make(10), 20)).toHaveLength(10)
  })

  it('truncates to limit when count exceeds it', () => {
    expect(truncateResults(make(30), 20)).toHaveLength(20)
  })

  it('keeps the first N entries in order', () => {
    const out = truncateResults(make(30), 5)
    expect(out.map(r => r.path)).toEqual(['/t0', '/t1', '/t2', '/t3', '/t4'])
  })

  it('default limit is 20', () => {
    expect(truncateResults(make(30))).toHaveLength(20)
  })

  it('handles empty input', () => {
    expect(truncateResults([], 20)).toEqual([])
  })
})
