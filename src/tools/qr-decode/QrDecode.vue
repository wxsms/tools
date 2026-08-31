<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">
      二维码解析
    </h1>
    <div class="flex flex-col gap-6 max-w-2xl">
      <!-- Input: file + dropzone -->
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

      <!-- Dropzone -->
      <div
        class="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors"
        :class="dragging ? 'border-primary bg-primary/10' : 'border-base-300 hover:border-base-400'"
        @click="fileInput?.click()"
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
        v-if="status === 'success' && result"
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

        <!-- Type badge -->
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">类型</span></label>
          <span class="badge badge-primary badge-lg">{{ result.title }}</span>
        </div>

        <!-- Structured fields -->
        <div
          v-if="result.fields.length"
          class="form-control"
        >
          <label class="label"><span class="label-text font-semibold">解析结果</span></label>
          <div class="overflow-x-auto">
            <table class="table table-zebra">
              <tbody>
                <tr
                  v-for="(field, i) in result.fields"
                  :key="i"
                >
                  <td class="font-semibold whitespace-nowrap w-1/4">
                    {{ field.label }}
                  </td>
                  <td class="break-all">
                    <a
                      v-if="field.action === 'link' && field.value"
                      :href="field.value"
                      target="_blank"
                      rel="noopener"
                      class="link link-primary"
                    >{{ field.value }}</a>
                    <span v-else>{{ field.value || '—' }}</span>
                  </td>
                  <td class="whitespace-nowrap w-12 text-right">
                    <button
                      v-if="field.value"
                      class="btn btn-ghost btn-xs btn-square"
                      :title="copiedKey === `${i}` ? '已复制！' : '复制'"
                      @click="copyText(field.value, `${i}`)"
                    >
                      <Icon
                        v-if="copiedKey === `${i}`"
                        icon="lucide:check"
                        class="w-4 h-4 text-success"
                      />
                      <Icon
                        v-else
                        icon="lucide:clipboard"
                        class="w-4 h-4"
                      />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Raw text -->
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">原始文本</span></label>
          <div class="relative">
            <textarea
              :value="rawText"
              class="textarea textarea-bordered w-full font-mono text-sm"
              rows="3"
              readonly
            />
            <button
              class="btn btn-ghost btn-xs btn-square absolute bottom-2 right-2"
              :title="copiedKey === 'raw' ? '已复制！' : '复制'"
              @click="copyText(rawText, 'raw')"
            >
              <Icon
                v-if="copiedKey === 'raw'"
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
import { ref, onMounted, onUnmounted } from 'vue'
import jsQR from 'jsqr'
import { detectType } from './qr-decode.js'

const fileInput = ref(null)
const status = ref('idle') // 'idle' | 'decoding' | 'success' | 'error'
const result = ref(null)
const rawText = ref('')
const imageSrc = ref('')
const dragging = ref(false)
const copiedKey = ref('')
let copyTimer = null

function decodeImage(file) {
  if (!file || !file.type.startsWith('image/')) return
  status.value = 'decoding'
  result.value = null
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
        result.value = detectType(decoded.data)
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

function onFileChange(e) {
  const file = e.target.files?.[0]
  if (file) decodeImage(file)
  e.target.value = '' // allow re-selecting same file
}

function onDrop(e) {
  dragging.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) decodeImage(file)
}

function onPaste(e) {
  const items = e.clipboardData?.items
  if (!items) return
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile()
      if (file) {
        decodeImage(file)
        break
      }
    }
  }
}

function copyText(value, key) {
  if (!value) return
  navigator.clipboard.writeText(value).then(() => {
    copiedKey.value = key
    if (copyTimer) clearTimeout(copyTimer)
    copyTimer = setTimeout(() => { copiedKey.value = '' }, 1500)
  })
}

onMounted(() => window.addEventListener('paste', onPaste))
onUnmounted(() => {
  window.removeEventListener('paste', onPaste)
  if (copyTimer) clearTimeout(copyTimer)
})
</script>
