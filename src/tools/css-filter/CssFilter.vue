<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">
      滤镜
    </h1>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Left: Controls -->
      <div class="flex flex-col gap-4">
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">预设</span></label>
          <div class="flex flex-wrap gap-1">
            <button
              v-for="p in presets"
              :key="p.name"
              class="btn btn-xs btn-outline"
              :title="p.css"
              @click="applyPreset(p)"
            >
              {{ p.name }}
            </button>
          </div>
        </div>
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">滤镜函数</span></label>
          <ul class="flex flex-col gap-1">
            <li
              v-for="(f, i) in filters"
              :key="i"
              class="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer"
              :class="i === selectedIndex ? 'bg-primary/10 border border-primary' : 'bg-base-200 border border-transparent hover:bg-base-300'"
              @click="selectedIndex = i"
            >
              <span class="font-mono text-xs flex-1 break-all">{{ filterSummary(f) }}</span>
              <button
                class="btn btn-ghost btn-xs"
                :disabled="filters.length <= 1"
                @click.stop="removeFilter(i)"
              >
                <Icon
                  icon="lucide:x"
                  class="w-3 h-3"
                />
              </button>
            </li>
          </ul>
          <details
            ref="addDetails"
            class="dropdown mt-2"
          >
            <summary class="btn btn-outline btn-sm cursor-pointer gap-1 w-fit">
              <Icon
                icon="lucide:plus"
                class="w-4 h-4"
              />
              添加滤镜
            </summary>
            <div class="dropdown-content mt-2 p-3 bg-base-200 rounded-lg shadow-lg flex flex-col gap-2 z-10 w-max">
              <div
                v-for="group in addGroups"
                :key="group.label"
              >
                <div class="text-xs font-semibold opacity-70 mb-1">
                  {{ group.label }}
                </div>
                <div class="flex flex-wrap gap-1">
                  <button
                    v-for="t in group.types"
                    :key="t.name"
                    class="btn btn-xs btn-ghost font-mono"
                    @click="addFilter(t.name)"
                  >
                    {{ t.name }}
                  </button>
                </div>
              </div>
            </div>
          </details>
          <button
            class="btn btn-ghost btn-sm gap-1 mt-2"
            @click="resetFilters"
          >
            <Icon
              icon="lucide:rotate-ccw"
              class="w-4 h-4"
            />
            重置
          </button>
        </div>

        <div
          v-if="selected"
          class="flex flex-col gap-4"
        >
          <div class="form-control flex flex-col gap-2">
            <label class="label"><span class="label-text font-semibold">滤镜类型</span></label>
            <select
              v-model="selected.type"
              class="select select-bordered select-sm"
            >
              <option
                v-for="t in filterTypes"
                :key="t.name"
                :value="t.name"
              >
                {{ t.name }} — {{ t.desc }}
              </option>
            </select>
          </div>

          <template v-if="selected.type === 'blur'">
            <range-row
              v-model="selected.value"
              label="半径"
              :min="0"
              :max="20"
              :step="0.1"
              unit="px"
            />
          </template>

          <template v-else-if="['brightness', 'contrast', 'saturate', 'opacity'].includes(selected.type)">
            <range-row
              v-model="selected.value"
              label="数值"
              :min="0"
              :max="3"
              :step="0.05"
              unit=""
              :format="(v) => Math.round(v * 100) + '%'"
            />
          </template>

          <template v-else-if="selected.type === 'grayscale' || selected.type === 'sepia' || selected.type === 'invert'">
            <range-row
              v-model="selected.value"
              label="数值"
              :min="0"
              :max="1"
              :step="0.05"
              unit=""
              :format="(v) => Math.round(v * 100) + '%'"
            />
          </template>

          <template v-else-if="selected.type === 'hue-rotate'">
            <range-row
              v-model="selected.value"
              label="角度"
              :min="0"
              :max="360"
              :step="1"
              unit="deg"
            />
          </template>

          <template v-else-if="selected.type === 'drop-shadow'">
            <range-row
              v-model="selected.x"
              label="X 偏移"
              :min="-50"
              :max="50"
              :step="1"
              unit="px"
            />
            <range-row
              v-model="selected.y"
              label="Y 偏移"
              :min="-50"
              :max="50"
              :step="1"
              unit="px"
            />
            <range-row
              v-model="selected.blur"
              label="模糊半径"
              :min="0"
              :max="50"
              :step="1"
              unit="px"
            />
            <div class="form-control">
              <label class="label"><span class="label-text font-semibold">颜色</span></label>
              <div class="flex items-center gap-2">
                <input
                  v-model="selected.color"
                  type="color"
                  class="input input-bordered w-12 h-10 p-1 cursor-pointer"
                >
                <input
                  v-model="selected.color"
                  type="text"
                  class="input input-bordered w-full font-mono text-sm"
                >
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- Right: Preview + Code -->
      <div class="flex flex-col gap-4">
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">预览</span></label>
          <div
            class="rounded-lg border border-base-300 min-h-[200px] flex items-center justify-center bg-base-200"
          >
            <img
              :src="sampleImage"
              alt="sample"
              class="max-h-[260px] rounded-lg"
              :style="{ filter: cssValue }"
            >
          </div>
        </div>
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">CSS 代码</span></label>
          <div class="relative">
            <pre class="bg-base-200 rounded-lg p-4 font-mono text-sm break-all whitespace-pre-wrap">{{ cssCode }}</pre>
            <button
              class="btn btn-ghost btn-xs btn-square absolute right-2 top-2"
              :title="copied ? '已复制！' : '复制'"
              @click="copyCode"
            >
              <Icon
                v-if="copied"
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
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Icon } from '@iconify/vue'
import { ref, computed, h } from 'vue'

const filterTypes = [
  { name: 'blur', desc: '高斯模糊' },
  { name: 'brightness', desc: '亮度' },
  { name: 'contrast', desc: '对比度' },
  { name: 'grayscale', desc: '灰度' },
  { name: 'hue-rotate', desc: '色相旋转' },
  { name: 'invert', desc: '反色' },
  { name: 'opacity', desc: '透明度' },
  { name: 'saturate', desc: '饱和度' },
  { name: 'sepia', desc: '棕褐色' },
  { name: 'drop-shadow', desc: '投影' },
]

const addGroups = [
  { label: '模糊', types: filterTypes.filter(t => t.name === 'blur') },
  { label: '颜色', types: filterTypes.filter(t => ['brightness', 'contrast', 'saturate', 'grayscale', 'sepia', 'invert', 'hue-rotate'].includes(t.name)) },
  { label: '透明', types: filterTypes.filter(t => t.name === 'opacity') },
  { label: '阴影', types: filterTypes.filter(t => t.name === 'drop-shadow') },
]

const defaultFilter = () => ({ type: 'blur', value: 4, x: 0, y: 8, blur: 12, color: '#000000' })

// Each preset is a list of filter objects matching the editor's shape.
const presets = [
  { name: '原图', filters: [] },
  { name: '模糊', filters: [{ type: 'blur', value: 4 }] },
  { name: '强模糊', filters: [{ type: 'blur', value: 10 }] },
  { name: '复古', filters: [{ type: 'sepia', value: 0.6 }, { type: 'contrast', value: 1.1 }, { type: 'brightness', value: 0.9 }] },
  { name: '黑白', filters: [{ type: 'grayscale', value: 1 }, { type: 'contrast', value: 1.1 }] },
  { name: '冷色', filters: [{ type: 'hue-rotate', value: 180 }, { type: 'saturate', value: 1.2 }] },
  { name: '暖色', filters: [{ type: 'sepia', value: 0.3 }, { type: 'saturate', value: 1.4 }] },
  { name: '高对比', filters: [{ type: 'contrast', value: 1.6 }, { type: 'brightness', value: 1.05 }] },
  { name: '高饱和', filters: [{ type: 'saturate', value: 2 }] },
  { name: '反色', filters: [{ type: 'invert', value: 1 }] },
  { name: '明亮', filters: [{ type: 'brightness', value: 1.4 }, { type: 'contrast', value: 1.1 }] },
  { name: '暗调', filters: [{ type: 'brightness', value: 0.7 }, { type: 'contrast', value: 1.2 }] },
  { name: '投影', filters: [{ type: 'drop-shadow', value: 0, x: 0, y: 8, blur: 16, color: '#000000' }] },
  { name: '梦幻', filters: [{ type: 'blur', value: 2 }, { type: 'brightness', value: 1.1 }, { type: 'saturate', value: 1.3 }] },
]

const filters = ref([defaultFilter()])
const selectedIndex = ref(0)
const copied = ref(false)
const addDetails = ref(null)

const selected = computed(() => filters.value[selectedIndex.value])

const sampleImage = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200">' +
  '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
  '<stop offset="0" stop-color="#f59e0b"/><stop offset="0.5" stop-color="#ec4899"/><stop offset="1" stop-color="#6366f1"/>' +
  '</linearGradient></defs>' +
  '<rect width="320" height="200" fill="url(#g)"/>' +
  '<circle cx="80" cy="100" r="40" fill="#ffffff" fill-opacity="0.85"/>' +
  '<rect x="160" y="60" width="120" height="80" rx="12" fill="#10b981"/>' +
  '<text x="160" y="180" font-family="sans-serif" font-size="20" fill="#fff" font-weight="bold">Filter</text>' +
  '</svg>'
)

function filterToCss(f) {
  switch (f.type) {
    case 'blur': return `blur(${f.value}px)`
    case 'brightness': return `brightness(${Math.round(f.value * 100)}%)`
    case 'contrast': return `contrast(${Math.round(f.value * 100)}%)`
    case 'grayscale': return `grayscale(${Math.round(f.value * 100)}%)`
    case 'hue-rotate': return `hue-rotate(${f.value}deg)`
    case 'invert': return `invert(${Math.round(f.value * 100)}%)`
    case 'opacity': return `opacity(${Math.round(f.value * 100)}%)`
    case 'saturate': return `saturate(${Math.round(f.value * 100)}%)`
    case 'sepia': return `sepia(${Math.round(f.value * 100)}%)`
    case 'drop-shadow': return `drop-shadow(${f.x}px ${f.y}px ${f.blur}px ${f.color})`
    default: return ''
  }
}

function filterSummary(f) {
  return filterToCss(f)
}

const cssValue = computed(() => filters.value.map(filterToCss).filter(Boolean).join(' '))

const cssCode = computed(() => `filter: ${cssValue.value};`)

function defaultFilterByType(type) {
  switch (type) {
    case 'blur': return { type, value: 3 }
    case 'brightness':
    case 'contrast':
    case 'saturate':
    case 'opacity': return { type, value: 1 }
    case 'grayscale':
    case 'sepia':
    case 'invert': return { type, value: 0 }
    case 'hue-rotate': return { type, value: 0 }
    case 'drop-shadow': return { type, value: 0, x: 0, y: 8, blur: 12, color: '#000000' }
    default: return { type, value: 0 }
  }
}

function addFilter(type) {
  filters.value.push(defaultFilterByType(type))
  selectedIndex.value = filters.value.length - 1
  if (addDetails.value) addDetails.value.removeAttribute('open')
}

function removeFilter(i) {
  if (filters.value.length <= 1) return
  filters.value.splice(i, 1)
  if (selectedIndex.value >= filters.value.length) {
    selectedIndex.value = filters.value.length - 1
  }
}

function resetFilters() {
  filters.value = [defaultFilter()]
  selectedIndex.value = 0
}

function applyPreset(p) {
  if (p.filters.length === 0) {
    filters.value = []
  } else {
    filters.value = p.filters.map(f => ({ ...f }))
  }
  selectedIndex.value = 0
}

async function copyCode() {
  try {
    await navigator.clipboard.writeText(cssCode.value)
    copied.value = true
    setTimeout(() => copied.value = false, 1500)
  } catch { /* clipboard not available */ }
}

// Inline range-row component to keep file self-contained
const RangeRow = {
  props: {
    modelValue: { type: Number, required: true },
    label: { type: String, required: true },
    min: { type: Number, required: true },
    max: { type: Number, required: true },
    step: { type: Number, default: 1 },
    unit: { type: String, default: '' },
    format: { type: Function, default: null },
  },
  emits: ['update:modelValue'],
  render() {
    const display = this.format ? this.format(this.modelValue) : `${this.modelValue}${this.unit}`
    return h('div', { class: 'form-control' }, [
      h('label', { class: 'label' }, [h('span', { class: 'label-text font-semibold' }, this.label)]),
      h('div', { class: 'flex items-center gap-2' }, [
        h('input', {
          type: 'range',
          class: 'range range-sm flex-1',
          min: this.min,
          max: this.max,
          step: this.step,
          value: this.modelValue,
          onInput: (e) => this.$emit('update:modelValue', Number(e.target.value)),
        }),
        h('span', { class: 'text-sm w-16 text-right' }, display),
      ]),
    ])
  },
}
const rangeRow = RangeRow
</script>
