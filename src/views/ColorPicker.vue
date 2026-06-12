<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">
      取色器
    </h1>
    <div class="flex flex-col gap-4 max-w-2xl">
      <!-- Preview card -->
      <div
        class="relative rounded-lg border border-base-300 h-28"
        :style="{ backgroundColor: hex }"
      >
        <input
          v-model="hex"
          type="color"
          class="absolute bottom-2 left-2 w-9 h-9 rounded-lg cursor-pointer bg-black/20 border-0 p-0.5"
          @input="onHexChange"
        >
        <div
          class="tooltip absolute bottom-2 right-2"
          :data-tip="eyedropperSupported ? '从屏幕取色' : '当前浏览器不支持取色'"
        >
          <button
            class="btn btn-sm gap-1 bg-black/20 backdrop-blur-sm border-0"
            :class="isLightColor ? 'text-neutral' : 'text-white'"
            :disabled="!eyedropperSupported || picking"
            @click="pickColor"
          >
            <EyeDropperIcon class="w-4 h-4" />
            {{ picking ? '取色中…' : '取色' }}
          </button>
        </div>
      </div>

      <!-- HEX -->
      <div class="form-control">
        <label class="label"><span class="label-text font-semibold">HEX</span></label>
        <div class="relative">
          <input
            v-model="hex"
            class="input input-bordered w-full font-mono text-sm"
            placeholder="#ff0000"
            @input="onHexChange"
          >
          <button
            class="btn btn-ghost btn-xs btn-square absolute right-1 top-1/2 -translate-y-1/2"
            :title="hexCopied ? '已复制！' : '复制'"
            @click="copyVal(hex, 'hexCopied')"
          >
            <CheckIcon
              v-if="hexCopied"
              class="w-4 h-4 text-success"
            />
            <ClipboardDocumentIcon
              v-else
              class="w-4 h-4"
            />
          </button>
        </div>
      </div>

      <!-- RGB -->
      <div class="form-control">
        <label class="label"><span class="label-text font-semibold">RGB</span></label>
        <div class="relative">
          <input
            v-model="rgb"
            class="input input-bordered w-full font-mono text-sm"
            placeholder="rgb(255, 0, 0)"
            @input="onRgbChange"
          >
          <button
            class="btn btn-ghost btn-xs btn-square absolute right-1 top-1/2 -translate-y-1/2"
            :title="rgbCopied ? '已复制！' : '复制'"
            @click="copyVal(rgb, 'rgbCopied')"
          >
            <CheckIcon
              v-if="rgbCopied"
              class="w-4 h-4 text-success"
            />
            <ClipboardDocumentIcon
              v-else
              class="w-4 h-4"
            />
          </button>
        </div>
      </div>

      <!-- HSL -->
      <div class="form-control">
        <label class="label"><span class="label-text font-semibold">HSL</span></label>
        <div class="relative">
          <input
            v-model="hsl"
            class="input input-bordered w-full font-mono text-sm"
            placeholder="hsl(0, 100%, 50%)"
            @input="onHslChange"
          >
          <button
            class="btn btn-ghost btn-xs btn-square absolute right-1 top-1/2 -translate-y-1/2"
            :title="hslCopied ? '已复制！' : '复制'"
            @click="copyVal(hsl, 'hslCopied')"
          >
            <CheckIcon
              v-if="hslCopied"
              class="w-4 h-4 text-success"
            />
            <ClipboardDocumentIcon
              v-else
              class="w-4 h-4"
            />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ClipboardDocumentIcon, CheckIcon, EyeDropperIcon } from '@heroicons/vue/24/outline'

const hex = ref('#6366f1')
const rgb = ref('rgb(99, 102, 241)')
const hsl = ref('hsl(239, 84%, 67%)')
const hexCopied = ref(false)
const rgbCopied = ref(false)
const hslCopied = ref(false)

function hexToRgb(h) {
  h = h.replace('#', '')
  if (h.length === 3) h = h.split('').map(c => c + c).join('')
  const n = parseInt(h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('')
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h, s, l = (max + min) / 2
  if (max === min) { h = s = 0 } else {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)]
}

function hslToRgb(h, s, l) {
  h /= 360; s /= 100; l /= 100
  let r, g, b
  if (s === 0) { r = g = b = l } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1; if (t > 1) t -= 1
      if (t < 1/6) return p + (q - p) * 6 * t
      if (t < 1/2) return q
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
      return p
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1/3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1/3)
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)]
}

function onHexChange() {
  const m = hex.value.match(/^#?([0-9a-fA-F]{3,6})$/)
  if (!m) return
  const [r, g, b] = hexToRgb(hex.value)
  rgb.value = `rgb(${r}, ${g}, ${b})`
  const [h, s, l] = rgbToHsl(r, g, b)
  hsl.value = `hsl(${h}, ${s}%, ${l}%)`
}

function onRgbChange() {
  const m = rgb.value.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
  if (!m) return
  const [, r, g, b] = m.map(Number)
  hex.value = rgbToHex(r, g, b)
  const [h, s, l] = rgbToHsl(r, g, b)
  hsl.value = `hsl(${h}, ${s}%, ${l}%)`
}

function onHslChange() {
  const m = hsl.value.match(/(\d+)\s*,\s*(\d+)%?\s*,\s*(\d+)%?/)
  if (!m) return
  const [, h, s, l] = m.map(Number)
  const [r, g, b] = hslToRgb(h, s, l)
  hex.value = rgbToHex(r, g, b)
  rgb.value = `rgb(${r}, ${g}, ${b})`
}

const eyedropperSupported = typeof window !== 'undefined' && 'EyeDropper' in window
const picking = ref(false)

const isLightColor = computed(() => {
  const [r, g, b] = hexToRgb(hex.value)
  return (r * 299 + g * 587 + b * 114) / 1000 > 128
})

async function pickColor() {
  try {
    picking.value = true
    const dropper = new EyeDropper()
    const result = await dropper.open()
    hex.value = result.sRGBHex
    onHexChange()
  } catch {
    // user cancelled or API error
  } finally {
    picking.value = false
  }
}

async function copyVal(text, flag) {
  try {
    await navigator.clipboard.writeText(text)
    const ref = flag === 'hexCopied' ? hexCopied : flag === 'rgbCopied' ? rgbCopied : hslCopied
    ref.value = true
    setTimeout(() => ref.value = false, 1500)
  } catch { /* clipboard not available */ }
}
</script>
