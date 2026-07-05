<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">
      文件转 Base64
    </h1>

    <!-- Tabs -->
    <div
      role="tablist"
      class="tabs tabs-boxed mb-6 w-fit"
    >
      <button
        role="tab"
        class="tab"
        :class="{ 'tab-active': activeTab === 'to-base64' }"
        @click="activeTab = 'to-base64'"
      >
        文件 → Base64
      </button>
      <button
        role="tab"
        class="tab"
        :class="{ 'tab-active': activeTab === 'to-file' }"
        @click="activeTab = 'to-file'"
      >
        Base64 → 文件
      </button>
    </div>

    <!-- File → Base64 Tab -->
    <div
      v-if="activeTab === 'to-base64'"
      class="flex flex-col gap-4 max-w-2xl"
    >
      <div class="form-control">
        <label class="label"><span class="label-text font-semibold">选择文件</span></label>
        <input
          ref="fileInput"
          type="file"
          class="file-input file-input-bordered w-full"
          @change="onFileChange"
        >
      </div>

      <div
        v-if="fileInfo"
        class="flex flex-col gap-3"
      >
        <div class="text-sm opacity-70">
          {{ fileInfo.name }} ({{ fileInfo.size }})
        </div>
        <div
          v-if="imagePreviewUrl"
          class="form-control"
        >
          <label class="label"><span class="label-text font-semibold">预览</span></label>
          <div class="border border-base-300 rounded-lg overflow-hidden bg-base-200 p-2">
            <img
              :src="imagePreviewUrl"
              alt="预览"
              class="max-w-full h-auto max-h-80 block mx-auto"
            >
          </div>
        </div>
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">Base64 输出</span></label>
          <div class="relative">
            <textarea
              v-model="base64Output"
              class="textarea textarea-bordered w-full font-mono text-sm"
              rows="6"
              readonly
            />
            <button
              v-if="base64Output"
              class="btn btn-ghost btn-xs btn-square absolute bottom-2 right-2"
              :title="encodeCopied ? '已复制！' : '复制'"
              @click="copyBase64Output"
            >
              <CheckIcon
                v-if="encodeCopied"
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

      <div class="flex justify-end">
        <button
          class="btn btn-ghost btn-sm gap-1"
          @click="clearEncode"
        >
          <TrashIcon class="w-4 h-4" />
          清空
        </button>
      </div>
    </div>

    <!-- Base64 → File Tab -->
    <div
      v-if="activeTab === 'to-file'"
      class="flex flex-col gap-4 max-w-2xl"
    >
      <div class="form-control">
        <div class="flex gap-2">
          <div class="w-1/2">
            <label class="label"><span class="label-text font-semibold">文件名</span></label>
            <input
              v-model="fileName"
              type="text"
              class="input input-bordered w-full"
              placeholder="image.png"
            >
          </div>
          <div class="w-1/2">
            <label class="label"><span class="label-text font-semibold">MIME 类型</span></label>
            <input
              v-model="fileMime"
              type="text"
              class="input input-bordered w-full"
              placeholder="image/png"
            >
          </div>
        </div>
      </div>
      <div class="form-control">
        <label class="label"><span class="label-text font-semibold">Base64 字符串</span></label>
        <div class="relative">
          <textarea
            v-model="base64Input"
            class="textarea textarea-bordered w-full font-mono text-sm"
            placeholder="粘贴 Base64 字符串（带或不带 data:xxx;base64, 前缀）..."
            rows="6"
          />
        </div>
        <p
          v-if="decodeError"
          class="text-error text-sm mt-1"
        >
          {{ decodeError }}
        </p>
      </div>

      <div
        v-if="decodedImageSrc"
        class="form-control"
      >
        <label class="label"><span class="label-text font-semibold">预览</span></label>
        <div class="border border-base-300 rounded-lg overflow-hidden bg-base-200 p-2">
          <img
            :src="decodedImageSrc"
            alt="解码预览"
            class="max-w-full h-auto max-h-80 block mx-auto"
          >
        </div>
      </div>

      <div class="flex justify-end gap-2">
        <button
          class="btn btn-ghost btn-sm gap-1"
          @click="clearDecode"
        >
          <TrashIcon class="w-4 h-4" />
          清空
        </button>
        <button
          class="btn btn-primary btn-sm gap-1"
          :disabled="!base64Input"
          @click="download"
        >
          <ArrowDownTrayIcon class="w-4 h-4" />
          下载
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ClipboardDocumentIcon, CheckIcon, TrashIcon, ArrowDownTrayIcon } from '@heroicons/vue/24/outline'
import { IMAGE_MIMES, formatSize, mimeToExt, parseDataUrl, buildImageSrc } from './file-base64.js'

// --- Shared ---
const activeTab = ref('to-base64')

// --- File → Base64 ---
const fileInput = ref(null)
const base64Output = ref('')
const fileInfo = ref(null)
const imagePreviewUrl = ref('')
const encodeCopied = ref(false)

function onFileChange(e) {
  const file = e.target.files[0]
  if (!file) return

  fileInfo.value = { name: file.name, size: formatSize(file.size) }
  imagePreviewUrl.value = ''

  const reader = new FileReader()
  reader.onload = (ev) => {
    const dataUrl = ev.target.result
    base64Output.value = dataUrl
    if (IMAGE_MIMES.includes(file.type)) {
      imagePreviewUrl.value = dataUrl
    }
  }
  reader.readAsDataURL(file)
}

async function copyBase64Output() {
  try {
    await navigator.clipboard.writeText(base64Output.value)
    encodeCopied.value = true
    setTimeout(() => encodeCopied.value = false, 1500)
  } catch { /* clipboard not available */ }
}

function clearEncode() {
  base64Output.value = ''
  fileInfo.value = null
  imagePreviewUrl.value = ''
  if (fileInput.value) fileInput.value.value = ''
}

// --- Base64 → File ---
const base64Input = ref('')
const fileName = ref('')
const fileMime = ref('')
const decodeError = ref('')

const decodedImageSrc = computed(() => {
  return buildImageSrc(base64Input.value, fileMime.value)
})

function parseBase64Input() {
  const raw = base64Input.value.trim()
  const parsed = parseDataUrl(raw)
  if (parsed === null) {
    if (raw) decodeError.value = '无效的 data URL 格式'
    return null
  }
  const { base64, mime } = parsed

  if (raw.startsWith('data:')) {
    if (!fileMime.value && mime) fileMime.value = mime
    if (!fileName.value) {
      fileName.value = 'decoded' + mimeToExt(mime)
    }
  }

  try {
    atob(base64)
  } catch {
    decodeError.value = '无效的 Base64 字符串'
    return null
  }

  return { base64, mime: mime || 'application/octet-stream' }
}

function download() {
  decodeError.value = ''
  const parsed = parseBase64Input()
  if (!parsed) return

  const binaryStr = atob(parsed.base64)
  const bytes = new Uint8Array(binaryStr.length)
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i)
  }

  const name = fileName.value || ('decoded' + mimeToExt(parsed.mime))
  const blob = new Blob([bytes], { type: parsed.mime })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.download = name
  link.href = url
  link.click()
  URL.revokeObjectURL(url)
}

function clearDecode() {
  base64Input.value = ''
  fileName.value = ''
  fileMime.value = ''
  decodeError.value = ''
}
</script>
