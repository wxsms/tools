<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">
      文本 Diff
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
          <ArrowsRightLeftIcon class="w-5 h-5" />
        </div>
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">修改文本</span></label>
          <textarea
            v-model="rightText"
            class="textarea textarea-bordered w-full font-mono text-sm"
            placeholder="输入修改后的文本..."
            rows="10"
          />
        </div>
      </div>

      <div class="flex justify-center gap-2">
        <button
          class="btn btn-primary btn-sm gap-1"
          :disabled="!leftText && !rightText"
          @click="computeDiff"
        >
          <ArrowsRightLeftIcon class="w-4 h-4" />
          对比
        </button>
        <button
          class="btn btn-ghost btn-sm gap-1"
          @click="clear"
        >
          <TrashIcon class="w-4 h-4" />
          清空
        </button>
      </div>

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
          <h2 class="text-lg font-semibold">
            对比结果
          </h2>
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
            <div class="flex items-center gap-3 text-xs opacity-70">
              <span class="flex items-center gap-1"><span class="inline-block w-3 h-3 rounded bg-success/20 border border-success/40" /> 新增</span>
              <span class="flex items-center gap-1"><span class="inline-block w-3 h-3 rounded bg-error/20 border border-error/40" /> 删除</span>
              <span class="flex items-center gap-1"><span class="inline-block w-3 h-3 rounded bg-base-300 border border-base-content/10" /> 未变</span>
            </div>
          </div>
        </div>

        <div class="rounded-lg border border-base-content/10 overflow-hidden">
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
                    ⋯ 折叠了 {{ item.count }} 行相同内容（点击展开）⋯
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
                  <td class="px-3 py-0.5 whitespace-pre-wrap break-all">
                    <span
                      v-if="item.type === 'add'"
                      class="text-success"
                    >+</span>
                    <span
                      v-else-if="item.type === 'delete'"
                      class="text-error"
                    >-</span>
                    <span
                      v-else
                      class="text-base-content/30"
                    />
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
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>

        <p class="text-xs opacity-50 mt-2">
          共 {{ stats.unchanged }} 行未变，{{ stats.added }} 行新增，{{ stats.deleted }} 行删除
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import * as Diff from 'diff'
import { ArrowsRightLeftIcon, TrashIcon } from '@heroicons/vue/24/outline'

const leftText = ref('')
const rightText = ref('')
const diffLines = ref([])
const compared = ref(false)
const showMode = ref('compact')
const unfolded = ref(new Set())
const CONTEXT = 3

const hasChanges = computed(() => diffLines.value.some(l => l.type !== 'equal'))

const stats = computed(() => {
  let added = 0, deleted = 0, unchanged = 0
  for (const line of diffLines.value) {
    if (line.type === 'add') added++
    else if (line.type === 'delete') deleted++
    else unchanged++
  }
  return { added, deleted, unchanged }
})

const displayLines = computed(() => {
  if (showMode.value === 'full') return diffLines.value

  // compact mode: show changed lines + N context lines, fold the rest
  const lines = diffLines.value
  const visible = new Set()
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].type !== 'equal') {
      for (let j = Math.max(0, i - CONTEXT); j <= Math.min(lines.length - 1, i + CONTEXT); j++) {
        visible.add(j)
      }
    }
  }

  const result = []
  let i = 0
  while (i < lines.length) {
    if (visible.has(i)) {
      result.push(lines[i])
      i++
      continue
    }

    // Collect consecutive invisible lines
    const foldStart = i
    while (i < lines.length && !visible.has(i)) i++
    const foldEnd = i

    // Check if this fold region is unfolded by user
    const isUnfolded = [...unfolded.value].some(u => u >= foldStart && u < foldEnd)
    if (isUnfolded) {
      for (let j = foldStart; j < foldEnd; j++) {
        result.push(lines[j])
      }
    } else {
      result.push({ type: 'fold', foldIndex: foldStart, count: foldEnd - foldStart })
    }
  }
  return result
})

function unfold(foldIndex) {
  unfolded.value = new Set([...unfolded.value, foldIndex])
}

function computeDiff() {
  const lineChanges = Diff.diffLines(leftText.value, rightText.value)
  const result = []
  let oldNum = 0, newNum = 0

  for (const change of lineChanges) {
    const lines = change.value.replace(/\n$/, '').split('\n')
    for (const text of lines) {
      if (change.added) {
        newNum++
        result.push({ type: 'add', text, oldNum: '', newNum })
      } else if (change.removed) {
        oldNum++
        result.push({ type: 'delete', text, oldNum, newNum: '' })
      } else {
        oldNum++
        newNum++
        result.push({ type: 'equal', text, oldNum, newNum })
      }
    }
  }

  diffLines.value = addInlineHighlights(result)
  compared.value = true
  unfolded.value = new Set()
}

function clear() {
  leftText.value = ''
  rightText.value = ''
  diffLines.value = []
  compared.value = false
  showMode.value = 'compact'
  unfolded.value = new Set()
}

/**
 * For consecutive delete+add pairs, compute word-level diff
 * and attach segments for inline highlighting.
 */
function addInlineHighlights(lines) {
  const result = []
  let i = 0
  while (i < lines.length) {
    const deletes = []
    while (i < lines.length && lines[i].type === 'delete') {
      deletes.push(lines[i])
      i++
    }
    const adds = []
    while (i < lines.length && lines[i].type === 'add') {
      adds.push(lines[i])
      i++
    }

    if (deletes.length > 0 && adds.length > 0) {
      const pairCount = Math.min(deletes.length, adds.length)
      for (let p = 0; p < pairCount; p++) {
        const wordDiff = Diff.diffWords(deletes[p].text, adds[p].text)
        deletes[p].segments = wordDiff
          .filter(p => !p.added)
          .map(p => ({ type: p.removed ? 'delete' : 'equal', text: p.value }))
        adds[p].segments = wordDiff
          .filter(p => !p.removed)
          .map(p => ({ type: p.added ? 'add' : 'equal', text: p.value }))
      }
      result.push(...deletes, ...adds)
    } else {
      result.push(...deletes, ...adds)
    }

    while (i < lines.length && lines[i].type !== 'delete' && lines[i].type !== 'add') {
      result.push(lines[i])
      i++
    }
  }
  return result
}
</script>
