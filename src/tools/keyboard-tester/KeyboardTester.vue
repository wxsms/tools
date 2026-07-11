<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">
      键盘测试
    </h1>

    <!-- Toolbar -->
    <div class="flex flex-wrap items-center gap-3 mb-4">
      <div class="join">
        <button
          class="btn btn-sm join-item"
          :class="layout === '104' ? 'btn-primary' : 'btn-outline'"
          @click="layout = '104'"
        >
          104 全键盘
        </button>
        <button
          class="btn btn-sm join-item"
          :class="layout === '87' ? 'btn-primary' : 'btn-outline'"
          @click="layout = '87'"
        >
          87 TKL
        </button>
      </div>
      <button
        class="btn btn-sm gap-1"
        @click="reset"
      >
        <ArrowPathIcon class="w-4 h-4" />
        重置
      </button>
      <div class="flex items-center gap-3 text-sm ml-auto">
        <span class="flex items-center gap-1">
          <span class="w-4 h-4 rounded border border-base-300 bg-base-200" />
          未按
        </span>
        <span class="flex items-center gap-1">
          <span class="w-4 h-4 rounded border border-base-300 bg-info/30" />
          已按过
        </span>
        <span class="flex items-center gap-1">
          <span class="w-4 h-4 rounded border border-base-300 bg-success" />
          按下中
        </span>
      </div>
    </div>

    <!-- Progress -->
    <div
      v-if="totalKeys > 0"
      class="text-sm opacity-70 mb-2"
    >
      已按 {{ pressedCount }} / {{ totalKeys }} 键
    </div>

    <!-- Keyboard (SVG with viewBox → auto-scales, no horizontal scrollbar) -->
    <div
      ref="kbEl"
      class="bg-base-200 rounded-lg p-3 w-fit max-w-full"
      tabindex="0"
    >
      <svg
        :viewBox="`0 0 ${svgSize.width} ${svgSize.height}`"
        class="block h-auto max-w-full"
        :style="{ width: svgSize.width + 'px' }"
      >
        <g :transform="`translate(${PAD} ${PAD})`">
          <g
            v-for="key in currentLayout"
            :key="key.code"
          >
            <rect
              :x="key.x * UNIT + GAP"
              :y="key.y * UNIT + GAP"
              :width="key.w * UNIT - GAP * 2"
              :height="key.h * UNIT - GAP * 2"
              :rx="4"
              :class="keyRectClass(key)"
              stroke-width="1"
            />
            <text
              :x="(key.x + key.w / 2) * UNIT"
              :y="(key.y + key.h / 2) * UNIT"
              text-anchor="middle"
              dominant-baseline="central"
              :class="['fill-base-content text-[12px] font-semibold select-none pointer-events-none', (state[key.code] || 'idle') === 'active' ? 'fill-success-content' : '']"
            >{{ key.label }}</text>
            <text
              v-if="key.sub"
              :x="(key.x + key.w / 2) * UNIT"
              :y="(key.y + key.h / 2 + 0.32) * UNIT"
              text-anchor="middle"
              dominant-baseline="central"
              class="fill-base-content text-[10px] opacity-60 select-none pointer-events-none"
            >{{ key.sub }}</text>
            <text
              v-if="isLimited(key.code)"
              :x="(key.x + key.w) * UNIT - GAP - 4"
              :y="key.y * UNIT + GAP + 8"
              text-anchor="end"
              class="fill-warning text-[10px] opacity-70 select-none pointer-events-none"
            >⚠</text>
          </g>
        </g>
      </svg>
    </div>

    <!-- Tips -->
    <p class="text-xs opacity-60 mt-3">
      点击键盘区域获取焦点后再按键。浏览器出于安全限制可能无法捕获 Win / Menu 等系统键,
      以及被浏览器拦截的快捷键(如 Ctrl+W、Ctrl+N 等)。
    </p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, reactive } from 'vue'
import { ArrowPathIcon } from '@heroicons/vue/24/outline'
import { layout104, layout87, limitedCodes } from './layout.js'

const layout = ref('104')
const currentLayout = computed(() => layout.value === '104' ? layout104 : layout87)
const totalKeys = computed(() => currentLayout.value.length)

// 状态:每个 code -> 'idle' | 'pressed' | 'active'
// active 是当前正在按下(瞬时);pressed 是本次会话按过(累计)
const state = reactive({})

const kbEl = ref(null)

// 1u = 52px,键之间留 4px 视觉间距
const UNIT = 52
const GAP = 2
const PAD = 12 // 容器内边距 p-3

const limitedSet = new Set(limitedCodes)
function isLimited(code) { return limitedSet.has(code) }

const svgSize = computed(() => {
  let maxX = 0, maxY = 0
  for (const k of currentLayout.value) {
    maxX = Math.max(maxX, k.x + k.w)
    maxY = Math.max(maxY, k.y + k.h)
  }
  return {
    width: maxX * UNIT + PAD * 2,
    height: maxY * UNIT + PAD * 2,
  }
})

// SVG 内部坐标:用像素,通过 <g transform="translate(PAD PAD)"> 偏移内边距
function keyRectClass(key) {
  const s = state[key.code] || 'idle'
  if (s === 'active') return 'fill-success stroke-success'
  if (s === 'pressed') return 'fill-info/30 stroke-info/40'
  return 'fill-base-100 stroke-base-300'
}

const pressedCount = computed(() => {
  let n = 0
  for (const k of currentLayout.value) {
    const s = state[k.code]
    if (s === 'pressed' || s === 'active') n++
  }
  return n
})

function onKeyDown(e) {
  // 阻断默认行为(F5 刷新、Ctrl+R、Tab 切焦点、Backspace 后退等),
  // 让用户在这页测试键盘时按键不会触发浏览器/页面副作用。
  // 仅影响 keydown 不影响 keyup,不影响 OS 级或浏览器 chrome 快捷键
  // (如 Ctrl+W / Ctrl+N / Alt+Tab 等本就拿不到事件)。
  e.preventDefault()
  if (e.repeat) return
  const code = e.code
  if (!code) return
  state[code] = 'active'
}

function onKeyUp(e) {
  e.preventDefault()
  const code = e.code
  if (!code) return
  if (state[code] === 'active') {
    state[code] = 'pressed'
  }
}

function onBlur() {
  for (const k of Object.keys(state)) {
    if (state[k] === 'active') state[k] = 'pressed'
  }
}

function reset() {
  for (const k of Object.keys(state)) delete state[k]
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('blur', onBlur)
  kbEl.value?.focus?.()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
  window.removeEventListener('blur', onBlur)
})
</script>

