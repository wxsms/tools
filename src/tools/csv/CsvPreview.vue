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
      <template v-else>
        <div class="flex items-center justify-between flex-wrap gap-2 text-sm mb-2">
          <div class="flex items-center gap-2">
            <span
              v-if="activeFilterCount > 0"
              class="badge badge-sm badge-primary"
            >筛选条件 {{ activeFilterCount }}</span>
            <button
              v-if="activeFilterCount > 0"
              class="btn btn-ghost btn-xs"
              @click="clearFilters"
            >
              清除
            </button>
          </div>
          <div class="flex items-center gap-3">
            <div class="dropdown dropdown-end">
              <button
                class="btn btn-sm gap-1"
                @click="toggleExportMenu"
              >
                导出
                <ChevronDownIcon class="w-4 h-4" />
              </button>
              <ul
                v-if="showExportMenu"
                class="dropdown-content menu menu-sm bg-base-100 rounded-box shadow z-20 w-40"
              >
                <li>
                  <button @click="doExport('json')">
                    JSON
                  </button>
                </li>
                <li>
                  <button @click="doExport('markdown')">
                    Markdown
                  </button>
                </li>
              </ul>
            </div>
            <div class="opacity-70">
              显示 {{ displayedRows.length }} 行 / 共 {{ dataRows.length }} 行
            </div>
          </div>
        </div>
        <div
          class="border border-base-content/10 rounded-lg overflow-auto csv-scroll-container"
          style="max-height: 600px;"
          @scroll="onScroll"
        >
          <div class="sticky top-0 bg-base-100 z-10 flex">
            <div
              v-for="(h, i) in headers"
              :key="i"
              class="csv-header-cell flex-1 px-2 py-1 border-b border-base-content/10 align-top cursor-pointer select-none"
              @click="toggleSort(i)"
            >
              <div class="font-semibold text-sm">
                {{ h }}
                <span class="opacity-70">{{ sortIcon(i) }}</span>
              </div>
              <div class="text-xs opacity-60">
                {{ types[i] }}
              </div>
              <div class="text-xs opacity-50">
                {{ formatStats(columnStatsList[i], types[i]) }}
              </div>
              <input
                v-model="filters[i]"
                class="csv-filter-input input input-xs input-bordered mt-1 w-full"
                placeholder="筛选..."
                @click.stop
              >
            </div>
          </div>
          <div
            class="relative csv-body"
            :style="{ height: bodyHeight + 'px' }"
          >
            <div
              v-for="item in visibleRows"
              :key="item.absoluteIndex"
              class="flex absolute left-0 right-0"
              data-row
              :style="{ top: (item.absoluteIndex * ROW_HEIGHT) + 'px', height: ROW_HEIGHT + 'px' }"
            >
              <div
                v-for="(cell, ci) in item.row"
                :key="ci"
                class="flex-1 px-2 truncate max-w-[200px] text-sm flex items-center"
                :title="String(cell ?? '')"
              >
                {{ cell }}
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
    <div
      v-if="copyToast"
      class="toast toast-top toast-center z-50"
    >
      <div class="alert alert-success">
        已复制
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import Papa from 'papaparse'
import {
  DocumentTextIcon,
  ArrowUpTrayIcon,
  TrashIcon,
  ArrowLeftIcon,
  ChevronDownIcon,
} from '@heroicons/vue/24/outline'
import {
  inferColumnType,
  columnStats,
  sortRows,
  filterRows,
  toJson,
  toMarkdown,
} from './csv.js'

const SAMPLE_CSV = [
  'name,age,score,active,joined,last_login',
  'Alice,30,95.5,true,2024-01-15,2024-12-01',
  'Bob,25,87.2,false,2023-11-20,2024-11-28',
  'Carol,35,92.8,true,2024-03-08,2024-12-10',
  'David,28,78.1,false,2024-02-11,2024-10-15',
  'Eve,40,88.9,true,2023-09-01,2024-12-09',
].join('\n')

const input = ref(SAMPLE_CSV)
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

const sortState = ref({ column: null, direction: null })
const filters = ref({})

const activeFilterCount = computed(() => {
  let n = 0
  for (const k of Object.keys(filters.value)) {
    if ((filters.value[k] || '').trim()) n++
  }
  return n
})

const filteredRows = computed(() => filterRows(dataRows.value, filters.value))

const displayedRows = computed(() => {
  if (sortState.value.column === null || sortState.value.direction === null) {
    return filteredRows.value
  }
  return sortRows(
    filteredRows.value,
    sortState.value.column,
    sortState.value.direction,
    types.value,
  )
})

function toggleSort(colIndex) {
  const cur = sortState.value
  if (cur.column !== colIndex) {
    sortState.value = { column: colIndex, direction: 'asc' }
    return
  }
  if (cur.direction === 'asc') {
    sortState.value = { column: colIndex, direction: 'desc' }
  } else if (cur.direction === 'desc') {
    sortState.value = { column: null, direction: null }
  } else {
    sortState.value = { column: colIndex, direction: 'asc' }
  }
}

function sortIcon(colIndex) {
  if (sortState.value.column !== colIndex) return ''
  if (sortState.value.direction === 'asc') return '↑'
  if (sortState.value.direction === 'desc') return '↓'
  return ''
}

function clearFilters() {
  filters.value = {}
}

const showExportMenu = ref(false)
const copyToast = ref(false)

async function doExport(format) {
  const text = format === 'json'
    ? toJson(displayedRows.value, headers.value)
    : toMarkdown(displayedRows.value, headers.value)
  try {
    await navigator.clipboard.writeText(text)
    copyToast.value = true
    setTimeout(() => { copyToast.value = false }, 1500)
  } catch {
    // clipboard 不可用，忽略
  }
  showExportMenu.value = false
}

function toggleExportMenu() {
  showExportMenu.value = !showExportMenu.value
}

const ROW_HEIGHT = 36
const BUFFER = 5
const VIEWPORT_HEIGHT = 600

const scrollTop = ref(0)

watch([filteredRows, sortState], () => {
  scrollTop.value = 0
})

const visibleRange = computed(() => {
  const total = displayedRows.value.length
  if (total === 0) return { start: 0, end: 0 }
  const start = Math.max(0, Math.floor(scrollTop.value / ROW_HEIGHT) - BUFFER)
  const end = Math.min(total, Math.ceil((scrollTop.value + VIEWPORT_HEIGHT) / ROW_HEIGHT) + BUFFER)
  return { start, end }
})

const visibleRows = computed(() => {
  const { start, end } = visibleRange.value
  return displayedRows.value.slice(start, end).map((row, i) => ({
    row,
    absoluteIndex: start + i,
  }))
})

const bodyHeight = computed(() => displayedRows.value.length * ROW_HEIGHT)

function onScroll(e) {
  scrollTop.value = e.target.scrollTop
}

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
  sortState.value = { column: null, direction: null }
  filters.value = {}
  scrollTop.value = 0
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
  sortState.value = { column: null, direction: null }
  filters.value = {}
  scrollTop.value = 0
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
