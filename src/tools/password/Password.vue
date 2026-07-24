<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">
      密码生成器
    </h1>
    <div class="flex flex-col gap-4 max-w-2xl">
      <!-- Config card -->
      <div class="card bg-base-200">
        <div class="card-body gap-4">
          <div class="form-control">
            <label class="label"><span class="label-text font-semibold">密码长度</span></label>
            <div class="flex items-center gap-3">
              <input
                v-model.number="length"
                type="range"
                min="4"
                max="64"
                step="1"
                class="range range-sm range-primary flex-1"
              >
              <span class="font-mono text-sm w-8 text-right">{{ length }}</span>
            </div>
          </div>

          <div class="flex flex-wrap gap-x-6 gap-y-2">
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

          <div class="flex items-center gap-6">
            <div class="flex items-center gap-2">
              <span class="text-sm font-semibold">生成数量</span>
              <input
                v-model.number="count"
                type="number"
                min="1"
                max="50"
                class="input input-bordered input-sm w-20"
              >
            </div>
            <button
              class="btn btn-primary btn-sm gap-1"
              @click="generate"
            >
              <Icon
                icon="lucide:refresh-cw"
                class="w-4 h-4"
              />
              重新生成
            </button>
          </div>
        </div>
      </div>

      <!-- Strength indicator -->
      <div class="flex items-center gap-3">
        <span class="text-sm font-semibold whitespace-nowrap">强度</span>
        <progress
          class="progress flex-1"
          :class="strengthClass"
          :value="strengthValue"
          max="4"
        />
        <span class="text-sm whitespace-nowrap">{{ strengthLabel }}</span>
      </div>

      <!-- Results card -->
      <div class="card bg-base-200">
        <div class="card-body">
          <ul
            v-if="passwords.length"
            class="flex flex-col gap-2"
          >
            <li
              v-for="(pw, i) in passwords"
              :key="i"
              class="flex items-center gap-2 group"
            >
              <code class="font-mono text-sm flex-1 break-all">{{ pw }}</code>
              <button
                class="btn btn-ghost btn-xs btn-square opacity-0 group-hover:opacity-100 transition-opacity"
                :title="copiedIndex === i ? '已复制！' : '复制'"
                @click="copyIndex(i)"
              >
                <Icon
                  v-if="copiedIndex === i"
                  icon="lucide:check"
                  class="w-4 h-4 text-success"
                />
                <Icon
                  v-else
                  icon="lucide:clipboard"
                  class="w-4 h-4"
                />
              </button>
            </li>
          </ul>
          <p
            v-else
            class="text-sm opacity-50"
          >
            请至少勾选一种字符类型
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Icon } from '@iconify/vue'
import { ref, computed, watch } from 'vue'
const length = ref(16)
const uppercase = ref(true)
const lowercase = ref(true)
const numbers = ref(true)
const symbols = ref(false)
const excludeAmbiguous = ref(false)
const count = ref(1)
const passwords = ref([])
const copiedIndex = ref(-1)

const CHARS = {
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lower: 'abcdefghijklmnopqrstuvwxyz',
  digits: '0123456789',
  symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?'
}
const AMBIGUOUS = 'Il1O0o'

function buildPool() {
  let pool = ''
  if (uppercase.value) pool += CHARS.upper
  if (lowercase.value) pool += CHARS.lower
  if (numbers.value) pool += CHARS.digits
  if (symbols.value) pool += CHARS.symbols
  if (excludeAmbiguous.value) {
    pool = pool.split('').filter(c => !AMBIGUOUS.includes(c)).join('')
  }
  return pool
}

function generate() {
  const pool = buildPool()
  if (!pool) { passwords.value = []; return }
  const n = Math.min(Math.max(count.value || 1, 1), 50)
  const len = Math.min(Math.max(length.value, 4), 64)
  const lines = []
  const arr = new Uint32Array(len)
  for (let i = 0; i < n; i++) {
    crypto.getRandomValues(arr)
    lines.push(Array.from(arr, v => pool[v % pool.length]).join(''))
  }
  passwords.value = lines
}

const strengthValue = computed(() => {
  const pool = buildPool()
  if (!pool) return 0
  let score = 0
  const len = length.value
  if (len >= 8) score++
  if (len >= 12) score++
  if (len >= 20) score++
  const types = [uppercase.value, lowercase.value, numbers.value, symbols.value].filter(Boolean).length
  if (types >= 3) score++
  return Math.min(score, 4)
})

const strengthLabel = computed(() => {
  const labels = ['', '弱', '中', '强', '很强']
  return labels[strengthValue.value]
})

const strengthClass = computed(() => {
  const classes = ['', 'progress-error', 'progress-warning', 'progress-info', 'progress-success']
  return classes[strengthValue.value]
})

watch([length, uppercase, lowercase, numbers, symbols, excludeAmbiguous, count], () => {
  generate()
})

async function copyIndex(i) {
  try {
    await navigator.clipboard.writeText(passwords.value[i])
    copiedIndex.value = i
    setTimeout(() => copiedIndex.value = -1, 1500)
  } catch { /* clipboard not available */ }
}

generate()
</script>
