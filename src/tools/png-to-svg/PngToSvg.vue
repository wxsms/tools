<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">
      PNG 转 SVG
    </h1>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Left: source + params -->
      <div class="flex flex-col gap-4">
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">选择 PNG 图片</span></label>
          <input
            ref="fileInput"
            type="file"
            accept="image/png"
            class="file-input file-input-bordered w-full"
            @change="onFileChange"
          >
          <p class="text-xs opacity-60 mt-1">
            位图会先缩放到最长边 {{ MAX_TRACE_DIM }}px 再描摹，输出的 SVG 仍保持原始尺寸
          </p>
        </div>

        <div
          v-if="sourceFile"
          class="flex flex-wrap gap-x-6 gap-y-1 text-sm"
        >
          <span><span class="opacity-60">尺寸:</span> {{ imageSize.width }} × {{ imageSize.height }}</span>
          <span><span class="opacity-60">文件:</span> {{ formatSize(sourceFile.size) }}</span>
          <span v-if="tracedSize"><span class="opacity-60">描摹:</span> {{ tracedSize }}</span>
        </div>

        <div class="bg-base-200 rounded-lg p-4 flex flex-col gap-4">
          <div class="form-control">
            <label class="label py-0"><span class="label-text font-semibold">颜色数量</span></label>
            <div class="flex items-center gap-2">
              <input
                v-model.number="params.colors"
                type="range"
                min="2"
                max="64"
                step="1"
                class="range range-sm flex-1"
                aria-label="颜色数量"
              >
              <span class="text-sm w-10 text-right">{{ params.colors }}</span>
            </div>
            <p class="text-xs opacity-60">
              调色板颜色越多细节越丰富，文件也越大；开启去除背景时其中一种会被背景占用
            </p>
          </div>

          <div class="form-control">
            <label class="label py-0"><span class="label-text font-semibold">平滑度</span></label>
            <div class="flex items-center gap-2">
              <input
                v-model.number="params.smoothness"
                type="range"
                min="0"
                max="10"
                step="1"
                class="range range-sm flex-1"
                aria-label="平滑度"
              >
              <span class="text-sm w-10 text-right">{{ params.smoothness }}</span>
            </div>
            <p class="text-xs opacity-60">
              越高曲线越圆润、路径点越少；越低越贴近原始像素边缘
            </p>
          </div>

          <div class="form-control">
            <label class="label py-0"><span class="label-text font-semibold">噪点过滤</span></label>
            <div class="flex items-center gap-2">
              <input
                v-model.number="params.noiseFilter"
                type="range"
                min="0"
                max="32"
                step="1"
                class="range range-sm flex-1"
                aria-label="噪点过滤"
              >
              <span class="text-sm w-10 text-right">{{ params.noiseFilter }}</span>
            </div>
            <p class="text-xs opacity-60">
              丢弃小于该长度的杂边路径，用来清除麻点和碎屑
            </p>
          </div>

          <label class="label cursor-pointer justify-start gap-3 py-0">
            <input
              v-model="params.removeBackground"
              type="checkbox"
              class="checkbox checkbox-sm checkbox-primary"
            >
            <span class="label-text font-semibold">去除背景</span>
          </label>
          <p class="-mt-2 text-xs opacity-60">
            取图片四边最常见的颜色，从边缘向内填充成透明；被图形包围的同色区域会保留。
            若该颜色本身就贴满边框（例如紧裁的截图），会判定为主体并跳过去除
          </p>
        </div>

        <p
          v-if="error"
          class="text-error text-sm"
        >
          {{ error }}
        </p>
      </div>

      <!-- Right: preview + code -->
      <div class="flex flex-col gap-3">
        <div
          class="rounded-lg border border-base-300 overflow-auto"
          :style="checkerStyle"
        >
          <div
            v-if="error"
            class="flex items-center justify-center h-64 text-error text-sm p-4"
          >
            {{ error }}
          </div>
          <div
            v-else-if="!sourceFile"
            class="flex items-center justify-center h-64 text-sm opacity-40 p-4"
          >
            选择 PNG 图片后自动转换
          </div>
          <div
            v-else-if="converting && !result"
            class="flex items-center justify-center h-64 text-sm opacity-60 p-4"
          >
            转换中…
          </div>
          <div
            v-else-if="!result || !result.svg"
            class="flex items-center justify-center h-64 text-sm opacity-60 p-4"
          >
            没有可描摹的形状，试试减少噪点过滤或关闭去除背景
          </div>
          <!-- eslint-disable vue/no-v-html -->
          <div
            v-else
            class="min-h-64 flex items-center justify-center p-4 [&>svg]:max-w-full [&>svg]:h-auto"
            v-html="result.svg"
          />
          <!-- eslint-enable vue/no-v-html -->
        </div>

        <div
          v-if="result && result.svg"
          class="flex flex-wrap gap-x-6 gap-y-1 text-sm"
        >
          <span><span class="opacity-60">路径:</span> {{ result.pathCount }}</span>
          <span><span class="opacity-60">颜色图层:</span> {{ result.layerCount }}</span>
          <span><span class="opacity-60">SVG:</span> {{ formatSize(svgBytes) }}</span>
          <span
            v-if="converting"
            class="opacity-60"
          >更新中…</span>
          <span
            v-if="result.backgroundSkipReason === 'subject'"
            class="text-warning"
          >已跳过去除背景：四边同色区域是主体而非背景</span>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <button
            class="btn btn-sm gap-1"
            :disabled="!result || !result.svg"
            @click="copySvg"
          >
            <Icon
              :icon="svgCopied ? 'lucide:check' : 'lucide:clipboard'"
              class="w-4 h-4"
              :class="svgCopied ? 'text-success' : ''"
            />
            {{ svgCopied ? '已复制' : '复制' }}
          </button>
          <button
            class="btn btn-primary btn-sm gap-1"
            :disabled="!result || !result.svg"
            @click="downloadSvg"
          >
            <Icon
              icon="lucide:download"
              class="w-4 h-4"
            />
            下载 SVG
          </button>
          <button
            class="btn btn-ghost btn-sm gap-1"
            @click="reset"
          >
            <Icon
              icon="lucide:trash-2"
              class="w-4 h-4"
            />
            重置
          </button>
        </div>

        <textarea
          :value="result?.svg || ''"
          class="textarea textarea-bordered w-full font-mono text-xs leading-relaxed"
          rows="12"
          readonly
          spellcheck="false"
          placeholder="转换结果..."
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { Icon } from '@iconify/vue'
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { DEFAULT_PARAMS, MAX_TRACE_DIM, vectorize } from './png-to-svg.js'

const checkerStyle = {
  backgroundImage:
    'linear-gradient(45deg, #d4d4d4 25%, transparent 25%), linear-gradient(-45deg, #d4d4d4 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #d4d4d4 75%), linear-gradient(-45deg, transparent 75%, #d4d4d4 75%)',
  backgroundSize: '16px 16px',
  backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
  backgroundColor: '#ffffff',
}

// Parameter changes retrace after a short pause so dragging a slider stays responsive.
const RETRACE_DELAY = 250

const fileInput = ref(null)
const sourceFile = ref(null)
const imageData = ref(null)
const imageSize = reactive({ width: 0, height: 0 })
const params = reactive({ ...DEFAULT_PARAMS })
const result = ref(null)
const converting = ref(false)
const error = ref('')
const svgCopied = ref(false)
let retraceTimer = null

const tracedSize = computed(() => {
  if (!result.value || !imageSize.width) return ''
  if (result.value.traceWidth === imageSize.width && result.value.traceHeight === imageSize.height) return ''
  return `${result.value.traceWidth} × ${result.value.traceHeight}`
})

const svgBytes = computed(() => (result.value?.svg ? new Blob([result.value.svg]).size : 0))

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('无法读取该图片'))
    }
    img.src = url
  })
}

// Decoding a huge PNG costs its full pixel count in memory before the downscale
// even runs, so refuse images that a browser would struggle to rasterize.
const MAX_SOURCE_PIXELS = 64 * 1024 * 1024

// Downscale to MAX_TRACE_DIM and hand the pixels over as plain ImageData.
function toImageData(img) {
  if (img.naturalWidth * img.naturalHeight > MAX_SOURCE_PIXELS) {
    throw new Error('图片像素过多，请先缩小后再试')
  }
  const scale = Math.min(1, MAX_TRACE_DIM / Math.max(img.naturalWidth, img.naturalHeight))
  const width = Math.max(1, Math.round(img.naturalWidth * scale))
  const height = Math.max(1, Math.round(img.naturalHeight * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('当前浏览器不支持 Canvas，无法读取图片像素')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, width, height)
  try {
    return ctx.getImageData(0, 0, width, height)
  } catch {
    throw new Error('无法读取图片像素，请确认文件未损坏且不是超大的 PNG')
  }
}

async function onFileChange(event) {
  const file = event.target.files[0]
  if (!file) return
  clearTimeout(retraceTimer)
  error.value = ''
  result.value = null
  try {
    const img = await loadImage(file)
    imageSize.width = img.naturalWidth
    imageSize.height = img.naturalHeight
    imageData.value = toImageData(img)
    sourceFile.value = file
    retrace(0)
  } catch (e) {
    reset()
    error.value = e.message
  }
}

function retrace(delay = RETRACE_DELAY) {
  clearTimeout(retraceTimer)
  if (!imageData.value) return
  converting.value = true
  retraceTimer = setTimeout(() => {
    try {
      result.value = vectorize(imageData.value, params, { ...imageSize })
      error.value = ''
    } catch (e) {
      error.value = '转换失败：' + e.message
    } finally {
      converting.value = false
    }
  }, delay)
}

watch(params, () => retrace(), { deep: true })

onBeforeUnmount(() => clearTimeout(retraceTimer))

function reset() {
  clearTimeout(retraceTimer)
  sourceFile.value = null
  imageData.value = null
  imageSize.width = 0
  imageSize.height = 0
  result.value = null
  converting.value = false
  error.value = ''
  if (fileInput.value) fileInput.value.value = ''
}

async function copySvg() {
  if (!result.value?.svg) return
  try {
    await navigator.clipboard.writeText(result.value.svg)
    svgCopied.value = true
    setTimeout(() => svgCopied.value = false, 1500)
  } catch { /* clipboard not available */ }
}

function downloadSvg() {
  if (!result.value?.svg) return
  const blob = new Blob([result.value.svg], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = sourceFile.value ? sourceFile.value.name.replace(/\.png$/i, '') + '.svg' : 'image.svg'
  a.click()
  // revoking in the same tick can cancel the download in some browsers
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
</script>
