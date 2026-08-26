<template>
  <div>
    <!-- Input view -->
    <div v-if="view === 'input'">
      <h1 class="text-3xl font-bold mb-6">
        文本对比
      </h1>
      <div class="flex flex-col gap-4">
        <div class="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-4">
          <div class="form-control">
            <label class="label"><span class="label-text font-semibold">原始文本</span></label>
            <textarea
              v-model="leftText"
              class="textarea textarea-bordered w-full font-mono text-sm"
              placeholder="输入原始文本..."
              rows="10"
            />
          </div>
          <div class="hidden lg:flex items-center justify-center opacity-30">
            <Icon
              icon="lucide:arrow-left-right"
              class="w-5 h-5"
            />
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text font-semibold">修改后文本</span></label>
            <textarea
              v-model="rightText"
              class="textarea textarea-bordered w-full font-mono text-sm"
              placeholder="输入修改后文本..."
              rows="10"
            />
          </div>
        </div>

        <div class="flex justify-center gap-2">
          <button
            class="btn btn-primary btn-sm gap-1"
            :disabled="!leftText && !rightText"
            @click="computeDiffFn"
          >
            <Icon
              icon="lucide:arrow-left-right"
              class="w-4 h-4"
            />
            对比
          </button>
          <button
            class="btn btn-ghost btn-sm gap-1"
            @click="clear"
          >
            <Icon
              icon="lucide:trash-2"
              class="w-4 h-4"
            />
            清空
          </button>
        </div>
      </div>
    </div>

    <!-- Result view -->
    <div
      v-if="view === 'result'"
      class="mt-4"
    >
      <!-- No diff hint -->
      <div
        v-if="compared && !hasChanges"
        role="alert"
        class="alert alert-success mt-4"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-5 w-5 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span>两段文本完全相同</span>
      </div>

      <!-- Diff result -->
      <div
        v-if="compared && diffLines.length"
        class="mt-2"
      >
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-3">
            <button
              class="btn btn-ghost btn-sm gap-1"
              @click="backToInput"
            >
              <Icon
                icon="lucide:arrow-left"
                class="w-4 h-4"
              />
              返回
            </button>
            <h2 class="text-lg font-semibold">
              对比结果
            </h2>
          </div>
          <div class="flex items-center gap-4">
            <div class="join">
              <button
                class="btn btn-xs join-item"
                :class="showMode === 'compact' ? 'btn-active' : ''"
                @click="showMode = 'compact'"
              >
                差异
              </button>
              <button
                class="btn btn-xs join-item"
                :class="showMode === 'full' ? 'btn-active' : ''"
                @click="showMode = 'full'"
              >
                全部
              </button>
            </div>
            <div class="join">
              <button
                class="btn btn-xs join-item"
                :class="viewMode === 'unified' ? 'btn-active' : ''"
                @click="viewMode = 'unified'"
              >
                合并
              </button>
              <button
                class="btn btn-xs join-item"
                :class="viewMode === 'split' ? 'btn-active' : ''"
                @click="viewMode = 'split'"
              >
                分栏
              </button>
            </div>
            <div class="flex items-center gap-3 text-xs opacity-70">
              <span class="flex items-center gap-1"><span class="inline-block w-3 h-3 rounded bg-success/20 border border-success/40" /> 新增</span>
              <span class="flex items-center gap-1"><span class="inline-block w-3 h-3 rounded bg-error/20 border border-error/40" /> 删除</span>
              <span class="flex items-center gap-1"><span class="inline-block w-3 h-3 rounded bg-base-300 border border-base-content/10" /> 未变</span>
            </div>
          </div>
        </div>

        <div
          v-if="viewMode === 'unified'"
          class="rounded-lg border border-base-content/10 overflow-hidden"
        >
          <table class="w-full text-sm font-mono">
            <thead>
              <tr class="bg-base-200 text-xs text-base-content/50">
                <th class="w-12 text-right px-2 py-1">
                  旧
                </th>
                <th class="w-12 text-right px-2 py-1">
                  新
                </th>
                <th class="px-3 py-1 text-left" />
              </tr>
            </thead>
            <tbody>
              <template
                v-for="(item, i) in displayLines"
                :key="i"
              >
                <tr
                  v-if="item.type === 'fold'"
                  class="bg-base-200/50 cursor-pointer hover:bg-base-200"
                  @click="unfold(item.foldIndex)"
                >
                  <td
                    colspan="3"
                    class="text-center px-2 py-0.5 text-xs text-base-content/40 select-none"
                  >
                    ⋯ {{ item.count }} 行相同内容已折叠（点击展开） ⋯
                  </td>
                </tr>
                <tr
                  v-else
                  :class="{
                    'bg-success/10': item.type === 'add',
                    'bg-error/10': item.type === 'delete',
                  }"
                >
                  <td class="text-right px-2 py-0.5 text-base-content/30 select-none align-top">
                    {{ item.type === 'add' ? '' : item.oldNum }}
                  </td>
                  <td class="text-right px-2 py-0.5 text-base-content/30 select-none align-top">
                    {{ item.type === 'delete' ? '' : item.newNum }}
                  </td>
                  <td class="px-3 py-0.5">
                    <div class="flex gap-2">
                      <span
                        v-if="item.type === 'add'"
                        class="text-success w-4 shrink-0 select-none text-center"
                      >+</span>
                      <span
                        v-else-if="item.type === 'delete'"
                        class="text-error w-4 shrink-0 select-none text-center"
                      >-</span>
                      <span
                        v-else
                        class="w-4 shrink-0 select-none"
                      />
                      <div class="whitespace-pre-wrap break-all min-w-0 flex-1">
                        <template v-if="item.segments">
                          <span
                            v-for="(seg, si) in item.segments"
                            :key="si"
                            :class="{
                              'bg-error/30 text-error': seg.type === 'delete',
                              'bg-success/30 text-success': seg.type === 'add',
                            }"
                          >{{ seg.text }}</span>
                        </template>
                        <span v-else>{{ item.text }}</span>
                      </div>
                    </div>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>

        <!-- Split view -->
        <div
          v-if="viewMode === 'split'"
          class="rounded-lg border border-base-content/10 overflow-hidden"
        >
          <table class="w-full text-sm font-mono">
            <thead>
              <tr class="bg-base-200 text-xs text-base-content/50">
                <th class="w-10 text-right px-2 py-1">
                  旧
                </th>
                <th class="px-3 py-1 text-left border-r border-base-content/10">
                  原始文本
                </th>
                <th class="w-10 text-right px-2 py-1">
                  新
                </th>
                <th class="px-3 py-1 text-left">
                  修改后文本
                </th>
              </tr>
            </thead>
            <tbody>
              <template
                v-for="(row, i) in splitRows"
                :key="i"
              >
                <tr
                  v-if="row.type === 'fold'"
                  class="bg-base-200/50 cursor-pointer hover:bg-base-200"
                  @click="unfold(row.foldIndex)"
                >
                  <td
                    colspan="4"
                    class="text-center px-2 py-0.5 text-xs text-base-content/40 select-none"
                  >
                    ⋯ {{ row.count }} 行相同内容已折叠（点击展开） ⋯
                  </td>
                </tr>
                <tr v-else>
                  <!-- Left (old) side -->
                  <td
                    class="text-right px-2 py-0.5 text-base-content/30 select-none align-top"
                    :class="row.left && row.type !== 'equal' ? 'bg-error/10' : ''"
                  >
                    {{ row.left ? row.left.oldNum : '' }}
                  </td>
                  <td
                    class="px-3 py-0.5 border-r border-base-content/10"
                    :class="{
                      'bg-error/10': row.type === 'delete' || row.type === 'modify',
                    }"
                  >
                    <div
                      v-if="row.left"
                      class="whitespace-pre-wrap break-all min-w-0"
                    >
                      <template v-if="row.left.segments">
                        <span
                          v-for="(seg, si) in row.left.segments"
                          :key="si"
                          :class="{
                            'bg-error/30 text-error': seg.type === 'delete',
                          }"
                        >{{ seg.text }}</span>
                      </template>
                      <span v-else>{{ row.left.text }}</span>
                    </div>
                  </td>
                  <!-- Right (new) side -->
                  <td
                    class="text-right px-2 py-0.5 text-base-content/30 select-none align-top"
                    :class="row.right && row.type !== 'equal' ? 'bg-success/10' : ''"
                  >
                    {{ row.right ? row.right.newNum : '' }}
                  </td>
                  <td
                    class="px-3 py-0.5"
                    :class="{
                      'bg-success/10': row.type === 'add' || row.type === 'modify',
                    }"
                  >
                    <div
                      v-if="row.right"
                      class="whitespace-pre-wrap break-all min-w-0"
                    >
                      <template v-if="row.right.segments">
                        <span
                          v-for="(seg, si) in row.right.segments"
                          :key="si"
                          :class="{
                            'bg-success/30 text-success': seg.type === 'add',
                          }"
                        >{{ seg.text }}</span>
                      </template>
                      <span v-else>{{ row.right.text }}</span>
                    </div>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>

        <p class="text-xs opacity-50 mt-2">
          {{ stats.unchanged }} 行未变，{{ stats.added }} 行新增，{{ stats.deleted }} 行删除
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Icon } from '@iconify/vue'
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { computeDiff as doComputeDiff, computeStats, computeDisplayLines, computeSplitRows } from './diff.js'

const VIEW_MODE_KEY = 'diff-view-mode'

const leftText = ref('')
const rightText = ref('')
const diffLines = ref([])
const compared = ref(false)
const view = ref('input')
const showMode = ref('compact')
const viewMode = ref(localStorage.getItem(VIEW_MODE_KEY) === 'split' ? 'split' : 'unified')
const unfolded = ref(new Set())
const CONTEXT = 3

watch(viewMode, v => localStorage.setItem(VIEW_MODE_KEY, v))

const hasChanges = computed(() => diffLines.value.some(l => l.type !== 'equal'))

const stats = computed(() => computeStats(diffLines.value))

const displayLines = computed(() => computeDisplayLines(diffLines.value, showMode.value, unfolded.value, CONTEXT))

const splitRows = computed(() => computeSplitRows(displayLines.value))

function unfold(foldIndex) {
  unfolded.value = new Set([...unfolded.value, foldIndex])
}

function computeDiffFn() {
  diffLines.value = doComputeDiff(leftText.value, rightText.value)
  compared.value = true
  view.value = 'result'
  unfolded.value = new Set()
}

function backToInput() {
  view.value = 'input'
}

function onKeydown(e) {
  if (e.key !== 'Backspace') return
  if (view.value !== 'result') return
  // Don't hijack when focus is inside an editable element
  const tag = document.activeElement?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) return
  e.preventDefault()
  backToInput()
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))

function clear() {
  leftText.value = ''
  rightText.value = ''
  diffLines.value = []
  compared.value = false
  view.value = 'input'
  showMode.value = 'compact'
  unfolded.value = new Set()
}
</script>
