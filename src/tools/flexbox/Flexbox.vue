<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">
      Flexbox 可视化
    </h1>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Left: Controls -->
      <div class="flex flex-col gap-4">
        <!-- Container properties -->
        <div class="collapse collapse-arrow border border-base-300 bg-base-200">
          <input
            type="checkbox"
            checked
          >
          <div class="collapse-title font-semibold">
            容器属性
          </div>
          <div class="collapse-content flex flex-col gap-4">
            <div class="form-control">
              <label class="label"><span class="label-text font-semibold">flex-direction</span></label>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="opt in directions"
                  :key="opt.value"
                  class="btn btn-sm"
                  :class="opt.value === direction ? 'btn-primary' : 'btn-outline'"
                  @click="direction = opt.value"
                >
                  {{ opt.label }}
                </button>
              </div>
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text font-semibold">flex-wrap</span></label>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="opt in wraps"
                  :key="opt.value"
                  class="btn btn-sm"
                  :class="opt.value === wrap ? 'btn-primary' : 'btn-outline'"
                  @click="wrap = opt.value"
                >
                  {{ opt.label }}
                </button>
              </div>
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text font-semibold">justify-content</span></label>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="opt in justifyOptions"
                  :key="opt.value"
                  class="btn btn-sm"
                  :class="opt.value === justify ? 'btn-primary' : 'btn-outline'"
                  @click="justify = opt.value"
                >
                  {{ opt.label }}
                </button>
              </div>
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text font-semibold">align-items</span></label>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="opt in alignItemsOptions"
                  :key="opt.value"
                  class="btn btn-sm"
                  :class="opt.value === alignItems ? 'btn-primary' : 'btn-outline'"
                  @click="alignItems = opt.value"
                >
                  {{ opt.label }}
                </button>
              </div>
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text font-semibold">align-content</span></label>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="opt in alignContentOptions"
                  :key="opt.value"
                  class="btn btn-sm"
                  :class="opt.value === alignContent ? 'btn-primary' : 'btn-outline'"
                  @click="alignContent = opt.value"
                >
                  {{ opt.label }}
                </button>
              </div>
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text font-semibold">gap</span></label>
              <div class="flex items-center gap-2">
                <input
                  v-model.number="gap"
                  type="range"
                  min="0"
                  max="40"
                  class="range range-sm flex-1"
                >
                <span class="text-sm w-12 text-right">{{ gap }}px</span>
              </div>
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text font-semibold">容器尺寸</span></label>
              <div class="flex items-center gap-2">
                <span class="text-xs w-10">宽</span>
                <input
                  v-model.number="containerWidth"
                  type="range"
                  min="200"
                  max="500"
                  class="range range-sm flex-1"
                >
                <span class="text-sm w-12 text-right">{{ containerWidth }}px</span>
              </div>
              <div class="flex items-center gap-2 mt-2">
                <span class="text-xs w-10">高</span>
                <input
                  v-model.number="containerHeight"
                  type="range"
                  min="120"
                  max="400"
                  class="range range-sm flex-1"
                >
                <span class="text-sm w-12 text-right">{{ containerHeight }}px</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Items management -->
        <div class="collapse collapse-arrow border border-base-300 bg-base-200">
          <input
            type="checkbox"
            checked
          >
          <div class="collapse-title font-semibold">
            <span>子项 ({{ items.length }})</span>
          </div>
          <div class="collapse-content flex flex-col gap-4">
            <ul class="flex flex-col gap-1">
              <li
                v-for="(item, i) in items"
                :key="item.id"
                class="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer"
                :class="i === selectedIndex ? 'bg-primary/10 border border-primary' : 'bg-base-100 border border-transparent hover:bg-base-300'"
                @click="selectedIndex = i"
              >
                <span class="font-mono text-xs w-6">{{ i + 1 }}</span>
                <span class="font-mono text-xs flex-1 break-all">{{ itemSummary(item) }}</span>
                <button
                  class="btn btn-ghost btn-xs"
                  :disabled="items.length <= 1"
                  @click.stop="removeItem(i)"
                >
                  <Icon
                    icon="lucide:x"
                    class="w-3 h-3"
                  />
                </button>
              </li>
            </ul>
            <button
              class="btn btn-outline btn-sm gap-1"
              @click="addItem"
            >
              <Icon
                icon="lucide:plus"
                class="w-4 h-4"
              />
              添加子项
            </button>

            <!-- Selected item properties -->
            <template v-if="selected">
              <div class="divider my-1" />
              <div class="text-sm font-semibold">
                选中项 #{{ selectedIndex + 1 }} 属性
              </div>
              <div class="form-control">
                <label class="label"><span class="label-text font-semibold">flex-grow</span></label>
                <div class="flex items-center gap-2">
                  <input
                    v-model.number="selected.flexGrow"
                    type="range"
                    min="0"
                    max="5"
                    step="0.1"
                    class="range range-sm flex-1"
                  >
                  <span class="text-sm w-12 text-right">{{ selected.flexGrow }}</span>
                </div>
              </div>
              <div class="form-control">
                <label class="label"><span class="label-text font-semibold">flex-shrink</span></label>
                <div class="flex items-center gap-2">
                  <input
                    v-model.number="selected.flexShrink"
                    type="range"
                    min="0"
                    max="5"
                    step="0.1"
                    class="range range-sm flex-1"
                  >
                  <span class="text-sm w-12 text-right">{{ selected.flexShrink }}</span>
                </div>
              </div>
              <div class="form-control">
                <label class="label"><span class="label-text font-semibold">flex-basis</span></label>
                <div class="flex gap-2">
                  <input
                    v-model="selected.flexBasis"
                    type="text"
                    class="input input-bordered input-sm w-24 font-mono"
                  >
                  <button
                    class="btn btn-sm btn-outline"
                    @click="cycleBasisUnit(selected, 'px')"
                  >
                    px
                  </button>
                  <button
                    class="btn btn-sm btn-outline"
                    @click="cycleBasisUnit(selected, '%')"
                  >
                    %
                  </button>
                  <button
                    class="btn btn-sm btn-outline"
                    @click="selected.flexBasis = 'auto'"
                  >
                    auto
                  </button>
                </div>
              </div>
              <div class="form-control">
                <label class="label"><span class="label-text font-semibold">align-self</span></label>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="opt in alignSelfOptions"
                    :key="opt.value"
                    class="btn btn-sm"
                    :class="opt.value === selected.alignSelf ? 'btn-primary' : 'btn-outline'"
                    @click="selected.alignSelf = opt.value"
                  >
                    {{ opt.label }}
                  </button>
                </div>
              </div>
              <div class="form-control">
                <label class="label"><span class="label-text font-semibold">order</span></label>
                <div class="flex items-center gap-2">
                  <input
                    v-model.number="selected.order"
                    type="range"
                    min="-5"
                    max="10"
                    class="range range-sm flex-1"
                  >
                  <span class="text-sm w-12 text-right">{{ selected.order }}</span>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>

      <!-- Right: Preview + Code -->
      <div class="flex flex-col gap-4">
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">预览</span></label>
          <div
            class="rounded-lg border border-base-300 bg-base-100 p-4 flex items-center justify-center overflow-auto"
            style="min-height: 240px"
          >
            <div
              class="border-2 border-dashed border-primary/40 bg-primary/5 p-2"
              :style="containerStyle"
            >
              <div
                v-for="(item, i) in items"
                :key="item.id"
                class="flex items-center justify-center text-sm font-mono text-white rounded cursor-pointer select-none"
                :class="i === selectedIndex ? 'ring-2 ring-primary ring-offset-1' : ''"
                :style="itemStyle(item, i)"
                @click="selectedIndex = i"
              >
                {{ i + 1 }}
              </div>
            </div>
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
import { ref, computed } from 'vue'

const directions = [
  { value: 'row', label: 'row' },
  { value: 'row-reverse', label: 'row-reverse' },
  { value: 'column', label: 'column' },
  { value: 'column-reverse', label: 'column-reverse' },
]
const wraps = [
  { value: 'nowrap', label: 'nowrap' },
  { value: 'wrap', label: 'wrap' },
  { value: 'wrap-reverse', label: 'wrap-reverse' },
]
const justifyOptions = [
  { value: 'flex-start', label: 'flex-start' },
  { value: 'flex-end', label: 'flex-end' },
  { value: 'center', label: 'center' },
  { value: 'space-between', label: 'space-between' },
  { value: 'space-around', label: 'space-around' },
  { value: 'space-evenly', label: 'space-evenly' },
]
const alignItemsOptions = [
  { value: 'stretch', label: 'stretch' },
  { value: 'flex-start', label: 'flex-start' },
  { value: 'flex-end', label: 'flex-end' },
  { value: 'center', label: 'center' },
  { value: 'baseline', label: 'baseline' },
]
const alignContentOptions = [
  { value: 'stretch', label: 'stretch' },
  { value: 'flex-start', label: 'flex-start' },
  { value: 'flex-end', label: 'flex-end' },
  { value: 'center', label: 'center' },
  { value: 'space-between', label: 'space-between' },
  { value: 'space-around', label: 'space-around' },
]
const alignSelfOptions = [
  { value: 'auto', label: 'auto' },
  { value: 'stretch', label: 'stretch' },
  { value: 'flex-start', label: 'flex-start' },
  { value: 'flex-end', label: 'flex-end' },
  { value: 'center', label: 'center' },
  { value: 'baseline', label: 'baseline' },
]

const itemColors = [
  '#6366f1', '#ec4899', '#14b8a6', '#f59e0b',
  '#8b5cf6', '#ef4444', '#22c55e', '#0ea5e9',
]

let nextId = 1
function defaultItem() {
  return {
    id: nextId++,
    flexGrow: 0,
    flexShrink: 1,
    flexBasis: 'auto',
    alignSelf: 'auto',
    order: 0,
  }
}

const items = ref([defaultItem(), defaultItem(), defaultItem()])
const selectedIndex = ref(0)

const direction = ref('row')
const wrap = ref('nowrap')
const justify = ref('flex-start')
const alignItems = ref('stretch')
const alignContent = ref('stretch')
const gap = ref(8)
const containerWidth = ref(360)
const containerHeight = ref(220)

const copied = ref(false)

const selected = computed(() => items.value[selectedIndex.value])

const containerStyle = computed(() => ({
  display: 'flex',
  flexDirection: direction.value,
  flexWrap: wrap.value,
  justifyContent: justify.value,
  alignItems: alignItems.value,
  alignContent: alignContent.value,
  gap: `${gap.value}px`,
  width: `${containerWidth.value}px`,
  height: `${containerHeight.value}px`,
}))

function itemStyle(item, i) {
  const style = {
    flexGrow: item.flexGrow,
    flexShrink: item.flexShrink,
    flexBasis: item.flexBasis,
    alignSelf: item.alignSelf,
    order: item.order,
    backgroundColor: itemColors[i % itemColors.length],
  }
  if (direction.value === 'column') {
    style.padding = '6px 10px'
    style.minHeight = item.flexBasis === 'auto' && item.flexGrow === 0 ? '32px' : undefined
    style.minWidth = '60px'
  } else {
    style.padding = '10px 14px'
    style.minWidth = item.flexBasis === 'auto' && item.flexGrow === 0 ? '48px' : undefined
    style.minHeight = '32px'
  }
  return style
}

function itemSummary(item) {
  const parts = [`grow:${item.flexGrow}`, `shrink:${item.flexShrink}`]
  if (item.flexBasis !== 'auto') parts.push(`basis:${item.flexBasis}`)
  if (item.alignSelf !== 'auto') parts.push(`self:${item.alignSelf}`)
  if (item.order !== 0) parts.push(`order:${item.order}`)
  return parts.join(' ')
}

const cssCode = computed(() => {
  const lines = [
    '.container {',
    '  display: flex;',
    `  flex-direction: ${direction.value};`,
    `  flex-wrap: ${wrap.value};`,
    `  justify-content: ${justify.value};`,
    `  align-items: ${alignItems.value};`,
    `  align-content: ${alignContent.value};`,
    `  gap: ${gap.value}px;`,
    '}',
  ]
  items.value.forEach((item, i) => {
    const needLines = item.flexGrow !== 0 || item.flexShrink !== 1 || item.flexBasis !== 'auto' || item.alignSelf !== 'auto' || item.order !== 0
    if (!needLines) return
    lines.push(`.item-${i + 1} {`)
    if (item.flexGrow !== 0 || item.flexShrink !== 1 || item.flexBasis !== 'auto') {
      lines.push(`  flex: ${item.flexGrow} ${item.flexShrink} ${item.flexBasis};`)
    }
    if (item.alignSelf !== 'auto') lines.push(`  align-self: ${item.alignSelf};`)
    if (item.order !== 0) lines.push(`  order: ${item.order};`)
    lines.push('}')
  })
  return lines.join('\n')
})

function addItem() {
  items.value.push(defaultItem())
  selectedIndex.value = items.value.length - 1
}

function removeItem(i) {
  if (items.value.length <= 1) return
  items.value.splice(i, 1)
  if (selectedIndex.value >= items.value.length) {
    selectedIndex.value = items.value.length - 1
  }
}

function cycleBasisUnit(item, unit) {
  const numMatch = /^(\d+(?:\.\d+)?)/.exec(item.flexBasis)
  const num = numMatch ? numMatch[1] : '100'
  item.flexBasis = `${num}${unit}`
}

async function copyCode() {
  try {
    await navigator.clipboard.writeText(cssCode.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
  } catch { /* clipboard not available */ }
}
</script>
