# Kimi K2.5 + K2.6 — Token Counter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Kimi K2.5 and Kimi K2.6 to the token-counter dropdown, reusing the K2.7-Code tokenizer + ChatML renderer already shipped under `kimi-k2.js`.

**Architecture:** Mirror the DeepSeek V4 Flash pattern: thin per-model modules that import `load`/`renderMessages` from the existing Kimi K2 module and only override the `config`. Add a small named export (`KIMI_K2_SPECIAL_TOKENS`) to `kimi-k2.js` so the new configs reference the same 8-entry special-token map by reference rather than duplicating it.

**Tech Stack:** Vue 3, Vitest, `js-tiktoken`, existing `kimi-k2.js` module + `__fixtures__/mini.tiktoken`.

---

## File structure

- **Modify** `src/tools/token-counter/tokenizers/kimi-k2.js` — add `export` keyword to the existing `KIMI_K2_SPECIAL_TOKENS` const declaration (one line).
- **Create** `src/tools/token-counter/tokenizers/kimi-k2-5.js` — K2.5 config + re-exported load/render.
- **Create** `src/tools/token-counter/tokenizers/kimi-k2-6.js` — K2.6 config + re-exported load/render.
- **Create** `src/tools/token-counter/tokenizers/kimi-k2-5.test.js` — config-shape + smoke.
- **Create** `src/tools/token-counter/tokenizers/kimi-k2-6.test.js` — config-shape + smoke.
- **Modify** `src/tools/token-counter/token-counter.js` — two new imports + append to `MODELS`.
- **Modify** `src/tools/token-counter/token-counter.test.js:50` — extend aggregator expected ids.

No new tokenizer asset downloaded. Both new modules point `config.tokenizer.file` at `/tokenizers/kimi-k2.tiktoken`.

---

### Task 1: Export `KIMI_K2_SPECIAL_TOKENS` from `kimi-k2.js`

**Files:**
- Modify: `src/tools/token-counter/tokenizers/kimi-k2.js` (line 5 — add `export` keyword)

- [ ] **Step 1: Edit the declaration**

Change line 5 from:

```js
const KIMI_K2_SPECIAL_TOKENS = {
```

to:

```js
export const KIMI_K2_SPECIAL_TOKENS = {
```

No other lines in this file change.

- [ ] **Step 2: Verify lint clean on this file**

Run: `npx eslint src/tools/token-counter/tokenizers/kimi-k2.js`
Expected: no output, exit 0.

- [ ] **Step 3: Verify the existing kimi-k2 test suite still passes**

Run: `npx vitest run src/tools/token-counter/tokenizers/kimi-k2.test.js`
Expected: all tests pass (a named export added to an already-default-exported module cannot break existing imports).

- [ ] **Step 4: Commit**

```bash
git -C E:/githome-windows/tools add src/tools/token-counter/tokenizers/kimi-k2.js
git -C E:/githome-windows/tools commit -m "refactor(token-counter): export KIMI_K2_SPECIAL_TOKENS for reuse"
```

---

### Task 2: Create the K2.5 module

**Files:**
- Create: `src/tools/token-counter/tokenizers/kimi-k2-5.js`

- [ ] **Step 1: Write the file**

```js
import kimiK2, { KIMI_K2_SPECIAL_TOKENS } from './kimi-k2.js'

// Kimi K2.5 (https://modelscope.cn/models/moonshotai/Kimi-K2.5) ships no
// tokenizer.json — only safetensors. ModelScope reports its 160K vocab and
// ChatML envelope match the K2.x family, so we reuse the K2.7-Code tiktoken
// file + the simple ChatML renderer already shipped under kimi-k2.js. Only
// the config (id/label) differs here. Counts match K2.5 instant-mode usage.
const { load, renderMessages } = kimiK2

const KIMI_K2_5_CONFIG = {
  id: 'kimi-k2-5',
  label: 'Kimi K2.5',
  tokenizer: {
    type: 'tiktoken',
    file: '/tokenizers/kimi-k2.tiktoken',
    specialTokens: KIMI_K2_SPECIAL_TOKENS,
  },
  chatTemplate: 'kimi-k2',
}

export default {
  config: KIMI_K2_5_CONFIG,
  load,
  renderMessages,
}
```

- [ ] **Step 2: Commit**

```bash
git -C E:/githome-windows/tools add src/tools/token-counter/tokenizers/kimi-k2-5.js
git -C E:/githome-windows/tools commit -m "feat(token-counter): add Kimi K2.5 model module"
```

---

### Task 3: Create the K2.6 module

**Files:**
- Create: `src/tools/token-counter/tokenizers/kimi-k2-6.js`

- [ ] **Step 1: Write the file**

```js
import kimiK2, { KIMI_K2_SPECIAL_TOKENS } from './kimi-k2.js'

// Kimi K2.6 (https://modelscope.cn/models/moonshotai/Kimi-K2.6) shares the
// K2.5 architecture and the K2.x family tokenizer. Same reuse story as
// kimi-k2-5.js — see that file's header comment.
const { load, renderMessages } = kimiK2

const KIMI_K2_6_CONFIG = {
  id: 'kimi-k2-6',
  label: 'Kimi K2.6',
  tokenizer: {
    type: 'tiktoken',
    file: '/tokenizers/kimi-k2.tiktoken',
    specialTokens: KIMI_K2_SPECIAL_TOKENS,
  },
  chatTemplate: 'kimi-k2',
}

export default {
  config: KIMI_K2_6_CONFIG,
  load,
  renderMessages,
}
```

- [ ] **Step 2: Commit**

```bash
git -C E:/githome-windows/tools add src/tools/token-counter/tokenizers/kimi-k2-6.js
git -C E:/githome-windows/tools commit -m "feat(token-counter): add Kimi K2.6 model module"
```

---

### Task 4: Register both modules in `MODELS`

**Files:**
- Modify: `src/tools/token-counter/token-counter.js` (imports + MODELS line)

- [ ] **Step 1: Edit imports + MODELS**

Currently:

```js
import kimiK2 from './tokenizers/kimi-k2.js'
import deepseekV4 from './tokenizers/deepseek-v4.js'
import deepseekV4Flash from './tokenizers/deepseek-v4-flash.js'

const MODELS = [kimiK2, deepseekV4, deepseekV4Flash]
```

Change to:

```js
import kimiK2 from './tokenizers/kimi-k2.js'
import deepseekV4 from './tokenizers/deepseek-v4.js'
import deepseekV4Flash from './tokenizers/deepseek-v4-flash.js'
import kimiK2_5 from './tokenizers/kimi-k2-5.js'
import kimiK2_6 from './tokenizers/kimi-k2-6.js'

const MODELS = [kimiK2, deepseekV4, deepseekV4Flash, kimiK2_5, kimiK2_6]
```

- [ ] **Step 2: Commit**

```bash
git -C E:/githome-windows/tools add src/tools/token-counter/token-counter.js
git -C E:/githome-windows/tools commit -m "feat(token-counter): register Kimi K2.5 + K2.6 in MODELS"
```

---

### Task 5: Add K2.5 tests

**Files:**
- Create: `src/tools/token-counter/tokenizers/kimi-k2-5.test.js`

- [ ] **Step 1: Write the file**

```js
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import kimiK2_5 from './kimi-k2-5.js'
import { KIMI_K2_SPECIAL_TOKENS } from './kimi-k2.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURE = readFileSync(
  path.join(__dirname, '../__fixtures__/mini.tiktoken'),
  'utf8',
)

// ChatML envelope tokens reused from kimi-k2.js.
const USER_OPEN = '<|im_user|>'
const ASSISTANT_TAIL = '<|im_assistant|>assistant<|im_middle|>'

function stubFixture() {
  vi.stubGlobal('fetch', async () => ({
    ok: true,
    status: 200,
    text: async () => FIXTURE,
  }))
}

describe('kimi-k2-5 module — config shape', () => {
  it('exposes the kimi-k2-5 config entry with the required fields', () => {
    const cfg = kimiK2_5.config
    expect(cfg.id).toBe('kimi-k2-5')
    expect(cfg.label).toBe('Kimi K2.5')
    expect(cfg.tokenizer.type).toBe('tiktoken')
    expect(cfg.tokenizer.file).toBe('/tokenizers/kimi-k2.tiktoken')
    expect(cfg.tokenizer.specialTokens).toBe(KIMI_K2_SPECIAL_TOKENS)
    expect(cfg.chatTemplate).toBe('kimi-k2')
  })
})

describe('kimi-k2-5 module — wiring smoke test', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('load() returns an adapter that encodes plain ASCII to >0 tokens', async () => {
    stubFixture()
    const adapter = await kimiK2_5.load()
    expect(typeof adapter.encode).toBe('function')
    expect(adapter.encode('hello world').length).toBeGreaterThan(0)
  })

  it('renderMessages wraps a user message with the ChatML envelope', () => {
    const out = kimiK2_5.renderMessages([{ role: 'user', content: 'hi' }])
    expect(out.startsWith(USER_OPEN)).toBe(true)
    expect(out.endsWith(ASSISTANT_TAIL)).toBe(true)
  })
})
```

- [ ] **Step 2: Run the test file**

Run: `npx vitest run src/tools/token-counter/tokenizers/kimi-k2-5.test.js`
Expected: 3 tests pass.

- [ ] **Step 3: Commit**

```bash
git -C E:/githome-windows/tools add src/tools/token-counter/tokenizers/kimi-k2-5.test.js
git -C E:/githome-windows/tools commit -m "test(token-counter): cover Kimi K2.5 config + wiring"
```

---

### Task 6: Add K2.6 tests

**Files:**
- Create: `src/tools/token-counter/tokenizers/kimi-k2-6.test.js`

- [ ] **Step 1: Write the file**

```js
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import kimiK2_6 from './kimi-k2-6.js'
import { KIMI_K2_SPECIAL_TOKENS } from './kimi-k2.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURE = readFileSync(
  path.join(__dirname, '../__fixtures__/mini.tiktoken'),
  'utf8',
)

const USER_OPEN = '<|im_user|>'
const ASSISTANT_TAIL = '<|im_assistant|>assistant<|im_middle|>'

function stubFixture() {
  vi.stubGlobal('fetch', async () => ({
    ok: true,
    status: 200,
    text: async () => FIXTURE,
  }))
}

describe('kimi-k2-6 module — config shape', () => {
  it('exposes the kimi-k2-6 config entry with the required fields', () => {
    const cfg = kimiK2_6.config
    expect(cfg.id).toBe('kimi-k2-6')
    expect(cfg.label).toBe('Kimi K2.6')
    expect(cfg.tokenizer.type).toBe('tiktoken')
    expect(cfg.tokenizer.file).toBe('/tokenizers/kimi-k2.tiktoken')
    expect(cfg.tokenizer.specialTokens).toBe(KIMI_K2_SPECIAL_TOKENS)
    expect(cfg.chatTemplate).toBe('kimi-k2')
  })
})

describe('kimi-k2-6 module — wiring smoke test', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('load() returns an adapter that encodes plain ASCII to >0 tokens', async () => {
    stubFixture()
    const adapter = await kimiK2_6.load()
    expect(typeof adapter.encode).toBe('function')
    expect(adapter.encode('hello world').length).toBeGreaterThan(0)
  })

  it('renderMessages wraps a user message with the ChatML envelope', () => {
    const out = kimiK2_6.renderMessages([{ role: 'user', content: 'hi' }])
    expect(out.startsWith(USER_OPEN)).toBe(true)
    expect(out.endsWith(ASSISTANT_TAIL)).toBe(true)
  })
})
```

- [ ] **Step 2: Run the test file**

Run: `npx vitest run src/tools/token-counter/tokenizers/kimi-k2-6.test.js`
Expected: 3 tests pass.

- [ ] **Step 3: Commit**

```bash
git -C E:/githome-windows/tools add src/tools/token-counter/tokenizers/kimi-k2-6.test.js
git -C E:/githome-windows/tools commit -m "test(token-counter): cover Kimi K2.6 config + wiring"
```

---

### Task 7: Update aggregator + full verification

**Files:**
- Modify: `src/tools/token-counter/token-counter.test.js` (line 50)

- [ ] **Step 1: Extend the expected ids**

Change line 50 from:

```js
    expect(ids).toEqual(['kimi-k2', 'deepseek-v4-pro', 'deepseek-v4-flash'])
```

to:

```js
    expect(ids).toEqual([
      'kimi-k2',
      'deepseek-v4-pro',
      'deepseek-v4-flash',
      'kimi-k2-5',
      'kimi-k2-6',
    ])
```

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: exit 0, no errors.

- [ ] **Step 3: Run full test suite**

Run: `npm run test`
Expected: all tests pass (was 788; should now be 788 + 6 = 794, allowing for the aggregator assertion no longer counting as a new test).

- [ ] **Step 4: Commit**

```bash
git -C E:/githome-windows/tools add src/tools/token-counter/token-counter.test.js
git -C E:/githome-windows/tools commit -m "test(token-counter): include Kimi K2.5 + K2.6 in aggregator assertion"
```

- [ ] **Step 5: Final state check**

Run: `git -C E:/githome-windows/tools status && git -C E:/githome-windows/tools log --oneline -10`
Expected: clean working tree; the new feature/test commits sit on top of the K2.5/K2.6 design spec commit.
