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

          <!-- Single-length family: translateX / Y / Z / perspective -->
          <div
            v-if="isSingleLength(selected.type)"
            class="flex items-center gap-2"
          >
            <input
              v-model.number="selected.value.n"
              type="range"
              min="-200"
              max="200"
              step="1"
              class="range range-sm flex-1"
            >
            <input
              v-model.number="selected.value.n"
              type="number"
              class="input input-bordered input-sm w-20 font-mono text-sm"
            >
            <select
              v-if="selected.type !== 'perspective'"
              v-model="selected.value.unit"
              class="select select-bordered select-sm w-16"
            >
              <option value="px">
                px
              </option>
              <option value="%">
                %
              </option>
              <option value="em">
                em
              </option>
              <option value="rem">
                rem
              </option>
            </select>
            <span
              v-else
              class="text-xs w-8"
            >px</span>
          </div>

          <!-- translate / translate3d: 3 axes -->
          <div
            v-else-if="selected.type === 'translate' || selected.type === 'translate3d'"
            class="flex flex-col gap-2"
          >
            <div
              v-for="axis in ['x', 'y', 'z']"
              :key="axis"
              class="flex items-center gap-2"
            >
              <span class="text-sm w-4 uppercase">{{ axis }}</span>
              <input
                v-model.number="selected.value[axis].n"
                type="range"
                min="-200"
                max="200"
                step="1"
                class="range range-sm flex-1"
              >
              <input
                v-model.number="selected.value[axis].n"
                type="number"
                class="input input-bordered input-sm w-20 font-mono text-sm"
              >
              <select
                v-model="selected.value[axis].unit"
                class="select select-bordered select-sm w-16"
              >
                <option value="px">
                  px
                </option>
                <option value="%">
                  %
                </option>
                <option value="em">
                  em
                </option>
                <option value="rem">
                  rem
                </option>
              </select>
            </div>
          </div>

          <!-- Single angle family: rotate / rotateX / Y / Z -->
          <div
            v-else-if="isSingleAngle(selected.type)"
            class="flex items-center gap-2"
          >
            <input
              v-model.number="selected.value.deg"
              type="range"
              min="-180"
              max="180"
              step="1"
              class="range range-sm flex-1"
            >
            <input
              v-model.number="selected.value.deg"
              type="number"
              class="input input-bordered input-sm w-20 font-mono text-sm"
            >
            <span class="text-xs w-8">deg</span>
          </div>

          <!-- rotate3d: 4 inputs -->
          <div
            v-else-if="selected.type === 'rotate3d'"
            class="flex flex-col gap-2"
          >
            <div
              v-for="axis in ['x', 'y', 'z']"
              :key="axis"
              class="flex items-center gap-2"
            >
              <span class="text-sm w-4 uppercase">{{ axis }}</span>
              <input
                v-model.number="selected.value[axis]"
                type="number"
                step="0.1"
                class="input input-bordered input-sm w-24 font-mono text-sm"
              >
            </div>
            <div class="flex items-center gap-2">
              <span class="text-sm w-4">deg</span>
              <input
                v-model.number="selected.value.deg"
                type="range"
                min="-180"
                max="180"
                step="1"
                class="range range-sm flex-1"
              >
              <input
                v-model.number="selected.value.deg"
                type="number"
                class="input input-bordered input-sm w-20 font-mono text-sm"
              >
            </div>
          </div>

          <!-- scale / scale3d: 2 or 3 axes, no unit -->
          <div
            v-else-if="selected.type === 'scale' || selected.type === 'scale3d'"
            class="flex flex-col gap-2"
          >
            <div
              v-for="axis in (selected.type === 'scale' ? ['x', 'y'] : ['x', 'y', 'z'])"
              :key="axis"
              class="flex items-center gap-2"
            >
              <span class="text-sm w-4 uppercase">{{ axis }}</span>
              <input
                v-model.number="selected.value[axis]"
                type="range"
                min="0"
                max="3"
                step="0.05"
                class="range range-sm flex-1"
              >
              <input
                v-model.number="selected.value[axis]"
                type="number"
                step="0.05"
                class="input input-bordered input-sm w-20 font-mono text-sm"
              >
            </div>
          </div>

          <!-- scaleX / Y / Z: single value, no unit -->
          <div
            v-else-if="isSingleScale(selected.type)"
            class="flex items-center gap-2"
          >
            <input
              v-model.number="selected.value.n"
              type="range"
              min="0"
              max="3"
              step="0.05"
              class="range range-sm flex-1"
            >
            <input
              v-model.number="selected.value.n"
              type="number"
              step="0.05"
              class="input input-bordered input-sm w-20 font-mono text-sm"
            >
          </div>

          <!-- skewX / skewY: single angle -->
          <div
            v-else-if="selected.type === 'skewX' || selected.type === 'skewY'"
            class="flex items-center gap-2"
          >
            <input
              v-model.number="selected.value.deg"
              type="range"
              min="-90"
              max="90"
              step="1"
              class="range range-sm flex-1"
            >
            <input
              v-model.number="selected.value.deg"
              type="number"
              class="input input-bordered input-sm w-20 font-mono text-sm"
            >
            <span class="text-xs w-8">deg</span>
          </div>

          <!-- skew: 2 angles -->
          <div
            v-else-if="selected.type === 'skew'"
            class="flex flex-col gap-2"
          >
            <div class="flex items-center gap-2">
              <span class="text-sm w-4">X</span>
              <input
                v-model.number="selected.value.x"
                type="range"
                min="-90"
                max="90"
                step="1"
                class="range range-sm flex-1"
              >
              <input
                v-model.number="selected.value.x"
                type="number"
                class="input input-bordered input-sm w-20 font-mono text-sm"
              >
              <span class="text-xs w-8">deg</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-sm w-4">Y</span>
              <input
                v-model.number="selected.value.y"
                type="range"
                min="-90"
                max="90"
                step="1"
                class="range range-sm flex-1"
              >
              <input
                v-model.number="selected.value.y"
                type="number"
                class="input input-bordered input-sm w-20 font-mono text-sm"
              >
              <span class="text-xs w-8">deg</span>
            </div>
          </div>

          <!-- matrix: 6 inputs -->
          <div
            v-else-if="selected.type === 'matrix'"
            class="grid grid-cols-3 gap-2"
          >
            <div
              v-for="(label, idx) in ['a', 'b', 'c', 'd', 'e', 'f']"
              :key="label"
              class="flex items-center gap-1"
            >
              <span class="text-xs w-4">{{ label }}</span>
              <input
                v-model.number="selected.value[idx]"
                type="number"
                step="0.1"
                class="input input-bordered input-sm w-full font-mono text-sm"
              >
            </div>
          </div>

          <!-- matrix3d: 16 inputs, collapsible -->
          <details
            v-else-if="selected.type === 'matrix3d'"
          >
            <summary class="text-sm cursor-pointer">
              16 个数字(列主序)
            </summary>
            <div class="grid grid-cols-4 gap-2 mt-2">
              <input
                v-for="i in 16"
                :key="'m' + i"
                v-model.number="selected.value[i - 1]"
                type="number"
                step="0.1"
                class="input input-bordered input-xs w-full font-mono text-xs"
              >
            </div>
          </details>
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

      <!-- Right: Preview + Code + Reverse-parse -->
      <div class="flex flex-col gap-4">
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">预览</span></label>
          <div
            class="rounded-lg border border-base-300 min-h-[280px] flex items-center justify-center overflow-hidden"
            :style="{ backgroundImage: checkerboard, perspective: state.perspective.n + 'px', perspectiveOrigin: 'center' }"
          >
            <div
              class="cube-scene"
              :style="{ transform: 'rotateX(-20deg) rotateY(-25deg)', transformStyle: 'preserve-3d' }"
            >
              <div
                class="cube"
                :style="{ transform: transformForPreview, transformOrigin: originForPreview, transformStyle: 'preserve-3d' }"
              >
                <div class="face face-front" />
                <div class="face face-back" />
                <div class="face face-right" />
                <div class="face face-left" />
                <div class="face face-top" />
                <div class="face face-bottom" />
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

const transformForPreview = computed(() =>
  state.functions.map(functionToCss).join(' ')
)
const originForPreview = computed(() =>
  `${state.origin.x.n}${state.origin.x.unit} ${state.origin.y.n}${state.origin.y.unit} ${state.origin.z.n}${state.origin.z.unit}`
)

const checkerboard = `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="10" height="10" fill="%23f0f0f0"/><rect x="10" y="10" width="10" height="10" fill="%23f0f0f0"/><rect x="10" width="10" height="10" fill="%23e0e0e0"/><rect y="10" width="10" height="10" fill="%23e0e0e0"/></svg>')`

function isSingleLength(t) {
  return t === 'translateX' || t === 'translateY' || t === 'translateZ' || t === 'perspective'
}
function isSingleAngle(t) {
  return t === 'rotate' || t === 'rotateX' || t === 'rotateY' || t === 'rotateZ'
}
function isSingleScale(t) {
  return t === 'scaleX' || t === 'scaleY' || t === 'scaleZ'
}

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

<style scoped>
.cube-scene {
  width: 120px;
  height: 120px;
  position: relative;
}
.cube {
  width: 120px;
  height: 120px;
  position: relative;
  transform-style: preserve-3d;
}
.face {
  position: absolute;
  width: 120px;
  height: 120px;
  border: 2px solid rgba(0, 0, 0, 0.3);
  opacity: 0.7;
}
.face-front  { background: #f87171; transform: translateZ(60px); }
.face-back   { background: #60a5fa; transform: translateZ(-60px) rotateY(180deg); }
.face-right  { background: #34d399; transform: translateX(60px) rotateY(90deg); }
.face-left   { background: #fbbf24; transform: translateX(-60px) rotateY(-90deg); }
.face-top    { background: #a78bfa; transform: translateY(-60px) rotateX(90deg); }
.face-bottom { background: #f472b6; transform: translateY(60px) rotateX(-90deg); }
</style>
