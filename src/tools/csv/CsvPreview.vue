<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">
      CSV 预览
    </h1>

    <!-- idle / error: 输入区 -->
    <div
      v-if="state !== 'loaded'"
      class="flex flex-col gap-4"
    >
      <div class="form-control">
        <textarea
          v-model="input"
          class="textarea textarea-bordered w-full font-mono text-sm"
          :class="{ 'textarea-error': state === 'error' }"
          placeholder="粘贴 CSV 内容..."
          rows="12"
        />
      </div>
      <div class="flex items-center gap-2">
        <button
          class="btn btn-primary btn-sm gap-1"
          :disabled="!input.trim()"
          @click="parse"
        >
          <DocumentTextIcon class="w-4 h-4" />
          解析
        </button>
        <label class="btn btn-sm gap-1">
          <ArrowUpTrayIcon class="w-4 h-4" />
          上传文件
          <input
            type="file"
            accept=".csv,.txt"
            class="hidden"
            @change="onFileUpload"
          >
        </label>
        <button
          class="btn btn-ghost btn-sm gap-1"
          @click="clear"
        >
          <TrashIcon class="w-4 h-4" />
          清空
        </button>
      </div>
      <p
        v-if="state === 'error'"
        class="text-error text-sm"
      >
        CSV 解析失败：{{ error }}
      </p>
      <p class="text-xs opacity-50">
        RFC 4180 标准 CSV（逗号分隔，首行作为表头，自动识别换行符与 BOM）
      </p>
    </div>

    <!-- loaded: 摘要条 + 占位（表格由后续任务补全） -->
    <div
      v-else
      class="flex flex-col gap-4"
    >
      <div class="flex items-center justify-between flex-wrap gap-2 text-sm">
        <div class="flex items-center gap-3">
          <span class="font-semibold">{{ fileName || '已加载' }}</span>
          <span class="opacity-70">{{ dataRows.length }} 行 × {{ headers.length }} 列</span>
          <span
            v-if="typeSummary"
            class="opacity-50"
          >{{ typeSummary }}</span>
        </div>
        <button
          class="btn btn-ghost btn-sm gap-1"
          @click="backToInput"
        >
          <ArrowLeftIcon class="w-4 h-4" />
          更换
        </button>
      </div>
      <div
        v-if="dataRows.length === 0"
        class="text-base-content/40 text-sm"
      >
        无数据行
      </div>
      <div
        v-else
        class="border border-base-content/10 rounded-lg overflow-auto"
      >
        <div class="sticky top-0 bg-base-100 z-10 flex">
          <div
            v-for="(h, i) in headers"
            :key="i"
            class="flex-1 px-2 py-1 border-b border-base-content/10 align-top"
          >
            <div class="font-semibold text-sm">
              {{ h }}
            </div>
            <div class="text-xs opacity-60">
              {{ types[i] }}
            </div>
            <div class="text-xs opacity-50">
              {{ formatStats(columnStatsList[i], types[i]) }}
            </div>
          </div>
        </div>
        <div class="csv-body">
          <div
            v-for="(row, ri) in dataRows"
            :key="ri"
            class="flex"
            data-row
          >
            <div
              v-for="(cell, ci) in row"
              :key="ci"
              class="flex-1 px-2 truncate max-w-[200px] text-sm flex items-center"
              :title="String(cell ?? '')"
            >
              {{ cell }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import Papa from 'papaparse'
import {
  DocumentTextIcon,
  ArrowUpTrayIcon,
  TrashIcon,
  ArrowLeftIcon,
} from '@heroicons/vue/24/outline'
import { inferColumnType, columnStats } from './csv.js'

const input = ref('')
const fileName = ref('')
const state = ref('idle') // 'idle' | 'loaded' | 'error'
const error = ref('')
const headers = ref([])
const dataRows = ref([])
const types = ref([])

const columnStatsList = computed(() =>
  headers.value.map((_, i) =>
    columnStats(dataRows.value.map(r => r[i]), types.value[i])
  )
)

function formatStats(stats, type) {
  if (!stats || Object.keys(stats).length === 0) return ''
  if (type === 'integer' || type === 'float') {
    return `min:${stats.min} max:${stats.max} avg:${stats.avg}`
  }
  if (type === 'date') return `min:${stats.min} max:${stats.max}`
  if (type === 'boolean') return `T:${stats.true} F:${stats.false}`
  return `unique:${stats.unique}`
}

const typeSummary = computed(() => {
  if (types.value.length === 0) return ''
  const counts = {}
  for (const t of types.value) {
    counts[t] = (counts[t] || 0) + 1
  }
  return Object.entries(counts)
    .map(([k, v]) => `${k} ${v}`)
    .join(' / ')
})

function parse() {
  const result = Papa.parse(input.value, {
    header: false,
    skipEmptyLines: true,
  })
  if (result.errors && result.errors.length > 0) {
    state.value = 'error'
    error.value = result.errors[0].message
    return
  }
  const data = result.data
  if (!data || data.length === 0) {
    state.value = 'error'
    error.value = '空内容'
    return
  }
  headers.value = data[0]
  dataRows.value = data.slice(1)
  types.value = headers.value.map((_, i) =>
    inferColumnType(dataRows.value.map(r => r[i]))
  )
  // 兜底：补齐短行长度
  for (const row of dataRows.value) {
    while (row.length < headers.value.length) row.push('')
  }
  state.value = 'loaded'
  error.value = ''
}

function backToInput() {
  state.value = 'idle'
}

function clear() {
  input.value = ''
  fileName.value = ''
  state.value = 'idle'
  error.value = ''
  headers.value = []
  dataRows.value = []
  types.value = []
}

function onFileUpload(e) {
  const file = e.target.files[0]
  if (!file) return
  fileName.value = file.name
  const reader = new FileReader()
  reader.onload = () => {
    input.value = String(reader.result || '')
  }
  reader.readAsText(file)
  // 重置 input 以便选同名文件再次触发 change
  e.target.value = ''
}
</script>
