<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">
      UUID 生成器
    </h1>
    <div class="flex flex-col gap-4 max-w-2xl">
      <div class="flex flex-wrap gap-2">
        <label class="label cursor-pointer gap-2">
          <input
            v-model="uppercase"
            type="checkbox"
            class="checkbox checkbox-sm checkbox-primary"
          >
          <span class="label-text">大写</span>
        </label>
        <label class="label cursor-pointer gap-2">
          <input
            v-model="noDash"
            type="checkbox"
            class="checkbox checkbox-sm checkbox-primary"
          >
          <span class="label-text">无连字符</span>
        </label>
      </div>
      <div class="form-control">
        <label class="label"><span class="label-text font-semibold">生成数量</span></label>
        <input
          v-model.number="count"
          type="number"
          min="1"
          max="100"
          class="input input-bordered w-32"
        >
      </div>
      <button
        class="btn btn-primary btn-sm w-fit gap-1"
        @click="generate"
      >
        <SparklesIcon class="w-4 h-4" />
        生成
      </button>
      <div class="form-control">
        <label class="label"><span class="label-text font-semibold">结果</span></label>
        <div class="relative">
          <textarea
            v-model="result"
            class="textarea textarea-bordered w-full font-mono text-sm"
            readonly
            rows="8"
            placeholder="点击生成..."
          />
          <button
            v-if="result"
            class="btn btn-ghost btn-xs btn-square absolute bottom-2 right-2"
            :title="copied ? '已复制！' : '复制'"
            @click="copy"
          >
            <CheckIcon
              v-if="copied"
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
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { SparklesIcon, ClipboardDocumentIcon, CheckIcon } from '@heroicons/vue/24/outline'

const uppercase = ref(false)
const noDash = ref(false)
const count = ref(1)
const result = ref('')
const copied = ref(false)

function uuidV4() {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
  let id = `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`
  if (noDash.value) id = id.replace(/-/g, '')
  if (uppercase.value) id = id.toUpperCase()
  return id
}

function generate() {
  const n = Math.min(Math.max(count.value || 1, 1), 100)
  const lines = []
  for (let i = 0; i < n; i++) lines.push(uuidV4())
  result.value = lines.join('\n')
}

async function copy() {
  try {
    await navigator.clipboard.writeText(result.value)
    copied.value = true
    setTimeout(() => copied.value = false, 1500)
  } catch { /* clipboard not available */ }
}

generate()
</script>
