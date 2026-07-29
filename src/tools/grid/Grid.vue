<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">
      Grid 可视化
    </h1>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Left: Controls (xl 及以上内部拆两栏) -->
      <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <!-- Container properties -->
        <div class="collapse collapse-arrow border border-base-300 bg-base-200">
          <input
            type="checkbox"
            checked
          >
          <div class="collapse-title font-semibold">
            <span>容器属性</span>
          </div>
          <div class="collapse-content flex flex-col gap-4">
            <div class="form-control">
              <label class="label"><span class="label-text font-semibold">grid-template-columns</span></label>
              <input
                v-model="templateColumns"
                type="text"
                class="input input-bordered input-sm w-full font-mono"
                placeholder="例如 1fr 2fr 1fr"
              >
              <div class="flex flex-wrap gap-1 mt-1">
                <button
                  v-for="preset in trackPresets"
                  :key="preset"
                  class="btn btn-xs btn-outline"
                  @click="templateColumns = preset"
                >
                  {{ preset }}
                </button>
              </div>
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text font-semibold">grid-template-rows</span></label>
              <input
                v-model="templateRows"
                type="text"
                class="input input-bordered input-sm w-full font-mono"
                placeholder="例如 auto auto"
              >
              <div class="flex flex-wrap gap-1 mt-1">
                <button
                  v-for="preset in trackPresets"
                  :key="preset"
                  class="btn btn-xs btn-outline"
                  @click="templateRows = preset"
                >
                  {{ preset }}
                </button>
              </div>
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text font-semibold">grid-auto-flow</span></label>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="opt in autoFlowOptions"
                  :key="opt.value"
                  class="btn btn-sm"
                  :class="opt.value === autoFlow ? 'btn-primary' : 'btn-outline'"
                  @click="autoFlow = opt.value"
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
              <label class="label"><span class="label-text font-semibold">justify-items</span></label>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="opt in justifyItemsOptions"
                  :key="opt.value"
                  class="btn btn-sm"
                  :class="opt.value === justifyItems ? 'btn-primary' : 'btn-outline'"
                  @click="justifyItems = opt.value"
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
              <label class="label"><span class="label-text font-semibold">justify-content</span></label>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="opt in justifyContentOptions"
                  :key="opt.value"
                  class="btn btn-sm"
                  :class="opt.value === justifyContent ? 'btn-primary' : 'btn-outline'"
                  @click="justifyContent = opt.value"
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
              <label class="label"><span class="label-text font-semibold">容器尺寸</span></label>
              <div class="flex items-center gap-2">
                <span class="text-xs w-10">宽</span>
                <input
                  v-model.number="containerWidth"
                  type="range"
                  min="240"
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
                  min="160"
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

            <template v-if="selected">
              <div class="divider my-1" />
              <div class="text-sm font-semibold">
                选中项 #{{ selectedIndex + 1 }} 属性
              </div>
              <div class="form-control">
                <label class="label flex-col items-start gap-0.5">
                  <span class="label-text font-semibold">grid-area</span>
                  <span class="label-text-alt font-mono text-xs opacity-60">row-start / col-start / row-end / col-end</span>
                </label>
                <input
                  v-model="selected.gridArea"
                  type="text"
                  class="input input-bordered input-sm w-full font-mono"
                  placeholder="auto"
                >
                <div class="flex flex-wrap gap-1 mt-1">
                  <button
                    class="btn btn-xs btn-outline"
                    @click="selected.gridArea = 'auto'"
                  >
                    auto
                  </button>
                  <button
                    class="btn btn-xs btn-outline"
                    @click="selected.gridArea = '1 / 1 / 2 / 2'"
                  >
                    1/1/2/2
                  </button>
                  <button
                    class="btn btn-xs btn-outline"
                    @click="selected.gridArea = '1 / 1 / 3 / 3'"
                  >
                    1/1/3/3
                  </button>
                </div>
              </div>
              <div class="form-control">
                <label class="label"><span class="label-text font-semibold">justify-self</span></label>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="opt in justifySelfOptions"
                    :key="opt.value"
                    class="btn btn-sm"
                    :class="opt.value === selected.justifySelf ? 'btn-primary' : 'btn-outline'"
                    @click="selected.justifySelf = opt.value"
                  >
                    {{ opt.label }}
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
            style="min-height: 280px"
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

const trackPresets = [
  '1fr 1fr',
  '1fr 2fr 1fr',
  'repeat(3, 1fr)',
  'repeat(4, 1fr)',
  '100px 1fr 100px',
  'auto auto auto',
]

const autoFlowOptions = [
  { value: 'row', label: 'row' },
  { value: 'column', label: 'column' },
  { value: 'row dense', label: 'row dense' },
  { value: 'column dense', label: 'column dense' },
]
const justifyItemsOptions = [
  { value: 'stretch', label: 'stretch' },
  { value: 'start', label: 'start' },
  { value: 'end', label: 'end' },
  { value: 'center', label: 'center' },
  { value: 'baseline', label: 'baseline' },
]
const alignItemsOptions = [
  { value: 'stretch', label: 'stretch' },
  { value: 'start', label: 'start' },
  { value: 'end', label: 'end' },
  { value: 'center', label: 'center' },
  { value: 'baseline', label: 'baseline' },
]
const justifyContentOptions = [
  { value: 'normal', label: 'normal' },
  { value: 'start', label: 'start' },
  { value: 'end', label: 'end' },
  { value: 'center', label: 'center' },
  { value: 'space-between', label: 'space-between' },
  { value: 'space-around', label: 'space-around' },
  { value: 'space-evenly', label: 'space-evenly' },
]
const alignContentOptions = [
  { value: 'normal', label: 'normal' },
  { value: 'start', label: 'start' },
  { value: 'end', label: 'end' },
  { value: 'center', label: 'center' },
  { value: 'space-between', label: 'space-between' },
  { value: 'space-around', label: 'space-around' },
  { value: 'space-evenly', label: 'space-evenly' },
]
const justifySelfOptions = [
  { value: 'auto', label: 'auto' },
  { value: 'stretch', label: 'stretch' },
  { value: 'start', label: 'start' },
  { value: 'end', label: 'end' },
  { value: 'center', label: 'center' },
]
const alignSelfOptions = [
  { value: 'auto', label: 'auto' },
  { value: 'stretch', label: 'stretch' },
  { value: 'start', label: 'start' },
  { value: 'end', label: 'end' },
  { value: 'center', label: 'center' },
]

const itemColors = [
  '#6366f1', '#ec4899', '#14b8a6', '#f59e0b',
  '#8b5cf6', '#ef4444', '#22c55e', '#0ea5e9',
]

let nextId = 1
function defaultItem() {
  return {
    id: nextId++,
    gridArea: 'auto',
    justifySelf: 'auto',
    alignSelf: 'auto',
    order: 0,
  }
}

const items = ref([defaultItem(), defaultItem(), defaultItem(), defaultItem()])
const selectedIndex = ref(0)

const templateColumns = ref('repeat(3, 1fr)')
const templateRows = ref('auto')
const autoFlow = ref('row')
const gap = ref(8)
const justifyItems = ref('stretch')
const alignItems = ref('stretch')
const justifyContent = ref('normal')
const alignContent = ref('normal')
const containerWidth = ref(360)
const containerHeight = ref(240)

const copied = ref(false)

const selected = computed(() => items.value[selectedIndex.value])

const containerStyle = computed(() => ({
  display: 'grid',
  gridTemplateColumns: templateColumns.value,
  gridTemplateRows: templateRows.value,
  gridAutoFlow: autoFlow.value,
  gap: `${gap.value}px`,
  justifyItems: justifyItems.value,
  alignItems: alignItems.value,
  justifyContent: justifyContent.value,
  alignContent: alignContent.value,
  width: `${containerWidth.value}px`,
  height: `${containerHeight.value}px`,
}))

function itemStyle(item, i) {
  return {
    gridArea: item.gridArea === 'auto' ? undefined : item.gridArea,
    justifySelf: item.justifySelf === 'auto' ? undefined : item.justifySelf,
    alignSelf: item.alignSelf === 'auto' ? undefined : item.alignSelf,
    order: item.order === 0 ? undefined : item.order,
    backgroundColor: itemColors[i % itemColors.length],
    padding: '10px 14px',
    minHeight: '36px',
    minWidth: '48px',
  }
}

function itemSummary(item) {
  const parts = []
  if (item.gridArea !== 'auto') parts.push(`area:${item.gridArea}`)
  if (item.justifySelf !== 'auto') parts.push(`j-self:${item.justifySelf}`)
  if (item.alignSelf !== 'auto') parts.push(`a-self:${item.alignSelf}`)
  if (item.order !== 0) parts.push(`order:${item.order}`)
  if (parts.length === 0) return 'auto'
  return parts.join(' ')
}

const cssCode = computed(() => {
  const lines = [
    '.container {',
    '  display: grid;',
    `  grid-template-columns: ${templateColumns.value};`,
    `  grid-template-rows: ${templateRows.value};`,
    `  grid-auto-flow: ${autoFlow.value};`,
    `  gap: ${gap.value}px;`,
    `  justify-items: ${justifyItems.value};`,
    `  align-items: ${alignItems.value};`,
    `  justify-content: ${justifyContent.value};`,
    `  align-content: ${alignContent.value};`,
    '}',
  ]
  items.value.forEach((item, i) => {
    const needLines = item.gridArea !== 'auto' || item.justifySelf !== 'auto' || item.alignSelf !== 'auto' || item.order !== 0
    if (!needLines) return
    lines.push(`.item-${i + 1} {`)
    if (item.gridArea !== 'auto') lines.push(`  grid-area: ${item.gridArea};`)
    if (item.justifySelf !== 'auto') lines.push(`  justify-self: ${item.justifySelf};`)
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

async function copyCode() {
  try {
    await navigator.clipboard.writeText(cssCode.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
  } catch { /* clipboard not available */ }
}
</script>
