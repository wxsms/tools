// --- Cron parser ---

export const FIELD_RANGES = [
  { min: 0, max: 59 }, // min
  { min: 0, max: 23 }, // hour
  { min: 1, max: 31 }, // day
  { min: 1, max: 12 }, // month
  { min: 0, max: 6 },  // weekday
]

export const WEEKDAY_NAMES = ['日', '一', '二', '三', '四', '五', '六']

export const MONTH_NAMES = ['', '1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

export function parseField(field, rangeIdx) {
  const { min, max } = FIELD_RANGES[rangeIdx]
  const values = new Set()

  for (const part of field.split(',')) {
    let step = 1
    let rangeStart = min
    let rangeEnd = max

    if (part.includes('/')) {
      const [rangePart, stepPart] = part.split('/')
      step = parseInt(stepPart, 10)
      if (isNaN(step) || step < 1) return null
      if (rangePart === '*') {
        rangeStart = min
        rangeEnd = max
      } else if (rangePart.includes('-')) {
        const [a, b] = rangePart.split('-').map(Number)
        if (isNaN(a) || isNaN(b)) return null
        rangeStart = a
        rangeEnd = b
      } else {
        rangeStart = parseInt(rangePart, 10)
        if (isNaN(rangeStart)) return null
        rangeEnd = max
      }
    } else if (part === '*') {
      // all values, step = 1
    } else if (part.includes('-')) {
      const [a, b] = part.split('-').map(Number)
      if (isNaN(a) || isNaN(b)) return null
      rangeStart = a
      rangeEnd = b
    } else {
      const v = parseInt(part, 10)
      if (isNaN(v)) return null
      rangeStart = v
      rangeEnd = v
    }

    if (rangeStart < min || rangeEnd > max || rangeStart > rangeEnd) return null

    for (let i = rangeStart; i <= rangeEnd; i += step) {
      values.add(i)
    }
  }

  return values
}

export function parseCronExpr(expr) {
  const parts = expr.trim().split(/\s+/)
  if (parts.length !== 5) return { error: 'Cron 表达式应为 5 个字段：分 时 日 月 周' }

  const fieldNames = ['分', '时', '日', '月', '周']
  const sets = []
  for (let i = 0; i < 5; i++) {
    const s = parseField(parts[i], i)
    if (!s || s.size === 0) return { error: `${fieldNames[i]}字段无效：${parts[i]}` }
    sets.push(s)
  }

  return { sets, error: null }
}

export function computeNextTimes(sets, count = 5, now = new Date()) {
  const results = []
  // Start from next minute
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes() + 1)
  const capMs = 4 * 365.25 * 24 * 60 * 60 * 1000
  const deadline = new Date(now.getTime() + capMs)
  let candidate = start

  while (results.length < count && candidate <= deadline) {
    const m = candidate.getMinutes()
    const h = candidate.getHours()
    const d = candidate.getDate()
    const mo = candidate.getMonth() + 1
    const w = candidate.getDay()

    if (sets[0].has(m) && sets[1].has(h) && sets[2].has(d) && sets[3].has(mo) && sets[4].has(w)) {
      results.push(formatDatetime(candidate))
    }

    // Advance by 1 minute
    candidate = new Date(candidate.getFullYear(), candidate.getMonth(), candidate.getDate(), candidate.getHours(), candidate.getMinutes() + 1)
  }

  return results
}

export function formatDatetime(d) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

// --- Human-readable description ---

export function describeCron(expr) {
  const parts = expr.trim().split(/\s+/)
  if (parts.length !== 5) return ''

  const [minF, hourF, dayF, monthF, weekdayF] = parts

  const fragments = []

  // Month
  if (monthF !== '*') {
    fragments.push(describeFieldSimple(monthF, '月', MONTH_NAMES))
  }

  // Day of month
  if (dayF !== '*') {
    fragments.push(describeFieldSimple(dayF, '日', null))
  }

  // Weekday
  if (weekdayF !== '*') {
    fragments.push(describeFieldSimple(weekdayF, '周', WEEKDAY_NAMES))
  }

  // Hour + Min — the most specific and common combination
  if (hourF === '*' && minF === '*') {
    fragments.push('每分钟')
  } else if (hourF === '*' && minF !== '*') {
    fragments.push(describeFieldSimple(minF, '分钟', null))
  } else if (hourF !== '*' && minF !== '*') {
    const h = parseInt(hourF, 10)
    const m = parseInt(minF, 10)
    if (!isNaN(h) && !isNaN(m)) {
      fragments.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    } else {
      if (hourF !== '*') fragments.push(describeFieldSimple(hourF, '时', null))
      if (minF !== '*') fragments.push(describeFieldSimple(minF, '分', null))
    }
  } else {
    // hourF !== '*', minF === '*'
    fragments.push(describeFieldSimple(hourF, '时', null))
  }

  return fragments.join('，')
}

export function describeFieldSimple(field, unit, names) {
  // */N
  if (/^\*\/\d+$/.test(field)) {
    const n = field.split('/')[1]
    return `每 ${n} ${unit}`
  }
  // single value
  if (/^\d+$/.test(field)) {
    const v = parseInt(field, 10)
    const name = names ? names[v] : `${v}`
    return name
  }
  // range
  if (/^\d+-\d+$/.test(field)) {
    const [a, b] = field.split('-').map(Number)
    const nameA = names ? names[a] : a
    const nameB = names ? names[b] : b
    return `${nameA} 到 ${nameB}`
  }
  // range with step
  if (/^\d+-\d+\/\d+$/.test(field)) {
    const [range, step] = field.split('/')
    const [a, b] = range.split('-').map(Number)
    const nameA = names ? names[a] : a
    const nameB = names ? names[b] : b
    return `${nameA} 到 ${nameB}，每 ${step} ${unit}`
  }
  // list
  if (field.includes(',')) {
    return field.split(',').map(v => {
      const n = parseInt(v, 10)
      return names ? names[n] : n
    }).join('、')
  }
  return field
}
