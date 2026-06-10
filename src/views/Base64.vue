<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">
      Base64 转换
    </h1>
    <div class="flex flex-col gap-4 max-w-2xl">
      <div class="form-control">
        <label class="label"><span class="label-text font-semibold">原文</span></label>
        <div class="relative">
          <textarea
            v-model="input"
            class="textarea textarea-bordered w-full font-mono text-sm"
            placeholder="输入原文..."
            rows="6"
            @input="onInputChange"
          />
          <button
            v-if="input"
            class="btn btn-ghost btn-xs btn-square absolute bottom-2 right-2"
            :title="inputCopied ? '已复制！' : '复制'"
            @click="copyInput"
          >
            <CheckIcon
              v-if="inputCopied"
              class="w-4 h-4 text-success"
            />
            <ClipboardDocumentIcon
              v-else
              class="w-4 h-4"
            />
          </button>
        </div>
        <p
          v-if="inputError"
          class="text-error text-sm mt-1"
        >
          {{ inputError }}
        </p>
      </div>

      <div class="flex justify-center opacity-40">
        <ArrowsUpDownIcon class="w-6 h-6" />
      </div>

      <div class="form-control">
        <label class="label"><span class="label-text font-semibold">Base64</span></label>
        <div class="relative">
          <textarea
            v-model="output"
            class="textarea textarea-bordered w-full font-mono text-sm"
            placeholder="输入 Base64 字符串..."
            rows="6"
            @input="onOutputChange"
          />
          <button
            v-if="output"
            class="btn btn-ghost btn-xs btn-square absolute bottom-2 right-2"
            :title="outputCopied ? '已复制！' : '复制'"
            @click="copyOutput"
          >
            <CheckIcon
              v-if="outputCopied"
              class="w-4 h-4 text-success"
            />
            <ClipboardDocumentIcon
              v-else
              class="w-4 h-4"
            />
          </button>
        </div>
        <p
          v-if="outputError"
          class="text-error text-sm mt-1"
        >
          {{ outputError }}
        </p>
      </div>

      <div class="flex justify-end">
        <button
          class="btn btn-ghost btn-sm gap-1"
          @click="clear"
        >
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
import { encodeBase64, decodeBase64 } from '../utils/base64.js'

const input = ref('')
const output = ref('')
const inputError = ref('')
const outputError = ref('')
const inputCopied = ref(false)
const outputCopied = ref(false)

function onInputChange() {
  outputError.value = ''
  if (!input.value) {
    output.value = ''
    return
  }
  try {
    output.value = encodeBase64(input.value)
  } catch (e) {
    outputError.value = '编码失败: ' + e.message
  }
}

function onOutputChange() {
  inputError.value = ''
  if (!output.value) {
    input.value = ''
    return
  }
  try {
    input.value = decodeBase64(output.value)
  } catch {
    inputError.value = '无效的 Base64 字符串'
  }
}

function clear() {
  input.value = ''
  output.value = ''
  inputError.value = ''
  outputError.value = ''
}

async function copyInput() {
  try {
    await navigator.clipboard.writeText(input.value)
    inputCopied.value = true
    setTimeout(() => inputCopied.value = false, 1500)
  } catch { /* clipboard not available */ }
}

async function copyOutput() {
  try {
    await navigator.clipboard.writeText(output.value)
    outputCopied.value = true
    setTimeout(() => outputCopied.value = false, 1500)
  } catch { /* clipboard not available */ }
}
</script>
