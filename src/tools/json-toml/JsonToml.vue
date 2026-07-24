<template>
  <div class="json-toml-page">
    <h1 class="text-3xl font-bold mb-6">
      JSON / TOML 转换
    </h1>

    <div class="flex gap-4">
      <!-- JSON panel -->
      <div class="flex-1 form-control min-w-0">
        <label class="label mb-2">
          <span class="label-text font-semibold">JSON</span>
          <button
            v-if="jsonStr"
            class="btn btn-ghost btn-xs gap-1"
            @click="copyText(jsonStr, 'jsonCopied')"
          >
            <Icon
              v-if="jsonCopied"
              icon="lucide:check"
              class="w-3.5 h-3.5 text-success"
            />
            <Icon
              v-else
              icon="lucide:clipboard"
              class="w-3.5 h-3.5"
            />
            {{ jsonCopied ? '已复制！' : '复制' }}
          </button>
        </label>
        <div
          ref="jsonEditorEl"
          class="cm-container border border-base-300"
        />
      </div>

      <!-- TOML panel -->
      <div class="flex-1 form-control min-w-0">
        <label class="label mb-2">
          <span class="label-text font-semibold">TOML</span>
          <button
            v-if="tomlStr"
            class="btn btn-ghost btn-xs gap-1"
            @click="copyText(tomlStr, 'tomlCopied')"
          >
            <Icon
              v-if="tomlCopied"
              icon="lucide:check"
              class="w-3.5 h-3.5 text-success"
            />
            <Icon
              v-else
              icon="lucide:clipboard"
              class="w-3.5 h-3.5"
            />
            {{ tomlCopied ? '已复制！' : '复制' }}
          </button>
        </label>
        <div
          ref="tomlEditorEl"
          class="cm-container border border-base-300"
        />
      </div>
    </div>

    <div class="flex items-center justify-between mt-4 gap-4">
      <p
        v-if="error.json || error.toml"
        class="text-error text-sm flex-1 min-w-0 truncate"
      >
        {{ error.json || error.toml }}
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
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightActiveLine, drawSelection, rectangularSelection, highlightSpecialChars } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { json as jsonLang } from '@codemirror/lang-json'
import { oneDark } from '@codemirror/theme-one-dark'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching } from '@codemirror/language'
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete'
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search'
import { useTheme } from '../../composables/useTheme.js'
import { jsonToToml, tomlToJson } from './json-toml.js'

const defaultJson = `{
  "name": "工具箱示例",
  "version": "1.0.0",
  "tags": ["json", "toml"],
  "author": {
    "name": "wxsm",
    "url": "https://example.com"
  },
  "active": true
}`

const jsonStr = ref(defaultJson)
const tomlStr = ref('')
const error = ref({ json: '', toml: '' })
const jsonCopied = ref(false)
const tomlCopied = ref(false)

const jsonEditorEl = ref(null)
const tomlEditorEl = ref(null)

let jsonEditor = null
let tomlEditor = null
let jsonUpdatingFromToml = false
let tomlUpdatingFromJson = false

const { theme } = useTheme()

function createExtensions(langExtension, onChange) {
  const exts = [
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
    EditorView.updateListener.of(onChange),
    EditorView.theme({
      '&': { height: '100%' },
      '.cm-scroller': { overflow: 'auto' },
    }),
  ]
  if (langExtension) exts.push(langExtension)
  return exts
}

function jsonOnChange(update) {
  if (jsonUpdatingFromToml) return
  if (update.docChanged) {
    jsonStr.value = update.state.doc.toString()
    jsonToTomlAndSync()
  }
}

function tomlOnChange(update) {
  if (tomlUpdatingFromJson) return
  if (update.docChanged) {
    tomlStr.value = update.state.doc.toString()
    tomlToJsonAndSync()
  }
}

function jsonToTomlAndSync() {
  error.value.toml = ''
  if (!jsonStr.value.trim()) {
    setTomlEditor('')
    return
  }
  try {
    const toml = jsonToToml(jsonStr.value)
    setTomlEditor(toml)
  } catch (e) {
    error.value.toml = 'JSON → TOML 转换失败:' + e.message
  }
}

function tomlToJsonAndSync() {
  error.value.json = ''
  if (!tomlStr.value.trim()) {
    setJsonEditor('')
    return
  }
  try {
    const json = tomlToJson(tomlStr.value)
    setJsonEditor(json)
  } catch (e) {
    error.value.json = 'TOML → JSON 转换失败:' + e.message
  }
}

function setTomlEditor(text) {
  tomlStr.value = text
  if (tomlEditor) {
    tomlUpdatingFromJson = true
    tomlEditor.dispatch({
      changes: { from: 0, to: tomlEditor.state.doc.length, insert: text },
    })
    tomlUpdatingFromJson = false
  }
}

function setJsonEditor(text) {
  jsonStr.value = text
  if (jsonEditor) {
    jsonUpdatingFromToml = true
    jsonEditor.dispatch({
      changes: { from: 0, to: jsonEditor.state.doc.length, insert: text },
    })
    jsonUpdatingFromToml = false
  }
}

function clear() {
  jsonStr.value = ''
  tomlStr.value = ''
  error.value = { json: '', toml: '' }
  if (jsonEditor) {
    jsonEditor.dispatch({
      changes: { from: 0, to: jsonEditor.state.doc.length, insert: '' },
    })
  }
  if (tomlEditor) {
    tomlEditor.dispatch({
      changes: { from: 0, to: tomlEditor.state.doc.length, insert: '' },
    })
  }
}

async function copyText(text, flag) {
  try {
    await navigator.clipboard.writeText(text)
    if (flag === 'jsonCopied') {
      jsonCopied.value = true
      setTimeout(() => jsonCopied.value = false, 1500)
    } else {
      tomlCopied.value = true
      setTimeout(() => tomlCopied.value = false, 1500)
    }
  } catch { /* clipboard not available */ }
}

function getThemeExt() {
  return theme.value === 'dark' ? oneDark : []
}

watch(theme, () => {
  destroyEditors()
  createEditors()
})

function createEditors() {
  if (jsonEditorEl.value) {
    jsonEditor = new EditorView({
      state: EditorState.create({
        doc: jsonStr.value,
        extensions: [...createExtensions(jsonLang(), jsonOnChange), getThemeExt()],
      }),
      parent: jsonEditorEl.value,
    })
  }

  if (tomlEditorEl.value) {
    // No official CodeMirror TOML language pack — TOML side has no syntax highlighting.
    tomlEditor = new EditorView({
      state: EditorState.create({
        doc: tomlStr.value,
        extensions: [...createExtensions(null, tomlOnChange), getThemeExt()],
      }),
      parent: tomlEditorEl.value,
    })
  }
}

function destroyEditors() {
  jsonEditor?.destroy()
  jsonEditor = null
  tomlEditor?.destroy()
  tomlEditor = null
}

onMounted(() => {
  jsonToTomlAndSync()
  createEditors()
})

onBeforeUnmount(() => {
  destroyEditors()
})
</script>

<style>
.json-toml-page .cm-container {
  height: calc(100vh - 260px);
  min-height: 400px;
  border-radius: var(--radius-field, 0.5rem);
  overflow: hidden;
}

.json-toml-page .cm-container .cm-editor {
  height: 100%;
  font-size: 0.875rem;
}

.json-toml-page .cm-container .cm-editor.cm-focused {
  outline: none;
}

:not([data-theme="dark"]) .json-toml-page .cm-container .cm-editor {
  background: var(--color-base-300);
}
:not([data-theme="dark"]) .json-toml-page .cm-container .cm-editor .cm-gutters {
  background: var(--color-base-300);
  border-right: 1px solid var(--color-base-100);
}
:not([data-theme="dark"]) .json-toml-page .cm-container .cm-editor .cm-activeLineGutter {
  background: var(--color-base-200);
}
:not([data-theme="dark"]) .json-toml-page .cm-container .cm-editor .cm-activeLine {
  background: var(--color-base-200);
}
</style>
