<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">
      Markdown / HTML 转换
    </h1>

    <div class="flex gap-4">
      <!-- Markdown panel -->
      <div class="flex-1 form-control min-w-0">
        <label class="label mb-2">
          <span class="label-text font-semibold">Markdown</span>
          <button
            v-if="md"
            class="btn btn-ghost btn-xs gap-1"
            @click="copyText(md, 'mdCopied')"
          >
            <CheckIcon
              v-if="mdCopied"
              class="w-3.5 h-3.5 text-success"
            />
            <ClipboardDocumentIcon
              v-else
              class="w-3.5 h-3.5"
            />
            {{ mdCopied ? '已复制！' : '复制' }}
          </button>
        </label>
        <div
          ref="mdEditorEl"
          class="cm-container border border-base-300"
        />
      </div>

      <!-- HTML panel -->
      <div class="flex-1 form-control min-w-0">
        <label class="label mb-2">
          <span class="label-text font-semibold">HTML</span>
          <div class="flex items-center gap-2">
            <div class="join">
              <button
                :class="['join-item btn btn-xs', htmlMode === 'source' ? 'btn-primary' : 'btn-ghost']"
                @click="htmlMode = 'source'"
              >
                源码
              </button>
              <button
                :class="['join-item btn btn-xs', htmlMode === 'preview' ? 'btn-primary' : 'btn-ghost']"
                @click="htmlMode = 'preview'"
              >
                预览
              </button>
            </div>
            <button
              v-if="htmlRef && htmlMode === 'source'"
              class="btn btn-ghost btn-xs gap-1"
              @click="copyText(htmlRef, 'htmlCopied')"
            >
              <CheckIcon
                v-if="htmlCopied"
                class="w-3.5 h-3.5 text-success"
              />
              <ClipboardDocumentIcon
                v-else
                class="w-3.5 h-3.5"
              />
              {{ htmlCopied ? '已复制！' : '复制' }}
            </button>
          </div>
        </label>

        <!-- 源码 mode: CodeMirror editor -->
        <div
          v-if="htmlMode === 'source'"
          ref="htmlEditorEl"
          class="cm-container border border-base-300"
        />

        <!-- 预览 mode: rendered HTML -->
        <div
          v-else
          class="overflow-auto rounded-btn border border-base-300 bg-base-100 p-4 md-preview"
          style="height: calc(100vh - 260px); min-height: 400px;"
        >
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div v-html="htmlRef" />
        </div>

        <p
          v-if="error"
          class="text-error text-sm mt-1"
        >
          {{ error }}
        </p>
      </div>
    </div>

    <div class="flex justify-end mt-4">
      <button
        class="btn btn-ghost btn-sm gap-1"
        @click="clear"
      >
        <TrashIcon class="w-4 h-4" />
        清空
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightActiveLine, drawSelection, rectangularSelection, highlightSpecialChars } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { markdown } from '@codemirror/lang-markdown'
import { html as htmlLang } from '@codemirror/lang-html'
import { oneDark } from '@codemirror/theme-one-dark'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching } from '@codemirror/language'
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete'
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search'
import { marked } from 'marked'
import { useTheme } from '../../composables/useTheme.js'
import { ClipboardDocumentIcon, CheckIcon, TrashIcon } from '@heroicons/vue/24/outline'
import { htmlToMarkdown } from './md-html.js'

const defaultMd = `# 你好世界

这是一个 **Markdown** 示例，包含各种元素：

## 功能特性

- 无序列表项 1
- 无序列表项 2
  - 嵌套项

1. 有序列表项
2. 另一个列表项

> 一段引用示例

\`\`\`js
const greeting = "Hello!";
console.log(greeting);
\`\`\`

行内 \`代码\` 和一个[链接](https://example.com)。

| 列 A | 列 B |
|------|------|
| 单元格 1 | 单元格 2 |
| 单元格 3 | 单元格 4 |

---

*斜体文本* 和 ~~删除线~~。`

const md = ref(defaultMd)
const htmlRef = ref('')
const error = ref('')
const htmlMode = ref('source')
const mdCopied = ref(false)
const htmlCopied = ref(false)

const mdEditorEl = ref(null)
const htmlEditorEl = ref(null)

let mdEditor = null
let htmlEditor = null
let mdUpdatingFromHtml = false
let htmlUpdatingFromMd = false

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

function mdOnChange(update) {
  if (mdUpdatingFromHtml) return
  if (update.docChanged) {
    md.value = update.state.doc.toString()
    mdToHtml()
  }
}

function htmlOnChange(update) {
  if (htmlUpdatingFromMd) return
  if (update.docChanged) {
    htmlRef.value = update.state.doc.toString()
    htmlToMd()
  }
}

function mdToHtml() {
  error.value = ''
  if (!md.value) {
    htmlRef.value = ''
    if (htmlEditor) {
      htmlUpdatingFromMd = true
      htmlEditor.dispatch({
        changes: { from: 0, to: htmlEditor.state.doc.length, insert: '' },
      })
      htmlUpdatingFromMd = false
    }
    return
  }
  try {
    const result = marked.parse(md.value)
    htmlRef.value = result
    if (htmlEditor) {
      htmlUpdatingFromMd = true
      htmlEditor.dispatch({
        changes: { from: 0, to: htmlEditor.state.doc.length, insert: result },
      })
      htmlUpdatingFromMd = false
    }
  } catch (e) {
    error.value = 'Markdown → HTML 转换失败：' + e.message
  }
}

function htmlToMd() {
  error.value = ''
  if (!htmlRef.value) {
    md.value = ''
    if (mdEditor) {
      mdUpdatingFromHtml = true
      mdEditor.dispatch({
        changes: { from: 0, to: mdEditor.state.doc.length, insert: '' },
      })
      mdUpdatingFromHtml = false
    }
    return
  }
  try {
    const result = htmlToMarkdown(htmlRef.value)
    md.value = result
    if (mdEditor) {
      mdUpdatingFromHtml = true
      mdEditor.dispatch({
        changes: { from: 0, to: mdEditor.state.doc.length, insert: result },
      })
      mdUpdatingFromHtml = false
    }
  } catch (e) {
    error.value = 'HTML → Markdown 转换失败：' + e.message
  }
}

function clear() {
  md.value = ''
  htmlRef.value = ''
  error.value = ''
  if (mdEditor) {
    mdEditor.dispatch({
      changes: { from: 0, to: mdEditor.state.doc.length, insert: '' },
    })
  }
  if (htmlEditor) {
    htmlEditor.dispatch({
      changes: { from: 0, to: htmlEditor.state.doc.length, insert: '' },
    })
  }
}

async function copyText(text, flag) {
  try {
    await navigator.clipboard.writeText(text)
    if (flag === 'mdCopied') {
      mdCopied.value = true
      setTimeout(() => mdCopied.value = false, 1500)
    } else {
      htmlCopied.value = true
      setTimeout(() => htmlCopied.value = false, 1500)
    }
  } catch { /* clipboard not available */ }
}

function getThemeExt() {
  return theme.value === 'dark' ? oneDark : []
}

// Watch for theme changes
watch(theme, () => {
  // Rebuild editors on theme change for simplicity
  destroyEditors()
  createEditors()
})

function createEditors() {
  if (mdEditorEl.value) {
    mdEditor = new EditorView({
      state: EditorState.create({
        doc: md.value,
        extensions: [...createExtensions(markdown(), mdOnChange), getThemeExt()],
      }),
      parent: mdEditorEl.value,
    })
  }

  if (htmlEditorEl.value) {
    htmlEditor = new EditorView({
      state: EditorState.create({
        doc: htmlRef.value,
        extensions: [...createExtensions(htmlLang(), htmlOnChange), getThemeExt()],
      }),
      parent: htmlEditorEl.value,
    })
  }
}

function destroyEditors() {
  mdEditor?.destroy()
  mdEditor = null
  htmlEditor?.destroy()
  htmlEditor = null
}

// Re-create HTML editor when toggling back to source mode
watch(htmlMode, async (mode) => {
  if (mode === 'preview') {
    htmlEditor?.destroy()
    htmlEditor = null
  } else {
    await nextTick()
    if (htmlEditorEl.value && !htmlEditor) {
      htmlEditor = new EditorView({
        state: EditorState.create({
          doc: htmlRef.value,
          extensions: [...createExtensions(htmlLang(), htmlOnChange), getThemeExt()],
        }),
        parent: htmlEditorEl.value,
      })
    }
  }
})

onMounted(() => {
  // Initialize HTML from default markdown
  mdToHtml()
  createEditors()
})

onBeforeUnmount(() => {
  destroyEditors()
})
</script>

<style>
.cm-container {
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

/* Light mode: slightly deeper background than page */
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

/* Markdown preview styles */
.md-preview h1 { font-size: 1.75rem; font-weight: 700; margin: 1rem 0 0.5rem; }
.md-preview h2 { font-size: 1.5rem; font-weight: 700; margin: 1rem 0 0.5rem; border-bottom: 1px solid oklch(var(--b3)); padding-bottom: 0.3rem; }
.md-preview h3 { font-size: 1.25rem; font-weight: 600; margin: 0.8rem 0 0.4rem; }
.md-preview h4 { font-size: 1.1rem; font-weight: 600; margin: 0.6rem 0 0.3rem; }
.md-preview p { margin: 0.5rem 0; line-height: 1.6; }
.md-preview ul,
.md-preview ol { padding-left: 1.5rem; margin: 0.5rem 0; }
.md-preview li { margin: 0.2rem 0; }
.md-preview blockquote { border-left: 3px solid oklch(var(--p)); padding: 0.5rem 1rem; margin: 0.5rem 0; background: oklch(var(--b2)); border-radius: 0.25rem; }
.md-preview code { background: oklch(var(--b2)); padding: 0.15rem 0.4rem; border-radius: 0.25rem; font-size: 0.875rem; }
.md-preview pre { background: oklch(var(--b2)); padding: 1rem; border-radius: 0.5rem; overflow-x: auto; margin: 0.5rem 0; }
.md-preview pre code { background: transparent; padding: 0; }
.md-preview a { color: oklch(var(--p)); text-decoration: underline; }
.md-preview img { max-width: 100%; }
.md-preview table { border-collapse: collapse; width: 100%; margin: 0.5rem 0; }
.md-preview th,
.md-preview td { border: 1px solid oklch(var(--bc) / 0.2); padding: 0.4rem 0.8rem; }
.md-preview th { background: oklch(var(--b2)); font-weight: 600; }
.md-preview hr { border: none; border-top: 1px solid oklch(var(--bc) / 0.2); margin: 1rem 0; }
.md-preview strong { font-weight: 700; }
</style>
