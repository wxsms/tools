<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">
      正则表达式测试
    </h1>

    <!-- Pattern input + flags -->
    <div class="form-control mb-4">
      <label class="label">
        <span class="label-text font-semibold">正则表达式</span>
      </label>
      <div class="flex gap-2 items-center">
        <span class="text-lg font-mono opacity-50">/</span>
        <input
          v-model="pattern"
          type="text"
          class="input input-bordered flex-1 font-mono text-sm"
          :class="{
            'input-success': patternTouched && pattern && !regexError,
            'input-error': patternTouched && pattern && regexError,
          }"
          placeholder="输入正则表达式..."
          @input="onPatternInput"
        >
        <span class="text-lg font-mono opacity-50">/</span>
        <div class="flex gap-1">
          <button
            v-for="flag in flagList"
            :key="flag.key"
            class="btn btn-sm font-mono w-9"
            :class="flags[flag.key] ? 'btn-primary' : ''"
            :title="flag.desc"
            @click="toggleFlag(flag.key)"
          >
            {{ flag.key }}
          </button>
        </div>
      </div>
      <p
        v-if="regexError"
        class="text-error text-sm mt-1"
      >
        {{ regexError }}
      </p>
    </div>

    <!-- Common patterns -->
    <div class="mb-4">
      <p class="text-sm font-semibold opacity-50 mb-2">
        常用正则
      </p>
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="p in commonPatterns"
          :key="p.pattern"
          class="btn btn-xs gap-1"
          @click="applyPattern(p)"
        >
          {{ p.label }}
        </button>
      </div>
    </div>

    <!-- Main layout: two columns -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <!-- Left: test string -->
      <div class="form-control">
        <label class="label">
          <span class="label-text font-semibold">测试文本</span>
        </label>
        <div class="relative">
          <textarea
            v-model="testString"
            class="textarea textarea-bordered w-full font-mono text-sm h-[400px] resize-none"
            placeholder="输入测试文本..."
          />
          <button
            v-if="testString"
            class="btn btn-ghost btn-xs btn-square absolute bottom-2 right-2"
            :title="testCopied ? '已复制！' : '复制'"
            @click="copyText(testString, 'test')"
          >
            <Icon
              v-if="testCopied"
              icon="lucide:check"
              class="w-4 h-4 text-success"
            />
            <Icon
              v-else
              icon="lucide:clipboard"
              class="w-4 h-4"
            />
          </button>
        </div>
      </div>

      <!-- Right: results -->
      <div class="form-control">
        <label class="label">
          <span class="label-text font-semibold">匹配结果</span>
          <span
            v-if="matchResult.matches.length"
            class="label-text-alt opacity-50"
          >
            {{ matchResult.matches.length }} 个匹配
          </span>
        </label>

        <!-- Highlighted text -->
        <div
          v-if="testString"
          class="border border-base-content/10 rounded-lg p-3 mb-3 font-mono text-sm whitespace-pre-wrap break-all min-h-[80px]"
        >
          <span
            v-for="(seg, i) in segments"
            :key="i"
            :class="seg.isMatch ? 'bg-primary/30 rounded px-0.5' : ''"
          >{{ seg.text }}</span>
        </div>

        <!-- Match list -->
        <div
          v-if="matchResult.matches.length"
          class="border border-base-content/10 rounded-lg overflow-auto p-3 space-y-3"
          style="max-height: 280px"
        >
          <div
            v-for="(m, i) in matchResult.matches"
            :key="i"
          >
            <div class="flex items-start gap-2">
              <span class="badge badge-sm badge-ghost font-mono">#{{ i + 1 }}</span>
              <code class="text-sm break-all flex-1">{{ m.match }}</code>
              <button
                class="btn btn-ghost btn-xs btn-square shrink-0"
                :title="copiedIndex === i ? '已复制！' : '复制'"
                @click="copyText(m.match, 'match-' + i)"
              >
                <Icon
                  v-if="copiedIndex === i"
                  icon="lucide:check"
                  class="w-3.5 h-3.5 text-success"
                />
                <Icon
                  v-else
                  icon="lucide:clipboard"
                  class="w-3.5 h-3.5"
                />
              </button>
            </div>
            <div class="text-xs opacity-50 ml-7">
              位置 {{ m.index }}
            </div>
            <div
              v-if="m.groups"
              class="ml-7 mt-1 space-y-0.5"
            >
              <div
                v-for="(val, key) in m.groups"
                :key="key"
                class="flex gap-2 text-xs"
              >
                <span class="opacity-50 font-mono">{{ key }}:</span>
                <code class="break-all">{{ val }}</code>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div
          v-else-if="!regexError && pattern"
          class="border border-base-content/10 rounded-lg p-3 text-center opacity-30 text-sm"
        >
          无匹配结果
        </div>
        <div
          v-else-if="!pattern"
          class="border border-base-content/10 rounded-lg p-3 text-center opacity-30 text-sm"
        >
          输入正则和测试文本以查看匹配结果
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Icon } from '@iconify/vue'
import { ref, reactive, computed } from 'vue'
import { testRegex, buildHighlightedSegments, commonPatterns, flagsToString } from './regex.js'

const SAMPLE_PATTERN = '\\b\\w+@\\w+\\.\\w+\\b'
const SAMPLE_TEXT = '联系我们：admin@example.com 或 support@test.org，也可发至 dev@company.co.jp'

const pattern = ref(SAMPLE_PATTERN)
const patternTouched = ref(false)
const testString = ref(SAMPLE_TEXT)
const flags = reactive({ g: true, i: false, m: false, s: false })
const copiedIndex = ref(-1)
const testCopied = ref(false)

const flagList = [
  { key: 'g', desc: '全局匹配' },
  { key: 'i', desc: '忽略大小写' },
  { key: 'm', desc: '多行模式' },
  { key: 's', desc: '点号匹配换行' },
]

const flagsString = computed(() => flagsToString(flags))

const matchResult = computed(() => {
  return testRegex(pattern.value, flagsString.value, testString.value)
})

const regexError = computed(() => matchResult.value.error)

const segments = computed(() => {
  if (regexError.value || !pattern.value) {
    return testString.value ? [{ text: testString.value, isMatch: false, matchIndex: -1 }] : []
  }
  return buildHighlightedSegments(testString.value, matchResult.value.matches)
})

function onPatternInput() {
  patternTouched.value = true
}

function toggleFlag(key) {
  flags[key] = !flags[key]
}

function applyPattern(p) {
  pattern.value = p.pattern
  patternTouched.value = true
  if (p.sample) testString.value = p.sample
  flags.g = !!p.flags.g
  flags.i = !!p.flags.i
  flags.m = !!p.flags.m
  flags.s = !!p.flags.s
}

async function copyText(text, flag) {
  try {
    await navigator.clipboard.writeText(text)
    if (flag === 'test') {
      testCopied.value = true
      setTimeout(() => testCopied.value = false, 1500)
    } else if (flag.startsWith('match-')) {
      const idx = parseInt(flag.split('-')[1])
      copiedIndex.value = idx
      setTimeout(() => copiedIndex.value = -1, 1500)
    }
  } catch { /* clipboard not available */ }
}
</script>
