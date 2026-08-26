<template>
  <div
    ref="container"
    class="cm-host"
    :class="{ bordered: props.bordered, 'fill-height': props.fillHeight }"
  />
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { EditorView } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language'
import { oneDark } from '@codemirror/theme-one-dark'
import { useTheme } from '../composables/useTheme.js'

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  readOnly: { type: Boolean, default: false },
  minHeight: { type: String, default: '120px' },
  bordered: { type: Boolean, default: true },
  fillHeight: { type: Boolean, default: false },
  // A CodeMirror language extension (Extension or Extension[]). When omitted,
  // the editor is plain text with default highlighting only.
  language: { type: [Object, Array], default: null },
})

const emit = defineEmits(['update:modelValue', 'input'])
const { theme } = useTheme()

const container = ref(null)
let editor = null
// Guard: when we programmatically dispatch a doc replacement, ignore the
// resulting updateListener callback so we don't echo back into the parent.
let applyingExternal = false

function buildExtensions() {
  const exts = [
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    EditorView.theme({
      '&': {
        backgroundColor: 'transparent',
        fontSize: '13px',
        minHeight: props.minHeight,
        ...(props.fillHeight ? { height: '100%' } : {}),
      },
      '.cm-content': {
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
        caretColor: 'currentColor',
      },
      '.cm-cursor': { borderLeftColor: 'currentColor' },
      '.cm-gutters': { backgroundColor: 'transparent', border: 'none', color: 'currentColor', opacity: 0.4 },
      '.cm-activeLineGutter': { backgroundColor: 'transparent' },
      '.cm-activeLine': { backgroundColor: 'color-mix(in srgb, currentColor 5%, transparent)' },
      '.cm-selectionBackground': { backgroundColor: 'color-mix(in srgb, currentColor 20%, transparent)' },
      '&.cm-focused': { outline: 'none' },
      '.cm-scroller': { overflow: 'auto' },
    }),
    EditorView.lineWrapping,
    EditorView.updateListener.of(update => {
      if (update.docChanged && !applyingExternal) {
        const next = update.state.doc.toString()
        emit('update:modelValue', next)
        emit('input', next)
      }
    }),
  ]
  if (props.readOnly) {
    exts.push(EditorState.readOnly.of(true))
  }
  if (props.language) {
    const lang = Array.isArray(props.language) ? props.language : [props.language]
    exts.push(...lang)
  }
  // oneDark provides syntax token colors tuned for dark backgrounds. In light
  // mode we omit it and rely on defaultHighlightStyle (which uses dark ink on
  // light bg). oneDark also sets a dark editor background, which we override
  // to transparent so the page theme shows through.
  if (theme.value === 'dark') {
    exts.push(oneDark)
    exts.push(EditorView.theme({
      '&': { backgroundColor: 'transparent' },
      '.cm-gutters': { backgroundColor: 'transparent' },
    }))
  }
  return exts
}

function createEditor() {
  if (!container.value) return
  editor = new EditorView({
    state: EditorState.create({
      doc: props.modelValue || '',
      extensions: buildExtensions(),
    }),
    parent: container.value,
  })
}

function destroyEditor() {
  editor?.destroy()
  editor = null
}

onMounted(() => createEditor())
onBeforeUnmount(() => destroyEditor())

// When the parent pushes a new modelValue (e.g. from the other editor's
// conversion), sync it into the doc without emitting back.
watch(() => props.modelValue, next => {
  if (!editor) return
  const current = editor.state.doc.toString()
  if (next === current) return
  applyingExternal = true
  editor.dispatch({
    changes: { from: 0, to: editor.state.doc.length, insert: next || '' },
  })
  applyingExternal = false
})

// Rebuild editor when theme switches so token colors match the new mode.
watch(theme, async () => {
  const doc = editor?.state.doc.toString() ?? props.modelValue
  destroyEditor()
  await nextTick()
  if (container.value) {
    editor = new EditorView({
      state: EditorState.create({
        doc: doc || '',
        extensions: buildExtensions(),
      }),
      parent: container.value,
    })
  }
})
</script>

<style scoped>
.cm-host {
  width: 100%;
}

.cm-host.fill-height {
  height: 100%;
}

:deep(.cm-editor) {
  border-radius: 0.5rem;
  padding: 0.25rem 0;
}

.bordered :deep(.cm-editor) {
  border: 1px solid color-mix(in srgb, currentColor 15%, transparent);
}

:deep(.cm-content) {
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
