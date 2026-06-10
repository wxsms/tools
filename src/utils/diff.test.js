import { describe, it, expect } from 'vitest'
import { computeDiff, addInlineHighlights, computeStats, computeDisplayLines } from './diff.js'

describe('computeDiff', () => {
  it('returns empty for two empty strings', () => {
    expect(computeDiff('', '')).toEqual([])
  })

  it('returns all equal for identical text', () => {
    const result = computeDiff('abc', 'abc')
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('equal')
    expect(result[0].text).toBe('abc')
  })

  it('detects added lines', () => {
    const result = computeDiff('', 'new line')
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('add')
    expect(result[0].text).toBe('new line')
  })

  it('detects deleted lines', () => {
    const result = computeDiff('old line', '')
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('delete')
    expect(result[0].text).toBe('old line')
  })

  it('tracks line numbers for unchanged lines', () => {
    const result = computeDiff('line1\nline2', 'line1\nline2')
    expect(result[0].oldNum).toBe(1)
    expect(result[0].newNum).toBe(1)
    expect(result[1].oldNum).toBe(2)
    expect(result[1].newNum).toBe(2)
  })

  it('tracks line numbers for mixed changes', () => {
    const result = computeDiff('a\nb\nc', 'a\nx\nc')
    // a (equal), b (delete), x (add), c (equal)
    const equal1 = result.find(l => l.text === 'a' && l.type === 'equal')
    const equal2 = result.find(l => l.text === 'c' && l.type === 'equal')
    expect(equal1.oldNum).toBe(1)
    expect(equal1.newNum).toBe(1)
    expect(equal2.oldNum).toBe(3)
    expect(equal2.newNum).toBe(3)
  })

  it('adds inline highlights for delete+add pairs', () => {
    const result = computeDiff('hello world', 'hello earth')
    const deleted = result.find(l => l.type === 'delete')
    const added = result.find(l => l.type === 'add')
    expect(deleted.segments).toBeDefined()
    expect(added.segments).toBeDefined()
  })

  it('does not add segments for standalone deletes without adds', () => {
    const result = computeDiff('a\nb\nc', 'a\nc')
    // "b" is deleted but no corresponding add → no inline segments
    const deleted = result.find(l => l.type === 'delete' && l.text === 'b')
    expect(deleted.segments).toBeUndefined()
  })
})

describe('addInlineHighlights', () => {
  it('returns lines unchanged when no delete+add pairs', () => {
    const lines = [
      { type: 'equal', text: 'a', oldNum: 1, newNum: 1 },
      { type: 'delete', text: 'b', oldNum: 2, newNum: '' },
    ]
    const result = addInlineHighlights(lines)
    expect(result).toHaveLength(2)
    expect(result[1].segments).toBeUndefined()
  })

  it('adds segments to paired delete+add', () => {
    const lines = [
      { type: 'delete', text: 'foo bar', oldNum: 1, newNum: '' },
      { type: 'add', text: 'foo baz', oldNum: '', newNum: 1 },
    ]
    const result = addInlineHighlights(lines)
    expect(result[0].segments).toBeDefined()
    expect(result[1].segments).toBeDefined()
  })
})

describe('computeStats', () => {
  it('counts line types', () => {
    const lines = [
      { type: 'equal' },
      { type: 'add' },
      { type: 'add' },
      { type: 'delete' },
    ]
    expect(computeStats(lines)).toEqual({ added: 2, deleted: 1, unchanged: 1 })
  })

  it('returns zeros for empty array', () => {
    expect(computeStats([])).toEqual({ added: 0, deleted: 0, unchanged: 0 })
  })
})

describe('computeDisplayLines', () => {
  it('returns all lines in full mode', () => {
    const lines = Array.from({ length: 20 }, (_, i) => ({ type: 'equal', text: `line ${i}` }))
    const result = computeDisplayLines(lines, 'full', new Set())
    expect(result).toEqual(lines)
  })

  it('folds unchanged lines in compact mode', () => {
    const lines = [
      ...Array.from({ length: 10 }, (_, i) => ({ type: 'equal', text: `eq ${i}` })),
      { type: 'add', text: 'added' },
      ...Array.from({ length: 10 }, (_, i) => ({ type: 'equal', text: `eq2 ${i}` })),
    ]
    const result = computeDisplayLines(lines, 'compact', new Set(), 3)
    // Should have fold entries
    const folds = result.filter(l => l.type === 'fold')
    expect(folds.length).toBeGreaterThan(0)
  })

  it('unfolds regions when in unfolded set', () => {
    const lines = [
      ...Array.from({ length: 10 }, (_, i) => ({ type: 'equal', text: `eq ${i}` })),
      { type: 'add', text: 'added' },
    ]
    const folded = computeDisplayLines(lines, 'compact', new Set(), 3)
    const firstFold = folded.find(l => l.type === 'fold')
    const unfolded = computeDisplayLines(lines, 'compact', new Set([firstFold.foldIndex]), 3)
    expect(unfolded.length).toBeGreaterThan(folded.length)
  })

  it('returns all lines unchanged when there are few lines', () => {
    const lines = [
      { type: 'equal', text: 'a' },
      { type: 'add', text: 'b' },
      { type: 'equal', text: 'c' },
    ]
    const result = computeDisplayLines(lines, 'compact', new Set(), 3)
    expect(result).toEqual(lines)
  })
})
