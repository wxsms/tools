<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">
      进制转换
    </h1>
    <div class="flex flex-col gap-4 max-w-2xl">
      <!-- Input area -->
      <div class="form-control">
        <label class="label"><span class="label-text font-semibold">输入</span></label>
        <div class="flex gap-2">
          <div class="join flex-1">
            <input
              v-model="input"
              class="input input-bordered join-item flex-1 font-mono text-sm"
              placeholder="输入数值..."
              @input="convert"
            >
          </div>
        </div>
        <p
          v-if="inputError"
          class="text-error text-sm mt-1"
        >
          {{ inputError }}
        </p>
      </div>

      <!-- Input base selector -->
      <div class="flex flex-wrap gap-2">
        <span class="text-sm font-semibold self-center mr-1">输入进制</span>
        <button
          v-for="b in standardBases"
          :key="b.value"
          :class="['btn btn-sm', inputBase === b.value ? 'btn-primary' : '']"
          @click="setInputBase(b.value)"
        >
          {{ b.label }}
        </button>
      </div>

      <div class="divider my-0" />

      <!-- Standard results -->
      <div
        v-for="item in results"
        :key="item.key"
        class="form-control"
      >
        <label class="label">
          <span class="label-text font-semibold">{{ item.label }}</span>
          <span class="label-text-alt opacity-50">{{ item.desc }}</span>
        </label>
        <div class="relative">
          <input
            :value="item.value"
            class="input input-bordered w-full font-mono text-sm"
            readonly
          >
          <button
            v-if="item.value"
            class="btn btn-ghost btn-xs btn-square absolute right-1 top-1"
            :title="item.copied ? '已复制！' : '复制'"
            @click="copyText(item.value, item.key)"
          >
            <Icon
              v-if="item.copied"
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

      <!-- Advanced section -->
      <div class="collapse collapse-arrow bg-base-200 mt-2">
        <input type="checkbox">
        <div class="collapse-title text-sm font-semibold">
          高级 — 任意进制转换 (2-36)
        </div>
        <div class="collapse-content">
          <div class="flex items-center gap-3 pt-2">
            <span class="text-sm">目标进制</span>
            <input
              v-model.number="customBase"
              type="number"
              min="2"
              max="36"
              class="input input-bordered input-sm w-20"
            >
          </div>
          <div
            v-if="customResult !== null"
            class="form-control mt-3"
          >
            <label class="label">
              <span class="label-text font-semibold">{{ customBase }} 进制</span>
            </label>
            <div class="relative">
              <input
                :value="customResult"
                class="input input-bordered w-full font-mono text-sm"
                readonly
              >
              <button
                v-if="customResult"
                class="btn btn-ghost btn-xs btn-square absolute right-1 top-1"
                :title="customCopied ? '已复制！' : '复制'"
                @click="copyText(customResult, 'customCopied')"
              >
                <Icon
                  v-if="customCopied"
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
          <p
            v-if="customBaseError"
            class="text-error text-sm mt-1"
          >
            {{ customBaseError }}
          </p>
        </div>
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
import { ref, reactive, computed } from 'vue'
import { convertRadix, isValidForBase } from './radix.js'

const input = ref('')
const inputBase = ref(10)
const customBase = ref(36)
const customCopied = ref(false)

const standardBases = [
  { value: 2, label: 'BIN (2)' },
  { value: 8, label: 'OCT (8)' },
  { value: 10, label: 'DEC (10)' },
  { value: 16, label: 'HEX (16)' },
]

const results = reactive([
  { key: 'bin', label: 'BIN', desc: '二进制', base: 2, value: '', copied: false },
  { key: 'oct', label: 'OCT', desc: '八进制', base: 8, value: '', copied: false },
  { key: 'dec', label: 'DEC', desc: '十进制', base: 10, value: '', copied: false },
  { key: 'hex', label: 'HEX', desc: '十六进制', base: 16, value: '', copied: false },
])

const inputError = computed(() => {
  if (!input.value) return ''
  if (!isValidForBase(input.value, inputBase.value)) {
    return `输入包含不合法的 ${inputBase.value} 进制字符`
  }
  return ''
})

const customBaseError = computed(() => {
  if (customBase.value < 2 || customBase.value > 36) return '进制范围 2-36'
  return ''
})

const customResult = computed(() => {
  if (!input.value || inputError.value || customBaseError.value) return null
  return convertRadix(input.value, inputBase.value, customBase.value)
})

function convert() {
  if (!input.value) {
    results.forEach(r => r.value = '')
    return
  }
  if (inputError.value) {
    results.forEach(r => r.value = '')
    return
  }
  for (const item of results) {
    item.value = convertRadix(input.value, inputBase.value, item.base) || ''
  }
}

function setInputBase(base) {
  inputBase.value = base
  convert()
}

function clear() {
  input.value = ''
  results.forEach(r => r.value = '')
}

async function copyText(text, flag) {
  try {
    await navigator.clipboard.writeText(text)
    if (flag === 'customCopied') {
      customCopied.value = true
      setTimeout(() => customCopied.value = false, 1500)
    } else {
      const item = results.find(r => r.key === flag)
      if (item) {
        item.copied = true
        setTimeout(() => item.copied = false, 1500)
      }
    }
  } catch { /* clipboard not available */ }
}
</script>
