<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">
      密码生成器
    </h1>
    <div class="flex flex-col gap-4 max-w-2xl">
      <div class="form-control">
        <label class="label"><span class="label-text font-semibold">密码长度</span></label>
        <div class="flex items-center gap-2">
          <input
            v-model.number="length"
            type="range"
            min="4"
            max="64"
            step="1"
            class="range range-sm flex-1"
          >
          <span class="text-sm w-10 text-right">{{ length }}</span>
        </div>
      </div>

      <div class="flex flex-wrap gap-4">
        <label class="label cursor-pointer gap-2">
          <input
            v-model="uppercase"
            type="checkbox"
            class="checkbox checkbox-sm checkbox-primary"
          >
          <span class="label-text">大写字母</span>
        </label>
        <label class="label cursor-pointer gap-2">
          <input
            v-model="lowercase"
            type="checkbox"
            class="checkbox checkbox-sm checkbox-primary"
          >
          <span class="label-text">小写字母</span>
        </label>
        <label class="label cursor-pointer gap-2">
          <input
            v-model="numbers"
            type="checkbox"
            class="checkbox checkbox-sm checkbox-primary"
          >
          <span class="label-text">数字</span>
        </label>
        <label class="label cursor-pointer gap-2">
          <input
            v-model="symbols"
            type="checkbox"
            class="checkbox checkbox-sm checkbox-primary"
          >
          <span class="label-text">符号</span>
        </label>
        <label class="label cursor-pointer gap-2">
          <input
            v-model="excludeAmbiguous"
            type="checkbox"
            class="checkbox checkbox-sm checkbox-primary"
          >
          <span class="label-text">排除易混淆字符</span>
        </label>
      </div>

      <div class="form-control">
        <label class="label"><span class="label-text font-semibold">生成数量</span></label>
        <input
          v-model.number="count"
          type="number"
          min="1"
          max="50"
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
            rows="6"
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

const length = ref(16)
const uppercase = ref(true)
const lowercase = ref(true)
const numbers = ref(true)
const symbols = ref(false)
const excludeAmbiguous = ref(false)
const count = ref(1)
const result = ref('')
const copied = ref(false)

const CHARS = {
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lower: 'abcdefghijklmnopqrstuvwxyz',
  digits: '0123456789',
  symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?'
}
const AMBIGUOUS = 'Il1O0o'

function generate() {
  let pool = ''
  if (uppercase.value) pool += CHARS.upper
  if (lowercase.value) pool += CHARS.lower
  if (numbers.value) pool += CHARS.digits
  if (symbols.value) pool += CHARS.symbols
  if (!pool) { result.value = ''; return }
  if (excludeAmbiguous.value) {
    pool = pool.split('').filter(c => !AMBIGUOUS.includes(c)).join('')
  }
  const n = Math.min(Math.max(count.value || 1, 1), 50)
  const lines = []
  const arr = new Uint32Array(length.value)
  for (let i = 0; i < n; i++) {
    crypto.getRandomValues(arr)
    lines.push(Array.from(arr, v => pool[v % pool.length]).join(''))
  }
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
