<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">
      时间戳转换器
    </h1>

    <!-- Toolbar -->
    <div class="flex flex-wrap gap-2 mb-4">
      <button
        class="btn btn-sm"
        :class="isMillis ? 'btn-ghost' : 'btn-primary'"
        @click="setMillis(false)"
      >
        10 位 (秒)
      </button>
      <button
        class="btn btn-sm"
        :class="isMillis ? 'btn-primary' : 'btn-ghost'"
        @click="setMillis(true)"
      >
        13 位 (毫秒)
      </button>
    </div>

    <div class="flex flex-col gap-4 max-w-2xl">
      <div class="form-control">
        <label class="label"><span class="label-text font-semibold">Unix 时间戳</span></label>
        <div class="relative">
          <input
            v-model="timestamp"
            class="input input-bordered w-full font-mono text-sm"
            placeholder="e.g. 1718000000 or 1718000000000"
            @input="onTimestampChange"
          >
          <button
            v-if="timestamp"
            class="btn btn-ghost btn-xs btn-square absolute right-2 top-1/2 -translate-y-1/2"
            :title="tsCopied ? '已复制！' : '复制'"
            @click="copyTimestamp"
          >
            <Icon
              v-if="tsCopied"
              icon="lucide:check"
              class="w-4 h-4 text-success"
            />
            <Icon
              v-else
              icon="lucide:clipboard"
              class="w-4 h-4"
            />
          </button>
        </div>
        <p
          v-if="tsError"
          class="text-error text-sm mt-1"
        >
          {{ tsError }}
        </p>
      </div>

      <div class="flex justify-center opacity-40">
        <Icon
          icon="lucide:arrow-up-down"
          class="w-6 h-6"
        />
      </div>

      <div class="form-control">
        <label class="label"><span class="label-text font-semibold">日期时间</span></label>
        <div class="relative">
          <input
            v-model="datetime"
            class="input input-bordered w-full font-mono text-sm"
            placeholder="e.g. 2024-06-10 12:00:00"
            @input="onDatetimeChange"
          >
          <button
            v-if="datetime"
            class="btn btn-ghost btn-xs btn-square absolute right-2 top-1/2 -translate-y-1/2"
            :title="dtCopied ? '已复制！' : '复制'"
            @click="copyDatetime"
          >
            <Icon
              v-if="dtCopied"
              icon="lucide:check"
              class="w-4 h-4 text-success"
            />
            <Icon
              v-else
              icon="lucide:clipboard"
              class="w-4 h-4"
            />
          </button>
        </div>
        <p
          v-if="dtError"
          class="text-error text-sm mt-1"
        >
          {{ dtError }}
        </p>
      </div>

      <div class="flex justify-end">
        <button
          class="btn btn-ghost btn-sm gap-1"
          @click="clear"
        >
          <Icon
            icon="lucide:trash-2"
            class="w-4 h-4"
          />
          清空
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Icon } from '@iconify/vue'
import { ref, onMounted } from 'vue'
const timestamp = ref('')
const datetime = ref('')
const isMillis = ref(false)
const tsError = ref('')
const dtError = ref('')
const tsCopied = ref(false)
const dtCopied = ref(false)

function formatDt(d) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function fillNow() {
  const d = new Date()
  datetime.value = formatDt(d)
  timestamp.value = isMillis.value ? String(d.getTime()) : String(Math.floor(d.getTime() / 1000))
  tsError.value = ''
  dtError.value = ''
}

function setMillis(val) {
  if (isMillis.value === val) return
  const prevMs = resolveMs()
  isMillis.value = val
  if (prevMs !== null) {
    timestamp.value = val ? String(prevMs) : String(Math.floor(prevMs / 1000))
  } else {
    fillNow()
  }
}

function resolveMs() {
  const raw = timestamp.value.trim()
  if (!raw || !/^\d+$/.test(raw)) return null
  const num = Number(raw)
  const ms = isMillis.value ? num : num * 1000
  if (ms <= 0 || ms > 9999999999999) return null
  return ms
}

function onTimestampChange() {
  dtError.value = ''
  if (!timestamp.value) {
    datetime.value = ''
    return
  }
  const raw = timestamp.value.trim()
  if (!/^\d+$/.test(raw)) {
    dtError.value = '无效的时间戳（仅限数字）'
    return
  }
  const num = Number(raw)
  const ms = isMillis.value ? num : num * 1000
  if (ms <= 0 || ms > 9999999999999) {
    dtError.value = '时间戳超出范围'
    return
  }
  datetime.value = formatDt(new Date(ms))
}

function onDatetimeChange() {
  tsError.value = ''
  if (!datetime.value) {
    timestamp.value = ''
    return
  }
  const d = new Date(datetime.value.trim())
  if (isNaN(d.getTime())) {
    tsError.value = '无效的日期字符串'
    return
  }
  timestamp.value = isMillis.value ? String(d.getTime()) : String(Math.floor(d.getTime() / 1000))
}

function clear() {
  timestamp.value = ''
  datetime.value = ''
  tsError.value = ''
  dtError.value = ''
}

async function copyTimestamp() {
  try {
    await navigator.clipboard.writeText(timestamp.value)
    tsCopied.value = true
    setTimeout(() => tsCopied.value = false, 1500)
  } catch { /* clipboard not available */ }
}

async function copyDatetime() {
  try {
    await navigator.clipboard.writeText(datetime.value)
    dtCopied.value = true
    setTimeout(() => dtCopied.value = false, 1500)
  } catch { /* clipboard not available */ }
}

onMounted(fillNow)
</script>
