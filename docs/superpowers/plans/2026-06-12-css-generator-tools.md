# 4 CSS Generator Tools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 4 CSS visual generator tools (Box Shadow, Gradient, Border Radius, Triangle) with left-right split layout to wxsm's Kit.

**Architecture:** Each tool is an independent `.vue` file under `src/views/`. All use a common left-right split layout pattern (`grid grid-cols-1 lg:grid-cols-2 gap-6`). Registration requires 3 touches per tool: view file, router entry, tools.js sidebar entry. A new "CSS" sidebar group holds all 4 tools.

**Tech Stack:** Vue 3 Composition API, Tailwind CSS 4, DaisyUI 5, @heroicons/vue 24/outline, Vitest + @vue/test-utils for tests.

---

## File Structure

| Action | File | Purpose |
|--------|------|---------|
| Create | `src/views/BoxShadow.vue` | Box Shadow generator view |
| Create | `src/views/BoxShadow.test.js` | Box Shadow tests |
| Create | `src/views/Gradient.vue` | Gradient generator view |
| Create | `src/views/Gradient.test.js` | Gradient tests |
| Create | `src/views/BorderRadius.vue` | Border Radius generator view |
| Create | `src/views/BorderRadius.test.js` | Border Radius tests |
| Create | `src/views/Triangle.vue` | Triangle generator view |
| Create | `src/views/Triangle.test.js` | Triangle tests |
| Modify | `src/router.js` | Add 4 routes with `meta: { wide: true }` |
| Modify | `src/tools.js` | Add "CSS" group with 4 tools + icon imports |

---

### Task 1: Box Shadow Generator

**Files:**
- Create: `src/views/BoxShadow.vue`
- Create: `src/views/BoxShadow.test.js`

- [ ] **Step 1: Create `src/views/BoxShadow.vue`**

```vue
<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">盒阴影</h1>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Left: Controls -->
      <div class="flex flex-col gap-4">
        <!-- Shadow list -->
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">阴影列表</span></label>
          <ul class="flex flex-col gap-1">
            <li
              v-for="(shadow, i) in shadows"
              :key="i"
              class="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer"
              :class="i === selectedIndex ? 'bg-primary/10 border border-primary' : 'bg-base-200 border border-transparent hover:bg-base-300'"
              @click="selectedIndex = i"
            >
              <span class="font-mono text-xs flex-1 break-all">{{ shadowSummary(shadow) }}</span>
              <button
                class="btn btn-ghost btn-xs"
                :disabled="shadows.length <= 1"
                @click.stop="removeShadow(i)"
              >
                <XMarkIcon class="w-3 h-3" />
              </button>
            </li>
          </ul>
          <button
            class="btn btn-outline btn-sm mt-2 gap-1"
            @click="addShadow"
          >
            <PlusIcon class="w-4 h-4" />
            添加阴影
          </button>
        </div>

        <!-- Selected shadow params -->
        <template v-if="selected">
          <div class="form-control">
            <label class="label"><span class="label-text font-semibold">X 偏移</span></label>
            <div class="flex items-center gap-2">
              <input
                v-model.number="selected.x"
                type="range"
                min="-100"
                max="100"
                class="range range-sm flex-1"
              >
              <span class="text-sm w-12 text-right">{{ selected.x }}px</span>
            </div>
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text font-semibold">Y 偏移</span></label>
            <div class="flex items-center gap-2">
              <input
                v-model.number="selected.y"
                type="range"
                min="-100"
                max="100"
                class="range range-sm flex-1"
              >
              <span class="text-sm w-12 text-right">{{ selected.y }}px</span>
            </div>
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text font-semibold">模糊半径</span></label>
            <div class="flex items-center gap-2">
              <input
                v-model.number="selected.blur"
                type="range"
                min="0"
                max="200"
                class="range range-sm flex-1"
              >
              <span class="text-sm w-12 text-right">{{ selected.blur }}px</span>
            </div>
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text font-semibold">扩散半径</span></label>
            <div class="flex items-center gap-2">
              <input
                v-model.number="selected.spread"
                type="range"
                min="-100"
                max="100"
                class="range range-sm flex-1"
              >
              <span class="text-sm w-12 text-right">{{ selected.spread }}px</span>
            </div>
          </div>
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
          <div class="form-control">
            <label class="label"><span class="label-text font-semibold">透明度</span></label>
            <div class="flex items-center gap-2">
              <input
                v-model.number="selected.opacity"
                type="range"
                min="0"
                max="1"
                step="0.05"
                class="range range-sm flex-1"
              >
              <span class="text-sm w-12 text-right">{{ Math.round(selected.opacity * 100) }}%</span>
            </div>
          </div>
          <div class="form-control">
            <label class="label cursor-pointer justify-start gap-3">
              <input
                v-model="selected.inset"
                type="checkbox"
                class="checkbox checkbox-sm checkbox-primary"
              >
              <span class="label-text font-semibold">Inset（内阴影）</span>
            </label>
          </div>
        </template>
      </div>

      <!-- Right: Preview + Code -->
      <div class="flex flex-col gap-4">
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">预览</span></label>
          <div
            class="rounded-lg border border-base-300 min-h-[200px] flex items-center justify-center"
            :style="{ backgroundImage: checkerboard }"
          >
            <div
              class="w-32 h-32 bg-white rounded-lg"
              :style="{ boxShadow: cssValue }"
            />
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
              <CheckIcon v-if="copied" class="w-4 h-4 text-success" />
              <ClipboardDocumentIcon v-else class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { PlusIcon, XMarkIcon, ClipboardDocumentIcon, CheckIcon } from '@heroicons/vue/24/outline'

const defaultShadow = () => ({ x: 5, y: 5, blur: 15, spread: 0, color: '#000000', opacity: 0.3, inset: false })

const shadows = ref([defaultShadow()])
const selectedIndex = ref(0)
const copied = ref(false)

const selected = computed(() => shadows.value[selectedIndex.value])

const checkerboard = "url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"20\" height=\"20\"><rect width=\"10\" height=\"10\" fill=\"%23f0f0f0\"/><rect x=\"10\" y=\"10\" width=\"10\" height=\"10\" fill=\"%23f0f0f0\"/><rect x=\"10\" width=\"10\" height=\"10\" fill=\"%23e0e0e0\"/><rect y=\"10\" width=\"10\" height=\"10\" fill=\"%23e0e0e0\"/></svg>')"

function shadowToCss(s) {
  const rgba = hexToRgba(s.color, s.opacity)
  const parts = [`${s.x}px`, `${s.y}px`, `${s.blur}px`, `${s.spread}px`, rgba]
  if (s.inset) parts.unshift('inset')
  return parts.join(' ')
}

function hexToRgba(hex, opacity) {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}

function shadowSummary(s) {
  let str = `${s.x}px ${s.y}px ${s.blur}px`
  if (s.spread !== 0) str += ` ${s.spread}px`
  if (s.inset) str = 'inset ' + str
  return str
}

const cssValue = computed(() => shadows.value.map(shadowToCss).join(', '))

const cssCode = computed(() => `box-shadow: ${cssValue.value};`)

function addShadow() {
  shadows.value.push(defaultShadow())
  selectedIndex.value = shadows.value.length - 1
}

function removeShadow(i) {
  if (shadows.value.length <= 1) return
  shadows.value.splice(i, 1)
  if (selectedIndex.value >= shadows.value.length) {
    selectedIndex.value = shadows.value.length - 1
  }
}

async function copyCode() {
  try {
    await navigator.clipboard.writeText(cssCode.value)
    copied.value = true
    setTimeout(() => copied.value = false, 1500)
  } catch { /* clipboard not available */ }
}
</script>
```

- [ ] **Step 2: Create `src/views/BoxShadow.test.js`**

```js
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BoxShadow from './BoxShadow.vue'

function mountComponent() {
  return mount(BoxShadow)
}

describe('BoxShadow', () => {
  it('renders title', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('盒阴影')
  })

  it('shows default shadow in list', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('5px 5px 15px')
  })

  it('has range sliders for shadow params', () => {
    const wrapper = mountComponent()
    const ranges = wrapper.findAll('input[type="range"]')
    expect(ranges.length).toBeGreaterThanOrEqual(5)
  })

  it('shows add shadow button', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('添加阴影')
  })

  it('generates CSS code with box-shadow', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('box-shadow:')
  })

  it('shows preview card', () => {
    const wrapper = mountComponent()
    const preview = wrapper.find('.bg-white.rounded-lg')
    expect(preview.exists()).toBe(true)
  })
})
```

- [ ] **Step 3: Run test**

Run: `npx vitest run src/views/BoxShadow.test.js`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add src/views/BoxShadow.vue src/views/BoxShadow.test.js
git commit -m "Add box shadow generator tool"
```

---

### Task 2: Gradient Generator

**Files:**
- Create: `src/views/Gradient.vue`
- Create: `src/views/Gradient.test.js`

- [ ] **Step 1: Create `src/views/Gradient.vue`**

```vue
<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">渐变</h1>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Left: Controls -->
      <div class="flex flex-col gap-4">
        <!-- Gradient type -->
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">渐变类型</span></label>
          <div class="flex gap-2">
            <label
              v-for="t in types"
              :key="t.value"
              class="flex items-center gap-2 cursor-pointer"
            >
              <input
                v-model="type"
                type="radio"
                name="gradient-type"
                :value="t.value"
                class="radio radio-sm radio-primary"
              >
              <span class="text-sm">{{ t.label }}</span>
            </label>
          </div>
        </div>

        <!-- Direction controls -->
        <div v-if="type === 'linear'" class="form-control">
          <label class="label"><span class="label-text font-semibold">角度</span></label>
          <div class="flex items-center gap-2">
            <input
              v-model.number="angle"
              type="range"
              min="0"
              max="360"
              class="range range-sm flex-1"
            >
            <span class="text-sm w-12 text-right">{{ angle }}&deg;</span>
          </div>
        </div>

        <template v-if="type === 'radial'">
          <div class="form-control">
            <label class="label"><span class="label-text font-semibold">形状</span></label>
            <div class="flex gap-2">
              <label
                v-for="s in shapes"
                :key="s.value"
                class="flex items-center gap-2 cursor-pointer"
              >
                <input
                  v-model="shape"
                  type="radio"
                  name="radial-shape"
                  :value="s.value"
                  class="radio radio-sm radio-primary"
                >
                <span class="text-sm">{{ s.label }}</span>
              </label>
            </div>
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text font-semibold">位置</span></label>
            <select
              v-model="position"
              class="select select-bordered select-sm w-full"
            >
              <option
                v-for="p in positions"
                :key="p.value"
                :value="p.value"
              >
                {{ p.label }}
              </option>
            </select>
          </div>
        </template>

        <template v-if="type === 'conic'">
          <div class="form-control">
            <label class="label"><span class="label-text font-semibold">起始角度</span></label>
            <div class="flex items-center gap-2">
              <input
                v-model.number="startAngle"
                type="range"
                min="0"
                max="360"
                class="range range-sm flex-1"
              >
              <span class="text-sm w-12 text-right">{{ startAngle }}&deg;</span>
            </div>
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text font-semibold">位置</span></label>
            <select
              v-model="position"
              class="select select-bordered select-sm w-full"
            >
              <option
                v-for="p in positions"
                :key="p.value"
                :value="p.value"
              >
                {{ p.label }}
              </option>
            </select>
          </div>
        </template>

        <!-- Color stops -->
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">色标</span></label>
          <ul class="flex flex-col gap-1">
            <li
              v-for="(stop, i) in stops"
              :key="i"
              class="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer"
              :class="i === selectedStopIndex ? 'bg-primary/10 border border-primary' : 'bg-base-200 border border-transparent hover:bg-base-300'"
              @click="selectedStopIndex = i"
            >
              <span
                class="w-4 h-4 rounded-sm border border-base-300 shrink-0"
                :style="{ backgroundColor: stop.color }"
              />
              <span class="font-mono text-xs flex-1">{{ stop.color }} {{ stop.position }}%</span>
              <button
                class="btn btn-ghost btn-xs"
                :disabled="stops.length <= 2"
                @click.stop="removeStop(i)"
              >
                <XMarkIcon class="w-3 h-3" />
              </button>
            </li>
          </ul>
          <button
            class="btn btn-outline btn-sm mt-2 gap-1"
            @click="addStop"
          >
            <PlusIcon class="w-4 h-4" />
            添加色标
          </button>
        </div>

        <!-- Selected stop detail -->
        <template v-if="selectedStop">
          <div class="form-control">
            <label class="label"><span class="label-text font-semibold">色标颜色</span></label>
            <div class="flex items-center gap-2">
              <input
                v-model="selectedStop.color"
                type="color"
                class="input input-bordered w-12 h-10 p-1 cursor-pointer"
              >
              <input
                v-model="selectedStop.color"
                type="text"
                class="input input-bordered w-full font-mono text-sm"
              >
            </div>
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text font-semibold">色标位置</span></label>
            <div class="flex items-center gap-2">
              <input
                v-model.number="selectedStop.position"
                type="range"
                min="0"
                max="100"
                class="range range-sm flex-1"
              >
              <span class="text-sm w-12 text-right">{{ selectedStop.position }}%</span>
            </div>
          </div>
        </template>
      </div>

      <!-- Right: Preview + Code -->
      <div class="flex flex-col gap-4">
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">预览</span></label>
          <div
            class="rounded-lg border border-base-300 min-h-[120px]"
            :style="{ background: cssValue }"
          />
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
              <CheckIcon v-if="copied" class="w-4 h-4 text-success" />
              <ClipboardDocumentIcon v-else class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { PlusIcon, XMarkIcon, ClipboardDocumentIcon, CheckIcon } from '@heroicons/vue/24/outline'

const types = [
  { value: 'linear', label: '线性' },
  { value: 'radial', label: '径向' },
  { value: 'conic', label: '锥形' },
]

const shapes = [
  { value: 'circle', label: 'circle' },
  { value: 'ellipse', label: 'ellipse' },
]

const positions = [
  { value: 'center', label: 'center' },
  { value: 'top', label: 'top' },
  { value: 'bottom', label: 'bottom' },
  { value: 'left', label: 'left' },
  { value: 'right', label: 'right' },
  { value: 'top left', label: 'top left' },
  { value: 'top right', label: 'top right' },
  { value: 'bottom left', label: 'bottom left' },
  { value: 'bottom right', label: 'bottom right' },
]

const type = ref('linear')
const angle = ref(90)
const shape = ref('circle')
const position = ref('center')
const startAngle = ref(0)
const stops = ref([
  { color: '#6366f1', position: 0 },
  { color: '#ec4899', position: 100 },
])
const selectedStopIndex = ref(0)
const copied = ref(false)

const selectedStop = computed(() => stops.value[selectedStopIndex.value])

const stopsStr = computed(() => stops.value.map(s => `${s.color} ${s.position}%`).join(', '))

const cssValue = computed(() => {
  if (type.value === 'linear') {
    return `linear-gradient(${angle.value}deg, ${stopsStr.value})`
  } else if (type.value === 'radial') {
    return `radial-gradient(${shape.value} at ${position.value}, ${stopsStr.value})`
  } else {
    return `conic-gradient(from ${startAngle.value}deg at ${position.value}, ${stopsStr.value})`
  }
})

const cssCode = computed(() => `background: ${cssValue.value};`)

function addStop() {
  const lastPos = stops.value[stops.value.length - 1]?.position ?? 100
  stops.value.push({ color: '#ffffff', position: Math.min(lastPos, 100) })
  selectedStopIndex.value = stops.value.length - 1
}

function removeStop(i) {
  if (stops.value.length <= 2) return
  stops.value.splice(i, 1)
  if (selectedStopIndex.value >= stops.value.length) {
    selectedStopIndex.value = stops.value.length - 1
  }
}

async function copyCode() {
  try {
    await navigator.clipboard.writeText(cssCode.value)
    copied.value = true
    setTimeout(() => copied.value = false, 1500)
  } catch { /* clipboard not available */ }
}
</script>
```

- [ ] **Step 2: Create `src/views/Gradient.test.js`**

```js
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Gradient from './Gradient.vue'

function mountComponent() {
  return mount(Gradient)
}

describe('Gradient', () => {
  it('renders title', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('渐变')
  })

  it('shows gradient type radios', () => {
    const wrapper = mountComponent()
    const radios = wrapper.findAll('input[type="radio"][name="gradient-type"]')
    expect(radios.length).toBe(3)
  })

  it('shows default linear gradient code', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('linear-gradient')
  })

  it('shows two default color stops', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('#6366f1')
    expect(wrapper.text()).toContain('#ec4899')
  })

  it('has add stop button', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('添加色标')
  })

  it('shows preview bar', () => {
    const wrapper = mountComponent()
    const preview = wrapper.find('.min-h-\\[120px\\]')
    expect(preview.exists()).toBe(true)
  })
})
```

- [ ] **Step 3: Run test**

Run: `npx vitest run src/views/Gradient.test.js`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add src/views/Gradient.vue src/views/Gradient.test.js
git commit -m "Add gradient generator tool"
```

---

### Task 3: Border Radius Generator

**Files:**
- Create: `src/views/BorderRadius.vue`
- Create: `src/views/BorderRadius.test.js`

- [ ] **Step 1: Create `src/views/BorderRadius.vue`**

```vue
<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">圆角</h1>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Left: Controls -->
      <div class="flex flex-col gap-4">
        <!-- Link mode -->
        <div class="form-control">
          <label class="label cursor-pointer justify-start gap-3">
            <input
              v-model="linked"
              type="checkbox"
              class="checkbox checkbox-sm checkbox-primary"
            >
            <span class="label-text font-semibold">联动</span>
          </label>
        </div>

        <!-- Linked: single slider -->
        <div v-if="linked" class="form-control">
          <label class="label"><span class="label-text font-semibold">圆角</span></label>
          <div class="flex items-center gap-2">
            <input
              :value="corners.tl"
              type="range"
              min="0"
              max="100"
              class="range range-sm flex-1"
              @input="onLinkedChange"
            >
            <span class="text-sm w-16 text-right">{{ corners.tl }}{{ unit }}</span>
          </div>
        </div>

        <!-- Unlinked: 4 sliders -->
        <template v-else>
          <div
            v-for="c in cornerDefs"
            :key="c.key"
            class="form-control"
          >
            <label class="label"><span class="label-text font-semibold">{{ c.label }}</span></label>
            <div class="flex items-center gap-2">
              <input
                v-model.number="corners[c.key]"
                type="range"
                min="0"
                max="100"
                class="range range-sm flex-1"
              >
              <span class="text-sm w-16 text-right">{{ corners[c.key] }}{{ unit }}</span>
            </div>
          </div>
        </template>

        <!-- Unit -->
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">单位</span></label>
          <div class="flex gap-2">
            <label
              v-for="u in units"
              :key="u"
              class="flex items-center gap-2 cursor-pointer"
            >
              <input
                v-model="unit"
                type="radio"
                name="border-radius-unit"
                :value="u"
                class="radio radio-sm radio-primary"
              >
              <span class="text-sm">{{ u }}</span>
            </label>
          </div>
        </div>
      </div>

      <!-- Right: Preview + Code -->
      <div class="flex flex-col gap-4">
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">预览</span></label>
          <div class="rounded-lg border border-base-300 min-h-[200px] flex items-center justify-center">
            <div
              class="w-40 h-40 border-2 border-dashed border-base-content/30"
              :style="{ borderRadius: previewValue }"
            />
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
              <CheckIcon v-if="copied" class="w-4 h-4 text-success" />
              <ClipboardDocumentIcon v-else class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ClipboardDocumentIcon, CheckIcon } from '@heroicons/vue/24/outline'

const cornerDefs = [
  { key: 'tl', label: '左上' },
  { key: 'tr', label: '右上' },
  { key: 'br', label: '右下' },
  { key: 'bl', label: '左下' },
]

const units = ['px', '%', 'rem']

const linked = ref(true)
const corners = ref({ tl: 16, tr: 16, br: 16, bl: 16 })
const unit = ref('px')
const copied = ref(false)

function onLinkedChange(e) {
  const val = Number(e.target.value)
  corners.value = { tl: val, tr: val, br: val, bl: val }
}

const radiusStr = computed(() => {
  const { tl, tr, br, bl } = corners.value
  const u = unit.value
  if (tl === tr && tr === br && br === bl) return `${tl}${u}`
  if (tl === br && tr === bl) return `${tl}${u} ${tr}${u}`
  return `${tl}${u} ${tr}${u} ${br}${u} ${bl}${u}`
})

const previewValue = computed(() => {
  const { tl, tr, br, bl } = corners.value
  const u = unit.value
  return `${tl}${u} ${tr}${u} ${br}${u} ${bl}${u}`
})

const cssCode = computed(() => `border-radius: ${radiusStr.value};`)

async function copyCode() {
  try {
    await navigator.clipboard.writeText(cssCode.value)
    copied.value = true
    setTimeout(() => copied.value = false, 1500)
  } catch { /* clipboard not available */ }
}
</script>
```

- [ ] **Step 2: Create `src/views/BorderRadius.test.js`**

```js
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BorderRadius from './BorderRadius.vue'

function mountComponent() {
  return mount(BorderRadius)
}

describe('BorderRadius', () => {
  it('renders title', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('圆角')
  })

  it('shows link mode checkbox', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('联动')
  })

  it('shows unit radios', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('px')
    expect(wrapper.text()).toContain('%')
    expect(wrapper.text()).toContain('rem')
  })

  it('generates CSS code with border-radius', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('border-radius:')
  })

  it('shows default 16px value', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('16px')
  })

  it('shows preview square', () => {
    const wrapper = mountComponent()
    const preview = wrapper.find('.border-dashed')
    expect(preview.exists()).toBe(true)
  })
})
```

- [ ] **Step 3: Run test**

Run: `npx vitest run src/views/BorderRadius.test.js`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add src/views/BorderRadius.vue src/views/BorderRadius.test.js
git commit -m "Add border radius generator tool"
```

---

### Task 4: Triangle Generator

**Files:**
- Create: `src/views/Triangle.vue`
- Create: `src/views/Triangle.test.js`

- [ ] **Step 1: Create `src/views/Triangle.vue`**

```vue
<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">三角形</h1>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Left: Controls -->
      <div class="flex flex-col gap-4">
        <!-- Direction -->
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">方向</span></label>
          <div class="flex gap-2">
            <label
              v-for="d in directions"
              :key="d.value"
              class="flex items-center gap-2 cursor-pointer"
            >
              <input
                v-model="direction"
                type="radio"
                name="triangle-direction"
                :value="d.value"
                class="radio radio-sm radio-primary"
              >
              <span class="text-sm">{{ d.label }}</span>
            </label>
          </div>
        </div>

        <!-- Width -->
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">宽度</span></label>
          <div class="flex items-center gap-2">
            <input
              v-model.number="width"
              type="range"
              min="0"
              max="200"
              class="range range-sm flex-1"
            >
            <span class="text-sm w-16 text-right">{{ width }}px</span>
          </div>
        </div>

        <!-- Height -->
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">高度</span></label>
          <div class="flex items-center gap-2">
            <input
              v-model.number="height"
              type="range"
              min="0"
              max="200"
              class="range range-sm flex-1"
            >
            <span class="text-sm w-16 text-right">{{ height }}px</span>
          </div>
        </div>

        <!-- Color -->
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">颜色</span></label>
          <div class="flex items-center gap-2">
            <input
              v-model="color"
              type="color"
              class="input input-bordered w-12 h-10 p-1 cursor-pointer"
            >
            <input
              v-model="color"
              type="text"
              class="input input-bordered w-full font-mono text-sm"
            >
          </div>
        </div>
      </div>

      <!-- Right: Preview + Code -->
      <div class="flex flex-col gap-4">
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">预览</span></label>
          <div
            class="rounded-lg border border-base-300 min-h-[200px] flex items-center justify-center"
            :style="{ backgroundImage: checkerboard }"
          >
            <div :style="previewStyle" />
          </div>
        </div>
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">CSS 代码</span></label>
          <div class="relative">
            <pre class="bg-base-200 rounded-lg p-4 font-mono text-sm whitespace-pre-wrap">{{ cssCode }}</pre>
            <button
              class="btn btn-ghost btn-xs btn-square absolute right-2 top-2"
              :title="copied ? '已复制！' : '复制'"
              @click="copyCode"
            >
              <CheckIcon v-if="copied" class="w-4 h-4 text-success" />
              <ClipboardDocumentIcon v-else class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ClipboardDocumentIcon, CheckIcon } from '@heroicons/vue/24/outline'

const directions = [
  { value: 'up', label: '上' },
  { value: 'right', label: '右' },
  { value: 'down', label: '下' },
  { value: 'left', label: '左' },
]

const direction = ref('up')
const width = ref(100)
const height = ref(100)
const color = ref('#6366f1')
const copied = ref(false)

const checkerboard = "url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"20\" height=\"20\"><rect width=\"10\" height=\"10\" fill=\"%23f0f0f0\"/><rect x=\"10\" y=\"10\" width=\"10\" height=\"10\" fill=\"%23f0f0f0\"/><rect x=\"10\" width=\"10\" height=\"10\" fill=\"%23e0e0e0\"/><rect y=\"10\" width=\"10\" height=\"10\" fill=\"%23e0e0e0\"/></svg>')"

const borderRules = computed(() => {
  const w = width.value
  const h = height.value
  const c = color.value
  const halfW = Math.floor(w / 2)
  const halfH = Math.floor(h / 2)

  switch (direction.value) {
    case 'up':
      return [
        'width: 0;',
        'height: 0;',
        `border-left: ${halfW}px solid transparent;`,
        `border-right: ${halfW}px solid transparent;`,
        `border-bottom: ${h}px solid ${c};`,
      ]
    case 'down':
      return [
        'width: 0;',
        'height: 0;',
        `border-left: ${halfW}px solid transparent;`,
        `border-right: ${halfW}px solid transparent;`,
        `border-top: ${h}px solid ${c};`,
      ]
    case 'left':
      return [
        'width: 0;',
        'height: 0;',
        `border-top: ${halfH}px solid transparent;`,
        `border-bottom: ${halfH}px solid transparent;`,
        `border-right: ${w}px solid ${c};`,
      ]
    case 'right':
      return [
        'width: 0;',
        'height: 0;',
        `border-top: ${halfH}px solid transparent;`,
        `border-bottom: ${halfH}px solid transparent;`,
        `border-left: ${w}px solid ${c};`,
      ]
  }
})

const previewStyle = computed(() => {
  const w = width.value
  const h = height.value
  const c = color.value
  const halfW = Math.floor(w / 2)
  const halfH = Math.floor(h / 2)

  const base = { width: '0', height: '0' }
  switch (direction.value) {
    case 'up':
      return { ...base, borderLeft: `${halfW}px solid transparent`, borderRight: `${halfW}px solid transparent`, borderBottom: `${h}px solid ${c}` }
    case 'down':
      return { ...base, borderLeft: `${halfW}px solid transparent`, borderRight: `${halfW}px solid transparent`, borderTop: `${h}px solid ${c}` }
    case 'left':
      return { ...base, borderTop: `${halfH}px solid transparent`, borderBottom: `${halfH}px solid transparent`, borderRight: `${w}px solid ${c}` }
    case 'right':
      return { ...base, borderTop: `${halfH}px solid transparent`, borderBottom: `${halfH}px solid transparent`, borderLeft: `${w}px solid ${c}` }
  }
})

const cssCode = computed(() => borderRules.value.join('\n'))

async function copyCode() {
  try {
    await navigator.clipboard.writeText(cssCode.value)
    copied.value = true
    setTimeout(() => copied.value = false, 1500)
  } catch { /* clipboard not available */ }
}
</script>
```

- [ ] **Step 2: Create `src/views/Triangle.test.js`**

```js
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Triangle from './Triangle.vue'

function mountComponent() {
  return mount(Triangle)
}

describe('Triangle', () => {
  it('renders title', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('三角形')
  })

  it('shows direction radios', () => {
    const wrapper = mountComponent()
    const radios = wrapper.findAll('input[type="radio"][name="triangle-direction"]')
    expect(radios.length).toBe(4)
  })

  it('shows width and height sliders', () => {
    const wrapper = mountComponent()
    const ranges = wrapper.findAll('input[type="range"]')
    expect(ranges.length).toBe(2)
  })

  it('generates CSS code with border properties', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('border-bottom')
    expect(wrapper.text()).toContain('solid transparent')
  })

  it('shows default color #6366f1', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('#6366f1')
  })
})
```

- [ ] **Step 3: Run test**

Run: `npx vitest run src/views/Triangle.test.js`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add src/views/Triangle.vue src/views/Triangle.test.js
git commit -m "Add triangle generator tool"
```

---

### Task 5: Register Routes and Sidebar

**Files:**
- Modify: `src/router.js` (add 4 imports + 4 routes)
- Modify: `src/tools.js` (add CSS group with 4 tools + icon imports)

- [ ] **Step 1: Update `src/router.js`**

Add imports after the existing ones (after line 31):

```js
import BoxShadow from './views/BoxShadow.vue'
import Gradient from './views/Gradient.vue'
import BorderRadius from './views/BorderRadius.vue'
import Triangle from './views/Triangle.vue'
```

Add routes before the closing `]` of the routes array (after the mime-types route):

```js
  { path: '/box-shadow', component: BoxShadow, meta: { wide: true } },
  { path: '/gradient', component: Gradient, meta: { wide: true } },
  { path: '/border-radius', component: BorderRadius, meta: { wide: true } },
  { path: '/triangle', component: Triangle, meta: { wide: true } },
```

- [ ] **Step 2: Update `src/tools.js`**

Add icon imports at the top of the existing import block:

```js
import { Square3Stack3DIcon, SwatchIcon, Square2StackIcon, PlayIcon } from '@heroicons/vue/24/outline'
```

Add new group after the "生成转换" group and before "文本处理":

```js
  {
    name: 'CSS',
    tools: [
      {
        name: '盒阴影',
        path: '/box-shadow',
        desc: 'CSS box-shadow 可视化生成',
        icon: Square3Stack3DIcon,
      },
      {
        name: '渐变',
        path: '/gradient',
        desc: 'CSS 渐变可视化生成',
        icon: SwatchIcon,
      },
      {
        name: '圆角',
        path: '/border-radius',
        desc: 'CSS border-radius 可视化生成',
        icon: Square2StackIcon,
      },
      {
        name: '三角形',
        path: '/triangle',
        desc: 'CSS border 三角形生成',
        icon: PlayIcon,
      },
    ],
  },
```

- [ ] **Step 3: Run all tests and lint**

Run: `npx vitest run`
Expected: All tests pass

Run: `npm run lint`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/router.js src/tools.js
git commit -m "Register 4 CSS generator tools in router and sidebar"
```

---

### Task 6: Manual Verification

- [ ] **Step 1: Run dev server and verify each tool**

Run: `npm run dev`

Verify each tool:
1. `/box-shadow` — Can add/remove shadows, adjust all params, preview updates, code copies
2. `/gradient` — Switch between linear/radial/conic, add/remove stops, preview and code update
3. `/border-radius` — Toggle linked mode, adjust corners, switch units, code shows smart shorthand
4. `/triangle` — Switch directions, adjust width/height, color changes, code shows border hack

- [ ] **Step 2: Verify sidebar shows CSS group**

Check that "CSS" group appears in sidebar with 4 tools, icons render correctly.
