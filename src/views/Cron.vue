<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">
      Cron 表达式解析
    </h1>

    <div class="flex flex-col gap-4 max-w-2xl">
      <!-- Input -->
      <div class="form-control">
        <label class="label"><span class="label-text font-semibold">Cron 表达式</span></label>
        <input
          v-model="cronExpr"
          class="input input-bordered w-full font-mono text-sm"
          placeholder="* * * * *  (分 时 日 月 周)"
          @input="parseCron"
        >
      </div>

      <!-- Error -->
      <p
        v-if="error"
        class="text-error text-sm"
      >
        {{ error }}
      </p>

      <!-- Description -->
      <div
        v-if="description && !error"
        class="text-sm"
      >
        {{ description }}
      </div>

      <!-- Next execution times -->
      <div
        v-if="nextTimes.length && !error"
        class="card bg-base-200"
      >
        <div class="card-body">
          <span class="text-sm font-semibold mb-2">接下来 5 次执行时间</span>
          <ul class="flex flex-col gap-1">
            <li
              v-for="(t, i) in nextTimes"
              :key="i"
              class="flex items-center gap-2 group"
            >
              <code class="font-mono text-sm flex-1">{{ t }}</code>
              <button
                class="btn btn-ghost btn-xs btn-square opacity-0 group-hover:opacity-100 transition-opacity"
                :title="copiedIndex === i ? '已复制！' : '复制'"
                @click="copyIndex(i)"
              >
                <CheckIcon
                  v-if="copiedIndex === i"
                  class="w-4 h-4 text-success"
                />
                <ClipboardDocumentIcon
                  v-else
                  class="w-4 h-4"
                />
              </button>
            </li>
          </ul>
        </div>
      </div>

      <!-- Presets -->
      <div class="card bg-base-200">
        <div class="card-body">
          <span class="text-sm font-semibold mb-2">常用预设</span>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="p in presets"
              :key="p.expr"
              class="btn btn-sm"
              :class="cronExpr === p.expr ? 'btn-primary' : ''"
              @click="applyPreset(p.expr)"
            >
              {{ p.label }}
            </button>
          </div>
        </div>
      </div>

      <!-- Visual builder -->
      <div class="card bg-base-200">
        <div class="card-body">
          <span class="text-sm font-semibold mb-3">可视化构建</span>
          <div class="flex items-end gap-2">
            <div
              v-for="f in fields"
              :key="f.key"
              class="flex-1 min-w-0"
            >
              <label class="label py-1"><span class="label-text text-xs">{{ f.label }}</span></label>
              <select
                v-model="selectValues[f.key]"
                class="select select-bordered select-sm w-full"
                @change="onSelectChange"
              >
                <option
                  v-for="opt in f.options"
                  :key="opt.value"
                  :value="opt.value"
                >
                  {{ opt.label }}
                </option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ClipboardDocumentIcon, CheckIcon } from '@heroicons/vue/24/outline'

const cronExpr = ref('* * * * *')
const description = ref('')
const nextTimes = ref([])
const error = ref('')
const copiedIndex = ref(-1)

// Select values for visual builder
const selectValues = ref({
  min: '*',
  hour: '*',
  day: '*',
  month: '*',
  weekday: '*',
})

// Field definitions for visual builder
function stepOpts(base, steps) {
  return steps.map(s => ({ value: `*/${s}`, label: `每 ${s} ${base}` }))
}

function rangeOpts(start, end, unit) {
  const opts = [{ value: '*', label: `每${unit}` }]
  opts.push(...stepOpts(unit, unit === '分' ? [2, 5, 10, 15, 30] : unit === '时' ? [2, 6, 12] : []))
  for (let i = start; i <= end; i++) {
    opts.push({ value: String(i), label: `${i}` })
  }
  return opts
}

const WEEKDAY_NAMES = ['日', '一', '二', '三', '四', '五', '六']

const fields = [
  { key: 'min', label: '分', options: rangeOpts(0, 59, '分') },
  { key: 'hour', label: '时', options: rangeOpts(0, 23, '时') },
  { key: 'day', label: '日', options: rangeOpts(1, 31, '日') },
  { key: 'month', label: '月', options: rangeOpts(1, 12, '月') },
  { key: 'weekday', label: '周', options: (() => {
    const opts = [{ value: '*', label: '每周' }, { value: '*/2', label: '每 2 周' }]
    for (let i = 0; i <= 6; i++) {
      opts.push({ value: String(i), label: `周${WEEKDAY_NAMES[i]}` })
    }
    return opts
  })() },
]

const presets = [
  { label: '每分钟', expr: '* * * * *' },
  { label: '每5分钟', expr: '*/5 * * * *' },
  { label: '每10分钟', expr: '*/10 * * * *' },
  { label: '每30分钟', expr: '*/30 * * * *' },
  { label: '每小时', expr: '0 * * * *' },
  { label: '每2小时', expr: '0 */2 * * *' },
  { label: '每6小时', expr: '0 */6 * * *' },
  { label: '每天零点', expr: '0 0 * * *' },
  { label: '每天8点', expr: '0 8 * * *' },
  { label: '每天12点', expr: '0 12 * * *' },
  { label: '每周一零点', expr: '0 0 * * 1' },
  { label: '工作日9点', expr: '0 9 * * 1-5' },
  { label: '每月1号零点', expr: '0 0 1 * *' },
  { label: '每月15号0点', expr: '0 0 15 * *' },
]

// --- Cron parser ---

const FIELD_RANGES = [
  { min: 0, max: 59 }, // min
  { min: 0, max: 23 }, // hour
  { min: 1, max: 31 }, // day
  { min: 1, max: 12 }, // month
  { min: 0, max: 6 },  // weekday
]

function parseField(field, rangeIdx) {
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

function parseCronExpr(expr) {
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

function computeNextTimes(sets, count = 5) {
  const results = []
  const now = new Date()
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

function formatDatetime(d) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

// --- Human-readable description ---

const MONTH_NAMES = ['', '1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

function describeCron(expr) {
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

function describeFieldSimple(field, unit, names) {
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

// --- Actions ---

function parseCron() {
  error.value = ''
  description.value = ''
  nextTimes.value = []

  if (!cronExpr.value.trim()) return

  const result = parseCronExpr(cronExpr.value)
  if (result.error) {
    error.value = result.error
    return
  }

  description.value = describeCron(cronExpr.value)
  nextTimes.value = computeNextTimes(result.sets, 5)

  // Sync select values from expression
  syncSelectsFromExpr(cronExpr.value)
}

function syncSelectsFromExpr(expr) {
  const parts = expr.trim().split(/\s+/)
  if (parts.length !== 5) return
  const keys = ['min', 'hour', 'day', 'month', 'weekday']
  for (let i = 0; i < 5; i++) {
    const val = parts[i]
    const fieldDef = fields[i]
    // Find matching option
    const match = fieldDef.options.find(o => o.value === val)
    if (match) {
      selectValues.value[keys[i]] = val
    }
    // If no exact match, leave select as-is (custom value not in dropdown)
  }
}

function applyPreset(expr) {
  cronExpr.value = expr
  parseCron()
}

function onSelectChange() {
  const keys = ['min', 'hour', 'day', 'month', 'weekday']
  cronExpr.value = keys.map(k => selectValues.value[k]).join(' ')
  parseCron()
}

async function copyIndex(i) {
  try {
    await navigator.clipboard.writeText(nextTimes.value[i])
    copiedIndex.value = i
    setTimeout(() => copiedIndex.value = -1, 1500)
  } catch { /* clipboard not available */ }
}

// Initialize
parseCron()
</script>
