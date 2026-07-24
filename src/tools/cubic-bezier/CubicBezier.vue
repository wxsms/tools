<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">
      三次贝塞尔曲线
    </h1>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Left: curve editor -->
      <div class="flex flex-col gap-4">
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">曲线编辑</span></label>
          <div class="bg-base-200 rounded-lg p-4 flex justify-center">
            <svg
              ref="svgEl"
              :width="width"
              :height="height"
              :viewBox="`0 0 ${width} ${height}`"
              class="touch-none select-none"
              @mousedown="onPointerDown"
              @touchstart.passive="onPointerDown"
            >
              <!-- grid: vertical (x = 0, 0.25, 0.5, 0.75, 1) -->
              <line
                v-for="g in [0, 0.25, 0.5, 0.75, 1]"
                :key="`gx-${g}`"
                :x1="toScreenX(g)"
                :y1="pad"
                :x2="toScreenX(g)"
                :y2="pad + innerY"
                stroke="currentColor"
                class="text-base-content/10"
                stroke-width="1"
              />
              <!-- grid: horizontal (y = 0, 0.25, 0.5, 0.75, 1) -->
              <line
                v-for="g in [0, 0.25, 0.5, 0.75, 1]"
                :key="`gy-${g}`"
                :x1="pad"
                :y1="toScreenY(g)"
                :x2="pad + innerX"
                :y2="toScreenY(g)"
                stroke="currentColor"
                class="text-base-content/10"
                stroke-width="1"
              />

              <!-- [0,1] bounding box (clipping reference for overshoot) -->
              <rect
                :x="pad"
                :y="toScreenY(1)"
                :width="innerX"
                :height="toScreenY(0) - toScreenY(1)"
                fill="none"
                stroke="currentColor"
                class="text-base-content/20"
                stroke-width="1"
              />

              <!-- diagonal reference (linear) -->
              <line
                :x1="toScreenX(0)"
                :y1="toScreenY(0)"
                :x2="toScreenX(1)"
                :y2="toScreenY(1)"
                stroke="currentColor"
                class="text-base-content/30"
                stroke-width="1"
                stroke-dasharray="3 3"
              />

              <!-- curve -->
              <path
                :d="curvePath"
                fill="none"
                stroke="currentColor"
                class="text-primary"
                stroke-width="2.5"
              />

              <!-- control handles -->
              <line
                :x1="toScreenX(0)"
                :y1="toScreenY(0)"
                :x2="p1Screen.x"
                :y2="p1Screen.y"
                stroke="currentColor"
                class="text-base-content/40"
                stroke-width="1"
              />
              <line
                :x1="toScreenX(1)"
                :y1="toScreenY(1)"
                :x2="p2Screen.x"
                :y2="p2Screen.y"
                stroke="currentColor"
                class="text-base-content/40"
                stroke-width="1"
              />

              <!-- P0 / P3 endpoints -->
              <circle
                :cx="toScreenX(0)"
                :cy="toScreenY(0)"
                r="3"
                fill="currentColor"
                class="text-base-content/50"
              />
              <circle
                :cx="toScreenX(1)"
                :cy="toScreenY(1)"
                r="3"
                fill="currentColor"
                class="text-base-content/50"
              />

              <!-- P1 draggable -->
              <circle
                :cx="p1Screen.x"
                :cy="p1Screen.y"
                r="8"
                fill="currentColor"
                class="text-primary cursor-grab"
                :class="{ 'cursor-grabbing': dragging === 'p1' }"
              />
              <circle
                :cx="p2Screen.x"
                :cy="p2Screen.y"
                r="8"
                fill="currentColor"
                class="text-secondary cursor-grab"
                :class="{ 'cursor-grabbing': dragging === 'p2' }"
              />
            </svg>
          </div>
          <p class="text-xs text-base-content/60 mt-1">
            拖动 P1（蓝）与 P2（粉）调整曲线；x 轴为时间，y 轴为进度。
          </p>
        </div>

        <!-- numeric inputs -->
        <div class="grid grid-cols-2 gap-3">
          <div
            v-for="p in ['p1', 'p2']"
            :key="p"
            class="p-3 rounded-lg bg-base-200"
          >
            <p class="text-xs font-semibold uppercase tracking-wider mb-2 opacity-60">
              {{ p === 'p1' ? 'P1' : 'P2' }}
            </p>
            <div class="flex flex-col gap-2">
              <label class="flex items-center gap-2 text-sm">
                <span class="w-4 opacity-60">x</span>
                <input
                  :value="formatNum(p === 'p1' ? bezier.x1 : bezier.x2)"
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  class="input input-bordered input-sm w-full font-mono"
                  @input="setCoord(p, 'x', $event.target.value)"
                >
              </label>
              <label class="flex items-center gap-2 text-sm">
                <span class="w-4 opacity-60">y</span>
                <input
                  :value="formatNum(p === 'p1' ? bezier.y1 : bezier.y2)"
                  type="number"
                  step="0.01"
                  class="input input-bordered input-sm w-full font-mono"
                  @input="setCoord(p, 'y', $event.target.value)"
                >
              </label>
            </div>
          </div>
        </div>

        <!-- timing function table preview (sampled) -->
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">采样点</span></label>
          <div class="bg-base-200 rounded-lg p-3 font-mono text-xs">
            <div
              v-for="sample in samples"
              :key="sample.x"
              class="flex justify-between gap-2"
            >
              <span class="opacity-60">x={{ sample.x.toFixed(2) }}</span>
              <span>y={{ sample.y.toFixed(3) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: preview + code -->
      <div class="flex flex-col gap-4">
        <!-- animation preview -->
        <div class="form-control">
          <label class="label">
            <span class="label-text font-semibold">动画预览</span>
          </label>
          <div class="bg-base-200 rounded-lg p-4">
            <div class="flex items-center justify-between mb-3">
              <span class="text-sm opacity-60">时长</span>
              <input
                v-model.number="duration"
                type="range"
                min="200"
                max="3000"
                step="100"
                class="range range-sm flex-1 mx-3"
              >
              <span class="text-sm w-16 text-right font-mono">{{ duration }}ms</span>
            </div>
            <div class="relative bg-base-300/40 rounded">
              <!-- normal-range track marker (matches the ball's 0..1 travel) -->
              <div
                class="absolute top-4 bottom-4 left-2 right-2 border border-dashed border-base-content/15 rounded pointer-events-none"
              />
              <div class="relative h-16 px-2 py-2">
                <div
                  class="absolute top-1/2 -translate-y-1/2 w-8 h-8 rounded bg-primary transition-none"
                  :style="ballStyle"
                />
              </div>
            </div>
            <div class="flex items-center gap-2 mt-3">
              <button
                class="btn btn-sm btn-primary gap-1"
                @click="play"
              >
                <Icon
                  icon="lucide:play"
                  class="w-4 h-4"
                />
                播放
              </button>
              <button
                class="btn btn-sm btn-ghost gap-1"
                @click="loop = !loop"
              >
                <span :class="loop ? 'text-success' : 'opacity-60'">循环</span>
              </button>
            </div>
          </div>
        </div>

        <!-- presets -->
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">预设</span></label>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="preset in presets"
              :key="preset.name"
              class="btn btn-sm"
              :class="isCurrent(preset) ? 'btn-primary' : 'btn-outline'"
              @click="applyPreset(preset)"
            >
              {{ preset.name }}
            </button>
          </div>
        </div>

        <!-- css code -->
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
import { ref, computed, onBeforeUnmount, reactive } from 'vue'
import {
  DEFAULT_BEZIER,
  PRESETS,
  bezierAxis,
  yAtX,
  formatCss,
} from './cubicBezier.js'

const width = 320
const height = 640
const pad = 24
const innerX = width - pad * 2
const innerY = height - pad * 2
// y display range extended beyond [0,1] so overshoot / bounce
// control points (e.g. in-out-back y=-0.55..1.55) stay visible.
// With yRange = 2 and xRange = 1, innerY = 2 * innerX keeps the
// canvas visually 1:1 (1 unit on each axis = same pixel length).
const yMin = -0.5
const yMax = 1.5
const yRange = yMax - yMin

const bezier = reactive({ ...DEFAULT_BEZIER })
const presets = PRESETS
const duration = ref(1000)
const loop = ref(false)
const copied = ref(false)

const svgEl = ref(null)
const dragging = ref(null)
let rafId = null
let startTime = null

const p1Screen = computed(() => toScreen(bezier.x1, bezier.y1))
const p2Screen = computed(() => toScreen(bezier.x2, bezier.y2))

function toScreen(x, y) {
  return {
    x: pad + x * innerX,
    y: pad + (yMax - y) / yRange * innerY,
  }
}

function toScreenX(x) {
  return pad + x * innerX
}

function toScreenY(y) {
  return pad + (yMax - y) / yRange * innerY
}

function screenToBezier(sx, sy) {
  const rect = svgEl.value.getBoundingClientRect()
  // Guard against zero-layout (hidden SVG, jsdom) which would produce
  // Infinity / NaN and corrupt the bezier state.
  if (!rect.width || !rect.height) return { x: 0, y: 0 }
  // x and y scales differ (canvas is 320x640), so compute each axis
  // from its own pixel dimension.
  const scaleX = width / rect.width
  const scaleY = height / rect.height
  const x = ((sx - rect.left) * scaleX - pad) / innerX
  const y = yMax - ((sy - rect.top) * scaleY - pad) / innerY * yRange
  return { x, y }
}

const curvePath = computed(() => {
  // sample 60 points to draw a smooth path
  const steps = 60
  const pts = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const x = bezierAxis(t, bezier.x1, bezier.x2)
    const y = bezierAxis(t, bezier.y1, bezier.y2)
    pts.push(toScreen(x, y))
  }
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ')
})

const cssValue = computed(() => formatCss(bezier))
const cssCode = computed(() => `transition-timing-function: ${cssValue.value};`)

const samples = computed(() => {
  const out = []
  for (let i = 0; i <= 5; i++) {
    const x = i / 5
    out.push({ x, y: yAtX(x, bezier) })
  }
  return out
})

const ballProgress = ref(0)
const ballStyle = computed(() => {
  // progress 0 -> left:0 (ball left edge at track left)
  // progress 1 -> left: 100% - 2rem (ball right edge at track right)
  // progress > 1 (overshoot) -> ball extends beyond track, visible
  // because the parent has no overflow-hidden.
  return {
    left: `calc(${ballProgress.value} * (100% - 2rem))`,
  }
})

function isCurrent(preset) {
  return ['x1', 'y1', 'x2', 'y2'].every(k => Math.abs(bezier[k] - preset[k]) < 1e-6)
}

function applyPreset(preset) {
  Object.assign(bezier, {
    x1: preset.x1, y1: preset.y1, x2: preset.x2, y2: preset.y2,
  })
}

function formatNum(n) {
  return String(Math.round(n * 1000) / 1000)
}

function setCoord(point, axis, value) {
  // Ignore empty / non-numeric input so the user can clear a field
  // to re-type without the coordinate snapping to 0.
  if (value === '' || value == null) return
  const num = Number(value)
  if (!Number.isFinite(num)) return
  const key = point === 'p1'
    ? (axis === 'x' ? 'x1' : 'y1')
    : (axis === 'x' ? 'x2' : 'y2')
  if (axis === 'x') {
    bezier[key] = Math.max(0, Math.min(1, num))
  } else {
    bezier[key] = num
  }
}

function onPointerDown(e) {
  const point = e.touches ? e.touches[0] : e
  const { x, y } = screenToBezier(point.clientX, point.clientY)
  // decide which handle is closer
  const d1 = Math.hypot(x - bezier.x1, y - bezier.y1)
  const d2 = Math.hypot(x - bezier.x2, y - bezier.y2)
  dragging.value = d1 <= d2 ? 'p1' : 'p2'
  window.addEventListener('mousemove', onPointerMove)
  window.addEventListener('mouseup', onPointerUp)
  window.addEventListener('touchmove', onPointerMove, { passive: false })
  window.addEventListener('touchend', onPointerUp)
  onPointerMove(e)
}

function onPointerMove(e) {
  if (!dragging.value) return
  e.preventDefault?.()
  const point = e.touches ? e.touches[0] : e
  const { x, y } = screenToBezier(point.clientX, point.clientY)
  const cx = Math.max(0, Math.min(1, x))
  if (dragging.value === 'p1') {
    bezier.x1 = cx
    bezier.y1 = y
  } else {
    bezier.x2 = cx
    bezier.y2 = y
  }
}

function onPointerUp() {
  dragging.value = null
  window.removeEventListener('mousemove', onPointerMove)
  window.removeEventListener('mouseup', onPointerUp)
  window.removeEventListener('touchmove', onPointerMove)
  window.removeEventListener('touchend', onPointerUp)
}

function play() {
  if (rafId) cancelAnimationFrame(rafId)
  startTime = null
  ballProgress.value = 0
  const step = (ts) => {
    if (startTime === null) startTime = ts
    const elapsed = ts - startTime
    const linearX = Math.min(1, elapsed / duration.value)
    ballProgress.value = yAtX(linearX, bezier)
    if (linearX < 1) {
      rafId = requestAnimationFrame(step)
    } else if (loop.value) {
      startTime = ts
      rafId = requestAnimationFrame(step)
    } else {
      rafId = null
    }
  }
  rafId = requestAnimationFrame(step)
}

async function copyCode() {
  try {
    await navigator.clipboard.writeText(cssCode.value)
    copied.value = true
    setTimeout(() => copied.value = false, 1500)
  } catch { /* clipboard not available */ }
}

onBeforeUnmount(() => {
  if (rafId) cancelAnimationFrame(rafId)
  onPointerUp()
})
</script>
