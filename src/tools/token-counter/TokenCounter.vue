<script setup>
import { ref, watch, onMounted, computed } from 'vue'
import {
  MODEL_CONFIGS,
  loadTokenizer,
  countTokens,
  renderKimiMessages,
} from './token-counter.js'

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

const messages = ref([])

function ensureMessagesSeed() {
  if (mode.value === 'messages' && messages.value.length === 0) {
    messages.value = [{ role: 'system', content: '' }]
  }
}

watch(mode, ensureMessagesSeed, { immediate: true })

function addMessage() {
  messages.value.push({ role: 'user', content: '' })
}

function deleteMessage(i) {
  messages.value.splice(i, 1)
}

const tokenCount = computed(() => {
  if (!encoderReady.value || !encoder) return 0
  if (mode.value === 'plain') return countTokens(text.value, encoder)
  return countTokens(renderKimiMessages(messages.value), encoder)
})

const charCount = computed(() => {
  if (mode.value === 'plain') return text.value.length
  return messages.value.reduce((n, m) => n + (m.content?.length || 0), 0)
})

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

      <div
        v-else
        class="flex flex-col gap-2"
      >
        <div
          v-for="(msg, i) in messages"
          :key="i"
          class="flex gap-2 items-start"
        >
          <select
            v-model="msg.role"
            class="select select-bordered select-sm w-32"
          >
            <option value="system">
              system
            </option>
            <option value="user">
              user
            </option>
            <option value="assistant">
              assistant
            </option>
          </select>
          <textarea
            v-model="msg.content"
            class="textarea textarea-bordered w-full font-mono text-sm"
            rows="2"
            placeholder="消息内容..."
          />
          <button
            class="btn btn-ghost btn-sm btn-square"
            title="删除"
            @click="deleteMessage(i)"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <button
          class="btn btn-sm btn-ghost w-fit"
          @click="addMessage"
        >
          + 添加消息
        </button>
      </div>
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
