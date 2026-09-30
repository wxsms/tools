<template>
  <div
    ref="editorEl"
    class="cm-container border border-base-300"
    :style="{ height }"
  />
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightActiveLine, drawSelection, rectangularSelection, highlightSpecialChars } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching } from '@codemirror/language'
import { oneDark } from '@codemirror/theme-one-dark'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete'
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search'
import { useTheme } from '../../composables/useTheme.js'

const props = defineProps({
  modelValue: { type: String, default: '' },
  // CodeMirror language extension or factory (json()/xml()/...), optional
  language: { type: [Object, Function, Array], default: null },
  height: { type: String, default: '200px' },
})
const emit = defineEmits(['update:modelValue'])
const { theme } = useTheme()

const editorEl = ref(null)
let editor = null

function getThemeExt() {
  return theme.value === 'dark' ? oneDark : []
}

function createExtensions() {
  const lang = typeof props.language === 'function'
    ? props.language()
    : props.language
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
    ...(lang ? (Array.isArray(lang) ? lang : [lang]) : []),
    EditorView.updateListener.of((update) => {
      if (update.docChanged) emit('update:modelValue', update.state.doc.toString())
    }),
    EditorView.theme({
      '&': { height: '100%' },
      '.cm-scroller': { overflow: 'auto' },
      // 空内容时 content 只有一行高,点击下方空白无法聚焦编辑器
      '.cm-content': { minHeight: '100%' },
    }),
  ]
}

function createEditor() {
  if (!editorEl.value) return
  editor = new EditorView({
    state: EditorState.create({
      doc: props.modelValue,
      extensions: [...createExtensions(), getThemeExt()],
    }),
    parent: editorEl.value,
  })
}

function destroyEditor() {
  editor?.destroy()
  editor = null
}

onMounted(() => createEditor())
onBeforeUnmount(() => destroyEditor())

// 主题或语言变化时重建编辑器(同 Json.vue 模式)
watch([theme, () => props.language], async () => {
  const doc = editor?.state.doc.toString() ?? props.modelValue
  destroyEditor()
  await nextTick()
  if (editorEl.value) {
    editor = new EditorView({
      state: EditorState.create({
        doc,
        extensions: [...createExtensions(), getThemeExt()],
      }),
      parent: editorEl.value,
    })
  }
})
</script>

<style scoped>
/* 以下样式照搬 Json.vue 的 .cm-container 系列 */
.cm-container {
  border-radius: var(--radius-field, 0.5rem);
  overflow: hidden;
}

.cm-container :deep(.cm-editor) {
  height: 100%;
  font-size: 0.875rem;
}

.cm-container :deep(.cm-editor.cm-focused) {
  outline: none;
}

:not([data-theme='dark']) .cm-container :deep(.cm-editor) {
  background: var(--color-base-300);
}

:not([data-theme='dark']) .cm-container :deep(.cm-editor .cm-gutters) {
  background: var(--color-base-300);
  border-right: 1px solid var(--color-base-100);
}

:not([data-theme='dark']) .cm-container :deep(.cm-editor .cm-activeLineGutter) {
  background: var(--color-base-200);
}

:not([data-theme='dark']) .cm-container :deep(.cm-editor .cm-activeLine) {
  background: var(--color-base-200);
}
</style>
