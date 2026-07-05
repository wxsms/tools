import { describe, it, expect } from 'vitest'
import {
  FIELD_RANGES,
  WEEKDAY_NAMES,
  MONTH_NAMES,
  parseField,
  parseCronExpr,
  describeCron,
  describeFieldSimple,
  formatDatetime,
  computeNextTimes,
} from './cron.js'

describe('constants', () => {
  it('FIELD_RANGES has 5 entries', () => {
    expect(FIELD_RANGES).toHaveLength(5)
  })

  it('FIELD_RANGES[0] is minute range', () => {
    expect(FIELD_RANGES[0]).toEqual({ min: 0, max: 59 })
  })

  it('MONTH_NAMES[1] is "1月"', () => {
    expect(MONTH_NAMES[1]).toBe('1月')
  })

  it('WEEKDAY_NAMES[0] is "日"', () => {
    expect(WEEKDAY_NAMES[0]).toBe('日')
  })
})

describe('parseField', () => {
  it('"*" on minute range yields 0..59', () => {
    const result = parseField('*', 0)
    expect(result.size).toBe(60)
    expect(result.has(0)).toBe(true)
    expect(result.has(59)).toBe(true)
  })

  it('"5" yields a single value', () => {
    expect(parseField('5', 0)).toEqual(new Set([5]))
  })

  it('"1-5" yields a range', () => {
    expect(parseField('1-5', 0)).toEqual(new Set([1, 2, 3, 4, 5]))
  })

  it('"*/15" yields step values', () => {
    expect(parseField('*/15', 0)).toEqual(new Set([0, 15, 30, 45]))
  })

  it('"1-10/2" yields stepped range', () => {
    expect(parseField('1-10/2', 0)).toEqual(new Set([1, 3, 5, 7, 9]))
  })

  it('"0,15,30,45" yields a list of 4', () => {
    expect(parseField('0,15,30,45', 0)).toEqual(new Set([0, 15, 30, 45]))
  })

  it('"60" is out of minute range → null', () => {
    expect(parseField('60', 0)).toBeNull()
  })

  it('"abc" is invalid → null', () => {
    expect(parseField('abc', 0)).toBeNull()
  })

  it('"5-3" has start > end → null', () => {
    expect(parseField('5-3', 0)).toBeNull()
  })

  it('"*/0" has step < 1 → null', () => {
    expect(parseField('*/0', 0)).toBeNull()
  })

  it('"0" on hour range yields {0}', () => {
    expect(parseField('0', 1)).toEqual(new Set([0]))
  })

  it('"1-31" on day range yields 31 values', () => {
    expect(parseField('1-31', 2).size).toBe(31)
  })
})

describe('parseCronExpr', () => {
  it('"* * * * *" yields 5 sets, no error', () => {
    const result = parseCronExpr('* * * * *')
    expect(result.error).toBeNull()
    expect(result.sets).toHaveLength(5)
  })

  it('"0 0 1 1 0" parses normally', () => {
    const result = parseCronExpr('0 0 1 1 0')
    expect(result.error).toBeNull()
    expect(result.sets).toHaveLength(5)
  })

  it('"0 0 1 1" (4 fields) yields error containing "5 个字段"', () => {
    const result = parseCronExpr('0 0 1 1')
    expect(result.error).toContain('5 个字段')
  })

  it('"0 0 1 1 0 0" (6 fields) yields error containing "5 个字段"', () => {
    const result = parseCronExpr('0 0 1 1 0 0')
    expect(result.error).toContain('5 个字段')
  })

  it('"60 0 1 1 0" yields error containing "分"', () => {
    const result = parseCronExpr('60 0 1 1 0')
    expect(result.error).toContain('分')
  })

  it('"0 24 1 1 0" yields error containing "时"', () => {
    const result = parseCronExpr('0 24 1 1 0')
    expect(result.error).toContain('时')
  })

  it('"0 0 32 1 0" yields error containing "日"', () => {
    const result = parseCronExpr('0 0 32 1 0')
    expect(result.error).toContain('日')
  })
})

describe('formatDatetime', () => {
  it('formats 2024-01-01 00:00:00', () => {
    expect(formatDatetime(new Date(2024, 0, 1, 0, 0, 0))).toBe('2024-01-01 00:00:00')
  })

  it('formats 2024-12-31 23:59:59', () => {
    expect(formatDatetime(new Date(2024, 11, 31, 23, 59, 59))).toBe('2024-12-31 23:59:59')
  })
})

describe('computeNextTimes', () => {
  it('next run for "0 0 1 1 *" after 2024-01-01 12:00 is 2025-01-01', () => {
    const now = new Date(2024, 0, 1, 12, 0, 0)
    const sets = parseCronExpr('0 0 1 1 *').sets
    const results = computeNextTimes(sets, 5, now)
    expect(results[0]).toBe('2025-01-01 00:00:00')
  })

  it('"* * * * *" with count=3 yields 3 entries starting next minute', () => {
    const now = new Date(2024, 0, 1, 12, 0, 0)
    const sets = parseCronExpr('* * * * *').sets
    const results = computeNextTimes(sets, 3, now)
    expect(results).toHaveLength(3)
    expect(results[0]).toBe('2024-01-01 12:01:00')
  })
})

describe('describeCron', () => {
  it('"0 0 1 * *" contains day value and time', () => {
    const d = describeCron('0 0 1 * *')
    expect(d).toContain('1')
    expect(d).toContain('00:00')
  })

  it('"0 0 1 1 *" contains month, day, and time', () => {
    const d = describeCron('0 0 1 1 *')
    expect(d).toContain('1月')
    expect(d).toContain('00:00')
    expect(d).toContain('1')
  })

  it('"*/15 * * * *" contains "每 15 分钟"', () => {
    expect(describeCron('*/15 * * * *')).toContain('每 15 分钟')
  })

  it('"0 9-17 * * 1-5" contains weekday range and time', () => {
    const d = describeCron('0 9-17 * * 1-5')
    // WEEKDAY_NAMES uses bare characters, so range is "一 到 五"
    expect(d).toContain('一 到 五')
    // hourF '9-17' parses via parseInt to 9, minF '0' to 0 → time 09:00
    expect(d).toContain('09:00')
  })

  it('"30 8 * * *" contains "08:30"', () => {
    expect(describeCron('30 8 * * *')).toContain('08:30')
  })

  it('"invalid" returns empty string', () => {
    expect(describeCron('invalid')).toBe('')
  })

  it('"0 0 1 1" (4 fields) returns empty string', () => {
    expect(describeCron('0 0 1 1')).toBe('')
  })
})

describe('describeFieldSimple', () => {
  it('"*/5" with minute unit', () => {
    expect(describeFieldSimple('*/5', '分钟', null)).toBe('每 5 分钟')
  })

  it('"3" with hour unit', () => {
    expect(describeFieldSimple('3', '时', null)).toBe('3')
  })

  it('"1-5" with day unit', () => {
    expect(describeFieldSimple('1-5', '日', null)).toBe('1 到 5')
  })

  it('"1,3,5" with minute unit', () => {
    expect(describeFieldSimple('1,3,5', '分', null)).toBe('1、3、5')
  })

  it('"1" with month names', () => {
    expect(describeFieldSimple('1', '月', MONTH_NAMES)).toBe('1月')
  })

  it('"1-3" with month names', () => {
    expect(describeFieldSimple('1-3', '月', MONTH_NAMES)).toBe('1月 到 3月')
  })
})
