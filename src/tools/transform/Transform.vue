<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">
      变换 transform
    </h1>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Left: Controls -->
      <div class="flex flex-col gap-4">
        <!-- Function list -->
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">函数列表(顺序敏感)</span></label>
          <ul class="flex flex-col gap-1">
            <li
              v-for="(fn, i) in state.functions"
              :key="i"
              class="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer"
              :class="i === selectedIndex ? 'bg-primary/10 border border-primary' : 'bg-base-200 border border-transparent hover:bg-base-300'"
              @click="selectedIndex = i"
            >
              <span class="font-mono text-xs flex-1 break-all">{{ functionToCss(fn) }}</span>
              <button
                class="btn btn-ghost btn-xs btn-square"
                :disabled="i === 0"
                title="上移"
                @click.stop="moveUp(i)"
              >
                <Icon
                  icon="lucide:chevron-left"
                  class="w-3 h-3"
                />
              </button>
              <button
                class="btn btn-ghost btn-xs btn-square"
                :disabled="i === state.functions.length - 1"
                title="下移"
                @click.stop="moveDown(i)"
              >
                <Icon
                  icon="lucide:chevron-right"
                  class="w-3 h-3"
                />
              </button>
              <button
                class="btn btn-ghost btn-xs btn-square"
                title="删除"
                @click.stop="removeFn(i)"
              >
                <Icon
                  icon="lucide:x"
                  class="w-3 h-3"
                />
              </button>
            </li>
          </ul>
          <details class="mt-2">
            <summary class="btn btn-outline btn-sm cursor-pointer gap-1 w-fit">
              <Icon
                icon="lucide:plus"
                class="w-4 h-4"
              />
              添加函数
            </summary>
            <div class="mt-2 p-3 bg-base-200 rounded-lg flex flex-col gap-2">
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
                    :key="t"
                    class="btn btn-xs btn-ghost font-mono"
                    @click="addFn(t)"
                  >
                    {{ t }}
                  </button>
                </div>
              </div>
            </div>
          </details>
        </div>

        <!-- Selected function params -->
        <div
          v-if="selected"
          class="form-control"
        >
          <label class="label"><span class="label-text font-semibold">参数 ({{ selected.type }})</span></label>
          <component
            :is="paramComponent"
            v-bind="paramComponentProps"
            @update="updateSelected"
          />
        </div>

        <!-- transform-origin -->
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">transform-origin</span></label>
          <div class="flex flex-col gap-2">
            <div
              v-for="axis in ['x', 'y', 'z']"
              :key="axis"
              class="flex items-center gap-2"
            >
              <span class="text-sm w-4 uppercase">{{ axis }}</span>
              <input
                :value="state.origin[axis].n"
                type="range"
                :min="axis === 'z' ? -100 : -50"
                :max="axis === 'z' ? 100 : 150"
                step="1"
                class="range range-sm flex-1"
                @input="updateOrigin(axis, $event.target.value)"
              >
              <input
                :value="state.origin[axis].n"
                type="number"
                class="input input-bordered input-sm w-20 font-mono text-sm"
                @input="updateOrigin(axis, $event.target.value)"
              >
              <select
                v-if="axis !== 'z'"
                v-model="state.origin[axis].unit"
                class="select select-bordered select-sm w-16"
              >
                <option value="%">
                  %
                </option>
                <option value="px">
                  px
                </option>
              </select>
              <span
                v-else
                class="text-xs w-8"
              >px</span>
            </div>
          </div>
        </div>

        <!-- perspective (preview container) -->
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">perspective (预览容器)</span></label>
          <div class="flex items-center gap-2">
            <input
              v-model.number="state.perspective.n"
              type="range"
              min="100"
              max="2000"
              step="10"
              class="range range-sm flex-1"
            >
            <span class="text-sm w-16 text-right">{{ state.perspective.n }}px</span>
          </div>
        </div>
      </div>

      <!-- Right: Code (preview + reverse-parse come later) -->
      <div class="flex flex-col gap-4">
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">CSS 代码</span></label>
          <div class="relative">
            <pre class="bg-base-200 rounded-lg p-4 font-mono text-sm break-all whitespace-pre-wrap">{{ cssCode }}</pre>
            <button
              class="btn btn-ghost btn-xs btn-square absolute right-2 top-2"
              :title="copied ? '已复制!' : '复制'"
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
import { ref, reactive, computed } from 'vue'
// eslint-disable-next-line no-unused-vars -- used by Task 10 (reverse-parse)
import { functionToCss, stateToCss, parseTransform } from './transform.js'

const addGroups = [
  { label: '平移', types: ['translateX', 'translateY', 'translateZ', 'translate', 'translate3d'] },
  { label: '旋转', types: ['rotate', 'rotateX', 'rotateY', 'rotateZ', 'rotate3d'] },
  { label: '缩放', types: ['scaleX', 'scaleY', 'scaleZ', 'scale', 'scale3d'] },
  { label: '斜切', types: ['skew', 'skewX', 'skewY'] },
  { label: '矩阵', types: ['matrix', 'matrix3d'] },
  { label: '透视', types: ['perspective'] },
]

function defaultFn(type) {
  switch (type) {
    case 'translateX':
    case 'translateY':
    case 'translateZ':
      return { type, value: { n: 0, unit: 'px' } }
    case 'translate':
      return { type, value: { x: { n: 0, unit: 'px' }, y: { n: 0, unit: 'px' }, z: { n: 0, unit: 'px' } } }
    case 'translate3d':
      return { type, value: { x: { n: 0, unit: 'px' }, y: { n: 0, unit: 'px' }, z: { n: 0, unit: 'px' } } }
    case 'rotate':
    case 'rotateX':
    case 'rotateY':
    case 'rotateZ':
      return { type, value: { deg: 0 } }
    case 'rotate3d':
      return { type, value: { x: 0, y: 1, z: 0, deg: 0 } }
    case 'scale':
      return { type, value: { x: 1, y: 1 } }
    case 'scale3d':
      return { type, value: { x: 1, y: 1, z: 1 } }
    case 'scaleX':
    case 'scaleY':
    case 'scaleZ':
      return { type, value: { n: 1 } }
    case 'skewX':
    case 'skewY':
      return { type, value: { deg: 0 } }
    case 'skew':
      return { type, value: { x: 0, y: 0 } }
    case 'matrix':
      return { type, value: [1, 0, 0, 1, 0, 0] }
    case 'matrix3d':
      return { type, value: [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1] }
    case 'perspective':
      return { type, value: { n: 800, unit: 'px' } }
    default:
      throw new Error(`未知 type: ${type}`)
  }
}

const state = reactive({
  functions: [
    { type: 'rotate', value: { deg: 15 } },
    { type: 'translateZ', value: { n: 30, unit: 'px' } },
  ],
  origin: { x: { n: 50, unit: '%' }, y: { n: 50, unit: '%' }, z: { n: 0, unit: 'px' } },
  perspective: { n: 800, unit: 'px' },
})

const selectedIndex = ref(0)
const copied = ref(false)

const selected = computed(() => state.functions[selectedIndex.value])

const cssCode = computed(() => stateToCss({ ...state, functions: state.functions }))

// Per-type param form: render inline as a function returning vdom would be cleaner,
// but inline template branching is fine for one component.
const paramComponent = computed(() => 'param-form-' + selected.value.type.replace(/[A-Z]/g, m => '-' + m.toLowerCase()).replace('3d', '3d'))
const paramComponentProps = computed(() => ({ fn: selected.value }))

function updateSelected() { /* placeholder, replaced by inline template below */ }

function addFn(type) {
  state.functions.push(defaultFn(type))
  selectedIndex.value = state.functions.length - 1
}
function removeFn(i) {
  state.functions.splice(i, 1)
  if (selectedIndex.value >= state.functions.length) {
    selectedIndex.value = Math.max(0, state.functions.length - 1)
  }
}
function moveUp(i) {
  if (i === 0) return
  const arr = state.functions
  const tmp = arr[i - 1]
  arr[i - 1] = arr[i]
  arr[i] = tmp
}
function moveDown(i) {
  if (i === state.functions.length - 1) return
  const arr = state.functions
  const tmp = arr[i + 1]
  arr[i + 1] = arr[i]
  arr[i] = tmp
}
function updateOrigin(axis, v) {
  const n = Number(v)
  if (Number.isFinite(n)) state.origin[axis].n = n
}

async function copyCode() {
  try {
    await navigator.clipboard.writeText(cssCode.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 1500)
  } catch { /* clipboard not available */ }
}
</script>
