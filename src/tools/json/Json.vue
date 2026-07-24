<template>
  <div class="json-page">
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
        <Icon
          icon="lucide:sparkles"
          class="w-4 h-4"
        />
        格式化
      </button>
      <button
        class="btn btn-sm gap-1"
        :disabled="!input"
        @click="minify"
      >
        <Icon
          icon="lucide:minimize-2"
          class="w-4 h-4"
        />
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
    <div class="flex gap-4">
      <!-- Left: editor -->
      <div class="flex-1 form-control min-w-0">
        <label class="label mb-2">
          <span class="label-text font-semibold">输入</span>
          <button
            v-if="input"
            class="btn btn-ghost btn-xs gap-1"
            @click="copy"
          >
            <Icon
              v-if="copied"
              icon="lucide:check"
              class="w-3.5 h-3.5 text-success"
            />
            <Icon
              v-else
              icon="lucide:clipboard"
              class="w-3.5 h-3.5"
            />
            {{ copied ? '已复制！' : '复制' }}
          </button>
        </label>
        <div
          ref="editorEl"
          class="cm-container border border-base-300"
        />
      </div>

      <!-- Right: tree view -->
      <div class="flex-1 form-control min-w-0">
        <label class="label mb-2">
          <span class="label-text font-semibold">树形视图</span>
        </label>
        <div class="json-tree-container border border-base-content/10 rounded-lg overflow-auto p-3">
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

    <!-- Bottom row: validation status + clear button -->
    <div class="flex items-center justify-between mt-4 gap-4">
      <p
        v-if="touched && input.trim()"
        :class="isValid ? 'text-success' : 'text-error'"
        class="text-sm flex-1 min-w-0 truncate"
      >
        {{ isValid ? 'JSON 有效' : 'JSON 无效：' + error }}
      </p>
      <span
        v-else
        class="flex-1"
      />
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
</template>

<script setup>
import { Icon } from '@iconify/vue'
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightActiveLine, drawSelection, rectangularSelection, highlightSpecialChars } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { json as jsonLang } from '@codemirror/lang-json'
import { oneDark } from '@codemirror/theme-one-dark'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching } from '@codemirror/language'
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete'
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search'
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

const editorEl = ref(null)
let editor = null

const isValid = computed(() => !input.value.trim() || !error.value)

const parsedData = computed(() => {
  if (!input.value.trim()) return undefined
  try {
    return JSON.parse(input.value)
  } catch {
    return undefined
  }
})

function getThemeExt() {
  return theme.value === 'dark' ? oneDark : []
}

function createExtensions() {
  return [
    lineNumbers(),
    highlightActiveLineGutter(),
    highlightSpecialChars(),
    history(),
    drawSelection(),
    EditorState.allowMultipleSelections.of(true),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    bracketMatching(),
    closeBrackets(),
    rectangularSelection(),
    highlightActiveLine(),
    highlightSelectionMatches(),
    keymap.of([
      ...closeBracketsKeymap,
      ...defaultKeymap,
      ...searchKeymap,
      ...historyKeymap,
      indentWithTab,
    ]),
    jsonLang(),
    EditorView.updateListener.of(onChange),
    EditorView.theme({
      '&': { height: '100%' },
      '.cm-scroller': { overflow: 'auto' },
    }),
  ]
}

function onChange(update) {
  if (!update.docChanged) return
  input.value = update.state.doc.toString()
  validate()
}

function validate() {
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

function syncEditor() {
  if (!editor) return
  editor.dispatch({
    changes: { from: 0, to: editor.state.doc.length, insert: input.value },
  })
}

function createEditor() {
  if (!editorEl.value) return
  editor = new EditorView({
    state: EditorState.create({
      doc: input.value,
      extensions: [...createExtensions(), getThemeExt()],
    }),
    parent: editorEl.value,
  })
}

function destroyEditor() {
  editor?.destroy()
  editor = null
}

function format() {
  try {
    const obj = JSON.parse(input.value)
    input.value = JSON.stringify(obj, null, 2)
    error.value = ''
    syncEditor()
  } catch (e) {
    error.value = e.message
  }
}

function minify() {
  try {
    const obj = JSON.parse(input.value)
    input.value = JSON.stringify(obj)
    error.value = ''
    syncEditor()
  } catch (e) {
    error.value = e.message
  }
}

function toUnicode() {
  input.value = input.value.replace(/[\u4e00-\u9fff]/g, ch => {
    return '\\u' + ch.charCodeAt(0).toString(16).padStart(4, '0')
  })
  syncEditor()
}

function fromUnicode() {
  input.value = input.value.replace(/\\u([0-9a-fA-F]{4})/g, (_, code) => {
    return String.fromCharCode(parseInt(code, 16))
  })
  syncEditor()
}

function addQuoteEscape() {
  input.value = JSON.stringify(input.value)
  syncEditor()
}

function removeQuoteEscape() {
  try {
    input.value = JSON.parse(input.value)
    error.value = ''
  } catch (e) {
    error.value = '不是有效的转义字符串：' + e.message
  }
  syncEditor()
}

function clear() {
  input.value = ''
  error.value = ''
  touched.value = false
  syncEditor()
}

async function copy() {
  try {
    await navigator.clipboard.writeText(input.value)
    copied.value = true
    setTimeout(() => copied.value = false, 1500)
  } catch { /* clipboard not available */ }
}

watch(theme, async () => {
  destroyEditor()
  await nextTick()
  createEditor()
  syncEditor()
})

onMounted(() => {
  createEditor()
  validate()
})

onBeforeUnmount(() => {
  destroyEditor()
})
</script>

<style>
.json-page .cm-container {
  height: calc(100vh - 260px);
  min-height: 400px;
  border-radius: var(--radius-field, 0.5rem);
  overflow: hidden;
}

.json-page .cm-container .cm-editor {
  height: 100%;
  font-size: 0.875rem;
}

.json-page .cm-container .cm-editor.cm-focused {
  outline: none;
}

:not([data-theme="dark"]) .json-page .cm-container .cm-editor {
  background: var(--color-base-300);
}
:not([data-theme="dark"]) .json-page .cm-container .cm-editor .cm-gutters {
  background: var(--color-base-300);
  border-right: 1px solid var(--color-base-100);
}
:not([data-theme="dark"]) .json-page .cm-container .cm-editor .cm-activeLineGutter {
  background: var(--color-base-200);
}
:not([data-theme="dark"]) .json-page .cm-container .cm-editor .cm-activeLine {
  background: var(--color-base-200);
}

.json-page .json-tree-container {
  height: calc(100vh - 260px);
  min-height: 400px;
  background: var(--color-base-100);
}
</style>
