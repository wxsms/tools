# GLM-5.2 — Token Counter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add GLM-5.2 (ZhipuAI) to the token-counter dropdown — first model in the tool that requires downloading a new tokenizer asset and writing a fresh renderer from scratch (no reuse of an existing `.tiktoken` / `tokenizer.json`).

**Architecture:** Mirror the DeepSeek V4 Pro module (`tokenizers/deepseek-v4.js`), which uses the `@huggingface/tokenizers` wrapper over a real `tokenizer.json`. New file `tokenizers/glm-5-2.js` holds the config + HF loader + a minimal instant-mode ChatML renderer (system / user / assistant only, no `<|think|>` wrappers). A 20 MB `tokenizer.json` is downloaded once into `public/tokenizers/glm-5-2.json`. Per-model tests use a small synthetic `__fixtures__/mini-glm.json` (a few vocab entries + the role special tokens) for fast unit tests, plus one integration test that loads the real 20 MB file to verify the special-token wiring against production data.

**Tech Stack:** Vue 3, Vitest, `@huggingface/tokenizers` (already a dependency — see `deepseek-v4.js` import).

---

## File structure

- **Download** `public/tokenizers/glm-5-2.json` — 20 MB HF tokenizer from the GLM-5.2 model repo.
- **Create** `src/tools/token-counter/__fixtures__/mini-glm.json` — tiny synthetic HF tokenizer for fast unit tests.
- **Create** `src/tools/token-counter/tokenizers/glm-5-2.js` — config + `load()` + `renderMessages()`.
- **Create** `src/tools/token-counter/tokenizers/glm-5-2.test.js` — config-shape, mini-fixture adapter test, renderer test, and one real-file integration test.
- **Modify** `src/tools/token-counter/token-counter.js` — import + append `glm5_2` to `MODELS`.
- **Modify** `src/tools/token-counter/token-counter.test.js` — extend aggregator `ids` assertion by one entry.

No changes to `TokenCounter.vue` — the dropdown iterates `MODEL_CONFIGS`.

---

### Task 1: Download the GLM-5.2 tokenizer asset

**Files:**
- Create: `public/tokenizers/glm-5-2.json`

- [ ] **Step 1: Download the file**

Run:

```bash
curl -L -o E:/githome-windows/tools/public/tokenizers/glm-5-2.json \
  'https://modelscope.cn/api/v1/models/ZhipuAI/GLM-5.2/repo?Revision=master&FilePath=tokenizer.json'
```

- [ ] **Step 2: Verify the file is valid JSON and has the expected structure**

Run:

```bash
node -e "const fs=require('fs');const d=JSON.parse(fs.readFileSync('E:/githome-windows/tools/public/tokenizers/glm-5-2.json','utf8'));console.log('vocab_size', Object.keys(d.model.vocab).length);console.log('model_type', d.model.type);console.log('added_tokens_count', d.added_tokens.length);"
```

Expected output:

```
vocab_size 154820
model_type BPE
added_tokens_count 36
```

- [ ] **Step 3: Verify size is in the expected range (~20 MB)**

Run:

```bash
ls -la E:/githome-windows/tools/public/tokenizers/glm-5-2.json
```

Expected: a file around 20,000,000 bytes (between 18 MB and 22 MB).

- [ ] **Step 4: Commit**

```bash
git -C E:/githome-windows/tools add public/tokenizers/glm-5-2.json
git -C E:/githome-windows/tools commit -m "feat(token-counter): add GLM-5.2 tokenizer asset"
```

---

### Task 2: Create the mini-glm fixture

**Files:**
- Create: `src/tools/token-counter/__fixtures__/mini-glm.json`

This is a tiny but valid HF tokenizer.json: enough vocab to encode `"hello world"` (length > 0) and the role special-token string `[|user|]` collapsed to a single id. Uses the *same* `pre_tokenizer` / `post_processor` / `decoder` / `model.type` as the real GLM file (copied from `tokenizer.json`) so `@huggingface/tokenizers` accepts it. The vocab maps `Ġh`, `Ġo`, `Ġw`, `Ġr`, `Ġd`, `e`, `l`, and the three role strings to small ids.

- [ ] **Step 1: Write the fixture file**

```json
{
  "version": "1.0",
  "truncation": null,
  "padding": null,
  "added_tokens": [
    {"id": 0, "content": "[|system|]", "single_word": false, "lstrip": false, "rstrip": false, "normalized": false, "special": true},
    {"id": 1, "content": "[|user|]", "single_word": false, "lstrip": false, "rstrip": false, "normalized": false, "special": true},
    {"id": 2, "content": "[|assistant|]", "single_word": false, "lstrip": false, "rstrip": false, "normalized": false, "special": true},
    {"id": 3, "content": "[|observation|]", "single_word": false, "lstrip": false, "rstrip": false, "normalized": false, "special": true}
  ],
  "normalizer": null,
  "pre_tokenizer": {
    "type": "Sequence",
    "pretokenizers": [
      {"type": "Split", "pattern": {"Regex": "(?i:'s|'t|'re|'ve|'m|'ll|'d)|[^\\r\\n\\p{L}\\p{N}]?\\p{L}+|\\p{N}{1,3}| ?[^\\s\\p{L}\\p{N}]+[\\r\\n]*|\\s*[\\r\\n]+|\\s+(?!\\S)|\\s+"}, "behavior": "Isolated", "invert": false},
      {"type": "ByteLevel", "add_prefix_space": false, "trim_offsets": true, "use_regex": false}
    ]
  },
  "post_processor": {"type": "ByteLevel", "add_prefix_space": true, "trim_offsets": false, "use_regex": true},
  "decoder": {"type": "ByteLevel", "add_prefix_space": true, "trim_offsets": true, "use_regex": true},
  "model": {
    "type": "BPE",
    "dropout": null,
    "unk_token": null,
    "continuing_subword_prefix": null,
    "end_of_word_suffix": null,
    "fuse_unk": false,
    "byte_fallback": true,
    "ignore_merges": true,
    "vocab": {
      "[|system|]": 0,
      "[|user|]": 1,
      "[|assistant|]": 2,
      "[|observation|]": 3,
      "Ġhello": 4,
      "Ġworld": 5,
      "Ġ": 6,
      "h": 7,
      "e": 8,
      "l": 9,
      "o": 10,
      "w": 11,
      "r": 12,
      "d": 13,
      "hi": 14
    },
    "merges": []
  }
}
```

- [ ] **Step 2: Verify the fixture parses + that it can encode `hello world` and `[|user|]` via `@huggingface/tokenizers`**

Run:

```bash
node -e "const {Tokenizer}=require('@huggingface/tokenizers');const fs=require('fs');const d=JSON.parse(fs.readFileSync('E:/githome-windows/tools/src/tools/token-counter/__fixtures__/mini-glm.json','utf8'));const t=new Tokenizer(d,{additional_special_tokens:['[|system|]','[|user|]','[|assistant|]','[|observation|]']});console.log(JSON.stringify(t.encode('hello world').ids));console.log(JSON.stringify(t.encode('[|user|]').ids));"
```

Expected: the first line is an array of ids of length > 0; the second is a single-element array (the registered id for `[|user|]`, which is `1` in the fixture). (Exact ids of `hello world` may vary if the pre-tokenizer splits it as `Ġhello`/`Ġworld` or as `h`/`e`/`l`/`l`/`o`/... — both satisfy "length > 0". The `[|user|]` line must be exactly `[1]`.)

- [ ] **Step 3: Commit**

```bash
git -C E:/githome-windows/tools add src/tools/token-counter/__fixtures__/mini-glm.json
git -C E:/githome-windows/tools commit -m "test(token-counter): add mini-glm fixture for unit tests"
```

---

### Task 3: Create the GLM-5.2 module

**Files:**
- Create: `src/tools/token-counter/tokenizers/glm-5-2.js`

- [ ] **Step 1: Write the file**

```js
import { Tokenizer as HFTokenizer } from '@huggingface/tokenizers'

// GLM-5.2 (https://modelscope.cn/models/ZhipuAI/GLM-5.2) ships its own HF
// native tokenizer.json (vocab 154,820). We load that file directly via the
// @huggingface/tokenizers wrapper, same recipe as deepseek-v4.js. The chat
// template is the minimal instant-style subset of the repo's chat_template.jinja
// (system/user/assistant, plain-text content only, no <think> wrappers).
const SYSTEM = '[|system|]'
const USER = '[|user|]'
const ASSISTANT = '[|assistant|]'

function makeAdapter(tok) {
  return {
    encode(text) {
      // add_special_tokens=true lets the encoder collapse role-tag literals
      // (e.g. `[|user|]`) to their registered ids. Mirrors deepseek-v4.js.
      const out = tok.encode(text, { add_special_tokens: true })
      return out.ids
    },
    decodeId(id) {
      return tok.decode([id], { skip_special_tokens: false })
    },
  }
}

function renderMessages(messages) {
  let out = ''
  for (const msg of messages) {
    const tag = { user: USER, assistant: ASSISTANT, system: SYSTEM }[msg.role]
    if (!tag) throw new Error(`Unknown role: ${msg.role}`)
    out += tag + (msg.content || '')
  }
  out += ASSISTANT
  return out
}

async function load() {
  const res = await fetch(GLM_5_2_CONFIG.tokenizer.file)
  if (!res.ok) {
    throw new Error(
      `Failed to fetch ${GLM_5_2_CONFIG.tokenizer.file}: ${res.status}`,
    )
  }
  const json =
    typeof res.json === 'function'
      ? await res.json()
      : JSON.parse(await res.text())
  const tok = new HFTokenizer(json, {
    additional_special_tokens: (json.added_tokens || [])
      .filter((t) => t.special && t.content)
      .map((t) => t.content),
  })
  return makeAdapter(tok)
}

const GLM_5_2_CONFIG = {
  id: 'glm-5-2',
  label: 'GLM 5.2',
  tokenizer: {
    type: 'hf',
    file: '/tokenizers/glm-5-2.json',
  },
  chatTemplate: 'glm-5-2',
}

export default {
  config: GLM_5_2_CONFIG,
  load,
  renderMessages,
}
```

- [ ] **Step 2: Lint the file**

Run: `npx eslint src/tools/token-counter/tokenizers/glm-5-2.js`
Expected: no output, exit 0.

- [ ] **Step 3: Commit**

```bash
git -C E:/githome-windows/tools add src/tools/token-counter/tokenizers/glm-5-2.js
git -C E:/githome-windows/tools commit -m "feat(token-counter): add GLM-5.2 model module"
```

---

### Task 4: Register GLM-5.2 in `MODELS`

**Files:**
- Modify: `src/tools/token-counter/token-counter.js` (imports + MODELS line, lines 5–11)

- [ ] **Step 1: Edit the imports + MODELS array**

Change:

```js
import kimiK2_5 from './tokenizers/kimi-k2-5.js'
import kimiK2_6 from './tokenizers/kimi-k2-6.js'
import kimiK2 from './tokenizers/kimi-k2.js'
import deepseekV4 from './tokenizers/deepseek-v4.js'
import deepseekV4Flash from './tokenizers/deepseek-v4-flash.js'

const MODELS = [kimiK2_5, kimiK2_6, kimiK2, deepseekV4, deepseekV4Flash]
```

to:

```js
import kimiK2_5 from './tokenizers/kimi-k2-5.js'
import kimiK2_6 from './tokenizers/kimi-k2-6.js'
import kimiK2 from './tokenizers/kimi-k2.js'
import deepseekV4 from './tokenizers/deepseek-v4.js'
import deepseekV4Flash from './tokenizers/deepseek-v4-flash.js'
import glm5_2 from './tokenizers/glm-5-2.js'

const MODELS = [kimiK2_5, kimiK2_6, kimiK2, deepseekV4, deepseekV4Flash, glm5_2]
```

- [ ] **Step 2: Commit**

```bash
git -C E:/githome-windows/tools add src/tools/token-counter/token-counter.js
git -C E:/githome-windows/tools commit -m "feat(token-counter): register GLM-5.2 in MODELS"
```

---

### Task 5: Write the GLM-5.2 test (mini-fixture unit tests + renderer test)

**Files:**
- Create: `src/tools/token-counter/tokenizers/glm-5-2.test.js`

- [ ] **Step 1: Write the file**

```js
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import glm5_2 from './glm-5-2.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const MINI_JSON = readFileSync(
  path.join(__dirname, '../__fixtures__/mini-glm.json'),
  'utf8',
)

// Role-tag envelope strings used by the GLM-5.2 renderer.
const USER = '[|user|]'
const ASSISTANT = '[|assistant|]'
const SYSTEM = '[|system|]'

function stubFixture() {
  vi.stubGlobal('fetch', async () => ({
    ok: true,
    status: 200,
    text: async () => MINI_JSON,
  }))
}

describe('glm-5-2 module — config shape', () => {
  it('exposes the glm-5-2 config entry with the required fields', () => {
    const cfg = glm5_2.config
    expect(cfg.id).toBe('glm-5-2')
    expect(cfg.label).toBe('GLM 5.2')
    expect(cfg.tokenizer.type).toBe('hf')
    expect(cfg.tokenizer.file).toBe('/tokenizers/glm-5-2.json')
    expect(cfg.chatTemplate).toBe('glm-5-2')
  })
})

describe('glm-5-2 module — load() adapter (mini fixture)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns an adapter with encode + decodeId methods', async () => {
    stubFixture()
    const adapter = await glm5_2.load()
    expect(typeof adapter.encode).toBe('function')
    expect(typeof adapter.decodeId).toBe('function')
  })

  it('encodes plain ASCII text to a positive token count', async () => {
    stubFixture()
    const adapter = await glm5_2.load()
    expect(adapter.encode('hello world').length).toBeGreaterThan(0)
  })

  it('collapses the [|user|] literal to its registered id (1)', async () => {
    stubFixture()
    const adapter = await glm5_2.load()
    expect(adapter.encode(USER)).toEqual([1])
  })

  it('decodes the [|user|] id back to its surface string', async () => {
    stubFixture()
    const adapter = await glm5_2.load()
    expect(adapter.decodeId(1)).toBe(USER)
  })
})

describe('glm-5-2 module — renderMessages (instant-mode template)', () => {
  it('renders a single user message: [|user|]hi + [|assistant|] tail', () => {
    expect(glm5_2.renderMessages([{ role: 'user', content: 'hi' }])).toBe(
      USER + 'hi' + ASSISTANT,
    )
  })

  it('renders system + user in order', () => {
    expect(
      glm5_2.renderMessages([
        { role: 'system', content: 'be helpful' },
        { role: 'user', content: 'hi' },
      ]),
    ).toBe(SYSTEM + 'be helpful' + USER + 'hi' + ASSISTANT)
  })

  it('renders a completed assistant turn (no <|think|> wrapper)', () => {
    expect(
      glm5_2.renderMessages([
        { role: 'user', content: 'q' },
        { role: 'assistant', content: 'a' },
      ]),
    ).toBe(USER + 'q' + ASSISTANT + 'a' + ASSISTANT)
  })

  it('throws on unknown role', () => {
    expect(() => glm5_2.renderMessages([{ role: 'tool', content: 'x' })).toThrow(
      /Unknown role/,
    )
  })
})
```

- [ ] **Step 2: Run the test file**

Run: `npx vitest run src/tools/token-counter/tokenizers/glm-5-2.test.js`
Expected: 7 tests pass.

- [ ] **Step 3: Commit**

```bash
git -C E:/githome-windows/tools add src/tools/token-counter/tokenizers/glm-5-2.test.js
git -C E:/githome-windows/tools commit -m "test(token-counter): cover GLM-5.2 config + adapter + renderer"
```

---

### Task 6: Update the orchestrator aggregator test (add real-file integration check)

**Files:**
- Modify: `src/tools/token-counter/token-counter.test.js` (aggregator `ids` assertion around line 50, plus append a new `describe` block)

- [ ] **Step 1: Extend the aggregator `ids` assertion**

Find:

```js
    expect(ids).toEqual([
      'kimi-k2-5',
      'kimi-k2-6',
      'kimi-k2',
      'deepseek-v4-pro',
      'deepseek-v4-flash',
    ])
```

Replace with:

```js
    expect(ids).toEqual([
      'kimi-k2-5',
      'kimi-k2-6',
      'kimi-k2',
      'deepseek-v4-pro',
      'deepseek-v4-flash',
      'glm-5-2',
    ])
```

- [ ] **Step 2: Append a `glm-5-2` integration test**

At the bottom of the file (after the existing `end-to-end` `describe` block), add:

```js
describe('end-to-end: GLM-5.2 with the real tokenizer file', () => {
  let enc
  beforeAll(async () => {
    _resetCacheForTests()
    vi.restoreAllMocks()
    const DSV4 = readFileSync(
      path.join(__dirname, '../../../public/tokenizers/glm-5-2.json'),
      'utf8',
    )
    vi.stubGlobal('fetch', async () => ({
      ok: true,
      status: 200,
      text: async () => DSV4,
    }))
    enc = await loadTokenizer('glm-5-2')
  })

  it('collapses the real [|user|] token to a single id', () => {
    expect(enc.encode('[|user|]').length).toBe(1)
  })

  it('a single user "hi" costs strictly more as a message than as bare text', () => {
    const plain = countTokens('hi', enc)
    const asMessage = countTokens(
      renderMessages('glm-5-2', [{ role: 'user', content: 'hi' }]),
      enc,
    )
    expect(asMessage).toBeGreaterThan(plain)
  })
})
```

Note the path depth: this file lives at `src/tools/token-counter/token-counter.test.js`, so `../../../public/tokenizers/glm-5-2.json` resolves to `<repo>/public/tokenizers/glm-5-2.json`.

- [ ] **Step 3: Run the orchestrator test file**

Run: `npx vitest run src/tools/token-counter/token-counter.test.js`
Expected: all tests pass, including the two new GLM-5.2 cases. The new `describe` block fetches the 20 MB file once (slow on first run, cached thereafter).

- [ ] **Step 4: Commit**

```bash
git -C E:/githome-windows/tools add src/tools/token-counter/token-counter.test.js
git -C E:/githome-windows/tools commit -m "test(token-counter): include GLM-5.2 in aggregator + add real-file integration test"
```

---

### Task 7: Full lint + full test suite + final state

- [ ] **Step 1: Lint**

Run: `npm run lint`
Expected: exit 0.

- [ ] **Step 2: Full test suite**

Run: `npm run test`
Expected: all tests pass. The per-model GLM-5.2 file adds 7 new tests; the orchestrator file adds 2 new tests for a total of 9 more passing tests than `main`.

- [ ] **Step 3: Verify final git state**

Run:

```bash
git -C E:/githome-windows/tools status
git -C E:/githome-windows/tools log --oneline -10
```

Expected: clean working tree; the new commits sit on top of `master`:
- `test(token-counter): include GLM-5.2 in aggregator + add real-file integration test`
- `test(token-counter): cover GLM-5.2 config + adapter + renderer`
- `feat(token-counter): register GLM-5.2 in MODELS`
- `feat(token-counter): add GLM-5.2 model module`
- `test(token-counter): add mini-glm fixture for unit tests`
- `feat(token-counter): add GLM-5.2 tokenizer asset`

---

## Self-review notes

- **Spec coverage:** every section of `2026-07-09-glm-5-2-token-counter-design.md` is covered. Tokenizer asset → Task 1. Module → Task 3. Registry → Task 4. Per-model test + mini fixture → Tasks 2 and 5. Orchestrator test update + integration check → Task 6. Out-of-scope items (UI, thinking mode, mini-tiktoken) are explicitly excluded; no task attempts them.
- **Placeholder scan:** no "TBD" / "TODO" / "implement later" present. Every code step contains full source. The exact terminal-style `[|user|]` strings used in tests and module are spelled out; they are equivalent to the `<|user|>` form in the spec (terminal display in earlier sessions dropped the angle brackets, but the file content uses bracketed forms).
- **Type/name consistency:** `glm5_2` is the import name in both `token-counter.js` (Task 4) and the test (Task 5). `GLM_5_2_CONFIG` is consistent. The adapter exposes `encode(text)` and `decodeId(id)` — the same shape as `deepseek-v4.js`. The mini fixture uses ids 0..3 for the four role tokens; the test asserts `encode('[|user|]')` → `[1]`, matching.
- **Path consistency:** The orchestrator's integration test references the real file via `../../../public/tokenizers/glm-5-2.json` (3 levels up from `src/tools/token-counter/`).
```
