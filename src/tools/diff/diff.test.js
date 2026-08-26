import { describe, it, expect } from 'vitest'
import { computeDiff, addInlineHighlights, computeStats, computeDisplayLines, computeSplitRows } from './diff.js'

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

  it('keeps shared leading whitespace as an equal segment (regression for alignment)', () => {
    // Both lines share two leading spaces; the only change is a leading "#".
    // diffWords would merge "  #" into one added token and shift the shared
    // suffix, breaking visual alignment between the delete and add rows.
    const lines = [
      { type: 'delete', text: '  reasoning-parser: glm45', oldNum: 1, newNum: '' },
      { type: 'add', text: '  #reasoning-parser: glm45', oldNum: '', newNum: 1 },
    ]
    const result = addInlineHighlights(lines)
    const deleted = result.find(l => l.type === 'delete')
    const added = result.find(l => l.type === 'add')

    // The leading "  " must be an equal segment on both sides, not folded
    // into the changed token.
    expect(deleted.segments[0]).toEqual({ type: 'equal', text: '  ' })
    expect(added.segments[0]).toEqual({ type: 'equal', text: '  ' })

    // The "#" must be a standalone added segment on the add side, and absent
    // from the delete side.
    expect(added.segments.some(s => s.type === 'add' && s.text === '#')).toBe(true)
    expect(deleted.segments.some(s => s.type === 'delete')).toBe(false)

    // The shared suffix must be an equal segment on both sides.
    expect(deleted.segments.some(s => s.type === 'equal' && s.text === 'reasoning-parser: glm45')).toBe(true)
    expect(added.segments.some(s => s.type === 'equal' && s.text === 'reasoning-parser: glm45')).toBe(true)
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

describe('computeSplitRows', () => {
  it('pairs equal lines on both sides', () => {
    const lines = [{ type: 'equal', text: 'a', oldNum: 1, newNum: 1 }]
    const rows = computeSplitRows(lines)
    expect(rows).toEqual([{ type: 'equal', left: lines[0], right: lines[0] }])
  })

  it('pairs a delete+add into a modify row', () => {
    const lines = [
      { type: 'delete', text: 'old', oldNum: 1, newNum: '' },
      { type: 'add', text: 'new', oldNum: '', newNum: 1 },
    ]
    const rows = computeSplitRows(lines)
    expect(rows).toEqual([{ type: 'modify', left: lines[0], right: lines[1] }])
  })

  it('emits a delete-only row when no matching add', () => {
    const lines = [{ type: 'delete', text: 'old', oldNum: 1, newNum: '' }]
    const rows = computeSplitRows(lines)
    expect(rows).toEqual([{ type: 'delete', left: lines[0], right: null }])
  })

  it('emits an add-only row when no matching delete', () => {
    const lines = [{ type: 'add', text: 'new', oldNum: '', newNum: 1 }]
    const rows = computeSplitRows(lines)
    expect(rows).toEqual([{ type: 'add', left: null, right: lines[0] }])
  })

  it('handles unbalanced delete+add runs', () => {
    // 2 deletes, 1 add → 1 modify + 1 delete
    const lines = [
      { type: 'delete', text: 'a', oldNum: 1, newNum: '' },
      { type: 'delete', text: 'b', oldNum: 2, newNum: '' },
      { type: 'add', text: 'x', oldNum: '', newNum: 1 },
    ]
    const rows = computeSplitRows(lines)
    expect(rows).toEqual([
      { type: 'modify', left: lines[0], right: lines[2] },
      { type: 'delete', left: lines[1], right: null },
    ])
  })

  it('passes fold rows through unchanged', () => {
    const fold = { type: 'fold', foldIndex: 0, count: 3 }
    const rows = computeSplitRows([fold])
    expect(rows).toEqual([fold])
  })

  it('handles a mixed sequence', () => {
    const lines = [
      { type: 'equal', text: 'same', oldNum: 1, newNum: 1 },
      { type: 'delete', text: 'old', oldNum: 2, newNum: '' },
      { type: 'add', text: 'new', oldNum: '', newNum: 2 },
      { type: 'add', text: 'extra', oldNum: '', newNum: 3 },
      { type: 'equal', text: 'tail', oldNum: 3, newNum: 4 },
    ]
    const rows = computeSplitRows(lines)
    expect(rows).toEqual([
      { type: 'equal', left: lines[0], right: lines[0] },
      { type: 'modify', left: lines[1], right: lines[2] },
      { type: 'add', left: null, right: lines[3] },
      { type: 'equal', left: lines[4], right: lines[4] },
    ])
  })
})
