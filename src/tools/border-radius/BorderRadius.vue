<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">
      圆角
    </h1>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Left: Controls -->
      <div class="flex flex-col gap-4">
        <!-- Link mode -->
        <div class="form-control">
          <label class="label cursor-pointer justify-start gap-3">
            <input
              v-model="linked"
              type="checkbox"
              class="checkbox checkbox-sm checkbox-primary"
            >
            <span class="label-text font-semibold">联动</span>
          </label>
        </div>

        <!-- Linked: single slider -->
        <div
          v-if="linked"
          class="form-control"
        >
          <label class="label"><span class="label-text font-semibold">圆角</span></label>
          <div class="flex items-center gap-2">
            <input
              :value="corners.tl"
              type="range"
              min="0"
              max="100"
              class="range range-sm flex-1"
              @input="onLinkedChange"
            >
            <span class="text-sm w-16 text-right">{{ corners.tl }}{{ unit }}</span>
          </div>
        </div>

        <!-- Unlinked: 4 sliders -->
        <template v-else>
          <div
            v-for="c in cornerDefs"
            :key="c.key"
            class="form-control"
          >
            <label class="label"><span class="label-text font-semibold">{{ c.label }}</span></label>
            <div class="flex items-center gap-2">
              <input
                v-model.number="corners[c.key]"
                type="range"
                min="0"
                max="100"
                class="range range-sm flex-1"
              >
              <span class="text-sm w-16 text-right">{{ corners[c.key] }}{{ unit }}</span>
            </div>
          </div>
        </template>

        <!-- Unit -->
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">单位</span></label>
          <div class="flex gap-2">
            <label
              v-for="u in units"
              :key="u"
              class="flex items-center gap-2 cursor-pointer"
            >
              <input
                v-model="unit"
                type="radio"
                name="border-radius-unit"
                :value="u"
                class="radio radio-sm radio-primary"
              >
              <span class="text-sm">{{ u }}</span>
            </label>
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
            <div
              class="w-40 h-40 bg-indigo-400 border-2 border-dashed border-base-content/30"
              :style="{ borderRadius: previewValue }"
            />
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
const cornerDefs = [
  { key: 'tl', label: '左上' },
  { key: 'tr', label: '右上' },
  { key: 'br', label: '右下' },
  { key: 'bl', label: '左下' },
]

const units = ['px', '%', 'rem']

const linked = ref(true)
const corners = ref({ tl: 16, tr: 16, br: 16, bl: 16 })
const unit = ref('px')
const copied = ref(false)

const checkerboard = "url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"20\" height=\"20\"><rect width=\"10\" height=\"10\" fill=\"%23f0f0f0\"/><rect x=\"10\" y=\"10\" width=\"10\" height=\"10\" fill=\"%23f0f0f0\"/><rect x=\"10\" width=\"10\" height=\"10\" fill=\"%23e0e0e0\"/><rect y=\"10\" width=\"10\" height=\"10\" fill=\"%23e0e0e0\"/></svg>')"

function onLinkedChange(e) {
  const val = Number(e.target.value)
  corners.value = { tl: val, tr: val, br: val, bl: val }
}

const radiusStr = computed(() => {
  const { tl, tr, br, bl } = corners.value
  const u = unit.value
  if (tl === tr && tr === br && br === bl) return `${tl}${u}`
  if (tl === br && tr === bl) return `${tl}${u} ${tr}${u}`
  return `${tl}${u} ${tr}${u} ${br}${u} ${bl}${u}`
})

const previewValue = computed(() => {
  const { tl, tr, br, bl } = corners.value
  const u = unit.value
  return `${tl}${u} ${tr}${u} ${br}${u} ${bl}${u}`
})

const cssCode = computed(() => `border-radius: ${radiusStr.value};`)

async function copyCode() {
  try {
    await navigator.clipboard.writeText(cssCode.value)
    copied.value = true
    setTimeout(() => copied.value = false, 1500)
  } catch { /* clipboard not available */ }
}
</script>
