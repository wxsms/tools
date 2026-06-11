<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">HTML 实体编码</h1>
    <div class="flex flex-col gap-4 max-w-2xl">
      <div class="form-control">
        <label class="label"><span class="label-text font-semibold">明文</span></label>
        <div class="relative">
          <textarea
            v-model="input"
            class="textarea textarea-bordered w-full font-mono text-sm"
            placeholder="输入 HTML 文本..."
            rows="6"
            @input="onInputChange"
          />
          <button
            v-if="input"
            class="btn btn-ghost btn-xs btn-square absolute bottom-2 right-2"
            :title="inputCopied ? '已复制！' : '复制'"
            @click="copyText(input, 'inputCopied')"
          >
            <CheckIcon v-if="inputCopied" class="w-4 h-4 text-success" />
            <ClipboardDocumentIcon v-else class="w-4 h-4" />
          </button>
        </div>
      </div>

      <div class="flex justify-center opacity-40">
        <ArrowsUpDownIcon class="w-6 h-6" />
      </div>

      <div class="form-control">
        <label class="label"><span class="label-text font-semibold">HTML 实体</span></label>
        <div class="relative">
          <textarea
            v-model="output"
            class="textarea textarea-bordered w-full font-mono text-sm"
            placeholder="输入 HTML 实体..."
            rows="6"
            @input="onOutputChange"
          />
          <button
            v-if="output"
            class="btn btn-ghost btn-xs btn-square absolute bottom-2 right-2"
            :title="outputCopied ? '已复制！' : '复制'"
            @click="copyText(output, 'outputCopied')"
          >
            <CheckIcon v-if="outputCopied" class="w-4 h-4 text-success" />
            <ClipboardDocumentIcon v-else class="w-4 h-4" />
          </button>
        </div>
        <p v-if="error" class="text-error text-sm mt-1">{{ error }}</p>
      </div>

      <div class="flex justify-end">
        <button class="btn btn-ghost btn-sm gap-1" @click="clear">
          <TrashIcon class="w-4 h-4" />
          清空
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ArrowsUpDownIcon, ClipboardDocumentIcon, CheckIcon, TrashIcon } from '@heroicons/vue/24/outline'

const input = ref('')
const output = ref('')
const error = ref('')
const inputCopied = ref(false)
const outputCopied = ref(false)

function encodeHtml(str) {
  return str.replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]))
}

function decodeHtml(str) {
  const el = document.createElement('textarea')
  el.innerHTML = str
  return el.value
}

function onInputChange() {
  error.value = ''
  if (!input.value) { output.value = ''; return }
  output.value = encodeHtml(input.value)
}

function onOutputChange() {
  error.value = ''
  if (!output.value) { input.value = ''; return }
  try {
    input.value = decodeHtml(output.value)
  } catch (e) {
    error.value = '解码失败：' + e.message
  }
}

function clear() {
  input.value = ''
  output.value = ''
  error.value = ''
}

async function copyText(text, flag) {
  try {
    await navigator.clipboard.writeText(text)
    if (flag === 'inputCopied') {
      inputCopied.value = true
      setTimeout(() => inputCopied.value = false, 1500)
    } else {
      outputCopied.value = true
      setTimeout(() => outputCopied.value = false, 1500)
    }
  } catch { /* clipboard not available */ }
}

onInputChange()
</script>
