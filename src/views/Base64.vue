<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">Base64 转换</h1>
    <div class="flex flex-col gap-4 max-w-2xl">
      <div class="form-control">
        <label class="label"><span class="label-text font-semibold">输入</span></label>
        <textarea v-model="input" class="textarea textarea-bordered w-full font-mono text-sm" placeholder="输入文本或 Base64 字符串..." rows="6" />
      </div>
      <div class="flex gap-2">
        <button class="btn btn-primary" @click="encode">编码</button>
        <button class="btn btn-secondary" @click="decode">解码</button>
        <button class="btn btn-ghost" @click="clear">清空</button>
      </div>
      <div class="form-control">
        <label class="label">
          <span class="label-text font-semibold">输出</span>
          <button v-if="output" class="btn btn-xs btn-outline" @click="copy">{{ copied ? '已复制！' : '复制' }}</button>
        </label>
        <textarea v-model="output" class="textarea textarea-bordered w-full font-mono text-sm" readonly rows="6" />
        <p v-if="error" class="text-error text-sm mt-1">{{ error }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const input = ref('')
const output = ref('')
const error = ref('')
const copied = ref(false)

function encode() {
  error.value = ''
  try {
    output.value = btoa(unescape(encodeURIComponent(input.value)))
  } catch (e) {
    error.value = '编码失败: ' + e.message
  }
}

function decode() {
  error.value = ''
  try {
    output.value = decodeURIComponent(escape(atob(input.value.trim())))
  } catch (e) {
    error.value = '无效的 Base64 字符串'
  }
}

function clear() {
  input.value = ''
  output.value = ''
  error.value = ''
}

async function copy() {
  try {
    await navigator.clipboard.writeText(output.value)
    copied.value = true
    setTimeout(() => copied.value = false, 1500)
  } catch {
    error.value = '复制失败'
  }
}
</script>
