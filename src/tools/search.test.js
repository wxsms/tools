import { describe, it, expect } from 'vitest'
import { buildSearchIndex, highlightMatch } from './search.js'
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
