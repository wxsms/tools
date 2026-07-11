import { describe, it, expect } from 'vitest'
import { inferColumnType } from './csv.js'

describe('inferColumnType', () => {
  it('returns "string" for empty array', () => {
    expect(inferColumnType([])).toBe('string')
  })

  it('returns "string" when all values are empty strings', () => {
    expect(inferColumnType(['', '', ''])).toBe('string')
  })

  it('detects integer column', () => {
    expect(inferColumnType(['1', '2', '10', '-5'])).toBe('integer')
  })

  it('detects float column', () => {
    expect(inferColumnType(['1.5', '2', '-3.14', '0.1'])).toBe('float')
  })

  it('detects boolean column (case-insensitive)', () => {
    expect(inferColumnType(['true', 'false', 'TRUE', 'False'])).toBe('boolean')
  })

  it('detects date column (ISO-like)', () => {
    expect(inferColumnType(['2024-01-01', '2024-02-15', '2023-12-31'])).toBe('date')
  })

  it('falls back to string for mixed types', () => {
    expect(inferColumnType(['1', 'abc', '3'])).toBe('string')
  })

  it('falls back to string when integer mixed with float', () => {
    expect(inferColumnType(['1', '2.5', '3'])).toBe('float')
  })

  it('falls back to string for date-like mixed with non-date', () => {
    expect(inferColumnType(['2024-01-01', 'hello'])).toBe('string')
  })

  it('ignores empty values when inferring', () => {
    expect(inferColumnType(['1', '', '2', '', '3'])).toBe('integer')
  })

  it('only samples first 100 non-empty values', () => {
    const values = []
    for (let i = 0; i < 200; i++) values.push(String(i))
    values.push('not-a-number')
    expect(inferColumnType(values)).toBe('integer')
  })

  it('rejects plain words for date column', () => {
    expect(inferColumnType(['yesterday', 'today'])).toBe('string')
  })
})

import { columnStats } from './csv.js'

describe('columnStats', () => {
  it('returns empty object for empty values', () => {
    expect(columnStats([], 'string')).toEqual({})
  })

  it('returns empty object for all-empty values', () => {
    expect(columnStats(['', '', ''], 'integer')).toEqual({})
  })

  it('computes min/max/avg for integer column', () => {
    expect(columnStats(['1', '2', '3'], 'integer')).toEqual({
      min: 1, max: 3, avg: 2,
    })
  })

  it('computes avg rounded to 2 decimals for float column', () => {
    const stats = columnStats(['1.0', '2.5', '3.0'], 'float')
    expect(stats.min).toBe(1)
    expect(stats.max).toBe(3)
    expect(stats.avg).toBe(2.17)
  })

  it('computes min/max for date column formatted as YYYY-MM-DD', () => {
    const stats = columnStats(['2024-03-01', '2024-01-15', '2024-12-31'], 'date')
    expect(stats.min).toBe('2024-01-15')
    expect(stats.max).toBe('2024-12-31')
  })

  it('falls back to raw string for un-formattable date', () => {
    const stats = columnStats(['not-a-date', '2024-01-01'], 'date')
    expect(stats.min).toBe('not-a-date')
  })

  it('counts true/false for boolean column', () => {
    expect(columnStats(['true', 'false', 'TRUE', 'true'], 'boolean')).toEqual({
      true: 3, false: 1,
    })
  })

  it('counts unique values for string column', () => {
    expect(columnStats(['a', 'b', 'a', 'c'], 'string')).toEqual({ unique: 3 })
  })

  it('caps unique count at "100+"', () => {
    const values = []
    for (let i = 0; i < 150; i++) values.push(`v${i}`)
    expect(columnStats(values, 'string')).toEqual({ unique: '100+' })
  })
})
