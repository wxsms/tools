<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">
      JSON 校验器
    </h1>

    <!-- Toolbar -->
    <div class="flex flex-wrap gap-2 mb-4">
      <button
        class="btn btn-primary btn-sm gap-1"
        :disabled="!input"
        @click="format"
      >
        <SparklesIcon class="w-4 h-4" />
        格式化
      </button>
      <button
        class="btn btn-sm gap-1"
        :disabled="!input"
        @click="minify"
      >
        <ArrowsPointingInIcon class="w-4 h-4" />
        压缩
      </button>
      <button
        class="btn btn-sm gap-1"
        :disabled="!input"
        @click="toUnicode"
      >
        中文 → Unicode
      </button>
      <button
        class="btn btn-sm gap-1"
        :disabled="!input"
        @click="fromUnicode"
      >
        Unicode → 中文
      </button>
      <button
        class="btn btn-sm gap-1"
        :disabled="!input"
        @click="addQuoteEscape"
      >
        添加 \" 转义
      </button>
      <button
        class="btn btn-sm gap-1"
        :disabled="!input"
        @click="removeQuoteEscape"
      >
        去除 \" 转义
      </button>
    </div>

    <!-- Main layout -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <!-- Left: editor -->
      <div class="form-control">
        <label class="label">
          <span class="label-text font-semibold">输入</span>
        </label>
        <div class="relative">
          <textarea
            v-model="input"
            class="textarea textarea-bordered w-full font-mono text-sm h-[520px] resize-none"
            :class="{
              'textarea-success': touched && input.trim() && isValid,
              'textarea-error': touched && input.trim() && !isValid,
            }"
            placeholder="在此粘贴 JSON..."
            @input="onInput"
          />
          <button
            v-if="input"
            class="btn btn-ghost btn-xs btn-square absolute bottom-2 right-2"
            :title="copied ? '已复制！' : '复制'"
            @click="copy"
          >
            <CheckIcon
              v-if="copied"
              class="w-4 h-4 text-success"
            />
            <ClipboardDocumentIcon
              v-else
              class="w-4 h-4"
            />
          </button>
        </div>
        <p
          v-if="touched && input.trim()"
          :class="isValid ? 'text-success' : 'text-error'"
          class="text-sm mt-1"
        >
          {{ isValid ? 'JSON 有效' : 'JSON 无效：' + error }}
        </p>
      </div>

      <!-- Right: tree view -->
      <div class="form-control">
        <label class="label">
          <span class="label-text font-semibold">树形视图</span>
        </label>
        <div
          class="border border-base-content/10 rounded-lg overflow-auto p-3 h-[520px]"
        >
          <vue-json-pretty
            v-if="parsedData !== undefined"
            :data="parsedData"
            :deep="3"
            :show-length="true"
            :show-icon="true"
            :theme="theme"
          />
          <p
            v-else
            class="text-base-content/30 text-sm"
          >
            输入有效的 JSON 以查看树形视图
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import {
  SparklesIcon,
  ArrowsPointingInIcon,
  ClipboardDocumentIcon,
  CheckIcon,
} from '@heroicons/vue/24/outline'
import VueJsonPretty from 'vue-json-pretty'
import 'vue-json-pretty/lib/styles.css'
import { useTheme } from '../../composables/useTheme.js'

const { theme } = useTheme()
const SAMPLE = JSON.stringify({
  "name": "wxsm工具箱",
  "version": "1.0.0",
  "description": "个人在线工具集",
  "url": "https://example.com/api/v1/tools",
  "features": ["格式化", "压缩", "校验", "转义"],
  "author": {
    "name": "wxsm",
    "email": "wxsm@example.com",
    "links": { "github": "https://github.com/wxsms" }
  },
  "tags": ["JSON", "工具", "开发"],
  "active": true,
  "config": { "theme": "dark", "lang": "zh-CN", "maxDepth": 10 }
}, null, 2)

const input = ref(SAMPLE)
const error = ref('')
const copied = ref(false)
const touched = ref(false)

const isValid = computed(() => !input.value.trim() || !error.value)

const parsedData = computed(() => {
  if (!input.value.trim()) return undefined
  try {
    return JSON.parse(input.value)
  } catch {
    return undefined
  }
})

function onInput() {
  touched.value = true
  if (!input.value.trim()) {
    error.value = ''
    return
  }
  try {
    JSON.parse(input.value)
    error.value = ''
  } catch (e) {
    error.value = e.message
  }
}

function format() {
  try {
    const obj = JSON.parse(input.value)
    input.value = JSON.stringify(obj, null, 2)
    error.value = ''
  } catch (e) {
    error.value = e.message
  }
}

function minify() {
  try {
    const obj = JSON.parse(input.value)
    input.value = JSON.stringify(obj)
    error.value = ''
  } catch (e) {
    error.value = e.message
  }
}

function toUnicode() {
  input.value = input.value.replace(/[\u4e00-\u9fff]/g, ch => {
    return '\\u' + ch.charCodeAt(0).toString(16).padStart(4, '0')
  })
}

function fromUnicode() {
  input.value = input.value.replace(/\\u([0-9a-fA-F]{4})/g, (_, code) => {
    return String.fromCharCode(parseInt(code, 16))
  })
}

function addQuoteEscape() {
  // JSON string → escaped string with \" for quotes, \\n for newlines
  input.value = JSON.stringify(input.value)
}

function removeQuoteEscape() {
  try {
    // Unwrap one layer of JSON string escaping
    input.value = JSON.parse(input.value)
  } catch (e) {
    error.value = '不是有效的转义字符串：' + e.message
  }
}

async function copy() {
  try {
    await navigator.clipboard.writeText(input.value)
    copied.value = true
    setTimeout(() => copied.value = false, 1500)
  } catch { /* clipboard not available */ }
}
</script>
