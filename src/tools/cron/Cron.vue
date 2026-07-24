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
                <Icon
                  v-if="copiedIndex === i"
                  icon="lucide:check"
                  class="w-4 h-4 text-success"
                />
                <Icon
                  v-else
                  icon="lucide:clipboard"
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
import { Icon } from '@iconify/vue'
import { ref } from 'vue'
import { WEEKDAY_NAMES, parseCronExpr, describeCron, computeNextTimes } from './cron.js'

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
