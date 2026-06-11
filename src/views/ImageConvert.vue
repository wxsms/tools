<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">
      图片格式转换
    </h1>
    <div class="flex flex-col gap-6 max-w-2xl">
      <div class="form-control">
        <label class="label"><span class="label-text font-semibold">选择图片</span></label>
        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          class="file-input file-input-bordered w-full"
          @change="onFileChange"
        >
      </div>

      <div
        v-if="imageSrc"
        class="flex flex-col gap-4"
      >
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">目标格式</span></label>
          <div class="flex gap-2">
            <button
              v-for="f in formats"
              :key="f.value"
              :class="['btn btn-sm', targetFormat === f.value ? 'btn-primary' : '']"
              @click="targetFormat = f.value"
            >
              {{ f.label }}
            </button>
          </div>
        </div>

        <div
          v-if="targetFormat !== 'image/png'"
          class="form-control"
        >
          <label class="label"><span class="label-text font-semibold">质量</span></label>
          <div class="flex items-center gap-2">
            <input
              v-model.number="quality"
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              class="range range-sm flex-1"
            >
            <span class="text-sm w-10 text-right">{{ Math.round(quality * 100) }}%</span>
          </div>
        </div>

        <div class="stats shadow">
          <div class="stat">
            <div class="stat-title">
              原始格式
            </div>
            <div class="stat-value text-base">
              {{ sourceType || '未知' }}
            </div>
          </div>
          <div class="stat">
            <div class="stat-title">
              原始大小
            </div>
            <div class="stat-value text-base">
              {{ formatSize(originalSize) }}
            </div>
          </div>
          <div class="stat">
            <div class="stat-title">
              转换后大小
            </div>
            <div class="stat-value text-base">
              {{ convertedSize ? formatSize(convertedSize) : '-' }}
            </div>
          </div>
        </div>

        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">预览</span></label>
          <div class="border border-base-300 rounded-lg overflow-hidden bg-base-200">
            <canvas
              ref="canvas"
              class="max-w-full h-auto block mx-auto"
            />
          </div>
        </div>

        <div class="flex justify-end gap-2">
          <button
            class="btn btn-ghost btn-sm gap-1"
            @click="reset"
          >
            <TrashIcon class="w-4 h-4" />
            重置
          </button>
          <button
            class="btn btn-primary btn-sm gap-1"
            :disabled="!imageSrc"
            @click="download"
          >
            <ArrowDownTrayIcon class="w-4 h-4" />
            下载
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { TrashIcon, ArrowDownTrayIcon } from '@heroicons/vue/24/outline'

const fileInput = ref(null)
const canvas = ref(null)
const imageSrc = ref('')
const imageObj = ref(null)
const sourceType = ref('')
const originalSize = ref(0)
const convertedSize = ref(0)

const targetFormat = ref('image/png')
const quality = ref(0.9)
const formats = [
  { value: 'image/png', label: 'PNG' },
  { value: 'image/jpeg', label: 'JPEG' },
  { value: 'image/webp', label: 'WebP' },
]

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

function onFileChange(e) {
  const file = e.target.files[0]
  if (!file) return
  sourceType.value = file.type
  originalSize.value = file.size
  const reader = new FileReader()
  reader.onload = (ev) => {
    imageSrc.value = ev.target.result
    const img = new Image()
    img.onload = () => {
      imageObj.value = img
      nextTick(render)
    }
    img.src = ev.target.result
  }
  reader.readAsDataURL(file)
}

function render() {
  const img = imageObj.value
  const cvs = canvas.value
  if (!img || !cvs) return

  cvs.width = img.width
  cvs.height = img.height
  const ctx = cvs.getContext('2d')
  if (targetFormat.value === 'image/jpeg') {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, cvs.width, cvs.height)
  }
  ctx.drawImage(img, 0, 0)

  const dataUrl = cvs.toDataURL(targetFormat.value, quality.value)
  const base64 = dataUrl.split(',')[1]
  convertedSize.value = Math.round(base64.length * 3 / 4)
}

function reset() {
  imageSrc.value = ''
  imageObj.value = null
  sourceType.value = ''
  originalSize.value = 0
  convertedSize.value = 0
  targetFormat.value = 'image/png'
  quality.value = 0.9
  if (fileInput.value) fileInput.value.value = ''
}

function download() {
  if (!canvas.value) return
  const ext = targetFormat.value.split('/')[1]
  const link = document.createElement('a')
  link.download = `converted.${ext}`
  link.href = canvas.value.toDataURL(targetFormat.value, quality.value)
  link.click()
}

watch([targetFormat, quality], () => {
  nextTick(render)
})
</script>
