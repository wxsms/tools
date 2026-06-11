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
            <CheckIcon
              v-if="testCopied"
              class="w-4 h-4 text-success"
            />
            <ClipboardDocumentIcon
              v-else
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
                <CheckIcon
                  v-if="copiedIndex === i"
                  class="w-3.5 h-3.5 text-success"
                />
                <ClipboardDocumentIcon
                  v-else
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
import { ref, reactive, computed } from 'vue'
import { ClipboardDocumentIcon, CheckIcon } from '@heroicons/vue/24/outline'
import { testRegex, buildHighlightedSegments } from '../utils/regex.js'

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

const commonPatterns = [
  {
    label: '邮箱',
    pattern: '\\b[\\w.-]+@[\\w.-]+\\.\\w+\\b',
    flags: { g: true },
    sample: '联系我们：admin@example.com 或 support@test.org，也可发至 dev@company.co.jp',
  },
  {
    label: '手机号',
    pattern: '1[3-9]\\d{9}',
    flags: { g: true },
    sample: '张三：13800138000，李四：15912345678，座机：010-88888888 不是手机',
  },
  {
    label: 'URL',
    pattern: 'https?://[\\w\\-._~:/?#\\[\\]@!$&\'()*+,;=%]+',
    flags: { g: true },
    sample: '访问 https://www.example.com/path?q=hello 或 http://api.test.org:8080/v1/users 获取数据',
  },
  {
    label: 'IP 地址',
    pattern: '\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b',
    flags: { g: true },
    sample: '服务器 A：192.168.1.100，服务器 B：10.0.0.1，DNS：8.8.8.8',
  },
  {
    label: '日期',
    pattern: '\\d{4}[-/]\\d{2}[-/]\\d{2}',
    flags: { g: true },
    sample: '创建于 2024-01-15，更新于 2024/06/20，截止 2025-12-31',
  },
  {
    label: '身份证',
    pattern: '\\b\\d{17}[\\dXx]\\b',
    flags: { g: true },
    sample: '张三：110101199003076543，李四：44030519881212001X',
  },
  {
    label: '中文',
    pattern: '[\\u4e00-\\u9fff]+',
    flags: { g: true },
    sample: 'Hello 你好，this is 一个 mixed 字符串 with 中文 and English。',
  },
  {
    label: 'HTML 标签',
    pattern: '<[^>]+>',
    flags: { g: true },
    sample: '<div class="container"><h1>标题</h1><p>段落内容</p><br/></div>',
  },
  {
    label: '十六进制颜色',
    pattern: '#[0-9a-fA-F]{3,8}\\b',
    flags: { g: true },
    sample: '主色 #1a2b3c，强调色 #f00，背景 #ffffff，透明 #00000000',
  },
  {
    label: '数字',
    pattern: '-?\\d+(?:\\.\\d+)?',
    flags: { g: true },
    sample: '温度 -3.5°C，价格 99.8 元，数量 100，比例 0.618',
  },
  {
    label: '英文单词',
    pattern: '\\b[a-zA-Z]+\\b',
    flags: { g: true },
    sample: 'Hello world! This is a test123 and regex demo.',
  },
  {
    label: '邮编',
    pattern: '\\b[1-9]\\d{5}\\b',
    flags: { g: true },
    sample: '北京 100000，上海 200000，广州 510000，深圳 518000',
  },
  {
    label: '车牌号',
    pattern: '[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤川青藏琼宁][A-Z][A-HJ-NP-Z0-9]{4,5}[A-HJ-NP-Z0-9挂学警港澳]?',
    flags: { g: true },
    sample: '京A12345，粤B12345D，沪C67890，川D99999警',
  },
  {
    label: '银行卡号',
    pattern: '\\b\\d{16,19}\\b',
    flags: { g: true },
    sample: '卡号1：6222021234567890123，卡号2：6217001234567890，卡号3：6228481234567890123',
  },
  {
    label: 'IPv6',
    pattern: '(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::(?:[0-9a-fA-F]{1,4}:){0,5}[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,6}:',
    flags: { g: true },
    sample: '本地回环 ::1，公网 2001:0db8:85a3:0000:0000:8a2e:0370:7334，简写 fe80::1',
  },
  {
    label: '密码强度',
    pattern: '(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)[\\s\\S]{8,}',
    flags: {},
    sample: '弱密码：12345678\n中等：abcdefgh\n强密码：Abc12345\n最强：Abc@12345',
  },
]

const flagsString = computed(() => {
  return Object.entries(flags).filter(([, v]) => v).map(([k]) => k).join('')
})

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
