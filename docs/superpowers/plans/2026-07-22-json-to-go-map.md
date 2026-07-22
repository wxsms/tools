# JSON → Go Map 工具 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 wxsm's Kit 中新增一个 JSON → Go `map[string]interface{}` 字面量转换工具，用户粘贴 JSON 即可实时得到可粘贴的 Go 表达式，支持 `any` vs `interface{}` 切换。

**Architecture:** 新建 `src/tools/json-to-go-map/` 目录，包含 `json-to-go-map.js`（纯函数，递归遍历 `JSON.parse` 结果生成 Go 字面量，签名 `jsonToGoMap(jsonString, { useAny }) → { ok, code } | { ok: false, error }`）+ `JsonToGoMap.vue`（视图，镜像 `json-to-go` 的双 CodeMirror 布局）+ `json-to-go-map.test.js`（Vitest 单元测试）。接线到 `router.js`、`routes.js`、`tools.js` 三处。无新增依赖。开发在已有 `feat/json-to-go-map` 分支上继续。

**Tech Stack:** Vue 3 + Vite + Tailwind/DaisyUI + CodeMirror 6（已存在的 `@codemirror/lang-json`、`@codemirror/lang-go`、`@codemirror/theme-one-dark`）+ Vitest + `@heroicons/vue`

> 所有 `git -C` 命令在仓库根目录运行，用 `.` 表示当前仓库；不要硬编码机器绝对路径。如果当前 shell 不在仓库根，请先 `cd` 到仓库根再执行。

---

## File Structure

**Create:**
- `src/tools/json-to-go-map/json-to-go-map.js` — 纯模块，导出 `jsonToGoMap(jsonString, { useAny = false })`
- `src/tools/json-to-go-map/json-to-go-map.test.js` — Vitest 单元测试
- `src/tools/json-to-go-map/JsonToGoMap.vue` — 视图组件

**Modify:**
- `src/router.js` — 增加 lazy 路由
- `src/routes.js` — 追加路由 meta
- `src/tools.js` — 在"编码转换"分组追加侧边栏条目

**Reference (read-only, 不改):**
- `src/tools/json-to-go/JsonToGo.vue` — 双 CodeMirror 布局 + 主题切换 + 复制按钮的模式参考
- `src/tools/json-to-go/json-to-go.js` — `{ ok, code | error }` 返回约定参考
- `src/tools/json-to-go/json-to-go.test.js` — 测试风格参考

---

## Task 0: 确认起始分支状态

**Files:** 无

- [ ] **Step 1: 确认当前在 `feat/json-to-go-map` 分支且工作区干净**

Run:
```bash
git -C . status
git -C . branch --show-current
git -C . log --oneline -3
```

Expected:
- `On branch feat/json-to-go-map`
- `nothing to commit, working tree clean`
- 最近两笔提交是 spec 和 CLAUDE.md（`e592599 docs(spec): add JSON → Go Map tool design` 与 `docs(claude-md): require feature-branch workflow`）

如果当前不在 `feat/json-to-go-map`，先 `git -C . checkout feat/json-to-go-map`。如果工作区有未提交改动，先处理（commit / stash）再继续。

---

## Task 1: 创建纯模块（TDD - 先写测试）

**Files:**
- Create: `src/tools/json-to-go-map/json-to-go-map.test.js`
- Create: `src/tools/json-to-go-map/json-to-go-map.js`

### Step 1: 写失败测试

- [ ] **Step 1.1: 创建测试文件 `src/tools/json-to-go-map/json-to-go-map.test.js`**

写入完整内容：

```js
import { describe, it, expect } from 'vitest'
import { jsonToGoMap } from './json-to-go-map.js'

describe('jsonToGoMap', () => {
  it('returns empty code for empty input', () => {
    const r = jsonToGoMap('')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.code).toBe('')
  })

  it('returns empty code for whitespace-only input', () => {
    const r = jsonToGoMap('   \n\t  ')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.code).toBe('')
  })

  it('returns a clean error for invalid JSON', () => {
    const r = jsonToGoMap('{ not json')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/JSON 解析失败/)
  })

  it('handles top-level string', () => {
    const r = jsonToGoMap('"hello"')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.code).toBe('"hello"')
  })

  it('handles top-level number', () => {
    const r = jsonToGoMap('42')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.code).toBe('42')
  })

  it('handles top-level boolean', () => {
    const r = jsonToGoMap('true')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.code).toBe('true')
  })

  it('converts top-level null to nil', () => {
    const r = jsonToGoMap('null')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.code).toBe('nil')
  })

  it('converts a simple flat object', () => {
    const r = jsonToGoMap('{"key": "value"}')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.code).toBe('map[string]interface{}{\n\t"key": "value",\n}')
  })

  it('indents nested objects correctly', () => {
    const r = jsonToGoMap('{"outer": {"inner": 1}}')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.code).toBe(
      'map[string]interface{}{\n' +
      '\t"outer": map[string]interface{}{\n' +
      '\t\t"inner": 1,\n' +
      '\t},\n' +
      '}'
    )
  })

  it('handles arrays of mixed types', () => {
    const r = jsonToGoMap('["A", "B", 1]')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.code).toBe(
      '[]interface{}{\n' +
      '\t"A",\n' +
      '\t"B",\n' +
      '\t1,\n' +
      '}'
    )
  })

  it('handles null value inside object', () => {
    const r = jsonToGoMap('{"key": null}')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.code).toBe('map[string]interface{}{\n\t"key": nil,\n}')
  })

  it('handles empty object', () => {
    const r = jsonToGoMap('{}')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.code).toBe('map[string]interface{}{}')
  })

  it('handles empty array', () => {
    const r = jsonToGoMap('[]')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.code).toBe('[]interface{}{}')
  })

  it('handles a complex nested input', () => {
    const r = jsonToGoMap('{"array":["A","B",1],"foo":{"bar":0.5}}')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.code).toBe(
      'map[string]interface{}{\n' +
      '\t"array": []interface{}{\n' +
      '\t\t"A",\n' +
      '\t\t"B",\n' +
      '\t\t1,\n' +
      '\t},\n' +
      '\t"foo": map[string]interface{}{\n' +
      '\t\t"bar": 0.5,\n' +
      '\t},\n' +
      '}'
    )
  })

  it('uses interface{} by default', () => {
    const r = jsonToGoMap('{"a": 1}')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.code).toContain('interface{}')
    expect(r.code).not.toContain('any')
  })

  it('swaps interface{} for any when useAny: true', () => {
    const r = jsonToGoMap('{"a": [1]}', { useAny: true })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.code).toContain('map[string]any{')
    expect(r.code).toContain('[]any{')
    expect(r.code).not.toContain('interface{}')
  })
})
```

- [ ] **Step 1.2: 运行测试，确认全部失败**

Run:
```bash
npm run test -- src/tools/json-to-go-map/json-to-go-map.test.js
```

Expected: 全部测试失败（`Cannot find module './json-to-go-map.js'` 或类似错误）。这是正确的，因为模块还没建。

### Step 2: 写实现

- [ ] **Step 2.1: 创建 `src/tools/json-to-go-map/json-to-go-map.js`**

写入完整内容：

```js
/**
 * 把 JSON 字符串转换为 Go `map[string]interface{}` 字面量表达式。
 *
 * @param {string} jsonString
 * @param {{ useAny?: boolean }} [options]
 * @returns {{ ok: true, code: string } | { ok: false, error: string }}
 *
 * 行为：
 * - 空字符串 / 全空白输入 → `{ ok: true, code: '' }`
 * - JSON parse 失败 → `{ ok: false, error: 'JSON 解析失败：' + e.message }`
 * - 对象 → `map[string]<T>{ "key": <value>, ... }`（含尾逗号、tab 缩进）
 * - 数组 → `[]<T>{ <item>, ... }`
 * - null → `nil`
 * - 标量 → `JSON.stringify(value)`；顶层标量原样输出不包裹
 * - `<T>` 由 useAny 在 `interface{}` / `any` 之间切换，默认 `interface{}`
 */
export function jsonToGoMap(jsonString, { useAny = false } = {}) {
  if (!jsonString || jsonString.trim() === '') {
    return { ok: true, code: '' }
  }

  let parsed
  try {
    parsed = JSON.parse(jsonString)
  } catch (e) {
    return { ok: false, error: 'JSON 解析失败：' + e.message }
  }

  const typeToken = useAny ? 'any' : 'interface{}'
  return { ok: true, code: convert(parsed, 1, typeToken) }
}

function getTabs(n) {
  let s = ''
  for (let i = 0; i < n; i++) s += '\t'
  return s
}

function convert(value, tabLevel, typeToken) {
  if (value === null || value === undefined) return 'nil'

  if (Array.isArray(value)) {
    if (value.length === 0) return `[]${typeToken}{}`
    const items = value
      .map(v => `${getTabs(tabLevel)}${convert(v, tabLevel + 1, typeToken)},`)
      .join('\n')
    return `[]${typeToken}{\n${items}\n${getTabs(tabLevel - 1)}}`
  }

  if (typeof value === 'object') {
    const keys = Object.keys(value)
    if (keys.length === 0) return `map[string]${typeToken}{}`
    const entries = keys
      .map(k => `${getTabs(tabLevel)}${JSON.stringify(k)}: ${convert(value[k], tabLevel + 1, typeToken)},`)
      .join('\n')
    return `map[string]${typeToken}{\n${entries}\n${getTabs(tabLevel - 1)}}`
  }

  return JSON.stringify(value)
}
```

### Step 3: 运行测试，确认全部通过

- [ ] **Step 3.1: 跑测试**

Run:
```bash
npm run test -- src/tools/json-to-go-map/json-to-go-map.test.js
```

Expected: 全部测试通过（18 passed 之类）。

- [ ] **Step 3.2: 跑一次全量测试，确认没波及其他工具**

Run:
```bash
npm run test
```

Expected: 所有测试通过，没有 regression。

### Step 4: Commit

- [ ] **Step 4.1: 暂存与提交**

Run:
```bash
git -C . add src/tools/json-to-go-map/json-to-go-map.js src/tools/json-to-go-map/json-to-go-map.test.js
git -C . commit -m "$(cat <<'EOF'
feat(json-to-go-map): add pure jsonToGoMap converter with tests

Recursive converter that turns parsed JSON into a Go
`map[string]interface{}` literal expression (or `map[string]any`
when useAny is true). Returns discriminated union
{ ok, code } | { ok: false, error } to match json-to-go's
contract. Tab-indented, trailing commas, suppresses wrapping
for top-level primitives.

Co-Authored-By: zhipu/glm-5.2 <zai-org@claude-code-best.win>
EOF
)"
```

Expected: 一笔新提交，工作区干净。

---

## Task 2: 创建视图组件 `JsonToGoMap.vue`

**Files:**
- Create: `src/tools/json-to-go-map/JsonToGoMap.vue`
- Reference: `src/tools/json-to-go/JsonToGo.vue`

### Step 1: 写视图

- [ ] **Step 1.1: 阅读参考文件**

Run:
```bash
# 只是为了对照模式，不改它
```

Read `src/tools/json-to-go/JsonToGo.vue` 全文，作为模板。我们要做的是它的简化版本：
- 去掉「顶层结构体名」输入框
- 把 `omitempty` toggle 换成 `useAny` toggle（label：「使用 `any` 替代 `interface{}`」）
- `generate()` 同步调用 `jsonToGoMap`（不是异步，因为我们的纯函数不涉及 quicktype 异步调用），但要保留 debounce
- 错误处理：去掉 `warning` ref，只保留 `error`

- [ ] **Step 1.2: 创建 `src/tools/json-to-go-map/JsonToGoMap.vue`**

写入完整内容：

```vue
<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">
      JSON → Go Map 转换
    </h1>

    <!-- Toolbar -->
    <div class="flex flex-wrap items-center gap-4 mb-4">
      <label class="label cursor-pointer gap-2">
        <input
          v-model="useAny"
          type="checkbox"
          class="checkbox checkbox-sm"
          @change="regenerate"
        >
        <span class="label-text">使用 <code>any</code> 替代 <code>interface{}</code></span>
      </label>
    </div>

    <div class="flex flex-col gap-4 max-w-2xl">
      <!-- Input -->
      <div class="form-control">
        <label class="label"><span class="label-text font-semibold">JSON 输入</span></label>
        <div class="relative">
          <div
            ref="inputEditorEl"
            class="cm-container border border-base-300"
          />
          <button
            v-if="input"
            class="btn btn-ghost btn-xs btn-square absolute bottom-2 right-2 z-10"
            :title="inputCopied ? '已复制！' : '复制'"
            @click="copyText(input, 'inputCopied')"
          >
            <CheckIcon
              v-if="inputCopied"
              class="w-4 h-4 text-success"
            />
            <ClipboardDocumentIcon
              v-else
              class="w-4 h-4"
            />
          </button>
        </div>
        <p
          v-if="error"
          class="text-error text-sm mt-1"
        >
          {{ error }}
        </p>
      </div>

      <div class="flex justify-center opacity-40">
        <ArrowDownIcon class="w-6 h-6" />
      </div>

      <!-- Output -->
      <div class="form-control">
        <label class="label"><span class="label-text font-semibold">Go 输出</span></label>
        <div class="relative">
          <div
            ref="outputEditorEl"
            class="cm-container border border-base-300"
          />
          <button
            v-if="output"
            class="btn btn-ghost btn-xs btn-square absolute bottom-2 right-2 z-10"
            :title="outputCopied ? '已复制！' : '复制'"
            @click="copyText(output, 'outputCopied')"
          >
            <CheckIcon
              v-if="outputCopied"
              class="w-4 h-4 text-success"
            />
            <ClipboardDocumentIcon
              v-else
              class="w-4 h-4"
            />
          </button>
        </div>
      </div>

      <div class="flex justify-end">
        <button
          class="btn btn-ghost btn-sm gap-1"
          @click="clear"
        >
          <TrashIcon class="w-4 h-4" />
          清空
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightActiveLine, drawSelection, rectangularSelection, highlightSpecialChars } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { json as jsonLang } from '@codemirror/lang-json'
import { go as goLang } from '@codemirror/lang-go'
import { oneDark } from '@codemirror/theme-one-dark'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching } from '@codemirror/language'
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete'
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search'
import {
  ArrowDownIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  TrashIcon,
} from '@heroicons/vue/24/outline'
import { jsonToGoMap } from './json-to-go-map.js'
import { useTheme } from '../../composables/useTheme.js'

const DEFAULT_INPUT = JSON.stringify({
  name: 'wxsm',
  age: 18,
  active: true,
  tags: ['dev', 'go'],
  address: { city: 'BJ', zip: '100000' },
}, null, 2)

const input = ref(DEFAULT_INPUT)
const output = ref('')
const error = ref('')
const useAny = ref(false)
const inputCopied = ref(false)
const outputCopied = ref(false)

const inputEditorEl = ref(null)
const outputEditorEl = ref(null)
let inputEditor = null
let outputEditor = null
let debounceTimer = null

const { theme } = useTheme()

function getThemeExt() {
  return theme.value === 'dark' ? oneDark : []
}

function createExtensions(langExt, onChange) {
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
    langExt,
    EditorView.updateListener.of(onChange),
    EditorView.theme({
      '&': { height: '100%' },
      '.cm-scroller': { overflow: 'auto' },
    }),
  ]
}

function inputOnChange(update) {
  if (!update.docChanged) return
  input.value = update.state.doc.toString()
  scheduleGenerate()
}

function outputOnChange() {
  // 输出是只读的，不处理变更
}

function createEditors() {
  if (inputEditorEl.value && !inputEditor) {
    inputEditor = new EditorView({
      state: EditorState.create({
        doc: input.value,
        extensions: [...createExtensions(jsonLang(), inputOnChange), getThemeExt()],
      }),
      parent: inputEditorEl.value,
    })
  }
  if (outputEditorEl.value && !outputEditor) {
    outputEditor = new EditorView({
      state: EditorState.create({
        doc: output.value,
        extensions: [
          ...createExtensions(goLang(), outputOnChange),
          EditorState.readOnly.of(true),
          getThemeExt(),
        ],
      }),
      parent: outputEditorEl.value,
    })
  }
}

function destroyEditors() {
  inputEditor?.destroy()
  inputEditor = null
  outputEditor?.destroy()
  outputEditor = null
}

function generate() {
  const r = jsonToGoMap(input.value, { useAny: useAny.value })
  if (r.ok) {
    error.value = ''
    output.value = r.code
  } else {
    output.value = ''
    error.value = r.error
  }
  syncOutputEditor()
}

function syncOutputEditor() {
  if (!outputEditor) return
  outputEditor.dispatch({
    changes: { from: 0, to: outputEditor.state.doc.length, insert: output.value },
  })
}

function scheduleGenerate() {
  error.value = ''
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(generate, 300)
}

function regenerate() {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
  generate()
}

function clear() {
  input.value = ''
  output.value = ''
  error.value = ''
  if (inputEditor) {
    inputEditor.dispatch({
      changes: { from: 0, to: inputEditor.state.doc.length, insert: '' },
    })
  }
  syncOutputEditor()
}

async function copyText(text, flag) {
  try {
    await navigator.clipboard.writeText(text)
    if (flag === 'inputCopied') {
      inputCopied.value = true
      setTimeout(() => { inputCopied.value = false }, 1500)
    } else {
      outputCopied.value = true
      setTimeout(() => { outputCopied.value = false }, 1500)
    }
  } catch { /* clipboard not available */ }
}

watch(theme, async () => {
  destroyEditors()
  await nextTick()
  createEditors()
  syncOutputEditor()
})

onMounted(() => {
  createEditors()
  generate()
})

onBeforeUnmount(() => {
  if (debounceTimer) clearTimeout(debounceTimer)
  destroyEditors()
})
</script>

<style>
.cm-container {
  height: 320px;
  border-radius: var(--radius-field, 0.5rem);
  overflow: hidden;
}

.cm-container .cm-editor {
  height: 100%;
  font-size: 0.875rem;
}
</style>
```

### Step 2: 跑 lint

- [ ] **Step 2.1: 检查 lint**

Run:
```bash
npm run lint
```

Expected: No errors. 若有报错，按提示修掉再跑一次。

### Step 3: 手动 smoke test（dev server）

- [ ] **Step 3.1: 启动 dev server**

Run:
```bash
npm run dev
```

Expected: Vite 启动，打印本地 URL（如 `http://localhost:5173`）。**注意**：此时路由还没接线（Task 3 才会做），所以直接访问 `/json-to-go-map` 会 404。本步仅校验 `.vue` 文件能被 Vite 编译通过、没有语法 / import 错误。**若 dev server 启动时无编译错误即视为通过**，停止 dev server（`Ctrl+C`）继续下一步。

如果 Vite 编译报错（如 import 路径错、组件名错），先修。

### Step 4: Commit

- [ ] **Step 4.1: 暂存与提交**

Run:
```bash
git -C . add src/tools/json-to-go-map/JsonToGoMap.vue
git -C . commit -m "$(cat <<'EOF'
feat(json-to-go-map): add JsonToGoMap view

Mirrors json-to-go's dual-CodeMirror layout: JSON input on
top, read-only Go output below, theme switching, copy and
clear buttons. Toolbar has a single toggle swapping
interface{} for any. Calls the synchronous jsonToGoMap
pure function on a 300ms debounce; toggle re-runs immediately.

Co-Authored-By: zhipu/glm-5.2 <zai-org@claude-code-best.win>
EOF
)"
```

Expected: 新提交，工作区干净。

---

## Task 3: 接线（router + routes + sidebar）

**Files:**
- Modify: `src/router.js`
- Modify: `src/routes.js`
- Modify: `src/tools.js`

### Step 1: 路由注册

- [ ] **Step 1.1: 修改 `src/router.js`，在 components 对象里增加一行**

打开 `src/router.js`，在 `'/json-to-go'` 那行下面追加：

```js
  '/json-to-go-map': () => import('./tools/json-to-go-map/JsonToGoMap.vue'),
```

完整位置示意（仅在 `'/json-to-go'` 行下方插入新行，其他不动）：

```js
  '/json-to-go': () => import('./tools/json-to-go/JsonToGo.vue'),
  '/json-to-go-map': () => import('./tools/json-to-go-map/JsonToGoMap.vue'),
```

### Step 2: 路由 meta

- [ ] **Step 2.1: 修改 `src/routes.js`，在 `/json-to-go` 条目下方追加新条目**

打开 `src/routes.js`，找到 `/json-to-go` 那行，在其下方追加：

```js
  { path: '/json-to-go-map', meta: { title: 'JSON → Go Map', description: '将 JSON 转换为 Go map[string]interface{} 字面量' } },
```

### Step 3: 侧边栏

- [ ] **Step 3.1: 修改 `src/tools.js`，在「编码转换」分组的 `json-to-go` 条目下方追加新条目**

打开 `src/tools.js`，找到 `编码转换` 分组里 `JSON → Go` 条目，在其下方追加：

```js
      {
        name: 'JSON → Go Map',
        path: '/json-to-go-map',
        desc: '将 JSON 转换为 Go map[string]interface{} 字面量',
        icon: CodeBracketSquareIcon,
      },
```

`CodeBracketSquareIcon` 已在文件顶部 import 并被 `json-to-go` 使用，无需新增 import。

### Step 4: 验证

- [ ] **Step 4.1: lint**

Run:
```bash
npm run lint
```

Expected: No errors.

- [ ] **Step 4.2: 全量测试**

Run:
```bash
npm run test
```

Expected: 全部通过。

- [ ] **Step 4.3: 启动 dev server 手动验证**

Run:
```bash
npm run dev
```

打开浏览器访问 dev server URL，在侧边栏「编码转换」分组找到「JSON → Go Map」，点击进入。预期：
- 页面标题「JSON → Go Map 转换」
- 顶部有一个 `使用 any 替代 interface{}` 复选框
- 输入框预填示例 JSON
- 输出框立刻显示对应的 `map[string]interface{}{ ... }` 字面量
- 勾选 `使用 any`，输出立刻变成 `map[string]any{ ... }` 和 `[]any{ ... }`
- 输入 `invalid`，输出框下方红字显示 `JSON 解析失败：...`
- 点击「清空」，两个编辑器都清空
- 两个复制按钮都能正常复制

确认无误后 `Ctrl+C` 停止 dev server。

### Step 5: Commit

- [ ] **Step 5.1: 暂存与提交**

Run:
```bash
git -C . add src/router.js src/routes.js src/tools.js
git -C . commit -m "$(cat <<'EOF'
feat(json-to-go-map): wire route, meta, and sidebar entry

Registers /json-to-go-map in router.js with a lazy import,
adds route meta in routes.js, and appends a sidebar item
to the 编码转换 group in tools.js (reusing
CodeBracketSquareIcon already imported for json-to-go).

Co-Authored-By: zhipu/glm-5.2 <zai-org@claude-code-best.win>
EOF
)"
```

Expected: 新提交，工作区干净。

---

## Task 4: Build 检查

**Files:** 无

- [ ] **Step 4.1: 跑生产构建**

Run:
```bash
npm run build
```

Expected: 构建成功完成。如果有 prerender 步骤（vite-plugin-prerender-k），prerender 也应通过。如果 prerender 因新路由报错（如找不到对应 entry），按错误提示调整（通常是 routes.js 里的 path 和组件路径不匹配）。

- [ ] **Step 4.2: 确认分支最近 5 笔提交**

Run:
```bash
git -C . log --oneline -5
```

Expected: 看到 5 笔提交（从新到旧）：
1. 接线提交（`feat(json-to-go-map): wire route, meta, and sidebar entry`）
2. 视图提交（`feat(json-to-go-map): add JsonToGoMap view`）
3. 纯模块 + 测试提交（`feat(json-to-go-map): add pure jsonToGoMap converter with tests`）
4. CLAUDE.md 提交（`docs(claude-md): require feature-branch workflow`）
5. spec 提交（`e592599 docs(spec): add JSON → Go Map tool design`）

（前两笔 spec 和 CLAUDE.md 已在计划开始前提交，实现阶段的新提交是后 3 笔。）

---

## Self-review checklist

实现者在最后跑一遍：

- [ ] `npm run lint` 通过
- [ ] `npm run test` 通过
- [ ] `npm run build` 通过
- [ ] dev server 手动访问 `/json-to-go-map`，所有交互（编辑、toggle、复制、清空、错误显示）正常
- [ ] 分支干净：`git -C . status` 显示 `nothing to commit, working tree clean`
- [ ] 所有提交都在 `feat/json-to-go-map` 分支上，master 没动
