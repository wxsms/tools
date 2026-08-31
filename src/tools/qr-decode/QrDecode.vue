<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">
      二维码解析
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
          icon="mdi:qrcode-scan"
          class="w-12 h-12 mx-auto mb-2 opacity-50"
        />
        <p class="text-sm text-base-content/60">
          点击此处、拖拽图片到此处，或直接 <kbd class="kbd kbd-sm">Ctrl</kbd>+<kbd class="kbd kbd-sm">V</kbd> 粘贴
        </p>
      </div>

      <!-- Decoding state -->
      <div
        v-if="status === 'decoding'"
        class="flex items-center gap-2 text-base-content/60"
      >
        <span class="loading loading-spinner loading-sm" />
        解析中...
      </div>

      <!-- Error -->
      <div
        v-if="status === 'error'"
        class="alert alert-warning"
      >
        <Icon
          icon="lucide:alert-triangle"
          class="w-5 h-5"
        />
        <span>未检测到二维码，请确认图片清晰且包含完整二维码</span>
      </div>

      <!-- Result -->
      <div
        v-if="status === 'success'"
        class="flex flex-col gap-4"
      >
        <!-- Preview -->
        <div
          v-if="imageSrc"
          class="form-control"
        >
          <label class="label"><span class="label-text font-semibold">原图</span></label>
          <div class="border border-base-300 rounded-lg overflow-hidden bg-base-200 p-2">
            <img
              :src="imageSrc"
              alt="二维码原图"
              class="max-w-full max-h-48 h-auto block mx-auto"
            >
          </div>
        </div>

        <!-- Decoded text -->
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">解析结果</span></label>
          <div class="relative">
            <textarea
              :value="rawText"
              class="textarea textarea-bordered w-full font-mono text-sm"
              rows="3"
              readonly
            />
            <button
              class="btn btn-ghost btn-xs btn-square absolute bottom-2 right-2"
              :title="copied ? '已复制！' : '复制'"
              @click="copyText(rawText)"
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

        <!-- Open link button (only for URLs) -->
        <button
          v-if="isUrl"
          class="btn btn-primary btn-sm gap-1 self-start"
          @click="openLink"
        >
          <Icon
            icon="lucide:external-link"
            class="w-4 h-4"
          />
          打开链接
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Icon } from '@iconify/vue'
import { ref, computed } from 'vue'
import jsQR from 'jsqr'
import { useImageInput } from '../../composables/useImageInput.js'

const status = ref('idle') // 'idle' | 'decoding' | 'success' | 'error'
const rawText = ref('')
const imageSrc = ref('')
const copied = ref(false)
let copyTimer = null

const isUrl = computed(() => /^https?:\/\//i.test(rawText.value.trim()))

function decodeImage(file) {
  status.value = 'decoding'
  rawText.value = ''
  const reader = new FileReader()
  reader.onload = (e) => {
    imageSrc.value = e.target.result
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      ctx.drawImage(img, 0, 0)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const decoded = jsQR(imageData.data, canvas.width, canvas.height)
      if (decoded && decoded.data) {
        rawText.value = decoded.data
        status.value = 'success'
      } else {
        status.value = 'error'
      }
    }
    img.onerror = () => { status.value = 'error' }
    img.src = e.target.result
  }
  reader.onerror = () => { status.value = 'error' }
  reader.readAsDataURL(file)
}

const { fileInput, dragging, openPicker, onFileChange, onDrop } = useImageInput(decodeImage)

function copyText(value) {
  if (!value) return
  navigator.clipboard.writeText(value).then(() => {
    copied.value = true
    if (copyTimer) clearTimeout(copyTimer)
    copyTimer = setTimeout(() => { copied.value = false }, 1500)
  })
}

function openLink() {
  window.open(rawText.value.trim(), '_blank', 'noopener')
}
</script>
