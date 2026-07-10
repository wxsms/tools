# CLI 格式转换工具 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增"命令行格式转换"工具,在单行 ↔ 多行 Unix shell 命令风格之间互转,正确处理引号与转义。

**Architecture:** 纯函数模块 `src/utils/cli-format.js` 负责 token 解析与两个方向的转换;`src/views/CliFormat.vue` 负责双向同步的 UI;注册到 `routes.js` / `router.js` / `tools.js`。遵循项目既有 `utils + view` 分离 + TDD 模式。

**Tech Stack:** Vue 3 + Vitest + @vue/test-utils + Tailwind/DaisyUI。

---

## File Structure

**Create:**
- `src/utils/cli-format.js` — 纯函数:tokenize(解析 Unix shell token),toSingleLine(多行→单行),toMultiLine(单行→多行,带续行/缩进配置)
- `src/utils/cli-format.test.js` — 单元测试
- `src/views/CliFormat.vue` — 工具视图
- `src/views/CliFormat.test.js` — 视图测试

**Modify:**
- `src/routes.js` — 加 `/cli-format` 路由定义
- `src/router.js` — 加 import 与 components 映射
- `src/tools.js` — 在"文本处理"组加条目

---

### Task 1: tokenize 纯函数(核心解析)

**Files:**
- Create: `src/utils/cli-format.js`
- Create: `src/utils/cli-format.test.js`

- [ ] **Step 1: 写失败测试 — 基本空格拆分**

```js
// src/utils/cli-format.test.js
import { describe, it, expect } from 'vitest'
import { tokenize } from './cli-format.js'

describe('tokenize', () => {
  it('splits on whitespace', () => {
    expect(tokenize('command --flag value')).toEqual([
      { raw: 'command' },
      { raw: '--flag' },
      { raw: 'value' },
    ])
  })

  it('returns empty array for empty string', () => {
    expect(tokenize('')).toEqual([])
  })

  it('returns empty array for whitespace-only string', () => {
    expect(tokenize('   \n\t  ')).toEqual([])
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run src/utils/cli-format.test.js`
Expected: FAIL — `tokenize is not a function` 或模块不存在

- [ ] **Step 3: 实现最小版本**

```js
// src/utils/cli-format.js
/**
 * 把 Unix shell 风格的命令字符串解析成 token 数组。
 * 每个 token 形如 { raw: string },raw 是原样写法(含引号、转义)。
 * 支持:
 * - 单引号 '...'(内容原样,不可转义)
 * - 双引号 "..."(反斜杠仅转义 \" \\ \$ `)
 * - 反斜杠转义(非引号内):\X 当字面 X
 * - 行末单独的 \ 续行:吃掉换行与下一行前导空白
 * - 等号不拆分:--output=/path 是单个 token
 *
 * @param {string} input
 * @returns {Array<{raw: string}>}
 */
export function tokenize(input) {
  const tokens = []
  let i = 0
  const s = input ?? ''
  const n = s.length

  while (i < n) {
    // 跳过前导空白
    while (i < n && /\s/.test(s[i])) i++
    if (i >= n) break

    let raw = ''
    while (i < n && !/\s/.test(s[i])) {
      const c = s[i]
      if (c === '\\') {
        // 反斜杠转义:取下一个字符当字面
        if (i + 1 < n) {
          // 行末 \ + 换行 => 续行,吃掉换行与下一行前导空白
          if (s[i + 1] === '\n') {
            raw += '\\\n'
            i += 2
            while (i < n && /[ \t]/.test(s[i])) i++
            // 注意:续行后仍可能继续在同一 token 内,循环继续
            // 但如果续行后遇到非空白则继续累积,遇到空白则 token 结束
            continue
          }
          raw += s[i] + s[i + 1]
          i += 2
        } else {
          raw += c
          i++
        }
      } else if (c === "'") {
        // 单引号:原样直到下一个 '
        raw += "'"
        i++
        while (i < n && s[i] !== "'") {
          raw += s[i]
          i++
        }
        if (i < n) {
          raw += "'"
          i++
        } else {
          throw new Error("引号未闭合:缺少 '")
        }
      } else if (c === '"') {
        // 双引号:直到下一个未转义的 "
        raw += '"'
        i++
        while (i < n && s[i] !== '"') {
          if (s[i] === '\\' && i + 1 < n) {
            raw += s[i] + s[i + 1]
            i += 2
          } else {
            raw += s[i]
            i++
          }
        }
        if (i < n) {
          raw += '"'
          i++
        } else {
          throw new Error('引号未闭合:缺少 "')
        }
      } else {
        raw += c
        i++
      }
    }
    if (raw) tokens.push({ raw })
  }
  return tokens
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run src/utils/cli-format.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git -C "E:/githome-windows/tools" add src/utils/cli-format.js src/utils/cli-format.test.js
git -C "E:/githome-windows/tools" commit -m "feat(cli-format): add tokenize with quote/escape/continuation support"
```

---

### Task 2: tokenize 引号与转义测试覆盖

**Files:**
- Modify: `src/utils/cli-format.test.js`

- [ ] **Step 1: 追加失败测试**

在 `describe('tokenize', ...)` 块内追加:

```js
  it('handles double-quoted value with spaces', () => {
    expect(tokenize('docker run --name "my container"')).toEqual([
      { raw: 'docker' },
      { raw: 'run' },
      { raw: '--name' },
      { raw: '"my container"' },
    ])
  })

  it('handles single-quoted value with spaces', () => {
    expect(tokenize("git commit -m 'fix: hello world'")).toEqual([
      { raw: 'git' },
      { raw: 'commit' },
      { raw: '-m' },
      { raw: "'fix: hello world'" },
    ])
  })

  it('preserves escaped space outside quotes', () => {
    expect(tokenize('echo hello\\ world')).toEqual([
      { raw: 'echo' },
      { raw: 'hello\\ world' },
    ])
  })

  it('treats = as part of token', () => {
    expect(tokenize('--output=/path/to/file')).toEqual([
      { raw: '--output=/path/to/file' },
    ])
  })

  it('handles backslash-newline continuation', () => {
    expect(tokenize('command \\\n  --flag value')).toEqual([
      { raw: 'command' },
      { raw: '--flag' },
      { raw: 'value' },
    ])
  })

  it('preserves Windows-style backslash paths (no escape of next char)', () => {
    // \U \f 不是合法转义序列,按字面保留
    expect(tokenize('C:\\Users\\foo')).toEqual([
      { raw: 'C:\\Users\\foo' },
    ])
  })

  it('throws on unterminated single quote', () => {
    expect(() => tokenize("echo 'unterminated")).toThrow(/引号未闭合/)
  })

  it('throws on unterminated double quote', () => {
    expect(() => tokenize('echo "unterminated')).toThrow(/引号未闭合/)
  })

  it('handles mixed quotes and escapes', () => {
    expect(tokenize('cmd --msg "it\'s \\"ok\\"" --flag')).toEqual([
      { raw: 'cmd' },
      { raw: '--msg' },
      { raw: '"it\'s \\"ok\\""' },
      { raw: '--flag' },
    ])
  })

  it('handles adjacent quoted and unquoted parts in one token', () => {
    expect(tokenize('echo "hello"world\'foo\'')).toEqual([
      { raw: 'echo' },
      { raw: '"hello"world\'foo\'' },
    ])
  })
```

- [ ] **Step 2: 运行测试**

Run: `npx vitest run src/utils/cli-format.test.js`
Expected: 大部分 PASS;若个别失败,审视实现是否符合预期(如 Windows 路径 `\U` 应当被当作字面 `\U` —— 当前实现把 `\U` 当作"转义 U",输出 `\\U`,这其实是字面保留,符合预期)。

如有失败,调整测试期望或修正 `tokenize` 实现(注意:不要为了过测试而破坏既有行为)。

- [ ] **Step 3: Commit**

```bash
git -C "E:/githome-windows/tools" add src/utils/cli-format.test.js
git -C "E:/githome-windows/tools" commit -m "test(cli-format): cover quotes, escapes, continuation, = in token"
```

---

### Task 3: toSingleLine 多行→单行

**Files:**
- Modify: `src/utils/cli-format.js`
- Modify: `src/utils/cli-format.test.js`

- [ ] **Step 1: 写失败测试**

在 `cli-format.test.js` 顶部 import 行改为:

```js
import { tokenize, toSingleLine } from './cli-format.js'
```

文件末尾追加:

```js
describe('toSingleLine', () => {
  it('joins multi-line with backslash continuation into one line', () => {
    const input = 'command \\\n  --flag1 value1 \\\n  --flag2 value2'
    expect(toSingleLine(input)).toBe('command --flag1 value1 --flag2 value2')
  })

  it('joins tokens already on one line', () => {
    expect(toSingleLine('command --flag value')).toBe('command --flag value')
  })

  it('preserves quoted values with spaces', () => {
    expect(toSingleLine('docker run --name "my container"')).toBe('docker run --name "my container"')
  })

  it('returns empty string for empty input', () => {
    expect(toSingleLine('')).toBe('')
  })

  it('returns empty string for whitespace-only input', () => {
    expect(toSingleLine('   \n  ')).toBe('')
  })

  it('throws on unterminated quote (propagates from tokenize)', () => {
    expect(() => toSingleLine("echo 'unterminated")).toThrow(/引号未闭合/)
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run src/utils/cli-format.test.js`
Expected: FAIL — `toSingleLine is not a function`

- [ ] **Step 3: 实现**

在 `src/utils/cli-format.js` 末尾追加:

```js
/**
 * 多行 → 单行:解析 tokens,用单空格重新拼接(原引号保留)。
 * @param {string} input
 * @returns {string}
 */
export function toSingleLine(input) {
  const tokens = tokenize(input)
  return tokens.map(t => t.raw).join(' ')
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run src/utils/cli-format.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git -C "E:/githome-windows/tools" add src/utils/cli-format.js src/utils/cli-format.test.js
git -C "E:/githome-windows/tools" commit -m "feat(cli-format): add toSingleLine (multi-line -> single-line)"
```

---

### Task 4: toMultiLine 单行→多行

**Files:**
- Modify: `src/utils/cli-format.js`
- Modify: `src/utils/cli-format.test.js`

- [ ] **Step 1: 写失败测试**

import 行改为:

```js
import { tokenize, toSingleLine, toMultiLine } from './cli-format.js'
```

文件末尾追加:

```js
describe('toMultiLine', () => {
  it('splits single-line command into multi-line with default (2-space indent, backslash continuation)', () => {
    const input = 'command --flag1 value1 --flag2 value2'
    const expected = 'command \\\n  --flag1 value1 \\\n  --flag2 value2'
    expect(toMultiLine(input)).toBe(expected)
  })

  it('places flag and value on same line, positional arg alone', () => {
    const input = 'git commit -m "msg" file.txt'
    const expected = 'git \\\n  commit -m "msg" \\\n  file.txt'
    // 注意:'commit' 不以 - 开头,是位置参数,单独成行
    // '-m' 是 flag,下一个 token '"msg"' 不以 - 开头,同行
    // 'file.txt' 不以 - 开头,单独成行
    expect(toMultiLine(input)).toBe(expected)
  })

  it('flag whose next token starts with - goes alone', () => {
    const input = 'cmd --output -v'
    const expected = 'cmd \\\n  --output \\\n  -v'
    expect(toMultiLine(input)).toBe(expected)
  })

  it('single token (command only) has no continuation', () => {
    expect(toMultiLine('command')).toBe('command')
  })

  it('respects indent=0 option', () => {
    const input = 'command --flag value'
    expect(toMultiLine(input, { indent: 0 })).toBe('command \\\n--flag value')
  })

  it('respects indent=4 option', () => {
    const input = 'command --flag value'
    expect(toMultiLine(input, { indent: 4 })).toBe('command \\\n    --flag value')
  })

  it('respects continuation=false option (no backslash)', () => {
    const input = 'command --flag value'
    expect(toMultiLine(input, { continuation: false })).toBe('command\n  --flag value')
  })

  it('combines indent=0 and continuation=false', () => {
    const input = 'command --flag1 value1 --flag2 value2'
    expect(toMultiLine(input, { indent: 0, continuation: false })).toBe(
      'command\n--flag1 value1\n--flag2 value2',
    )
  })

  it('handles = in flag as single token', () => {
    const input = 'cmd --output=/path --flag'
    expect(toMultiLine(input)).toBe('cmd \\\n  --output=/path \\\n  --flag')
  })

  it('returns empty string for empty input', () => {
    expect(toMultiLine('')).toBe('')
  })

  it('last line has no trailing backslash', () => {
    const input = 'command --a 1 --b 2'
    const result = toMultiLine(input)
    expect(result.endsWith('--b 2')).toBe(true)
    expect(result.endsWith('\\')).toBe(false)
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run src/utils/cli-format.test.js`
Expected: FAIL — `toMultiLine is not a function`

- [ ] **Step 3: 实现**

在 `src/utils/cli-format.js` 末尾追加:

```js
/**
 * 单行 → 多行:解析 tokens,按 flag+值 启发式分组,生成多行字符串。
 *
 * 分组规则:
 * - 第 0 个 token(命令)单独一行,无缩进无续行符
 * - 后续 token:
 *   - 若以 - 开头,视为 flag;若下一个 token 不以 - 开头,则两 token 同行,否则单独成行
 *   - 不以 - 开头(位置参数)单独成行
 * - 每行(除命令行)前加 indent 个空格
 * - 若 continuation=true,每行(除最后一行)末尾追加 ' \\'
 *
 * @param {string} input
 * @param {{indent?: number, continuation?: boolean}} [opts]
 * @returns {string}
 */
export function toMultiLine(input, opts = {}) {
  const indent = opts.indent ?? 2
  const continuation = opts.continuation ?? true
  const tokens = tokenize(input)
  if (tokens.length === 0) return ''
  if (tokens.length === 1) return tokens[0].raw

  const pad = ' '.repeat(indent)
  const lines = [tokens[0].raw]
  let i = 1
  while (i < tokens.length) {
    const t = tokens[i].raw
    if (t.startsWith('-')) {
      const next = tokens[i + 1]?.raw
      if (next !== undefined && !next.startsWith('-')) {
        lines.push(pad + t + ' ' + next)
        i += 2
      } else {
        lines.push(pad + t)
        i += 1
      }
    } else {
      lines.push(pad + t)
      i += 1
    }
  }

  if (!continuation) {
    return lines.join('\n')
  }
  // 除最后一行外,每行末尾追加 ' \'
  return lines.map((ln, idx) => (idx < lines.length - 1 ? ln + ' \\' : ln)).join('\n')
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run src/utils/cli-format.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git -C "E:/githome-windows/tools" add src/utils/cli-format.js src/utils/cli-format.test.js
git -C "E:/githome-windows/tools" commit -m "feat(cli-format): add toMultiLine with indent/continuation options"
```

---

### Task 5: CliFormat.vue 视图

**Files:**
- Create: `src/views/CliFormat.vue`

- [ ] **Step 1: 创建视图组件**

```vue
<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">
      命令行格式转换
    </h1>

    <!-- Direction + options toolbar -->
    <div class="flex flex-wrap items-center gap-4 mb-4">
      <div class="join">
        <button
          :class="['btn btn-sm join-item', direction === 'to-multi' ? 'btn-primary' : '']"
          @click="setDirection('to-multi')"
        >
          单行 → 多行
        </button>
        <button
          :class="['btn btn-sm join-item', direction === 'to-single' ? 'btn-primary' : '']"
          @click="setDirection('to-single')"
        >
          多行 → 单行
        </button>
      </div>

      <div
        v-if="direction === 'to-multi'"
        class="flex items-center gap-3"
      >
        <div class="join">
          <button
            v-for="opt in [true, false]"
            :key="opt"
            :class="['btn btn-sm join-item', continuation === opt ? 'btn-primary' : '']"
            @click="continuation = opt"
          >
            {{ opt ? '带 \\' : '无 \\' }}
          </button>
        </div>
        <div class="join">
          <button
            v-for="ind in [0, 2, 4]"
            :key="ind"
            :class="['btn btn-sm join-item', indent === ind ? 'btn-primary' : '']"
            @click="indent = ind"
          >
            {{ ind }} 空格
          </button>
        </div>
      </div>
    </div>

    <div class="flex flex-col gap-4 max-w-3xl">
      <div class="form-control">
        <label class="label"><span class="label-text font-semibold">单行</span></label>
        <div class="relative">
          <textarea
            v-model="singleLine"
            class="textarea textarea-bordered w-full font-mono text-sm"
            placeholder="command --flag1 value1 --flag2 value2"
            rows="4"
            @input="onSingleChange"
          />
          <button
            v-if="singleLine"
            class="btn btn-ghost btn-xs btn-square absolute bottom-2 right-2"
            :title="singleCopied ? '已复制！' : '复制'"
            @click="copy(singleLine, 'singleCopied')"
          >
            <CheckIcon
              v-if="singleCopied"
              class="w-4 h-4 text-success"
            />
            <ClipboardDocumentIcon
              v-else
              class="w-4 h-4"
            />
          </button>
        </div>
      </div>

      <div class="flex justify-center opacity-40">
        <ArrowsUpDownIcon class="w-6 h-6" />
      </div>

      <div class="form-control">
        <label class="label"><span class="label-text font-semibold">多行</span></label>
        <div class="relative">
          <textarea
            v-model="multiLine"
            class="textarea textarea-bordered w-full font-mono text-sm"
            placeholder="command \\\n  --flag1 value1 \\\n  --flag2 value2"
            rows="6"
            @input="onMultiChange"
          />
          <button
            v-if="multiLine"
            class="btn btn-ghost btn-xs btn-square absolute bottom-2 right-2"
            :title="multiCopied ? '已复制！' : '复制'"
            @click="copy(multiLine, 'multiCopied')"
          >
            <CheckIcon
              v-if="multiCopied"
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
import { ref } from 'vue'
import { ArrowsUpDownIcon, ClipboardDocumentIcon, CheckIcon, TrashIcon } from '@heroicons/vue/24/outline'
import { toSingleLine, toMultiLine } from '../utils/cli-format.js'

const singleLine = ref('command --flag1 value1 --flag2 value2')
const multiLine = ref('')
const direction = ref('to-multi')
const continuation = ref(true)
const indent = ref(2)
const error = ref('')
const singleCopied = ref(false)
const multiCopied = ref(false)

function onSingleChange() {
  if (direction.value !== 'to-multi') return
  error.value = ''
  if (!singleLine.value.trim()) {
    multiLine.value = ''
    return
  }
  try {
    multiLine.value = toMultiLine(singleLine.value, {
      indent: indent.value,
      continuation: continuation.value,
    })
  } catch (e) {
    error.value = '解析失败:' + e.message
    multiLine.value = ''
  }
}

function onMultiChange() {
  if (direction.value !== 'to-single') return
  error.value = ''
  if (!multiLine.value.trim()) {
    singleLine.value = ''
    return
  }
  try {
    singleLine.value = toSingleLine(multiLine.value)
  } catch (e) {
    error.value = '解析失败:' + e.message
    singleLine.value = ''
  }
}

function setDirection(d) {
  direction.value = d
  // 切换方向时以另一侧框为输入重新转换
  if (d === 'to-multi') {
    onSingleChange()
  } else {
    onMultiChange()
  }
}

function clear() {
  singleLine.value = ''
  multiLine.value = ''
  error.value = ''
}

async function copy(text, flag) {
  try {
    await navigator.clipboard.writeText(text)
    if (flag === 'singleCopied') {
      singleCopied.value = true
      setTimeout(() => (singleCopied.value = false), 1500)
    } else {
      multiCopied.value = true
      setTimeout(() => (multiCopied.value = false), 1500)
    }
  } catch { /* clipboard not available */ }
}

// 初始化多行输出
onSingleChange()
</script>
```

- [ ] **Step 2: 视觉/手测(可选,不阻塞)**

Run: `npm run dev`,打开 `/cli-format`(此时路由尚未注册,可临时在浏览器访问根路径手测组件,或先做下一步注册后再测)

- [ ] **Step 3: Commit**

```bash
git -C "E:/githome-windows/tools" add src/views/CliFormat.vue
git -C "E:/githome-windows/tools" commit -m "feat(cli-format): add CliFormat view with bidirectional sync"
```

---

### Task 6: CliFormat 视图测试

**Files:**
- Create: `src/views/CliFormat.test.js`

- [ ] **Step 1: 写测试**

```js
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CliFormat from './CliFormat.vue'

function mountComponent() {
  return mount(CliFormat)
}

describe('CliFormat', () => {
  it('renders title', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('命令行格式转换')
  })

  it('converts single-line to multi-line by default (direction = to-multi)', async () => {
    const wrapper = mountComponent()
    const textareas = wrapper.findAll('textarea')
    // 上框是单行,下框是多行
    await textareas[0].setValue('cmd --a 1 --b 2')
    await textareas[0].trigger('input')
    expect(textareas[1].element.value).toBe('cmd \\\n  --a 1 \\\n  --b 2')
  })

  it('converts multi-line to single-line when direction = to-single', async () => {
    const wrapper = mountComponent()
    // 点击"多行 → 单行"按钮
    const dirBtn = wrapper.findAll('button').find(b => b.text().includes('多行 → 单行'))
    await dirBtn.trigger('click')
    const textareas = wrapper.findAll('textarea')
    await textareas[1].setValue('cmd \\\n  --a 1 \\\n  --b 2')
    await textareas[1].trigger('input')
    expect(textareas[0].element.value).toBe('cmd --a 1 --b 2')
  })

  it('clears both fields', async () => {
    const wrapper = mountComponent()
    const textareas = wrapper.findAll('textarea')
    await textareas[0].setValue('cmd --a 1')
    await textareas[0].trigger('input')
    const clearBtn = wrapper.findAll('button').find(b => b.text().includes('清空'))
    await clearBtn.trigger('click')
    expect(textareas[0].element.value).toBe('')
    expect(textareas[1].element.value).toBe('')
  })

  it('shows error on unterminated quote', async () => {
    const wrapper = mountComponent()
    const textareas = wrapper.findAll('textarea')
    await textareas[0].setValue("echo 'unterminated")
    await textareas[0].trigger('input')
    expect(wrapper.text()).toContain('解析失败')
  })

  it('respects indent option (to-multi)', async () => {
    const wrapper = mountComponent()
    const indentBtn = wrapper.findAll('button').find(b => b.text().includes('4 空格'))
    await indentBtn.trigger('click')
    const textareas = wrapper.findAll('textarea')
    await textareas[0].setValue('cmd --a 1')
    await textareas[0].trigger('input')
    expect(textareas[1].element.value).toBe('cmd \\\n    --a 1')
  })

  it('respects continuation=false option (to-multi)', async () => {
    const wrapper = mountComponent()
    const noContBtn = wrapper.findAll('button').find(b => b.text().includes('无 \\'))
    await noContBtn.trigger('click')
    const textareas = wrapper.findAll('textarea')
    await textareas[0].setValue('cmd --a 1')
    await textareas[0].trigger('input')
    expect(textareas[1].element.value).toBe('cmd\n  --a 1')
  })
})
```

- [ ] **Step 2: 运行测试**

Run: `npx vitest run src/views/CliFormat.test.js`
Expected: PASS。若有失败,审视是测试期望写错还是组件行为不对,相应修正。

- [ ] **Step 3: Commit**

```bash
git -C "E:/githome-windows/tools" add src/views/CliFormat.test.js
git -C "E:/githome-windows/tools" commit -m "test(cli-format): add view tests for direction, options, clear, error"
```

---

### Task 7: 注册路由与侧边栏

**Files:**
- Modify: `src/routes.js`
- Modify: `src/router.js`
- Modify: `src/tools.js`

- [ ] **Step 1: routes.js 加路由定义**

在 `src/routes.js` 数组末尾(`patch-viewer` 条目之后)追加一行:

```js
  { path: '/cli-format', meta: { title: '命令行格式转换', description: '命令行参数单行与多行风格互转,支持 Unix shell 引号与转义' } },
```

注意:前一行 `patch-viewer` 的行尾需要补一个逗号。

- [ ] **Step 2: router.js 加 import 与 components 映射**

在 `src/router.js` 第 39 行(`import PatchViewer from './views/PatchViewer.vue'`)之后追加:

```js
import CliFormat from './views/CliFormat.vue'
```

在 `components` 对象内 `'/patch-viewer': PatchViewer,` 之后追加:

```js
  '/cli-format': CliFormat,
```

- [ ] **Step 3: tools.js 加侧边栏条目**

在 `src/tools.js` 顶部 import 列表中确认 `CommandLineIcon` 已存在(已用于 JSON 工具,无需重复 import)。

在"文本处理"组内 `Patch 查看` 条目之后追加:

```js
      {
        name: '命令行格式转换',
        path: '/cli-format',
        desc: '命令行参数单行与多行风格互转,支持 Unix shell 引号与转义',
        icon: CommandLineIcon,
      },
```

- [ ] **Step 4: 跑全套测试 + lint**

Run: `npm run test`
Expected: 全部 PASS

Run: `npm run lint`
Expected: 无错误

- [ ] **Step 5: 手测导航**

Run: `npm run dev`,访问 `/cli-format`,确认:
- 侧边栏"文本处理"组出现"命令行格式转换"
- 点击可进入,默认单行 → 多行,初始示例正确转换
- 切换方向、缩进、续行符开关均生效
- 引号未闭合时显示错误
- 复制按钮可用

- [ ] **Step 6: Commit**

```bash
git -C "E:/githome-windows/tools" add src/routes.js src/router.js src/tools.js
git -C "E:/githome-windows/tools" commit -m "feat(cli-format): register route and sidebar entry"
```

---

## Self-Review

- **Spec coverage**:
  - 双向转换 ✓ (Task 3, 4)
  - Unix shell 引号/转义 ✓ (Task 1, 2)
  - 续行符开关 ✓ (Task 4 option, Task 5 toolbar)
  - 缩进开关 ✓ (Task 4 option, Task 5 toolbar)
  - `=` 不拆分 ✓ (Task 2 测试, Task 4 测试)
  - 引号未闭合容错 ✓ (Task 1 throws, Task 5 try/catch, Task 6 测试)
  - 双向自动同步 ✓ (Task 5 onSingleChange/onMultiChange)
  - 侧边栏/路由注册 ✓ (Task 7)
  - lint / test 通过 ✓ (Task 7 Step 4)
- **Placeholder scan**:无 TBD/TODO,所有代码完整。
- **Type consistency**:`tokenize` 返回 `Array<{raw: string}>`,`toMultiLine` 第二参数 `{indent, continuation}` 全程一致。

无遗漏。
