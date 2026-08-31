<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">
      图片压缩
    </h1>
    <div class="flex flex-col gap-6 max-w-2xl">
      <!-- Hidden file input, triggered by dropzone click -->
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        class="hidden"
        @change="onFileChange"
      >

      <!-- Dropzone -->
      <div
        class="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors"
        :class="dragging ? 'border-primary bg-primary/10' : 'border-base-300 hover:border-base-400'"
        @click="openPicker"
        @dragover.prevent="dragging = true"
        @dragleave.prevent="dragging = false"
        @drop.prevent="onDrop"
      >
        <Icon
          icon="lucide:image-up"
          class="w-12 h-12 mx-auto mb-2 opacity-50"
        />
        <p class="text-sm text-base-content/60">
          点击此处、拖拽图片到此处，或直接 <kbd class="kbd kbd-sm">Ctrl</kbd>+<kbd class="kbd kbd-sm">V</kbd> 粘贴
        </p>
      </div>

      <div
        v-if="imageSrc"
        class="flex flex-col gap-4"
      >
        <div class="grid grid-cols-2 gap-4">
          <div
            v-if="format !== 'image/png'"
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
          <div class="form-control">
            <label class="label"><span class="label-text font-semibold">缩放</span></label>
            <div class="flex items-center gap-2">
              <input
                v-model.number="scale"
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                class="range range-sm flex-1"
              >
              <span class="text-sm w-10 text-right">{{ Math.round(scale * 100) }}%</span>
            </div>
          </div>
        </div>

        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">输出格式</span></label>
          <div class="flex gap-2">
            <button
              v-for="f in formats"
              :key="f"
              :class="['btn btn-sm', format === f ? 'btn-primary' : '']"
              @click="format = f"
            >
              {{ fLabel(f) }}
            </button>
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
              压缩后
            </div>
            <div class="stat-value text-base">
              {{ compressedSize ? formatSize(compressedSize) : '-' }}
            </div>
          </div>
          <div class="stat">
            <div class="stat-title">
              压缩率
            </div>
            <div class="stat-value text-base">
              {{ ratio }}
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
            <Icon
              icon="lucide:trash-2"
              class="w-4 h-4"
            />
            重置
          </button>
          <button
            class="btn btn-primary btn-sm gap-1"
            :disabled="!imageSrc"
            @click="download"
          >
            <Icon
              icon="lucide:download"
              class="w-4 h-4"
            />
            下载
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Icon } from '@iconify/vue'
import { ref, watch, nextTick } from 'vue'
import { useImageInput } from '../../composables/useImageInput.js'

const canvas = ref(null)
const imageSrc = ref('')
const imageObj = ref(null)
const originalSize = ref(0)
const compressedSize = ref(0)
const sourceType = ref('')

const quality = ref(0.7)
const scale = ref(1)
const format = ref('image/jpeg')
const formats = ['image/jpeg', 'image/png', 'image/webp']
const ratio = ref('')

function fLabel(f) {
  return f.split('/')[1].toUpperCase()
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

function loadImage(file) {
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

const { fileInput, dragging, openPicker, onFileChange, onDrop } = useImageInput(loadImage)

function render() {
  const img = imageObj.value
  const cvs = canvas.value
  if (!img || !cvs) return

  cvs.width = Math.round(img.width * scale.value)
  cvs.height = Math.round(img.height * scale.value)
  const ctx = cvs.getContext('2d')
  if (format.value === 'image/jpeg') {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, cvs.width, cvs.height)
  }
  ctx.drawImage(img, 0, 0, cvs.width, cvs.height)

  const dataUrl = cvs.toDataURL(format.value, quality.value)
  const base64 = dataUrl.split(',')[1]
  compressedSize.value = Math.round(base64.length * 3 / 4)
  if (originalSize.value > 0 && compressedSize.value > 0) {
    ratio.value = (100 - (compressedSize.value / originalSize.value * 100)).toFixed(1) + '%'
  }
}

function reset() {
  imageSrc.value = ''
  imageObj.value = null
  sourceType.value = ''
  originalSize.value = 0
  compressedSize.value = 0
  ratio.value = ''
  quality.value = 0.7
  scale.value = 1
  format.value = 'image/jpeg'
  if (fileInput.value) fileInput.value.value = ''
}

function download() {
  if (!canvas.value) return
  const ext = format.value.split('/')[1]
  const link = document.createElement('a')
  link.download = `output.${ext}`
  link.href = canvas.value.toDataURL(format.value, quality.value)
  link.click()
}

watch([quality, scale, format], () => {
  nextTick(render)
})
</script>
