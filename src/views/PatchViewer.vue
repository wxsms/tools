<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">
      Patch 查看
    </h1>

    <!-- Input area -->
    <div
      v-if="!parsed"
      class="flex flex-col gap-4"
    >
      <div class="form-control">
        <textarea
          v-model="patchText"
          class="textarea textarea-bordered w-full font-mono text-sm"
          placeholder="粘贴 git diff / unified patch 内容..."
          rows="12"
        />
      </div>
      <div class="flex items-center gap-2">
        <button
          class="btn btn-primary btn-sm gap-1"
          :disabled="!patchText.trim()"
          @click="parse"
        >
          <DocumentTextIcon class="w-4 h-4" />
          解析
        </button>
        <label class="btn btn-sm gap-1">
          <ArrowUpTrayIcon class="w-4 h-4" />
          上传文件
          <input
            type="file"
            accept=".patch,.diff,.txt"
            class="hidden"
            @change="onFileUpload"
          >
        </label>
        <button
          class="btn btn-ghost btn-sm gap-1"
          @click="clear"
        >
          <TrashIcon class="w-4 h-4" />
          清空
        </button>
      </div>
      <p class="text-xs opacity-50">
        支持 unified diff 格式（git diff、diff -u 等输出）
      </p>
    </div>

    <!-- Parsed result -->
    <div
      v-if="parsed"
      class="flex flex-col gap-4"
    >
      <!-- Summary bar -->
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div class="flex items-center gap-3 text-sm">
          <span class="font-semibold">{{ totalStats.files }} 个文件</span>
          <span class="text-success">+{{ totalStats.added }}</span>
          <span class="text-error">-{{ totalStats.deleted }}</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="join">
            <button
              class="btn btn-xs join-item"
              :class="viewMode === 'split' ? 'btn-active' : ''"
              @click="viewMode = 'split'"
            >
              并排
            </button>
            <button
              class="btn btn-xs join-item"
              :class="viewMode === 'unified' ? 'btn-active' : ''"
              @click="viewMode = 'unified'"
            >
              统一
            </button>
          </div>
          <button
            class="btn btn-ghost btn-xs"
            @click="toggleAllFiles"
          >
            {{ allExpanded ? '全部折叠' : '全部展开' }}
          </button>
          <button
            class="btn btn-ghost btn-sm gap-1"
            @click="backToInput"
          >
            <ArrowLeftIcon class="w-4 h-4" />
            返回
          </button>
        </div>
      </div>

      <!-- File entries -->
      <div
        v-for="(file, fi) in parsed"
        :key="fi"
        class="rounded-lg border border-base-content/10 overflow-hidden"
      >
        <!-- File header -->
        <div
          class="flex items-center gap-2 px-3 py-2 bg-base-200 cursor-pointer select-none"
          @click="toggleFile(fi)"
        >
          <ChevronDownIcon
            class="w-4 h-4 shrink-0 transition-transform"
            :class="{ '-rotate-90': !expandedFiles.has(fi) }"
          />
          <span class="font-mono text-sm font-semibold truncate">{{ getFileDisplayName(file) }}</span>
          <button
            class="btn btn-ghost btn-xs btn-square shrink-0"
            :title="copiedFileIndex === fi ? '已复制！' : '复制文件名'"
            @click.stop="copyFileName(fi)"
          >
            <CheckIcon
              v-if="copiedFileIndex === fi"
              class="w-3.5 h-3.5 text-success"
            />
            <ClipboardDocumentIcon
              v-else
              class="w-3.5 h-3.5"
            />
          </button>
          <span class="ml-auto text-xs opacity-60 shrink-0">
            <span
              v-if="file.from === '/dev/null'"
              class="text-success"
            >新增</span>
            <span
              v-else-if="file.to === '/dev/null'"
              class="text-error"
            >删除</span>
            <template v-else>
              <span class="text-success">+{{ file.added }}</span>
              <span class="text-error ml-1">-{{ file.deleted }}</span>
            </template>
          </span>
        </div>

        <!-- File diff content -->
        <div v-show="expandedFiles.has(fi)">
          <template v-if="viewMode === 'unified'">
            <UnifiedView :hunks="file.hunks" />
          </template>
          <template v-else>
            <SplitView :hunks="file.hunks" />
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import {
  DocumentTextIcon,
  ArrowUpTrayIcon,
  TrashIcon,
  ArrowLeftIcon,
  ChevronDownIcon,
  ClipboardDocumentIcon,
  CheckIcon,
} from '@heroicons/vue/24/outline'
import { parsePatch, getFileDisplayName, computeTotalStats } from '../utils/patch.js'
import UnifiedView from './patch/UnifiedView.vue'
import SplitView from './patch/SplitView.vue'

const patchText = ref('')
const parsed = ref(null)
const viewMode = ref('unified')
const expandedFiles = reactive(new Set())
const allExpanded = ref(true)
const copiedFileIndex = ref(-1)

const totalStats = computed(() => computeTotalStats(parsed.value || []))

function parse() {
  const result = parsePatch(patchText.value)
  parsed.value = result
  // Expand all files by default
  expandedFiles.clear()
  for (let i = 0; i < result.length; i++) {
    expandedFiles.add(i)
  }
  allExpanded.value = true
}

function toggleFile(index) {
  if (expandedFiles.has(index)) {
    expandedFiles.delete(index)
  } else {
    expandedFiles.add(index)
  }
  allExpanded.value = parsed.value.every((_, i) => expandedFiles.has(i))
}

function toggleAllFiles() {
  if (allExpanded.value) {
    expandedFiles.clear()
    allExpanded.value = false
  } else {
    expandedFiles.clear()
    for (let i = 0; i < parsed.value.length; i++) {
      expandedFiles.add(i)
    }
    allExpanded.value = true
  }
}

function backToInput() {
  parsed.value = null
}

function clear() {
  patchText.value = ''
  parsed.value = null
}

function copyFileName(fi) {
  const name = getFileDisplayName(parsed.value[fi])
  navigator.clipboard.writeText(name).then(() => {
    copiedFileIndex.value = fi
    setTimeout(() => { copiedFileIndex.value = -1 }, 1500)
  })
}

function onFileUpload(event) {
  const file = event.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (e) => {
    patchText.value = e.target.result
  }
  reader.readAsText(file)
  event.target.value = ''
}
</script>
