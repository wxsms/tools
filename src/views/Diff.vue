<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">
      Text Diff
    </h1>
    <div class="flex flex-col gap-4">
      <div class="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-4">
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">Original Text</span></label>
          <textarea
            v-model="leftText"
            class="textarea textarea-bordered w-full font-mono text-sm"
            placeholder="Enter original text..."
            rows="10"
          />
        </div>
        <div class="hidden lg:flex items-center justify-center opacity-30">
          <ArrowsRightLeftIcon class="w-5 h-5" />
        </div>
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">Modified Text</span></label>
          <textarea
            v-model="rightText"
            class="textarea textarea-bordered w-full font-mono text-sm"
            placeholder="Enter modified text..."
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
          <ArrowsRightLeftIcon class="w-4 h-4" />
          Compare
        </button>
        <button
          class="btn btn-ghost btn-sm gap-1"
          @click="clear"
        >
          <TrashIcon class="w-4 h-4" />
          Clear
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
        <span>The two texts are identical</span>
      </div>

      <!-- Diff result -->
      <div
        v-if="compared && diffLines.length"
        class="mt-2"
      >
        <div class="flex items-center justify-between mb-2">
          <h2 class="text-lg font-semibold">
            Comparison Result
          </h2>
          <div class="flex items-center gap-4">
            <div class="join">
              <button
                class="btn btn-xs join-item"
                :class="showMode === 'compact' ? 'btn-active' : ''"
                @click="showMode = 'compact'"
              >
                Diff
              </button>
              <button
                class="btn btn-xs join-item"
                :class="showMode === 'full' ? 'btn-active' : ''"
                @click="showMode = 'full'"
              >
                All
              </button>
            </div>
            <div class="flex items-center gap-3 text-xs opacity-70">
              <span class="flex items-center gap-1"><span class="inline-block w-3 h-3 rounded bg-success/20 border border-success/40" /> Added</span>
              <span class="flex items-center gap-1"><span class="inline-block w-3 h-3 rounded bg-error/20 border border-error/40" /> Deleted</span>
              <span class="flex items-center gap-1"><span class="inline-block w-3 h-3 rounded bg-base-300 border border-base-content/10" /> Unchanged</span>
            </div>
          </div>
        </div>

        <div class="rounded-lg border border-base-content/10 overflow-hidden">
          <table class="w-full text-sm font-mono">
            <thead>
              <tr class="bg-base-200 text-xs text-base-content/50">
                <th class="w-12 text-right px-2 py-1">
                  Old
                </th>
                <th class="w-12 text-right px-2 py-1">
                  New
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
                    ⋯ {{ item.count }} identical lines folded (click to expand) ⋯
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
          {{ stats.unchanged }} unchanged, {{ stats.added }} added, {{ stats.deleted }} deleted
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ArrowsRightLeftIcon, TrashIcon } from '@heroicons/vue/24/outline'
import { computeDiff as doComputeDiff, computeStats, computeDisplayLines } from '../utils/diff.js'

const leftText = ref('')
const rightText = ref('')
const diffLines = ref([])
const compared = ref(false)
const showMode = ref('compact')
const unfolded = ref(new Set())
const CONTEXT = 3

const hasChanges = computed(() => diffLines.value.some(l => l.type !== 'equal'))

const stats = computed(() => computeStats(diffLines.value))

const displayLines = computed(() => computeDisplayLines(diffLines.value, showMode.value, unfolded.value, CONTEXT))

function unfold(foldIndex) {
  unfolded.value = new Set([...unfolded.value, foldIndex])
}

function computeDiffFn() {
  diffLines.value = doComputeDiff(leftText.value, rightText.value)
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
</script>
