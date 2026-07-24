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
          104 键
        </button>
        <button
          class="btn btn-sm join-item"
          :class="layout === '87' ? 'btn-primary' : 'btn-outline'"
          @click="layout = '87'"
        >
          87 键
        </button>
      </div>
      <button
        class="btn btn-sm gap-1"
        @click="reset"
      >
        <Icon
          icon="lucide:refresh-cw"
          class="w-4 h-4"
        />
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
      class="text-sm opacity-70 mb-2 flex flex-wrap gap-x-4"
    >
      <span>已按 {{ pressedCount }} / {{ totalKeys }} 键</span>
      <span
        v-if="lastKey"
        class="font-mono"
      >最近 {{ lastKey }}</span>
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
              :y="labelY(key)"
              text-anchor="middle"
              dominant-baseline="central"
              :class="['fill-base-content text-[12px] font-semibold select-none pointer-events-none', (state[key.code] || 'idle') === 'active' ? 'fill-success-content' : '']"
            >{{ key.label }}</text>
            <text
              v-if="key.sub"
              :x="(key.x + key.w / 2) * UNIT"
              :y="subY(key)"
              text-anchor="middle"
              dominant-baseline="central"
              class="fill-base-content text-[10px] opacity-70 select-none pointer-events-none"
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
import { Icon } from '@iconify/vue'
import { ref, computed, onMounted, onBeforeUnmount, reactive } from 'vue'
import { layout104, layout87, limitedCodes, normalizeKeyCode } from './layout.js'

const layout = ref('104')
const currentLayout = computed(() => layout.value === '104' ? layout104 : layout87)
const totalKeys = computed(() => currentLayout.value.length)

// 状态:每个 code -> 'idle' | 'pressed' | 'active'
// active 是当前正在按下(瞬时);pressed 是本次会话按过(累计)
const state = reactive({})
const lastKey = ref('')

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

// 文字垂直位置:
//   单标签(只有 label):居中
//   双标签(label + sub):label 在下 2/3 处、sub 在上 1/3 处
//      匹配真实键帽印刷习惯(shifted 在上、unshifted 在下)
// 单位 1u;给的 y 是键左上角坐标,centre = y + h/2
function labelY(key) {
  const cy = key.y + key.h / 2
  return key.sub ? (cy + 0.16) * UNIT : cy * UNIT
}
function subY(key) {
  const cy = key.y + key.h / 2
  return (cy - 0.18) * UNIT
}

const pressedCount = computed(() => {
  let n = 0
  for (const k of currentLayout.value) {
    const s = state[k.code]
    if (s === 'pressed' || s === 'active') n++
  }
  return n
})

// 当前布局所有合法 code 的集合,用于 normalize 时判断
const knownCodes = computed(() => new Set(currentLayout.value.map(k => k.code)))

function onKeyDown(e) {
  // 阻断默认行为(F5 刷新、Ctrl+R、Tab 切焦点、Backspace 后退等),
  // 让用户在这页测试键盘时按键不会触发浏览器/页面副作用。
  // 仅影响 keydown 不影响 keyup,不影响 OS 级或浏览器 chrome 快捷键
  // (如 Ctrl+W / Ctrl+N / Alt+Tab 等本就拿不到事件)。
  if (e.repeat) return
  const code = normalizeKeyCode(e, knownCodes.value)
  if (!code) return
  lastKey.value = `${e.key} (${code})`
  state[code] = 'active'
  e.preventDefault()
}

function onKeyUp(e) {
  const code = normalizeKeyCode(e, knownCodes.value)
  if (!code) return
  if (state[code] === 'active') {
    state[code] = 'pressed'
  }
  e.preventDefault()
}

function onBlur() {
  for (const k of Object.keys(state)) {
    if (state[k] === 'active') state[k] = 'pressed'
  }
}

function reset() {
  for (const k of Object.keys(state)) delete state[k]
  lastKey.value = ''
}

onMounted(() => {
  // modifier 键(尤其右 Shift)在部分浏览器/IME 组合下,window 阶段
  // 可能拿不到事件,改用 document + capture 阶段尽早截获
  document.addEventListener('keydown', onKeyDown, true)
  document.addEventListener('keyup', onKeyUp, true)
  window.addEventListener('blur', onBlur)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeyDown, true)
  document.removeEventListener('keyup', onKeyUp, true)
  window.removeEventListener('blur', onBlur)
})
</script>

