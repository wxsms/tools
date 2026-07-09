<script setup>
import { ref, watch, onMounted, computed } from 'vue'
import { MODEL_CONFIGS, loadTokenizer, countTokens } from './token-counter.js'

const mode = ref('plain') // 'plain' | 'messages'
const activeModelId = ref(MODEL_CONFIGS[0].id)
const text = ref('')
const loading = ref(false)
const error = ref(null)
const encoderReady = ref(false)

let encoder = null

async function ensureLoaded() {
  if (encoder) return
  loading.value = true
  error.value = null
  try {
    encoder = await loadTokenizer(activeModelId.value)
    encoderReady.value = true
  } catch (e) {
    error.value = e.message || String(e)
  } finally {
    loading.value = false
  }
}

onMounted(ensureLoaded)

const tokenCount = computed(() => {
  if (!encoderReady.value || !encoder) return 0
  if (mode.value !== 'plain') return 0
  return countTokens(text.value, encoder)
})

const charCount = computed(() => text.value.length)

watch(activeModelId, () => {
  encoder = null
  encoderReady.value = false
  ensureLoaded()
})
</script>

<template>
  <div class="max-w-4xl mx-auto">
    <h1 class="text-3xl font-bold mb-6">
      Token 计数器
    </h1>

    <div class="flex flex-wrap items-center gap-2 mb-4">
      <div class="join">
        <button
          class="btn btn-sm join-item"
          :class="{ 'btn-primary': mode === 'plain' }"
          @click="mode = 'plain'"
        >
          纯文本
        </button>
        <button
          class="btn btn-sm join-item"
          :class="{ 'btn-primary': mode === 'messages' }"
          @click="mode = 'messages'"
        >
          Messages
        </button>
      </div>

      <select
        v-model="activeModelId"
        class="select select-bordered select-sm"
      >
        <option
          v-for="m in MODEL_CONFIGS"
          :key="m.id"
          :value="m.id"
        >
          {{ m.label }}
        </option>
      </select>
    </div>

    <div class="form-control mb-4">
      <textarea
        v-if="mode === 'plain'"
        v-model="text"
        class="textarea textarea-bordered w-full font-mono text-sm"
        rows="10"
        placeholder="输入文本..."
      />
    </div>

    <div class="card bg-base-200 mb-4">
      <div class="card-body">
        <div
          v-if="loading"
          class="text-base-content/70"
        >
          <span class="loading loading-spinner loading-sm" />
          加载分词器中...
        </div>
        <div
          v-else-if="error"
          class="alert alert-error"
        >
          分词器加载失败:{{ error }}
        </div>
        <div v-else>
          <div class="text-2xl font-bold text-primary">
            Token 数: {{ tokenCount }}
          </div>
          <div class="divider my-1" />
          <div class="text-sm opacity-70">
            字符: {{ charCount }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
