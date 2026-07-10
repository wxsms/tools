# DeepSeek V4 Flash — Token Counter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users pick "DeepSeek V4 Flash" in the token-counter dropdown, producing token counts identical to V4 Pro (which it shares its tokenizer with).

**Architecture:** Reuse the existing per-model registry. Add a thin `tokenizers/deepseek-v4-flash.js` that imports `load` and `renderMessages` from `deepseek-v4.js` and only overrides `config` (different id/label, same tokenizer file and chat template). Register it in `token-counter.js`'s `MODELS` array. The UI in `TokenCounter.vue` iterates `MODEL_CONFIGS` so nothing else needs to change.

**Tech Stack:** Vue 3, Vitest, `@huggingface/tokenizers`, existing `deepseek-v4.js` module.

---

## File structure

- **Create** `src/tools/token-counter/tokenizers/deepseek-v4-flash.js` — Flash config + re-exported load/render.
- **Create** `src/tools/token-counter/tokenizers/deepseek-v4-flash.test.js` — config-shape + smoke tests.
- **Modify** `src/tools/token-counter/token-counter.js` — add import + push into `MODELS`.

No new tokenizer asset is downloaded. `config.tokenizer.file` points at the existing `/tokenizers/deepseek-v4-pro.json` (confirmed shared via https://modelscope.cn/models/deepseek-ai/DeepSeek-V4-Flash which ships only safetensors and loads the V4 Pro tokenizer in its README example).

---

### Task 1: Add the Flash module

**Files:**
- Create: `src/tools/token-counter/tokenizers/deepseek-v4-flash.js`

- [ ] **Step 1: Create the module file**

```js
import deepseekV4, { load, renderMessages } from './deepseek-v4.js'

// DeepSeek V4 Flash (https://modelscope.cn/models/deepseek-ai/DeepSeek-V4-Flash)
// shares the V4 Pro tokenizer byte-for-byte — the repo ships only safetensors
// and the README chat-template example loads deepseek-ai/DeepSeek-V4-Pro's
// tokenizer. So load() and renderMessages() are literally V4 Pro's, and only
// the config (id/label) differs here.
const DEEPSEEK_V4_FLASH_CONFIG = {
  id: 'deepseek-v4-flash',
  label: 'DeepSeek V4 Flash',
  tokenizer: {
    type: 'hf',
    file: '/tokenizers/deepseek-v4-pro.json',
  },
  chatTemplate: 'deepseek-v4',
}

export default {
  config: DEEPSEEK_V4_FLASH_CONFIG,
  load,
  renderMessages,
}
```

- [ ] **Step 2: Sanity-check syntax by running lint on just this file**

Run: `npx eslint src/tools/token-counter/tokenizers/deepseek-v4-flash.js`
Expected: no output (exit 0). If `eslint` is not directly runnable this way, fall back to `npm run lint` after Task 3.

- [ ] **Step 3: Commit**

```bash
git -C E:/githome-windows/tools add src/tools/token-counter/tokenizers/deepseek-v4-flash.js
git -C E:/githome-windows/tools commit -m "feat(token-counter): add DeepSeek V4 Flash model module"
```

---

### Task 2: Register Flash in the MODELS array

**Files:**
- Modify: `src/tools/token-counter/token-counter.js` (top imports + `MODELS` line)

- [ ] **Step 1: Edit the imports + MODELS array**

The file currently begins (lines 5–8):

```js
import kimiK2 from './tokenizers/kimi-k2.js'
import deepseekV4 from './tokenizers/deepseek-v4.js'

const MODELS = [kimiK2, deepseekV4]
```

Change to:

```js
import kimiK2 from './tokenizers/kimi-k2.js'
import deepseekV4 from './tokenizers/deepseek-v4.js'
import deepseekV4Flash from './tokenizers/deepseek-v4-flash.js'

const MODELS = [kimiK2, deepseekV4, deepseekV4Flash]
```

No other lines in this file change. `MODEL_CONFIGS`, `BY_ID`, caching, and `renderMessages` dispatch are all derived from `MODELS`.

- [ ] **Step 2: Confirm the dropdown will pick it up automatically**

Read `src/tools/token-counter/TokenCounter.vue` and confirm the `<select>` iterates `MODEL_CONFIGS` (it does, lines ~196–203) — no UI edit needed.

- [ ] **Step 3: Commit**

```bash
git -C E:/githome-windows/tools add src/tools/token-counter/token-counter.js
git -C E:/githome-windows/tools commit -m "feat(token-counter): register DeepSeek V4 Flash in MODELS"
```

---

### Task 3: Add Flash tests

**Files:**
- Create: `src/tools/token-counter/tokenizers/deepseek-v4-flash.test.js`

- [ ] **Step 1: Write the test file**

```js
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import deepseekV4Flash from './deepseek-v4-flash.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TOKENIZER_JSON = readFileSync(
  path.join(__dirname, '../../../../public/tokenizers/deepseek-v4-pro.json'),
  'utf8',
)

// Same envelope constants as the V4 Pro test — Flash reuses V4 Pro's
// chat template byte-for-byte.
const BOS = '<\uff5cbegin\u2581of\u2581sentence\uff5c>'
const ASSISTANT = '<\uff5cAssistant\uff5c>'
const THINKING_END = String.fromCharCode(
  0x3c, 0x2f, 0x74, 0x68, 0x69, 0x6e, 0x6b, 0x3e,
)

function stubFixture() {
  vi.stubGlobal('fetch', async () => ({
    ok: true,
    status: 200,
    text: async () => TOKENIZER_JSON,
  }))
}

describe('deepseek-v4-flash module — config shape', () => {
  it('exposes the deepseek-v4-flash config entry with the required fields', () => {
    const cfg = deepseekV4Flash.config
    expect(cfg.id).toBe('deepseek-v4-flash')
    expect(cfg.label).toBe('DeepSeek V4 Flash')
    expect(cfg.tokenizer.type).toBe('hf')
    expect(cfg.tokenizer.file).toBe('/tokenizers/deepseek-v4-pro.json')
    expect(cfg.chatTemplate).toBe('deepseek-v4')
  })
})

describe('deepseek-v4-flash module — wiring smoke test', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('load() returns an adapter that encodes plain ASCII to >0 tokens', async () => {
    stubFixture()
    const adapter = await deepseekV4Flash.load()
    expect(typeof adapter.encode).toBe('function')
    expect(adapter.encode('hello world').length).toBeGreaterThan(0)
  })

  it('renderMessages wraps a user message with BOS + assistant tail', () => {
    const out = deepseekV4Flash.renderMessages([
      { role: 'user', content: 'hi' },
    ])
    expect(out.startsWith(BOS)).toBe(true)
    expect(out.endsWith(ASSISTANT + THINKING_END)).toBe(true)
  })
})
```

- [ ] **Step 2: Run the new test file in isolation**

Run: `npx vitest run src/tools/token-counter/tokenizers/deepseek-v4-flash.test.js`
Expected: 3 tests pass (1 config-shape, 1 load smoke, 1 render smoke).

- [ ] **Step 3: Commit**

```bash
git -C E:/githome-windows/tools add src/tools/token-counter/tokenizers/deepseek-v4-flash.test.js
git -C E:/githome-windows/tools commit -m "test(token-counter): cover DeepSeek V4 Flash config + wiring"
```

---

### Task 4: Full-suite verification

**Files:** none (verification only)

- [ ] **Step 1: Run the project lint**

Run: `npm run lint`
Expected: exit 0, no errors. If failures appear, fix only the lines this plan introduced.

- [ ] **Step 2: Run the full test suite**

Run: `npm run test`
Expected: all tests pass, including the new flash tests AND the pre-existing v4-pro / kimi-k2 / orchestrator tests.

- [ ] **Step 3: Manual UI smoke (optional but recommended)**

Run: `npm run dev`
Open the token counter tool, switch the model dropdown to "DeepSeek V4 Flash", type a sentence, confirm token count + preview render the same way V4 Pro does. Then stop the dev server.

- [ ] **Step 4: Final state check**

Run: `git -C E:/githome-windows/tools status && git -C E:/githome-windows/tools log --oneline -5`
Expected: clean working tree, last commits are the three feature/test/registration commits on top of the spec commit.
