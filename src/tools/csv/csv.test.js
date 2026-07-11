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
