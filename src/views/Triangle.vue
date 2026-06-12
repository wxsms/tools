<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">
      三角形
    </h1>
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
              <CheckIcon
                v-if="copied"
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
    default:
      return []
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
    default:
      return base
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
