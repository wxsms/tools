<template>
  <dialog
    v-if="open"
    class="modal modal-open"
    @click.self="close"
  >
    <div class="modal-box max-w-lg p-0 overflow-hidden">
      <!-- Input -->
      <div class="flex items-center gap-2 p-3 border-b border-base-300">
        <Icon
          icon="lucide:search"
          class="w-5 h-5 opacity-60"
        />
        <input
          ref="inputEl"
          v-model="query"
          type="text"
          placeholder="搜索工具…"
          class="input input-bordered flex-1"
          autocomplete="off"
          spellcheck="false"
        >
        <kbd class="kbd kbd-sm">Esc</kbd>
      </div>

      <!-- Results -->
      <ul
        v-if="results.length"
        class="max-h-80 overflow-y-auto"
      >
        <li
          v-for="(tool, i) in results"
          :key="tool.path"
          @click="select(tool.path)"
          @mouseenter="activeIndex = i"
        >
          <div
            :class="['flex items-center gap-3 px-3 py-2 cursor-pointer',
                     i === activeIndex ? 'bg-base-300' : '']"
          >
            <Icon
              :icon="tool.icon"
              class="w-5 h-5 opacity-70"
            />
            <div class="flex-1 min-w-0">
              <div class="flex items-center flex-wrap">
                <span
                  v-for="(seg, j) in highlightMatch(tool.name, query)"
                  :key="j"
                  :class="seg.matched ? 'bg-warning/30 rounded' : ''"
                >{{ seg.text }}</span>
              </div>
              <p class="text-xs text-base-content/60 truncate">
                <span
                  v-for="(seg, j) in highlightMatch(tool.desc, query)"
                  :key="j"
                  :class="seg.matched ? 'bg-warning/30 rounded' : ''"
                >{{ seg.text }}</span>
              </p>
            </div>
            <span class="badge badge-sm badge-ghost">{{ tool.groupName }}</span>
          </div>
        </li>
      </ul>

      <!-- Empty: query but no matches -->
      <div
        v-else-if="query.trim()"
        class="p-8 text-center text-base-content/50"
      >
        未找到匹配工具
      </div>

      <!-- Empty: no query -->
      <div
        v-else
        class="p-8 text-center text-base-content/50"
      >
        输入关键词以搜索工具…
      </div>
    </div>
  </dialog>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import { searchIndex, searchTools, highlightMatch, truncateResults } from '../tools/search.js'

const props = defineProps({
  limit: {
    type: Number,
    default: 20,
  },
})

const router = useRouter()

const open = ref(false)
const query = ref('')
const activeIndex = ref(0)
const inputEl = ref(null)

const results = computed(() =>
  truncateResults(searchTools(query.value, searchIndex), props.limit)
)

watch(results, (newResults) => {
  if (activeIndex.value >= newResults.length) {
    activeIndex.value = 0
  }
})

function openPalette() {
  open.value = true
  query.value = ''
  activeIndex.value = 0
  nextTick(() => {
    inputEl.value?.focus()
  })
}

function closePalette() {
  open.value = false
  query.value = ''
  activeIndex.value = 0
}

function select(path) {
  router.push(path)
  closePalette()
}

function handleKeydown(e) {
  const isToggleShortcut = (e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')
  if (isToggleShortcut) {
    e.preventDefault()
    if (open.value) closePalette()
    else openPalette()
    return
  }

  if (!open.value) return

  if (e.key === 'Escape') {
    e.preventDefault()
    closePalette()
    return
  }

  if (!results.value.length) return

  if (e.key === 'ArrowDown') {
    e.preventDefault()
    activeIndex.value = (activeIndex.value + 1) % results.value.length
    return
  }

  if (e.key === 'ArrowUp') {
    e.preventDefault()
    activeIndex.value =
      (activeIndex.value - 1 + results.value.length) % results.value.length
    return
  }

  if (e.key === 'Enter') {
    e.preventDefault()
    const tool = results.value[activeIndex.value]
    if (tool) select(tool.path)
    return
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

defineExpose({
  open: openPalette,
  close: closePalette,
  handleKeydown,
  activeIndex,
  results,
})
</script>
