<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">
      UUID 生成器
    </h1>
    <div class="flex flex-col gap-4 max-w-2xl">
      <!-- Config card -->
      <div class="card bg-base-200">
        <div class="card-body gap-4">
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
              v-for="(id, i) in uuids"
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

const uppercase = ref(false)
const noDash = ref(false)
const count = ref(1)
const uuids = ref([])
const copiedIndex = ref(-1)

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
  uuids.value = lines
}

async function copyIndex(i) {
  try {
    await navigator.clipboard.writeText(uuids.value[i])
    copiedIndex.value = i
    setTimeout(() => copiedIndex.value = -1, 1500)
  } catch { /* clipboard not available */ }
}

watch([uppercase, noDash, count], () => {
  generate()
})

generate()
</script>
