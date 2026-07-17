<template>
  <dialog
    v-if="open"
    class="modal modal-open"
    @click.self="close"
  >
    <div class="modal-box max-w-lg p-0 overflow-hidden">
      <!-- Input -->
      <div class="flex items-center gap-2 p-3 border-b border-base-300">
        <MagnifyingGlassIcon class="w-5 h-5 opacity-60" />
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
            <component
              :is="tool.icon"
              class="w-5 h-5 opacity-70"
            />
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span
                  v-for="(seg, j) in highlightMatch(tool.name, query)"
                  :key="j"
                  :class="seg.matched ? 'bg-warning/30 rounded px-0.5' : ''"
                >{{ seg.text }}</span>
              </div>
              <p class="text-xs text-base-content/60 truncate">
                <span
                  v-for="(seg, j) in highlightMatch(tool.desc, query)"
                  :key="j"
                  :class="seg.matched ? 'bg-warning/30 rounded px-0.5' : ''"
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
import { ref, computed, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { MagnifyingGlassIcon } from '@heroicons/vue/24/outline'
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

defineExpose({ open: openPalette, close: closePalette })
</script>
