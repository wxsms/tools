<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">
      ID 生成器
    </h1>
    <div class="flex flex-col gap-4 max-w-2xl">
      <!-- Type selector -->
      <div class="flex gap-2">
        <button
          :class="['btn btn-sm', idType === 'uuid' ? 'btn-primary' : '']"
          @click="idType = 'uuid'"
        >
          UUID v4
        </button>
        <button
          :class="['btn btn-sm', idType === 'nanoid' ? 'btn-primary' : '']"
          @click="idType = 'nanoid'"
        >
          NanoID
        </button>
      </div>

      <!-- Config card -->
      <div class="card bg-base-200">
        <div class="card-body gap-4">
          <!-- UUID options -->
          <template v-if="idType === 'uuid'">
            <div class="flex flex-wrap gap-x-6 gap-y-2">
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
          </template>

          <!-- NanoID options -->
          <template v-if="idType === 'nanoid'">
            <div class="flex items-center gap-2">
              <span class="text-sm font-semibold">ID 长度</span>
              <input
                v-model.number="nanoSize"
                type="number"
                min="1"
                max="256"
                class="input input-bordered input-sm w-20"
              >
            </div>

            <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span class="text-sm font-semibold">字母表</span>
              <label class="label cursor-pointer gap-2">
                <input
                  v-model="alphabetType"
                  type="radio"
                  value="alphanumeric"
                  class="radio radio-sm radio-primary"
                >
                <span class="label-text">字母数字</span>
              </label>
              <label class="label cursor-pointer gap-2">
                <input
                  v-model="alphabetType"
                  type="radio"
                  value="lowercase"
                  class="radio radio-sm radio-primary"
                >
                <span class="label-text">小写字母数字</span>
              </label>
              <label class="label cursor-pointer gap-2">
                <input
                  v-model="alphabetType"
                  type="radio"
                  value="custom"
                  class="radio radio-sm radio-primary"
                >
                <span class="label-text">自定义</span>
              </label>
            </div>

            <div
              v-if="alphabetType === 'custom'"
              class="flex items-center gap-2"
            >
              <span class="text-sm font-semibold">自定义字母表</span>
              <input
                v-model="customAlphabet"
                type="text"
                class="input input-bordered input-sm w-64"
                placeholder="输入自定义字符集"
              >
            </div>
          </template>

          <div class="flex items-center gap-6">
            <div class="flex items-center gap-2">
              <span class="text-sm font-semibold">生成数量</span>
              <input
                v-model.number="count"
                type="number"
                min="1"
                max="100"
                class="input input-bordered input-sm w-20"
              >
            </div>
            <button
              class="btn btn-primary btn-sm gap-1"
              @click="generate"
            >
              <ArrowPathIcon class="w-4 h-4" />
              重新生成
            </button>
          </div>
        </div>
      </div>

      <!-- Results card -->
      <div class="card bg-base-200">
        <div class="card-body">
          <ul class="flex flex-col gap-2">
            <li
              v-for="(id, i) in ids"
              :key="i"
              class="flex items-center gap-2 group"
            >
              <code class="font-mono text-sm flex-1 break-all">{{ id }}</code>
              <button
                class="btn btn-ghost btn-xs btn-square opacity-0 group-hover:opacity-100 transition-opacity"
                :title="copiedIndex === i ? '已复制！' : '复制'"
                @click="copyIndex(i)"
              >
                <CheckIcon
                  v-if="copiedIndex === i"
                  class="w-4 h-4 text-success"
                />
                <ClipboardDocumentIcon
                  v-else
                  class="w-4 h-4"
                />
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { ArrowPathIcon, ClipboardDocumentIcon, CheckIcon } from '@heroicons/vue/24/outline'

const idType = ref('uuid')
const uppercase = ref(false)
const noDash = ref(false)
const count = ref(1)
const nanoSize = ref(21)
const alphabetType = ref('alphanumeric')
const customAlphabet = ref('')
const ids = ref([])
const copiedIndex = ref(-1)

const ALPHABETS = {
  alphanumeric: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
  lowercase: 'abcdefghijklmnopqrstuvwxyz0123456789',
}

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

function generateNanoId(alphabet, size) {
  const bytes = new Uint8Array(size)
  crypto.getRandomValues(bytes)
  const mask = (2 << Math.floor(Math.log2(alphabet.length - 1))) - 1
  let id = ''
  let i = 0
  while (id.length < size) {
    const byte = bytes[i % size]
    if (i >= size) crypto.getRandomValues(bytes)
    if ((byte & mask) < alphabet.length) {
      id += alphabet[byte & mask]
    }
    i++
  }
  return id
}

function generate() {
  const n = Math.min(Math.max(count.value || 1, 1), 100)
  const lines = []
  if (idType.value === 'uuid') {
    for (let i = 0; i < n; i++) lines.push(uuidV4())
  } else {
    const alphabet = alphabetType.value === 'custom'
      ? customAlphabet.value
      : ALPHABETS[alphabetType.value]
    if (!alphabet || alphabet.length === 0) {
      ids.value = []
      return
    }
    const s = Math.min(Math.max(nanoSize.value || 1, 1), 256)
    for (let i = 0; i < n; i++) lines.push(generateNanoId(alphabet, s))
  }
  ids.value = lines
}

async function copyIndex(i) {
  try {
    await navigator.clipboard.writeText(ids.value[i])
    copiedIndex.value = i
    setTimeout(() => copiedIndex.value = -1, 1500)
  } catch { /* clipboard not available */ }
}

watch([idType, uppercase, noDash, count, nanoSize, alphabetType, customAlphabet], () => {
  generate()
})

generate()
</script>
