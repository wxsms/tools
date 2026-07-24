<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">
      代码截图
    </h1>

    <div class="flex flex-col gap-4 max-w-2xl">
      <!-- Row 1: Language + Theme -->
      <div class="grid grid-cols-2 gap-4">
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">语言</span></label>
          <select
            v-model="language"
            class="select select-bordered w-full"
            @change="rebuildEditor"
          >
            <option
              v-for="lang in languages"
              :key="lang.value"
              :value="lang.value"
            >
              {{ lang.label }}
            </option>
          </select>
        </div>

        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">主题</span></label>
          <select
            v-model="cmTheme"
            class="select select-bordered w-full"
            @change="onThemeChange"
          >
            <option
              v-for="t in themes"
              :key="t.value"
              :value="t.value"
            >
              {{ t.label }}
            </option>
          </select>
        </div>
      </div>

      <!-- Row 2: Font + Export -->
      <div class="grid grid-cols-2 gap-4">
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">字体</span></label>
          <select
            v-model="fontFamily"
            class="select select-bordered w-full"
            @change="rebuildEditor"
          >
            <option
              v-for="f in fontOptions"
              :key="f.value"
              :value="f.value"
            >
              {{ f.label }}
            </option>
          </select>
        </div>

        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">导出</span></label>
          <button
            class="btn btn-primary gap-1 w-full"
            :disabled="!code"
            @click="exportImage"
          >
            <Icon
              icon="lucide:download"
              class="w-4 h-4"
            />
            导出 PNG
          </button>
        </div>
      </div>

      <!-- Advanced options (collapsible) -->
      <div class="collapse collapse-arrow bg-base-200">
        <input
          v-model="showAdvanced"
          type="checkbox"
        >
        <div class="collapse-title text-sm font-semibold py-2 min-h-0">
          高级选项
        </div>
        <div class="collapse-content">
          <div class="flex flex-col gap-4 pt-2">
            <!-- Preview width -->
            <div class="form-control">
              <label class="label"><span class="label-text font-semibold">宽度</span></label>
              <div class="flex gap-2">
                <button
                  v-for="w in widthOptions"
                  :key="w.value"
                  class="btn btn-sm"
                  :class="previewWidth === w.value ? 'btn-primary' : 'btn-outline'"
                  @click="previewWidth = w.value"
                >
                  {{ w.label }}
                </button>
              </div>
            </div>

            <!-- Font size -->
            <div class="form-control">
              <label class="label"><span class="label-text font-semibold">字号</span></label>
              <div class="flex items-center gap-2">
                <input
                  v-model.number="fontSize"
                  type="range"
                  min="12"
                  max="24"
                  step="1"
                  class="range range-sm flex-1"
                >
                <span class="text-sm w-10 text-right">{{ fontSize }}px</span>
              </div>
            </div>

            <!-- Padding -->
            <div class="form-control">
              <label class="label"><span class="label-text font-semibold">内边距</span></label>
              <div class="flex items-center gap-2">
                <input
                  v-model.number="padding"
                  type="range"
                  min="16"
                  max="80"
                  step="4"
                  class="range range-sm flex-1"
                >
                <span class="text-sm w-10 text-right">{{ padding }}px</span>
              </div>
            </div>

            <!-- Background -->
            <div class="form-control">
              <label class="label"><span class="label-text font-semibold">背景色</span></label>
              <div class="flex items-center gap-2">
                <input
                  v-model="bgColor"
                  type="color"
                  class="input input-bordered input-sm w-10 h-8 p-0.5 cursor-pointer"
                >
                <input
                  v-model="bgColor"
                  type="text"
                  class="input input-bordered w-full font-mono text-sm"
                >
              </div>
            </div>

            <!-- Line numbers -->
            <div class="form-control">
              <label class="label cursor-pointer justify-start gap-2">
                <input
                  v-model="showLineNumbers"
                  type="checkbox"
                  class="checkbox checkbox-sm checkbox-primary"
                  @change="rebuildEditor"
                >
                <span class="label-text font-semibold">行号</span>
              </label>
            </div>

            <!-- Window dots -->
            <div class="form-control">
              <label class="label cursor-pointer justify-start gap-2">
                <input
                  v-model="showWindowDots"
                  type="checkbox"
                  class="checkbox checkbox-sm checkbox-primary"
                >
                <span class="label-text font-semibold">窗口按钮</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Preview area (WYSIWYG) -->
    <div
      ref="previewEl"
      class="rounded-lg overflow-auto"
      :style="previewContainerStyle"
    >
      <!-- macOS window dots -->
      <div
        v-if="showWindowDots"
        class="flex gap-2 mb-3"
      >
        <span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:#ff5f57" />
        <span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:#febc2e" />
        <span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:#28c840" />
      </div>
      <!-- CodeMirror editor -->
      <div ref="editorEl" />
    </div>
  </div>
</template>

<script setup>
import { Icon } from '@iconify/vue'
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { toPng } from 'html-to-image'
import { EditorView } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { javascript } from '@codemirror/lang-javascript'
import { html as htmlLang } from '@codemirror/lang-html'
import { css as cssLang } from '@codemirror/lang-css'
import { markdown } from '@codemirror/lang-markdown'
import { xml } from '@codemirror/lang-xml'
import { json as jsonLang } from '@codemirror/lang-json'
import { python } from '@codemirror/lang-python'
import { java } from '@codemirror/lang-java'
import { cpp } from '@codemirror/lang-cpp'
import { php } from '@codemirror/lang-php'
import { rust } from '@codemirror/lang-rust'
import { sql } from '@codemirror/lang-sql'
import { syntaxHighlighting, defaultHighlightStyle, indentUnit } from '@codemirror/language'
import { oneDark } from '@codemirror/theme-one-dark'
import { lineNumbers as lineNumbersExt, keymap, highlightActiveLineGutter, highlightActiveLine, drawSelection, rectangularSelection, highlightSpecialChars } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { bracketMatching } from '@codemirror/language'
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete'
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search'

const defaultCode = `function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

// Print first 10 Fibonacci numbers
for (let i = 0; i < 10; i++) {
  console.log(fibonacci(i));
}`

const code = ref(defaultCode)
const language = ref('javascript')
const cmTheme = ref('one-dark')
const fontFamily = ref('Consolas, monospace')
const bgColor = ref('#1e1e2e')
const padding = ref(32)
const fontSize = ref(14)
const showLineNumbers = ref(true)
const showWindowDots = ref(true)
const previewWidth = ref('md')
const showAdvanced = ref(false)

const previewEl = ref(null)
const editorEl = ref(null)

let editor = null

const themeDefaultBg = {
  'one-dark': '#1e1e2e',
  'solarized-dark': '#002b36',
  'dracula': '#282a36',
  'nord': '#2e3440',
  'monokai': '#272822',
  'classic-light': '#fafafa',
  'solarized-light': '#fdf6e3',
  'github-light': '#ffffff',
}

const widthOptions = [
  { value: 'sm', label: '窄' },
  { value: 'md', label: '中' },
  { value: 'lg', label: '宽' },
]

const widthMap = { sm: '480px', md: '680px', lg: '920px' }

const fontOptions = [
  { value: 'Consolas, monospace', label: 'Consolas' },
  { value: '"Cascadia Code", Consolas, monospace', label: 'Cascadia Code' },
  { value: '"Courier New", monospace', label: 'Courier New' },
  { value: 'monospace', label: 'Monospace (系统)' },
  { value: '"JetBrains Mono", Consolas, monospace', label: 'JetBrains Mono' },
  { value: '"Fira Code", Consolas, monospace', label: 'Fira Code' },
  { value: '"Source Code Pro", Consolas, monospace', label: 'Source Code Pro' },
  { value: '"IBM Plex Mono", Consolas, monospace', label: 'IBM Plex Mono' },
]

const languages = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'jsx', label: 'JSX' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'json', label: 'JSON' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'xml', label: 'XML' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C / C++' },
  { value: 'csharp', label: 'C#' },
  { value: 'php', label: 'PHP' },
  { value: 'rust', label: 'Rust' },
  { value: 'sql', label: 'SQL' },
  { value: 'plain', label: '纯文本' },
]

const themes = [
  { value: 'one-dark', label: 'One Dark' },
  { value: 'solarized-dark', label: 'Solarized Dark' },
  { value: 'dracula', label: 'Dracula' },
  { value: 'nord', label: 'Nord' },
  { value: 'monokai', label: 'Monokai' },
  { value: 'classic-light', label: 'Classic Light' },
  { value: 'solarized-light', label: 'Solarized Light' },
  { value: 'github-light', label: 'GitHub Light' },
]

const langExtensions = {
  javascript: () => javascript(),
  typescript: () => javascript({ typescript: true }),
  jsx: () => javascript({ jsx: true }),
  html: () => htmlLang(),
  css: () => cssLang(),
  json: () => jsonLang(),
  markdown: () => markdown(),
  xml: () => xml(),
  python: () => python(),
  java: () => java(),
  cpp: () => cpp(),
  csharp: () => cpp(),
  php: () => php(),
  rust: () => rust(),
  sql: () => sql(),
  plain: () => [],
}

function makeTheme(opts) {
  return [
    EditorView.theme({
      '&': { backgroundColor: 'transparent', color: opts.fg },
      '.cm-content': { caretColor: opts.fg },
      '.cm-cursor': { borderLeftColor: opts.fg },
      '.cm-gutters': { backgroundColor: 'transparent', color: opts.gutterFg || opts.fg + '80', border: 'none' },
      '.cm-activeLineGutter': { backgroundColor: opts.activeLine || 'transparent' },
      '.cm-activeLine': { backgroundColor: opts.activeLine || 'transparent' },
      '.cm-selectionBackground': { backgroundColor: opts.selection || opts.fg + '30' },
    }),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
  ]
}

const customThemes = {
  'solarized-dark': () => makeTheme({
    fg: '#839496', selection: '#073642', gutterFg: '#586e75', activeLine: '#07364240',
  }),
  'dracula': () => makeTheme({
    fg: '#f8f8f2', selection: '#44475a', gutterFg: '#6272a4', activeLine: '#44475a30',
  }),
  'nord': () => makeTheme({
    fg: '#d8dee9', selection: '#434c5e', gutterFg: '#4c566a', activeLine: '#3b425230',
  }),
  'monokai': () => makeTheme({
    fg: '#f8f8f2', selection: '#49483e', gutterFg: '#75715e', activeLine: '#3e3d3230',
  }),
  'classic-light': () => makeTheme({
    fg: '#383a42', selection: '#add6ff80', gutterFg: '#a0a1a7', activeLine: '#f0f0f0',
  }),
  'solarized-light': () => makeTheme({
    fg: '#657b83', selection: '#eee8d5', gutterFg: '#93a1a1', activeLine: '#eee8d580',
  }),
  'github-light': () => makeTheme({
    fg: '#24292e', selection: '#0366d620', gutterFg: '#959da5', activeLine: '#f6f8fa',
  }),
}

const previewContainerStyle = computed(() => ({
  backgroundColor: bgColor.value,
  padding: padding.value + 'px',
  maxWidth: widthMap[previewWidth.value],
}))

function getThemeExt() {
  if (cmTheme.value === 'one-dark') {
    // oneDark sets its own bg, we need to override to transparent
    return [
      oneDark,
      EditorView.theme({
        '&': { backgroundColor: 'transparent !important' },
        '.cm-gutters': { backgroundColor: 'transparent !important' },
        '.cm-activeLineGutter': { backgroundColor: 'transparent !important' },
        '.cm-activeLine': { backgroundColor: 'transparent !important' },
      }),
    ]
  }
  return customThemes[cmTheme.value]?.() ?? []
}

function createEditor() {
  if (!editorEl.value) return
  const langExt = langExtensions[language.value]?.() ?? []
  const extensions = [
    lineNumbersExt(),
    highlightActiveLineGutter(),
    highlightSpecialChars(),
    history(),
    drawSelection(),
    EditorState.allowMultipleSelections.of(true),
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
    indentUnit.of('  '),
    ...(Array.isArray(langExt) ? langExt : [langExt]),
    ...getThemeExt(),
    EditorView.theme({
      '&': { fontSize: fontSize.value + 'px' },
      '.cm-content': { fontFamily: fontFamily.value },
      '.cm-gutters': { fontFamily: fontFamily.value },
      '.cm-scroller': { overflow: 'hidden' },
    }),
    EditorView.updateListener.of(update => {
      if (update.docChanged) {
        code.value = update.state.doc.toString()
      }
    }),
  ]
  if (!showLineNumbers.value) {
    extensions.push(EditorView.theme({
      '.cm-gutters': { display: 'none' },
    }))
  }

  editor = new EditorView({
    state: EditorState.create({ doc: code.value, extensions }),
    parent: editorEl.value,
  })
}

function destroyEditor() {
  editor?.destroy()
  editor = null
}

function rebuildEditor() {
  destroyEditor()
  createEditor()
}

function onThemeChange() {
  bgColor.value = themeDefaultBg[cmTheme.value] || '#1e1e2e'
  rebuildEditor()
}

watch(fontSize, () => rebuildEditor())

async function exportImage() {
  if (!previewEl.value) return
  try {
    const dataUrl = await toPng(previewEl.value, {
      pixelRatio: 2,
      backgroundColor: bgColor.value,
    })
    const link = document.createElement('a')
    link.download = 'code-screenshot.png'
    link.href = dataUrl
    link.click()
  } catch (e) {
    console.error('Export failed:', e)
  }
}

onMounted(() => {
  createEditor()
})

onBeforeUnmount(() => {
  destroyEditor()
})
</script>

<style scoped>
:deep(.cm-editor) {
  line-height: 1.6 !important;
  background: transparent !important;
}

:deep(.cm-editor.cm-focused) {
  outline: none;
}

:deep(.cm-scroller) {
  overflow: hidden !important;
}

:deep(.cm-content) {
  white-space: pre-wrap !important;
  word-break: break-all;
}
</style>
