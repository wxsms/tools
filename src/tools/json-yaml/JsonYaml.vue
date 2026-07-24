<template>
  <div class="json-yaml-page">
    <h1 class="text-3xl font-bold mb-6">
      JSON / YAML 转换
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
        <p
          v-if="error.json"
          class="text-error text-sm mt-1"
        >
          {{ error.json }}
        </p>
      </div>

      <!-- YAML panel -->
      <div class="flex-1 form-control min-w-0">
        <label class="label mb-2">
          <span class="label-text font-semibold">YAML</span>
          <button
            v-if="yamlStr"
            class="btn btn-ghost btn-xs gap-1"
            @click="copyText(yamlStr, 'yamlCopied')"
          >
            <Icon
              v-if="yamlCopied"
              icon="lucide:check"
              class="w-3.5 h-3.5 text-success"
            />
            <Icon
              v-else
              icon="lucide:clipboard"
              class="w-3.5 h-3.5"
            />
            {{ yamlCopied ? '已复制！' : '复制' }}
          </button>
        </label>
        <div
          ref="yamlEditorEl"
          class="cm-container border border-base-300"
        />
        <p
          v-if="error.yaml"
          class="text-error text-sm mt-1"
        >
          {{ error.yaml }}
        </p>
      </div>
    </div>

    <div class="flex justify-end mt-4">
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
import { yaml as yamlLang } from '@codemirror/lang-yaml'
import { oneDark } from '@codemirror/theme-one-dark'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching } from '@codemirror/language'
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete'
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search'
import { useTheme } from '../../composables/useTheme.js'
import { jsonToYaml, yamlToJson } from './json-yaml.js'

const defaultJson = `{
  "name": "工具箱示例",
  "version": "1.0.0",
  "tags": ["json", "yaml"],
  "author": {
    "name": "wxsm",
    "url": "https://example.com"
  },
  "active": true
}`

const jsonStr = ref(defaultJson)
const yamlStr = ref('')
const error = ref({ json: '', yaml: '' })
const jsonCopied = ref(false)
const yamlCopied = ref(false)

const jsonEditorEl = ref(null)
const yamlEditorEl = ref(null)

let jsonEditor = null
let yamlEditor = null
let jsonUpdatingFromYaml = false
let yamlUpdatingFromJson = false

const { theme } = useTheme()

function createExtensions(langExtension, onChange) {
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
    langExtension,
    EditorView.updateListener.of(onChange),
    EditorView.theme({
      '&': { height: '100%' },
      '.cm-scroller': { overflow: 'auto' },
    }),
  ]
}

function jsonOnChange(update) {
  if (jsonUpdatingFromYaml) return
  if (update.docChanged) {
    jsonStr.value = update.state.doc.toString()
    jsonToYamlAndSync()
  }
}

function yamlOnChange(update) {
  if (yamlUpdatingFromJson) return
  if (update.docChanged) {
    yamlStr.value = update.state.doc.toString()
    yamlToJsonAndSync()
  }
}

function jsonToYamlAndSync() {
  error.value.yaml = ''
  if (!jsonStr.value.trim()) {
    setYamlEditor('')
    return
  }
  try {
    const yaml = jsonToYaml(jsonStr.value)
    setYamlEditor(yaml)
  } catch (e) {
    error.value.yaml = 'JSON → YAML 转换失败:' + e.message
  }
}

function yamlToJsonAndSync() {
  error.value.json = ''
  if (!yamlStr.value.trim()) {
    setJsonEditor('')
    return
  }
  try {
    const json = yamlToJson(yamlStr.value)
    setJsonEditor(json)
  } catch (e) {
    error.value.json = 'YAML → JSON 转换失败:' + e.message
  }
}

function setYamlEditor(text) {
  yamlStr.value = text
  if (yamlEditor) {
    yamlUpdatingFromJson = true
    yamlEditor.dispatch({
      changes: { from: 0, to: yamlEditor.state.doc.length, insert: text },
    })
    yamlUpdatingFromJson = false
  }
}

function setJsonEditor(text) {
  jsonStr.value = text
  if (jsonEditor) {
    jsonUpdatingFromYaml = true
    jsonEditor.dispatch({
      changes: { from: 0, to: jsonEditor.state.doc.length, insert: text },
    })
    jsonUpdatingFromYaml = false
  }
}

function clear() {
  jsonStr.value = ''
  yamlStr.value = ''
  error.value = { json: '', yaml: '' }
  if (jsonEditor) {
    jsonEditor.dispatch({
      changes: { from: 0, to: jsonEditor.state.doc.length, insert: '' },
    })
  }
  if (yamlEditor) {
    yamlEditor.dispatch({
      changes: { from: 0, to: yamlEditor.state.doc.length, insert: '' },
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
      yamlCopied.value = true
      setTimeout(() => yamlCopied.value = false, 1500)
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

  if (yamlEditorEl.value) {
    yamlEditor = new EditorView({
      state: EditorState.create({
        doc: yamlStr.value,
        extensions: [...createExtensions(yamlLang(), yamlOnChange), getThemeExt()],
      }),
      parent: yamlEditorEl.value,
    })
  }
}

function destroyEditors() {
  jsonEditor?.destroy()
  jsonEditor = null
  yamlEditor?.destroy()
  yamlEditor = null
}

onMounted(() => {
  jsonToYamlAndSync()
  createEditors()
})

onBeforeUnmount(() => {
  destroyEditors()
})
</script>

<style>
.json-yaml-page .cm-container {
  height: calc(100vh - 260px);
  min-height: 400px;
  border-radius: var(--radius-field, 0.5rem);
  overflow: hidden;
}

.cm-container .cm-editor {
  height: 100%;
  font-size: 0.875rem;
}

.cm-container .cm-editor.cm-focused {
  outline: none;
}

:not([data-theme="dark"]) .cm-container .cm-editor {
  background: var(--color-base-300);
}
:not([data-theme="dark"]) .cm-container .cm-editor .cm-gutters {
  background: var(--color-base-300);
  border-right: 1px solid var(--color-base-100);
}
:not([data-theme="dark"]) .cm-container .cm-editor .cm-activeLineGutter {
  background: var(--color-base-200);
}
:not([data-theme="dark"]) .cm-container .cm-editor .cm-activeLine {
  background: var(--color-base-200);
}
</style>
