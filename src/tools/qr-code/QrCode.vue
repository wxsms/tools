<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">
      二维码生成
    </h1>
    <div class="flex flex-col gap-6 max-w-2xl">
      <!-- Input -->
      <div class="form-control">
        <label class="label"><span class="label-text font-semibold">内容</span></label>
        <div class="relative">
          <textarea
            v-model="text"
            class="textarea textarea-bordered w-full font-mono text-sm"
            placeholder="输入文本或链接..."
            rows="4"
            @input="generate"
          />
          <button
            v-if="text"
            class="btn btn-ghost btn-xs btn-square absolute bottom-2 right-2"
            :title="textCopied ? '已复制！' : '复制'"
            @click="copyText(text)"
          >
            <Icon
              v-if="textCopied"
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

      <!-- Config -->
      <div class="grid grid-cols-2 gap-4">
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">尺寸</span></label>
          <select
            v-model.number="size"
            class="select select-bordered w-full"
            @change="generate"
          >
            <option :value="128">
              128 × 128
            </option>
            <option :value="256">
              256 × 256
            </option>
            <option :value="512">
              512 × 512
            </option>
          </select>
        </div>
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">纠错级别</span></label>
          <select
            v-model="errorLevel"
            class="select select-bordered w-full"
            @change="generate"
          >
            <option value="L">
              L — 低（7%）
            </option>
            <option value="M">
              M — 中（15%）
            </option>
            <option value="Q">
              Q — 较高（25%）
            </option>
            <option value="H">
              H — 高（30%）
            </option>
          </select>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">前景色</span></label>
          <div class="flex items-center gap-2">
            <input
              v-model="darkColor"
              type="color"
              class="input input-bordered w-12 h-10 p-1 cursor-pointer"
              @input="generate"
            >
            <input
              v-model="darkColor"
              type="text"
              class="input input-bordered w-full"
              @change="generate"
            >
          </div>
        </div>
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">背景色</span></label>
          <div class="flex items-center gap-2">
            <input
              v-model="lightColor"
              type="color"
              class="input input-bordered w-12 h-10 p-1 cursor-pointer"
              @input="generate"
            >
            <input
              v-model="lightColor"
              type="text"
              class="input input-bordered w-full"
              @change="generate"
            >
          </div>
        </div>
      </div>

      <!-- Preview -->
      <div
        v-if="dataUrl"
        class="form-control"
      >
        <label class="label"><span class="label-text font-semibold">预览</span></label>
        <div class="border border-base-300 rounded-lg p-4 bg-base-200 flex justify-center">
          <img
            :src="dataUrl"
            alt="QR Code"
            class="max-w-full h-auto"
            :style="{ width: Math.min(size, 320) + 'px' }"
          >
        </div>
      </div>

      <!-- Error -->
      <p
        v-if="error"
        class="text-error text-sm"
      >
        {{ error }}
      </p>

      <!-- Actions -->
      <div class="flex justify-end gap-2">
        <button
          class="btn btn-ghost btn-sm gap-1"
          @click="clear"
        >
          <Icon
            icon="lucide:trash-2"
            class="w-4 h-4"
          />
          清空
        </button>
        <button
          class="btn btn-primary btn-sm gap-1"
          :disabled="!dataUrl"
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
</template>

<script setup>
import { Icon } from '@iconify/vue'
import { ref } from 'vue'
import QRCode from 'qrcode'
const text = ref('https://example.com')
const size = ref(256)
const errorLevel = ref('M')
const darkColor = ref('#000000')
const lightColor = ref('#ffffff')
const dataUrl = ref('')
const error = ref('')
const textCopied = ref(false)

async function generate() {
  error.value = ''
  if (!text.value) {
    dataUrl.value = ''
    return
  }
  try {
    dataUrl.value = await QRCode.toDataURL(text.value, {
      width: size.value,
      margin: 2,
      errorCorrectionLevel: errorLevel.value,
      color: {
        dark: darkColor.value,
        light: lightColor.value,
      },
    })
  } catch (e) {
    error.value = '生成失败：' + e.message
    dataUrl.value = ''
  }
}

function clear() {
  text.value = ''
  dataUrl.value = ''
  error.value = ''
}

function download() {
  if (!dataUrl.value) return
  const link = document.createElement('a')
  link.download = 'qrcode.png'
  link.href = dataUrl.value
  link.click()
}

async function copyText(val) {
  try {
    await navigator.clipboard.writeText(val)
    textCopied.value = true
    setTimeout(() => textCopied.value = false, 1500)
  } catch { /* clipboard not available */ }
}

generate()
</script>
