import { describe, it, expect } from 'vitest'
import {
  STATUS_CODES,
  CLASS_NAMES,
  badgeClass,
  filterStatusCodes,
  groupByClass,
} from './http-status.js'

describe('STATUS_CODES', () => {
  it('has more than 60 entries', () => {
    expect(STATUS_CODES.length).toBeGreaterThan(60)
  })

  it('contains key codes 100, 200, 301, 404, 500', () => {
    for (const code of [100, 200, 301, 404, 500]) {
      expect(STATUS_CODES.find(x => x.code === code)).toBeTruthy()
    }
  })

  it('every item has code(number), name(string), desc(string), detail(string) and detail is non-empty', () => {
    for (const item of STATUS_CODES) {
      expect(typeof item.code).toBe('number')
      expect(typeof item.name).toBe('string')
      expect(typeof item.desc).toBe('string')
      expect(typeof item.detail).toBe('string')
      expect(item.detail).toBeTruthy()
    }
  })
})

describe('CLASS_NAMES', () => {
  it('contains keys 1-5 with string values', () => {
    for (const k of [1, 2, 3, 4, 5]) {
      expect(CLASS_NAMES[k]).toEqual(expect.any(String))
    }
  })
})

describe('badgeClass', () => {
  it('returns badge-info for 1xx', () => {
    expect(badgeClass(100)).toBe('badge-info')
  })

  it('returns badge-success for 2xx', () => {
    expect(badgeClass(200)).toBe('badge-success')
  })

  it('returns badge-warning for 3xx', () => {
    expect(badgeClass(300)).toBe('badge-warning')
  })

  it('returns badge-secondary for 4xx', () => {
    expect(badgeClass(400)).toBe('badge-secondary')
  })

  it('returns badge-error for 5xx', () => {
    expect(badgeClass(500)).toBe('badge-error')
  })

  it('returns empty string for unknown class', () => {
    expect(badgeClass(999)).toBe('')
  })
})

describe('filterStatusCodes', () => {
  it('returns all items when query is empty', () => {
    expect(filterStatusCodes(STATUS_CODES, '')).toHaveLength(STATUS_CODES.length)
  })

  it('includes 404 when query is "404"', () => {
    const result = filterStatusCodes(STATUS_CODES, '404')
    expect(result.some(x => x.code === 404)).toBe(true)
  })

  it('matches "not found" against name (case-insensitive via toLowerCase)', () => {
    const result = filterStatusCodes(STATUS_CODES, 'not found')
    expect(result.some(x => x.code === 404)).toBe(true)
  })

  it('matches "WebDAV" (case-sensitive in detail), includes 207 and 208', () => {
    const result = filterStatusCodes(STATUS_CODES, 'WebDAV')
    expect(result.some(x => x.code === 207)).toBe(true)
    expect(result.some(x => x.code === 208)).toBe(true)
  })

  it('matches "NOT FOUND".toLowerCase() against name', () => {
    const result = filterStatusCodes(STATUS_CODES, 'NOT FOUND'.toLowerCase())
    expect(result.some(x => x.code === 404)).toBe(true)
  })

  it('returns empty array when no match', () => {
    expect(filterStatusCodes(STATUS_CODES, 'zzzzzz')).toHaveLength(0)
  })
})

describe('groupByClass', () => {
  it('groups STATUS_CODES into 5 classes', () => {
    const groups = groupByClass(STATUS_CODES)
    expect(groups).toHaveLength(5)
    for (const g of groups) {
      expect(g.classCode).toBeGreaterThanOrEqual(1)
      expect(g.classCode).toBeLessThanOrEqual(5)
      expect(g.className).toBe(CLASS_NAMES[g.classCode])
      expect(g.items.length).toBeGreaterThan(0)
    }
  })

  it('groups a single 2xx item into one group', () => {
    const item = STATUS_CODES.find(x => x.code === 200)
    const groups = groupByClass([item])
    expect(groups).toHaveLength(1)
    expect(groups[0].classCode).toBe(2)
    expect(groups[0].className).toBe('成功')
    expect(groups[0].items).toHaveLength(1)
  })

  it('returns empty array for empty input', () => {
    expect(groupByClass([])).toHaveLength(0)
  })
})
