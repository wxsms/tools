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

    <!-- Keyboard -->
    <div
      ref="kbEl"
      class="relative bg-base-200 rounded-lg p-3 overflow-x-auto"
      tabindex="0"
      :style="kbStyle"
    >
      <div
        v-for="key in currentLayout"
        :key="key.code"
        class="absolute rounded flex flex-col items-center justify-center text-xs select-none transition-colors"
        :style="keyStyle(key)"
        :class="keyClass(key)"
      >
        <span class="font-semibold leading-tight">{{ key.label }}</span>
        <span
          v-if="key.sub"
          class="opacity-60 leading-tight"
        >{{ key.sub }}</span>
        <span
          v-if="isLimited(key.code)"
          class="absolute top-0.5 right-1 text-[10px] opacity-50"
          title="浏览器可能无法稳定捕获"
        >⚠</span>
      </div>
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
// active 是 keys 当前正在按下(瞬时);pressed 是本次会话按过(累计)
const state = reactive({})

const kbEl = ref(null)

// 键盘整体尺寸:1u = 52px
const UNIT = 52
const PAD = 12 // 容器内边距(px),对应 p-3(0.75rem≈12px)

const limitedSet = new Set(limitedCodes)
function isLimited(code) { return limitedSet.has(code) }

const kbStyle = computed(() => {
  // 计算最大 x+w 和 y+h
  let maxX = 0, maxY = 0
  for (const k of currentLayout.value) {
    maxX = Math.max(maxX, k.x + k.w)
    maxY = Math.max(maxY, k.y + k.h)
  }
  return {
    width: (maxX * UNIT + PAD * 2) + 'px',
    height: (maxY * UNIT + PAD * 2) + 'px',
  }
})

function keyStyle(key) {
  return {
    left: (key.x * UNIT + PAD) + 'px',
    top: (key.y * UNIT + PAD) + 'px',
    width: (key.w * UNIT - 4) + 'px',
    height: (key.h * UNIT - 4) + 'px',
  }
}

function keyClass(key) {
  const s = state[key.code] || 'idle'
  if (s === 'active') return 'bg-success text-success-content z-10'
  if (s === 'pressed') return 'bg-info/30 border border-info/40'
  return 'bg-base-100 border border-base-300'
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
  // 忽略浏览器自动重复的 keydown(只在首次按下时记录)
  if (e.repeat) return
  // 防止浏览器快捷键抢占(可阻止的部分):阻止 F5、Ctrl+R 等
  // 但很多快捷键无法阻止;我们不阻止默认行为,只记录
  const code = e.code
  if (!code) return
  // 如果该 code 在当前布局中存在,标记并阻止默认(避免页面滚动等)
  if (currentLayout.value.some(k => k.code === code)) {
    e.preventDefault()
    state[code] = 'active'
  }
}

function onKeyUp(e) {
  const code = e.code
  if (!code) return
  if (state[code] === 'active') {
    state[code] = 'pressed'
  }
}

// 失焦时把所有 active 重置为 pressed(防止 keyup 漏掉)
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
  // 自动聚焦键盘容器
  kbEl.value?.focus?.()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
  window.removeEventListener('blur', onBlur)
})
</script>
