<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">
      URL 编码 / 解码
    </h1>

    <!-- Toolbar -->
    <div class="flex flex-wrap gap-2 mb-4">
      <button
        :class="['btn btn-sm gap-1', method === 'uri' ? 'btn-primary' : '']"
        @click="setMethod('uri')"
      >
        encodeURI / decodeURI
      </button>
      <button
        :class="['btn btn-sm gap-1', method === 'component' ? 'btn-primary' : '']"
        @click="setMethod('component')"
      >
        encodeURIComponent / decodeURIComponent
      </button>
    </div>
    <div class="flex flex-col gap-4 max-w-2xl">
      <div class="form-control">
        <label class="label"><span class="label-text font-semibold">明文</span></label>
        <div class="relative">
          <textarea
            v-model="input"
            class="textarea textarea-bordered w-full font-mono text-sm"
            placeholder="输入明文..."
            rows="6"
            @input="onInputChange"
          />
          <button
            v-if="input"
            class="btn btn-ghost btn-xs btn-square absolute bottom-2 right-2"
            :title="inputCopied ? '已复制！' : '复制'"
            @click="copyText(input, 'inputCopied')"
          >
            <Icon
              v-if="inputCopied"
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

      <div class="flex justify-center opacity-40">
        <Icon
          icon="lucide:arrow-up-down"
          class="w-6 h-6"
        />
      </div>

      <div class="form-control">
        <label class="label"><span class="label-text font-semibold">URL 编码</span></label>
        <div class="relative">
          <textarea
            v-model="output"
            class="textarea textarea-bordered w-full font-mono text-sm"
            placeholder="输入 URL 编码字符串..."
            rows="6"
            @input="onOutputChange"
          />
          <button
            v-if="output"
            class="btn btn-ghost btn-xs btn-square absolute bottom-2 right-2"
            :title="outputCopied ? '已复制！' : '复制'"
            @click="copyText(output, 'outputCopied')"
          >
            <Icon
              v-if="outputCopied"
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
        <p
          v-if="error"
          class="text-error text-sm mt-1"
        >
          {{ error }}
        </p>
      </div>

      <div class="flex justify-end">
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
      </div>
    </div>
  </div>
</template>

<script setup>
import { Icon } from '@iconify/vue'
import { ref } from 'vue'
import { encodeLines, decodeLines } from './url-encode.js'

const input = ref('https://example.com/path?name=张三&lang=中文')
const output = ref('')
const method = ref('uri')
const error = ref('')
const inputCopied = ref(false)
const outputCopied = ref(false)

function onInputChange() {
  error.value = ''
  if (!input.value) {
    output.value = ''
    return
  }
  try {
    output.value = encodeLines(input.value, method.value)
  } catch (e) {
    error.value = '编码失败：' + e.message
  }
}

function onOutputChange() {
  error.value = ''
  if (!output.value) {
    input.value = ''
    return
  }
  try {
    input.value = decodeLines(output.value, method.value)
  } catch (e) {
    error.value = '解码失败：' + e.message
  }
}

function setMethod(m) {
  method.value = m
  onInputChange()
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

// Initialize output from default input
onInputChange()
</script>
