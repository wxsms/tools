<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">
      JSON → Go 转换
    </h1>

    <!-- Toolbar -->
    <div class="flex flex-wrap gap-2 mb-4">
      <label class="label cursor-pointer gap-2">
        <input
          v-model="omitempty"
          type="checkbox"
          class="checkbox checkbox-sm"
          @change="regenerate"
        >
        <span class="label-text">所有属性可选（指针字段 + omitempty tag）</span>
      </label>
    </div>

    <div class="flex flex-col gap-4 max-w-2xl">
      <!-- Input -->
      <div class="form-control">
        <label class="label"><span class="label-text font-semibold">JSON 输入</span></label>
        <div class="relative">
          <textarea
            v-model="input"
            class="textarea textarea-bordered w-full font-mono text-sm"
            placeholder="粘贴 JSON..."
            rows="8"
            @input="onInputChange"
          />
          <button
            v-if="input"
            class="btn btn-ghost btn-xs btn-square absolute bottom-2 right-2"
            :title="inputCopied ? '已复制！' : '复制'"
            @click="copyText(input, 'inputCopied')"
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
      </div>

      <div class="flex justify-center opacity-40">
        <ArrowsUpDownIcon class="w-6 h-6" />
      </div>

      <!-- Output -->
      <div class="form-control">
        <label class="label"><span class="label-text font-semibold">Go 输出</span></label>
        <div class="relative">
          <textarea
            v-model="output"
            class="textarea textarea-bordered w-full font-mono text-sm"
            placeholder="Go 结构体将在此处生成..."
            rows="12"
            readonly
          />
          <button
            v-if="output"
            class="btn btn-ghost btn-xs btn-square absolute bottom-2 right-2"
            :title="outputCopied ? '已复制！' : '复制'"
            @click="copyText(output, 'outputCopied')"
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
          <TrashIcon class="w-4 h-4" />
          清空
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import {
  ArrowsUpDownIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  TrashIcon,
} from '@heroicons/vue/24/outline'
import { jsonToGo } from './json-to-go.js'

const DEFAULT_INPUT = JSON.stringify({
  name: 'wxsm',
  age: 18,
  active: true,
  tags: ['dev', 'go'],
  address: { city: 'BJ', zip: '100000' },
}, null, 2)

const input = ref(DEFAULT_INPUT)
const output = ref('')
const error = ref('')
const omitempty = ref(true)
const inputCopied = ref(false)
const outputCopied = ref(false)

let debounceTimer = null

async function generate() {
  const r = await jsonToGo(input.value, { omitempty: omitempty.value })
  if (r.ok) {
    output.value = r.code
    error.value = ''
  } else {
    output.value = ''
    error.value = r.error
  }
}

function onInputChange() {
  error.value = ''
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(generate, 300)
}

function regenerate() {
  // omitempty 切换：立即重跑，不 debounce
  generate()
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
      setTimeout(() => { inputCopied.value = false }, 1500)
    } else {
      outputCopied.value = true
      setTimeout(() => { outputCopied.value = false }, 1500)
    }
  } catch { /* clipboard not available */ }
}

onMounted(generate)
</script>
