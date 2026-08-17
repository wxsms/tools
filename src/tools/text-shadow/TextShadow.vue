<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">
      文字阴影
    </h1>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Left: Controls -->
      <div class="flex flex-col gap-4">
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">预设</span></label>
          <div class="flex flex-wrap gap-1">
            <button
              v-for="p in presets"
              :key="p.name"
              class="btn btn-xs btn-outline"
              :title="p.css"
              @click="applyPreset(p)"
            >
              {{ p.name }}
            </button>
          </div>
        </div>
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
                <Icon
                  icon="lucide:x"
                  class="w-3 h-3"
                />
              </button>
            </li>
          </ul>
          <button
            class="btn btn-outline btn-sm mt-2 gap-1"
            @click="addShadow"
          >
            <Icon
              icon="lucide:plus"
              class="w-4 h-4"
            />
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
                min="-50"
                max="50"
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
                min="-50"
                max="50"
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
                max="100"
                class="range range-sm flex-1"
              >
              <span class="text-sm w-12 text-right">{{ selected.blur }}px</span>
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
        </template>

        <!-- Preview text customization -->
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">预览文字</span></label>
          <input
            v-model="previewText"
            type="text"
            class="input input-bordered w-full"
          >
        </div>
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">文字大小</span></label>
          <div class="flex items-center gap-2">
            <input
              v-model.number="fontSize"
              type="range"
              min="16"
              max="120"
              class="range range-sm flex-1"
            >
            <span class="text-sm w-12 text-right">{{ fontSize }}px</span>
          </div>
        </div>
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">文字颜色</span></label>
          <div class="flex items-center gap-2">
            <input
              v-model="textColor"
              type="color"
              class="input input-bordered w-12 h-10 p-1 cursor-pointer"
            >
            <input
              v-model="textColor"
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
            <span
              class="font-bold leading-none"
              :style="{
                color: textColor,
                fontSize: fontSize + 'px',
                textShadow: cssValue,
              }"
            >{{ previewText }}</span>
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
import { ref, computed } from 'vue'

const defaultShadow = () => ({ x: 0, y: 6, blur: 12, color: '#000000', opacity: 0.6 })

// Each preset may override shadows, textColor, and fontSize.
const presets = [
  { name: '原图', shadows: [], textColor: '#ffffff', fontSize: 48 },
  { name: '硬阴影', shadows: [{ x: 2, y: 2, blur: 0, color: '#000000', opacity: 1 }], textColor: '#ffffff', fontSize: 48 },
  { name: '柔和', shadows: [{ x: 0, y: 2, blur: 6, color: '#000000', opacity: 0.4 }], textColor: '#ffffff', fontSize: 48 },
  { name: '深浮離', shadows: [{ x: 0, y: 6, blur: 12, color: '#000000', opacity: 0.6 }], textColor: '#ffffff', fontSize: 48 },
  { name: '浅浮離', shadows: [{ x: 0, y: 1, blur: 2, color: '#000000', opacity: 0.3 }], textColor: '#ffffff', fontSize: 48 },
  { name: '描边', shadows: [
    { x: 1, y: 0, blur: 0, color: '#000000', opacity: 1 },
    { x: -1, y: 0, blur: 0, color: '#000000', opacity: 1 },
    { x: 0, y: 1, blur: 0, color: '#000000', opacity: 1 },
    { x: 0, y: -1, blur: 0, color: '#000000', opacity: 1 },
  ], textColor: '#ffffff', fontSize: 48 },
  { name: '发光', shadows: [
    { x: 0, y: 0, blur: 8, color: '#fbbf24', opacity: 0.9 },
    { x: 0, y: 0, blur: 16, color: '#f59e0b', opacity: 0.6 },
  ], textColor: '#ffffff', fontSize: 48 },
  { name: '霓虹', shadows: [
    { x: 0, y: 0, blur: 4, color: '#22d3ee', opacity: 1 },
    { x: 0, y: 0, blur: 12, color: '#06b6d4', opacity: 0.8 },
    { x: 0, y: 0, blur: 24, color: '#0891b2', opacity: 0.6 },
  ], textColor: '#ffffff', fontSize: 48 },
  { name: '火热', shadows: [
    { x: 0, y: 0, blur: 6, color: '#ef4444', opacity: 0.9 },
    { x: 0, y: 0, blur: 14, color: '#f97316', opacity: 0.7 },
  ], textColor: '#ffffff', fontSize: 48 },
  { name: '复古', shadows: [{ x: 4, y: 4, blur: 0, color: '#7c2d12', opacity: 0.8 }], textColor: '#fbbf24', fontSize: 48 },
  { name: '3D', shadows: [
    { x: 1, y: 1, blur: 0, color: '#9ca3af', opacity: 1 },
    { x: 2, y: 2, blur: 0, color: '#6b7280', opacity: 1 },
    { x: 3, y: 3, blur: 0, color: '#4b5563', opacity: 1 },
    { x: 4, y: 4, blur: 0, color: '#374151', opacity: 1 },
  ], textColor: '#ffffff', fontSize: 48 },
  { name: '凹陷', shadows: [
    { x: 1, y: 1, blur: 0, color: '#ffffff', opacity: 0.5 },
    { x: -1, y: -1, blur: 0, color: '#000000', opacity: 0.5 },
  ], textColor: '#9ca3af', fontSize: 48 },
  { name: '长投影', shadows: [
    { x: 1, y: 1, blur: 0, color: '#000000', opacity: 0.2 },
    { x: 2, y: 2, blur: 0, color: '#000000', opacity: 0.2 },
    { x: 3, y: 3, blur: 0, color: '#000000', opacity: 0.2 },
    { x: 4, y: 4, blur: 0, color: '#000000', opacity: 0.2 },
    { x: 5, y: 5, blur: 0, color: '#000000', opacity: 0.2 },
    { x: 6, y: 6, blur: 1, color: '#000000', opacity: 0.2 },
  ], textColor: '#ffffff', fontSize: 48 },
]

const shadows = ref([defaultShadow()])
const selectedIndex = ref(0)
const copied = ref(false)

const previewText = ref('文字阴影 Text Shadow')
const fontSize = ref(48)
const textColor = ref('#ffffff')

const selected = computed(() => shadows.value[selectedIndex.value])

const checkerboard = "url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"20\" height=\"20\"><rect width=\"10\" height=\"10\" fill=\"%23f0f0f0\"/><rect x=\"10\" y=\"10\" width=\"10\" height=\"10\" fill=\"%23f0f0f0\"/><rect x=\"10\" width=\"10\" height=\"10\" fill=\"%23e0e0e0\"/><rect y=\"10\" width=\"10\" height=\"10\" fill=\"%23e0e0e0\"/></svg>')"

function hexToRgba(hex, opacity) {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}

function shadowToCss(s) {
  const rgba = hexToRgba(s.color, s.opacity)
  return [`${s.x}px`, `${s.y}px`, `${s.blur}px`, rgba].join(' ')
}

function shadowSummary(s) {
  return `${s.x}px ${s.y}px ${s.blur}px`
}

const cssValue = computed(() => shadows.value.map(shadowToCss).join(', '))

const cssCode = computed(() => `text-shadow: ${cssValue.value};`)

function addShadow() {
  shadows.value.push(defaultShadow())
  selectedIndex.value = shadows.value.length - 1
}

function applyPreset(p) {
  shadows.value = p.shadows.map(s => ({ ...s }))
  selectedIndex.value = 0
  if (p.textColor) textColor.value = p.textColor
  if (p.fontSize) fontSize.value = p.fontSize
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
