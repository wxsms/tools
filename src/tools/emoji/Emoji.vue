<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">
      Emoji 大全
    </h1>

    <div class="relative mb-4">
      <input
        v-model="query"
        type="text"
        class="input input-bordered w-full pr-10"
        placeholder="输入关键词搜索（英文）..."
      >
      <button
        v-if="query"
        class="absolute right-2 top-1/2 -translate-y-1/2 btn btn-ghost btn-xs btn-circle"
        aria-label="清空搜索"
        @click="query = ''"
      >
        ✕
      </button>
    </div>

    <div class="flex gap-1 overflow-x-auto mb-6 pb-1">
      <button
        v-for="tab in tabs"
        :key="String(tab.id)"
        data-test="tab"
        class="btn btn-sm shrink-0"
        :class="activeGroup === tab.id ? 'btn-primary' : 'btn-ghost'"
        @click="activeGroup = tab.id"
      >
        {{ tab.name }}
      </button>
    </div>

    <div
      v-if="visibleEmojis.length"
      class="grid grid-cols-8 sm:grid-cols-10 lg:grid-cols-12 gap-1"
    >
      <button
        v-for="emoji in beforeAndRow"
        :key="emoji.hexcode"
        data-test="emoji-btn"
        class="aspect-square text-3xl flex items-center justify-center rounded-lg hover:bg-base-200 active:scale-95 transition"
        :class="{ 'bg-base-300 ring-2 ring-primary': selectedHex === emoji.hexcode }"
        :title="emoji.label"
        :aria-label="`复制 emoji ${emoji.label}`"
        @click="onEmojiClick(emoji)"
      >
        {{ emoji.char }}
      </button>
    </div>

    <div
      v-if="selectedEmoji && visibleEmojis.length"
      data-test="detail"
      class="card bg-base-200 my-1"
    >
      <div class="card-body">
        <div class="flex items-center gap-4">
          <span class="text-5xl">{{ selectedEmoji.char }}</span>
          <div>
            <p class="text-xl font-semibold">
              {{ selectedEmoji.label }}
            </p>
            <p class="text-sm opacity-60">
              <span class="font-mono">{{ formats.codepoint }}</span>
              <span class="mx-1">·</span>
              <span>{{ groupName(selectedEmoji.group) }}</span>
            </p>
          </div>
        </div>

        <div class="divider my-2" />

        <div class="flex flex-wrap gap-2">
          <button
            data-test="copy-btn"
            class="btn btn-sm btn-outline"
            aria-label="复制 字符"
            @click="copyAndToast(formats.char, `已复制 ${formats.char}`)"
          >
            字符 <span class="font-mono">{{ formats.char }}</span>
          </button>
          <button
            data-test="copy-btn"
            class="btn btn-sm btn-outline"
            :disabled="!formats.shortcode"
            :aria-label="formats.shortcode ? '复制 shortcode' : '无 shortcode'"
            @click="formats.shortcode && copyAndToast(formats.shortcode, `已复制 ${formats.shortcode}`)"
          >
            shortcode <span class="font-mono">{{ formats.shortcode || '无' }}</span>
          </button>
          <button
            data-test="copy-btn"
            class="btn btn-sm btn-outline"
            aria-label="复制 码点"
            @click="copyAndToast(formats.codepoint, `已复制 ${formats.codepoint}`)"
          >
            码点 <span class="font-mono">{{ formats.codepoint }}</span>
          </button>
          <button
            data-test="copy-btn"
            class="btn btn-sm btn-outline"
            aria-label="复制 HTML 实体"
            @click="copyAndToast(formats.htmlEntity, `已复制 ${formats.htmlEntity}`)"
          >
            HTML <span class="font-mono">{{ formats.htmlEntity }}</span>
          </button>
          <button
            data-test="copy-btn"
            class="btn btn-sm btn-outline"
            aria-label="复制 URL 编码"
            @click="copyAndToast(formats.urlEncoded, `已复制 ${formats.urlEncoded}`)"
          >
            URL <span class="font-mono">{{ formats.urlEncoded }}</span>
          </button>
        </div>

        <div class="text-sm mt-2">
          <span class="font-semibold">所有 shortcode：</span>
          <span v-if="selectedEmoji.shortcodes.length">
            {{ selectedEmoji.shortcodes.join(', ') }}
          </span>
          <span v-else>无</span>
        </div>

        <div class="text-sm">
          <span class="font-semibold">标签：</span>
          <span v-if="selectedEmoji.tags.length">
            {{ selectedEmoji.tags.join(', ') }}
          </span>
          <span v-else>无</span>
        </div>

        <div
          v-if="selectedEmoji.skins.length"
          class="mt-2"
        >
          <p class="text-sm font-semibold mb-1">
            肤色变体：
          </p>
          <div class="flex gap-1">
            <button
              v-for="skin in selectedEmoji.skins"
              :key="skin.hexcode"
              class="text-2xl w-10 h-10 flex items-center justify-center rounded-lg hover:bg-base-300 transition"
              :title="skin.label"
              :aria-label="`复制 emoji ${skin.label}`"
              @click="copyAndToast(skin.char, `已复制 ${skin.char}`)"
            >
              {{ skin.char }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="afterEmojis.length"
      class="grid grid-cols-8 sm:grid-cols-10 lg:grid-cols-12 gap-1 mt-1"
    >
      <button
        v-for="emoji in afterEmojis"
        :key="emoji.hexcode"
        data-test="emoji-btn"
        class="aspect-square text-3xl flex items-center justify-center rounded-lg hover:bg-base-200 active:scale-95 transition"
        :class="{ 'bg-base-300 ring-2 ring-primary': selectedHex === emoji.hexcode }"
        :title="emoji.label"
        :aria-label="`复制 emoji ${emoji.label}`"
        @click="onEmojiClick(emoji)"
      >
        {{ emoji.char }}
      </button>
    </div>

    <div
      v-if="toast"
      class="toast toast-end"
    >
      <div class="alert alert-info">
        {{ toast }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { EMOJIS, GROUPS } from './emoji-data.js'
import { searchEmojis, copyFormats, copyText } from './emoji.js'

const query = ref('')
const activeGroup = ref(null)
const selectedHex = ref(null)
const toast = ref(null)
let toastTimer = null

const cols = ref(8)
let smMQ = null
let lgMQ = null

function updateCols() {
  if (lgMQ && lgMQ.matches) cols.value = 12
  else if (smMQ && smMQ.matches) cols.value = 10
  else cols.value = 8
}

onMounted(() => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    smMQ = window.matchMedia('(min-width: 640px)')
    lgMQ = window.matchMedia('(min-width: 1024px)')
    updateCols()
    if (smMQ.addEventListener) smMQ.addEventListener('change', updateCols)
    if (lgMQ.addEventListener) lgMQ.addEventListener('change', updateCols)
  }
})

onBeforeUnmount(() => {
  if (smMQ && smMQ.removeEventListener) smMQ.removeEventListener('change', updateCols)
  if (lgMQ && lgMQ.removeEventListener) lgMQ.removeEventListener('change', updateCols)
})

const tabs = computed(() => [
  { id: null, name: '全部' },
  ...GROUPS,
])

const filteredByGroup = computed(() => {
  if (activeGroup.value === null) return EMOJIS
  return EMOJIS.filter(e => e.group === activeGroup.value)
})

const visibleEmojis = computed(() => searchEmojis(filteredByGroup.value, query.value))

const selectedEmoji = computed(() => {
  if (!selectedHex.value) return null
  return EMOJIS.find(e => e.hexcode === selectedHex.value) || null
})

const formats = computed(() => selectedEmoji.value ? copyFormats(selectedEmoji.value) : null)

const splitIndex = computed(() => {
  if (!selectedHex.value) return -1
  const idx = visibleEmojis.value.findIndex(e => e.hexcode === selectedHex.value)
  if (idx === -1) return -1
  // 选中 emoji 所在行的末尾索引（不含），即下一条 row 的起点
  return Math.ceil((idx + 1) / cols.value) * cols.value
})

const beforeAndRow = computed(() => {
  const split = splitIndex.value
  if (split === -1) return visibleEmojis.value
  return visibleEmojis.value.slice(0, split)
})

const afterEmojis = computed(() => {
  const split = splitIndex.value
  if (split === -1) return []
  return visibleEmojis.value.slice(split)
})

function groupName(id) {
  const g = GROUPS.find(g => g.id === id)
  return g ? g.name : ''
}

function showToast(msg) {
  toast.value = msg
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value = null }, 2000)
}

async function copyAndToast(text, msg) {
  try {
    await copyText(text)
    showToast(msg)
  } catch {
    showToast('复制失败，请手动选择')
  }
}

async function onEmojiClick(emoji) {
  selectedHex.value = emoji.hexcode
  await copyAndToast(emoji.char, `已复制 ${emoji.char}`)
}
</script>
