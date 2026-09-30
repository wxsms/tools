<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">
      图片占位图生成
    </h1>
    <div class="flex flex-col gap-6 max-w-2xl">
      <!-- 尺寸 -->
      <div class="grid grid-cols-2 gap-4">
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">宽度 (px)</span></label>
          <input
            v-model.number="width"
            type="number"
            min="1"
            max="4096"
            class="input input-bordered w-full font-mono"
          >
        </div>
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">高度 (px)</span></label>
          <input
            v-model.number="height"
            type="number"
            min="1"
            max="4096"
            class="input input-bordered w-full font-mono"
          >
        </div>
      </div>
      <div class="flex flex-wrap gap-2 -mt-3">
        <button
          v-for="p in PRESETS"
          :key="p.label"
          class="btn btn-xs btn-ghost border border-base-300 font-mono"
          @click="applyPreset(p)"
        >
          {{ p.label }}
        </button>
      </div>

      <!-- 颜色 -->
      <div class="grid grid-cols-2 gap-4">
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">背景色</span></label>
          <div class="flex items-center gap-2">
            <input
              v-model="background"
              type="color"
              class="input input-bordered w-12 h-10 p-1 cursor-pointer"
            >
            <input
              v-model="background"
              type="text"
              class="input input-bordered w-full font-mono text-sm"
            >
          </div>
        </div>
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">前景色 / 文字</span></label>
          <div class="flex items-center gap-2">
            <input
              v-model="foreground"
              type="color"
              class="input input-bordered w-12 h-10 p-1 cursor-pointer"
            >
            <input
              v-model="foreground"
              type="text"
              class="input input-bordered w-full font-mono text-sm"
            >
          </div>
        </div>
      </div>

      <!-- 文字 -->
      <div class="form-control">
        <label class="label">
          <span class="label-text font-semibold">文字</span>
          <span class="label-text-alt opacity-50">留空显示「宽 × 高」,支持 {w} {h} 占位符</span>
        </label>
        <textarea
          v-model="text"
          class="textarea textarea-bordered w-full font-mono text-sm"
          rows="2"
          placeholder="600 × 400"
        />
      </div>

      <!-- 预览 -->
      <div class="form-control">
        <label class="label"><span class="label-text font-semibold">预览</span></label>
        <div class="border border-base-300 rounded-lg p-4 bg-base-200 flex justify-center overflow-hidden">
          <img
            v-if="svg"
            :src="dataUri"
            :alt="placeholderText"
            class="max-w-full max-h-80 h-auto"
          >
        </div>
        <p
          v-if="!svg"
          class="text-error text-sm mt-2"
        >
          {{ error }}
        </p>
      </div>

      <!-- 导出 -->
      <div class="flex flex-wrap justify-end gap-2">
        <button
          class="btn btn-ghost btn-sm gap-1"
          :disabled="!svg"
          :title="copied ? '已复制！' : '复制 SVG 代码'"
          @click="copySvg"
        >
          <Icon
            :icon="copied ? 'lucide:check' : 'lucide:clipboard'"
            :class="['w-4 h-4', { 'text-success': copied }]"
          />
          {{ copied ? '已复制' : '复制 SVG' }}
        </button>
        <button
          class="btn btn-ghost btn-sm gap-1"
          :disabled="!svg"
          @click="downloadSvg"
        >
          <Icon
            icon="lucide:download"
            class="w-4 h-4"
          />
          SVG
        </button>
        <button
          class="btn btn-primary btn-sm gap-1"
          :disabled="!svg"
          @click="downloadPng"
        >
          <Icon
            icon="lucide:image-down"
            class="w-4 h-4"
          />
          PNG
        </button>
      </div>

      <!-- Data URI -->
      <div class="form-control">
        <label class="label"><span class="label-text font-semibold">Data URI</span></label>
        <div class="relative">
          <textarea
            :value="dataUri"
            readonly
            class="textarea textarea-bordered w-full font-mono text-xs leading-5 break-all"
            rows="3"
          />
          <button
            class="btn btn-ghost btn-xs btn-square absolute bottom-2 right-2"
            :title="uriCopied ? '已复制！' : '复制'"
            @click="copyUri"
          >
            <Icon
              v-if="uriCopied"
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
</template>

<script setup>
import { Icon } from '@iconify/vue'
import { computed, ref, watch } from 'vue'
import { buildSvg, normalizeColor, svgToDataUri, displayText } from './placeholder.js'

const PRESETS = [
  { w: 300, h: 250, label: '300×250' },
  { w: 600, h: 400, label: '600×400' },
  { w: 1200, h: 630, label: '1200×630' },
  { w: 1920, h: 1080, label: '1920×1080' },
]

const width = ref(600)
const height = ref(400)
const background = ref('#e5e7eb')
const foreground = ref('#111827')
const text = ref('')
const copied = ref(false)
const uriCopied = ref(false)

function clampSize(v) {
  const n = Math.floor(Number(v))
  if (!Number.isFinite(n) || n < 1) return 1
  return Math.min(n, 4096)
}

const safeWidth = computed(() => clampSize(width.value))
const safeHeight = computed(() => clampSize(height.value))
const safeBackground = computed(() => normalizeColor(background.value, '#e5e7eb'))
const safeForeground = computed(() => normalizeColor(foreground.value, '#111827'))
const placeholderText = computed(() => displayText(text.value, safeWidth.value, safeHeight.value))

const svg = computed(() => buildSvg({
  width: safeWidth.value,
  height: safeHeight.value,
  background: safeBackground.value,
  foreground: safeForeground.value,
  text: text.value,
}))
const dataUri = computed(() => svgToDataUri(svg.value))
const error = computed(() => {
  if (width.value === null || height.value === null) return '请输入宽度和高度'
  return '输入超出范围(1–4096)'
})

function applyPreset(p) {
  width.value = p.w
  height.value = p.h
}

function downloadBlob(blob, ext) {
  const link = document.createElement('a')
  link.download = `placeholder-${safeWidth.value}x${safeHeight.value}.${ext}`
  link.href = URL.createObjectURL(blob)
  link.click()
  URL.revokeObjectURL(link.href)
}

function downloadSvg() {
  downloadBlob(new Blob([svg.value], { type: 'image/svg+xml' }), 'svg')
}

async function downloadPng() {
  // 通过 Image 解码 SVG 后绘制到 canvas 导出 PNG
  const img = new Image()
  img.decoding = 'async'
  await new Promise((resolve, reject) => {
    img.onload = resolve
    img.onerror = () => reject(new Error('SVG 解码失败'))
    img.src = dataUri.value
  })
  const scale = 2 // 2x 导出,保证清晰度
  const canvas = document.createElement('canvas')
  canvas.width = safeWidth.value * scale
  canvas.height = safeHeight.value * scale
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
  downloadBlob(blob, 'png')
}

async function copySvg() {
  try {
    await navigator.clipboard.writeText(svg.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
  } catch { /* clipboard not available */ }
}

async function copyUri() {
  try {
    await navigator.clipboard.writeText(dataUri.value)
    uriCopied.value = true
    setTimeout(() => (uriCopied.value = false), 1500)
  } catch { /* clipboard not available */ }
}

watch([width, height], () => {
  // 输入框清空时显示空,避免 0 干扰
  if (width.value === 0) width.value = null
  if (height.value === 0) height.value = null
})
</script>
