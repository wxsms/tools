<script setup>
import { ref, watch, onMounted, computed } from 'vue'
import {
  MODEL_CONFIGS,
  loadTokenizer,
  countTokens,
  renderMessages,
  tokenPieces,
} from './token-counter.js'

const mode = ref('plain') // 'plain' | 'messages'
const activeModelId = ref(MODEL_CONFIGS[0].id)
const DEFAULT_PLAIN_TEXT =
  'Token 计数器用来估算提示词的 token 数量。\n' +
  'Kimi K2 uses a 128k ChatML-style BPE vocabulary, so 中英混合的文本也能正确分词。\n' +
  'Try editing this text or switching to Messages mode 验证对话模板的开销。'

const text = ref(DEFAULT_PLAIN_TEXT)
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

function retry() {
  encoder = null
  encoderReady.value = false
  error.value = null
  ensureLoaded()
}

const copied = ref(false)
async function copyCount() {
  try {
    await navigator.clipboard.writeText(String(tokenCount.value))
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
  } catch {
    // silent — matches Base64.vue pattern
  }
}

function clearAll() {
  text.value = ''
  messages.value =
    mode.value === 'messages' ? [{ role: 'system', content: '' }] : []
  previewTokens.value = []
  overflowCount.value = 0
}

const DEFAULT_MESSAGES = [
  {
    role: 'system',
    content:
      '你是一个双语助手 / You are a bilingual assistant. 用简洁的中文或英文回答问题。',
  },
  {
    role: 'user',
    content:
      '请用一句话总结这句话 / Summarize this sentence in one line:\n' +
      '"Token 计数器 helps estimate prompt cost before sending to an LLM API."',
  },
]

const messages = ref([])

function ensureMessagesSeed() {
  if (mode.value === 'messages' && messages.value.length === 0) {
    messages.value = DEFAULT_MESSAGES.map((m) => ({ ...m }))
  }
}

watch(mode, ensureMessagesSeed, { immediate: true })

function addMessage() {
  messages.value.push({ role: 'user', content: '' })
}

function deleteMessage(i) {
  messages.value.splice(i, 1)
}

const PREVIEW_CAP = 500
const previewTokens = ref([]) // array of { id, piece, type }
const overflowCount = ref(0)

let debounceTimer = null
function schedulePreview() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(rebuildPreview, 200)
}

// When the encoder (re)loads, clear stale chips immediately and skip the
// debounce so the preview doesn't briefly show the previous model's tokens.
watch(encoderReady, (ready) => {
  if (!ready) {
    previewTokens.value = []
    overflowCount.value = 0
  } else {
    clearTimeout(debounceTimer)
    rebuildPreview()
  }
})

function classifyToken(piece) {
  if (/^\s+$/.test(piece)) return 'whitespace'
  // Special-token envelope: <...> with either regular "|" (U+007C, Kimi K2
  // style) or fullwidth "｜" (U+FF5C, DeepSeek V4 style) at the boundaries.
  if (/^<[|\uff5c].*[|\uff5c]>$/.test(piece)) return 'special'
  if (/^\d+$/.test(piece)) return 'numeric'
  return 'normal'
}

function whitespaceDisplay(s) {
  return s
    .replace(/ /g, '·')
    .replace(/\n/g, '⏎')
    .replace(/\t/g, '\\t')
}

function rebuildPreview() {
  previewTokens.value = []
  overflowCount.value = 0
  if (!encoderReady.value || !encoder) return
  const source = mode.value === 'plain' ? text.value : renderMessages(activeModelId.value, messages.value)
  if (!source) return
  const pieces = tokenPieces(encoder, source)
  overflowCount.value = Math.max(0, pieces.length - PREVIEW_CAP)
  const shown = pieces.slice(0, PREVIEW_CAP)
  previewTokens.value = shown.map(({ id, piece }) => ({
    id,
    piece,
    type: classifyToken(piece),
  }))
}

watch([text, messages, mode], schedulePreview, { deep: true })
onMounted(schedulePreview)

const tokenCount = computed(() => {
  if (!encoderReady.value || !encoder) return 0
  if (mode.value === 'plain') return countTokens(text.value, encoder)
  return countTokens(renderMessages(activeModelId.value, messages.value), encoder)
})

const charCount = computed(() => {
  if (mode.value === 'plain') return text.value.length
  return messages.value.reduce((n, m) => n + (m.content?.length || 0), 0)
})

// UTF-8 byte length — distinct from char count for non-ASCII text (spec §Result area).
const sourceText = computed(() =>
  mode.value === 'plain' ? text.value : renderMessages(activeModelId.value, messages.value),
)
const byteCount = computed(() =>
  new TextEncoder().encode(sourceText.value).length,
)

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
          class="alert alert-error flex flex-col items-start"
        >
          <span>分词器加载失败:{{ error }}</span>
          <button
            class="btn btn-sm btn-ghost mt-1"
            @click="retry"
          >
            重试
          </button>
        </div>
        <div v-else>
          <div class="flex items-center justify-between">
            <div class="text-2xl font-bold text-primary">
              Token 数: {{ tokenCount }}
            </div>
            <div class="flex gap-1">
              <button
                class="btn btn-ghost btn-xs"
                @click="copyCount"
              >
                {{ copied ? '已复制' : '复制' }}
              </button>
              <button
                class="btn btn-ghost btn-xs"
                @click="clearAll"
              >
                清空
              </button>
            </div>
          </div>
          <div class="divider my-1" />
          <div class="text-sm opacity-70">
            字符: {{ charCount }} · 字节: {{ byteCount }}
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="!loading && !error"
      class="card bg-base-200"
    >
      <div class="card-body">
        <h2 class="card-title text-lg">
          Token 预览
        </h2>
        <div class="flex flex-wrap gap-1">
          <span
            v-for="(t, i) in previewTokens"
            :key="i"
            data-testid="token-chip"
            class="px-1 py-0.5 rounded text-xs font-mono cursor-help"
            :class="{
              'bg-blue-200/40 text-blue-900': t.type === 'normal',
              'bg-orange-200/60 text-orange-900': t.type === 'special',
              'bg-gray-300/50 text-gray-700': t.type === 'whitespace',
              'bg-green-200/40 text-green-900': t.type === 'numeric',
            }"
            :title="`rank: ${t.id}, bytes: ${t.piece.length}`"
          >
            {{ t.type === 'whitespace' ? whitespaceDisplay(t.piece) : t.piece }}
          </span>
        </div>
        <div
          v-if="overflowCount > 0"
          class="text-sm opacity-70 mt-2"
        >
          ... 还有 {{ overflowCount }} 个 token 未显示
        </div>
      </div>
    </div>
  </div>
</template>
