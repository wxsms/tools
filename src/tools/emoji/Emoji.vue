<template>
  <div
    class="relative"
  >
    <h1 class="text-3xl font-bold mb-6">
      Emoji 大全
    </h1>

    <div
      v-if="loading"
      class="text-center py-12 opacity-50"
      data-test="loading"
    >
      <span class="loading loading-spinner loading-lg" />
      <p class="mt-2">
        加载 emoji 数据中...
      </p>
    </div>

    <div
      v-else-if="loadError"
      class="text-center py-12 text-error"
      data-test="error"
    >
      <p>emoji 数据加载失败</p>
      <p class="text-sm opacity-70 mt-1">
        {{ loadError.message }}
      </p>
    </div>

    <template v-else>
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
          v-for="emoji in renderedEmojis"
          :key="emoji.hexcode"
          data-test="emoji-btn"
          class="aspect-square text-3xl flex items-center justify-center rounded-lg hover:bg-base-200 transition"
          :class="{ 'bg-base-300 ring-2 ring-primary': selectedHex === emoji.hexcode }"
          :title="emoji.label"
          :aria-label="`复制 emoji ${emoji.label}`"
          style="content-visibility: auto; contain-intrinsic-size: 40px 40px;"
          @click="onEmojiClick(emoji, $event)"
        >
          {{ emoji.char }}
        </button>
      </div>
      <div
        v-else
        class="text-center py-12 opacity-50"
      >
        未找到匹配的 emoji
      </div>
      <!-- 渐进式渲染哨兵：滚入视口时加载下一批 -->
      <div
        v-if="renderedEmojis.length < visibleEmojis.length"
        ref="sentinelEl"
        class="h-4"
      />
    </template>

    <div
      v-if="selectedEmoji && visibleEmojis.length"
      ref="floatingRef"
      data-test="detail"
      :data-placement="placement"
      class="card bg-base-200 shadow-xl border border-base-300 w-80 max-w-[90vw] z-50"
      :style="isPositioned ? floatingStyles : { position: 'absolute', visibility: 'hidden' }"
    >
      <div class="card-body">
        <button
          class="btn btn-ghost btn-xs btn-circle absolute right-2 top-2"
          aria-label="关闭详情"
          @click="closePopover"
        >
          ✕
        </button>
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
            class="btn btn-sm btn-outline max-w-full whitespace-normal h-auto py-1"
            aria-label="复制 字符"
            @click="copyAndToast(formats.char, `已复制 ${formats.char}`)"
          >
            字符 <span class="font-mono break-all">{{ formats.char }}</span>
          </button>
          <button
            data-test="copy-btn"
            class="btn btn-sm btn-outline max-w-full whitespace-normal h-auto py-1"
            :disabled="!formats.shortcode"
            :aria-label="formats.shortcode ? '复制 shortcode' : '无 shortcode'"
            @click="formats.shortcode && copyAndToast(formats.shortcode, `已复制 ${formats.shortcode}`)"
          >
            shortcode <span class="font-mono break-all">{{ formats.shortcode || '无' }}</span>
          </button>
          <button
            data-test="copy-btn"
            class="btn btn-sm btn-outline max-w-full whitespace-normal h-auto py-1"
            aria-label="复制 码点"
            @click="copyAndToast(formats.codepoint, `已复制 ${formats.codepoint}`)"
          >
            码点 <span class="font-mono break-all">{{ formats.codepoint }}</span>
          </button>
          <button
            data-test="copy-btn"
            class="btn btn-sm btn-outline max-w-full whitespace-normal h-auto py-1"
            aria-label="复制 HTML 实体"
            @click="copyAndToast(formats.htmlEntity, `已复制 ${formats.htmlEntity}`)"
          >
            HTML <span class="font-mono break-all">{{ formats.htmlEntity }}</span>
          </button>
          <button
            data-test="copy-btn"
            class="btn btn-sm btn-outline max-w-full whitespace-normal h-auto py-1"
            aria-label="复制 URL 编码"
            @click="copyAndToast(formats.urlEncoded, `已复制 ${formats.urlEncoded}`)"
          >
            URL <span class="font-mono break-all">{{ formats.urlEncoded }}</span>
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
import { ref, shallowRef, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/vue'
import { loadEmojiData, GROUPS } from './emoji-data.js'
import { searchEmojis, copyFormats, copyText } from './emoji.js'

const query = ref('')
const activeGroup = ref(null)
const selectedHex = ref(null)
const toast = ref(null)
let toastTimer = null

const emojis = ref([])
const loading = ref(true)
const loadError = ref(null)

// 浮动窗口的参考元素（被点击的 emoji 按钮）与浮动元素本身
const referenceRef = shallowRef(null)
const floatingRef = ref(null)

const { floatingStyles, placement, isPositioned } = useFloating(referenceRef, floatingRef, {
  placement: 'bottom-start',
  strategy: 'absolute',
  middleware: [
    offset(8),
    flip({ padding: 8 }),
    shift({ padding: 8 }),
  ],
  // 两个元素都挂载后启动 autoUpdate，自动监听滚动/resize/DOM 变化重新定位
  whileElementsMounted: (reference, floating, update) => autoUpdate(reference, floating, update),
})

function onKeydown(e) {
  if (e.key === 'Escape' && selectedHex.value) closePopover()
}

onMounted(async () => {
  window.addEventListener('keydown', onKeydown)
  try {
    emojis.value = await loadEmojiData()
  } catch (e) {
    loadError.value = e
  } finally {
    loading.value = false
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  if (sentinelObserver) sentinelObserver.disconnect()
})

const tabs = computed(() => [
  { id: null, name: '全部' },
  ...GROUPS,
])

const filteredByGroup = computed(() => {
  if (activeGroup.value === null) return emojis.value
  return emojis.value.filter(e => e.group === activeGroup.value)
})

const visibleEmojis = computed(() => searchEmojis(filteredByGroup.value, query.value))

// 渐进式渲染：首屏只渲染前 renderLimit 个，滚到底部再加载下一批
const RENDER_BATCH = 200
const renderLimit = ref(RENDER_BATCH)
const sentinelEl = ref(null)
let sentinelObserver = null

const renderedEmojis = computed(() => visibleEmojis.value.slice(0, renderLimit.value))

// 搜索/分类变化时重置渲染数量并清除选中状态
watch([query, activeGroup], () => {
  renderLimit.value = RENDER_BATCH
  closePopover()
})

watch(sentinelEl, (el) => {
  if (sentinelObserver) sentinelObserver.disconnect()
  if (!el) return
  sentinelObserver = new IntersectionObserver((entries) => {
    if (entries[0]?.isIntersecting) {
      renderLimit.value += RENDER_BATCH
    }
  }, { rootMargin: '200px' })
  sentinelObserver.observe(el)
})

const selectedEmoji = computed(() => {
  if (!selectedHex.value) return null
  if (!visibleEmojis.value.some(e => e.hexcode === selectedHex.value)) return null
  return emojis.value.find(e => e.hexcode === selectedHex.value) || null
})

const formats = computed(() => selectedEmoji.value ? copyFormats(selectedEmoji.value) : null)

// 选中项被搜索/分类过滤掉时，清理参考元素，避免悬浮窗指向已不存在的按钮
watch(selectedEmoji, (val) => {
  if (!val) referenceRef.value = null
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

async function onEmojiClick(emoji, event) {
  // 再次点击已选中的 emoji 时关闭 popover
  if (selectedHex.value === emoji.hexcode) {
    closePopover()
    return
  }
  selectedHex.value = emoji.hexcode
  referenceRef.value = event?.currentTarget || null
  await copyAndToast(emoji.char, `已复制 ${emoji.char}`)
}

function closePopover() {
  selectedHex.value = null
  referenceRef.value = null
}
</script>
