# LLM Token 计数器 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the "Token 计数器" tool described in `docs/superpowers/specs/2026-07-08-llm-token-counter-design.md` — a Kimi K2 v1 token counter with plain-text + messages modes, colored token-chip preview, and a declarative model registry that makes adding future models (OpenAI / DeepSeek / Llama 3) a config-only change.

**Architecture:** A pure-logic module `token-counter.js` holds a declarative `MODEL_CONFIGS` array and three pure functions (`loadTokenizer`, `countTokens`, `renderKimiMessages`, `getEncoder`). The BPE file (`kimi-k2.tiktoken`, 2.8 MB ASCII) is vendored in `public/tokenizers/` and fetched lazily on first use via the `js-tiktoken` library; the resulting `Tiktoken` instance is cached at module scope. The Vue component `TokenCounter.vue` is a single-file view with a mode toggle (纯文本 / Messages), shared result + preview area, debounced input, and loading/error states. Tool registration touches three files (`router.js`, `routes.js`, `tools.js`).

**Tech Stack:** Vue 3 (Composition API, `<script setup>`), Vite, Tailwind CSS v4 + DaisyUI v5, Vitest 4 + `@vue/test-utils` 2.4 (jsdom), `js-tiktoken` (new dep), `@heroicons/vue` (already present).

---

## File Structure

### New files

| Path | Responsibility |
|---|---|
| `src/tools/token-counter/token-counter.js` | Pure logic: `MODEL_CONFIGS` registry, `loadTokenizer(modelId)` with module-level cache, `countTokens(text, encoder)`, `renderKimiMessages(messages)`, `getEncoder(modelId)`. No Vue, no DOM. |
| `src/tools/token-counter/token-counter.test.js` | Unit tests for the above pure functions. Stubs `global.fetch`. |
| `src/tools/token-counter/TokenCounter.vue` | Vue view: mode toggle, model dropdown, input area (textarea or message rows), result, token preview, loading/error state. `<script setup>`, scoped styles. |
| `src/tools/token-counter/TokenCounter.component.test.js` | Interaction tests with `@vue/test-utils`. Stubs `global.fetch`. |
| `src/tools/token-counter/__fixtures__/mini.tiktoken` | First 100 lines of `kimi-k2.tiktoken`, used by both test files. |
| `public/tokenizers/kimi-k2.tiktoken` | Vendored Kimi K2 BPE file (2.8 MB ASCII, downloaded from ModelScope `moonshotai/Kimi-K2.7-Code` resolve path). Git-tracked. |

### Modified files

| Path | Change |
|---|---|
| `package.json` | Add `"js-tiktoken"` to `dependencies`. |
| `src/router.js` | Import `TokenCounter.vue`; add `'/token-counter': TokenCounter` to the `components` map. |
| `src/routes.js` | Append `{ path: '/token-counter', meta: { title, description } }`. |
| `src/tools.js` | Import `ChatBubbleBottomCenterTextIcon`; append entry to the existing `LLM` tool group. |

### Files referenced but not modified

- `src/tools/kv-cache/KvCache.vue`, `kv-cache.js`, `KvCache.component.test.js` — sibling tool; copy its `<script setup>` + `watch(..., { immediate: true })` + DaisyUI class conventions.
- `src/tools/url-encode/UrlEncode.vue` — CLAUDE.md's reference for textarea + live-recompute layout.
- `vitest.config.js` — confirms jsdom env, no path alias; tests use relative imports.

---

## Task 0: Vendor the BPE file and create the test fixture

**Why first:** Every later task (pure-function tests, component mount) needs the fixture file and the real BPE file present on disk. The dependency must also be installed before any `import` from `js-tiktoken` resolves.

**Files:**
- Create: `public/tokenizers/kimi-k2.tiktoken`
- Create: `src/tools/token-counter/__fixtures__/mini.tiktoken`
- Modify: `package.json`

- [ ] **Step 0.1: Add `js-tiktoken` to dependencies**

Edit `package.json` `dependencies` block. Add the line (alphabetical placement not required, but keep the block tidy):

```json
"js-tiktoken": "^1.0.14"
```

Run install:

```bash
npm install
```

Expected: install completes; `node_modules/js-tiktoken` exists; `package-lock.json` updated.

- [ ] **Step 0.2: Download the Kimi K2 BPE file from ModelScope**

The `tiktoken.model` lives at the ModelScope resolve path for `moonshotai/Kimi-K2.7-Code`. From a shell:

```bash
mkdir -p public/tokenizers
curl -L -o public/tokenizers/kimi-k2.tiktoken "https://modelscope.cn/api/v1/models/moonshotai/Kimi-K2.7-Code/repo?Revision=master&FilePath=tiktoken.model"
```

Verify the file:

```bash
wc -l public/tokenizers/kimi-k2.tiktoken
head -3 public/tokenizers/kimi-k2.tiktoken
file public/tokenizers/kimi-k2.tiktoken
```

Expected:
- `wc -l` returns ~163,000+ lines
- `head -3` shows lines like `IQ== 0`, `Ig== 1`, `Iw== 2` (base64 byte \n-collapsed rank table)
- `file` reports `ASCII text` (no binary)
- Total size ≈ 2.8 MB

If ModelScope is unreachable or returns HTML, retry; if it persistently fails, flag the issue — do not fabricate the file. The spec says verification has confirmed the file is standard tiktoken BPE text (`<base64>\t<rank>` per line); confirm the first line really is `IQ== 0` (or a tab instead of space) before continuing.

- [ ] **Step 0.3: Create the test fixture (first 100 lines)**

```bash
head -100 public/tokenizers/kimi-k2.tiktoken > src/tools/token-counter/__fixtures__/mini.tiktoken
wc -l src/tools/token-counter/__fixtures__/mini.tiktoken
```

Expected: prints `100`.

- [ ] **Step 0.4: Commit the vendored files**

```bash
git -C E:/githome-windows/tools add public/tokenizers/kimi-k2.tiktoken src/tools/token-counter/__fixtures__/mini.tiktoken package.json package-lock.json
git -C E:/githome-windows/tools commit -m "chore(token-counter): vendor Kimi K2 BPE file and add js-tiktoken dep"
```

Expected: commit succeeds.

---

## Task 1: `MODEL_CONFIGS` registry and module cache

**Goal of this task:** establish the declarative model registry and the module-level cache that `loadTokenizer` populates and `getEncoder` reads. The cache + config are tested indirectly via `loadTokenizer` later, but we land the data shape first so later tasks have something to import.

**Files:**
- Create: `src/tools/token-counter/token-counter.js`
- Create: `src/tools/token-counter/token-counter.test.js`

- [ ] **Step 1.1: Write the failing test for `MODEL_CONFIGS` shape**

Create `src/tools/token-counter/token-counter.test.js` with:

```js
import { describe, it, expect } from 'vitest'
import { MODEL_CONFIGS } from './token-counter.js'

describe('MODEL_CONFIGS', () => {
  it('exposes kimi-k2 as the first entry with the required fields', () => {
    const k2 = MODEL_CONFIGS.find((m) => m.id === 'kimi-k2')
    expect(k2).toBeDefined()
    expect(k2.label).toBe('Kimi K2 (K2.7-Code)')
    expect(k2.tokenizer.type).toBe('tiktoken')
    expect(k2.tokenizer.file).toBe('/tokenizers/kimi-k2.tiktoken')
    expect(k2.tokenizer.specialTokens).toBeInstanceOf(Object)
    expect(k2.tokenizer.specialTokens['<|im_end|>']).toBe(163586)
    expect(k2.tokenizer.specialTokens['<|im_user|>']).toBe(163587)
    expect(k2.tokenizer.specialTokens['<|im_assistant|>']).toBe(163588)
    expect(k2.tokenizer.specialTokens['<|im_system|>']).toBe(163594)
    expect(k2.tokenizer.specialTokens['<|im_middle|>']).toBe(163601)
    expect(k2.chatTemplate).toBe('kimi-k2')
  })
})
```

- [ ] **Step 1.2: Run it to verify it fails**

Run: `npx vitest run src/tools/token-counter/token-counter.test.js`
Expected: FAIL with `Failed to resolve import './token-counter.js'` (file doesn't exist yet).

- [ ] **Step 1.3: Write minimal `token-counter.js`**

Create `src/tools/token-counter/token-counter.js`:

```js
// Special-token IDs copied from Kimi K2.7-Code tokenizer_config.json
// (added_tokens_decoder — full set; see spec for the verified subset).
const KIMI_K2_SPECIAL_TOKENS = {
  '<|im_end|>': 163586,
  '<|im_user|>': 163587,
  '<|im_assistant|>': 163588,
  '<|im_system|>': 163594,
  '<|im_middle|>': 163601,
  '[BOS]': 163584,
  '[EOS]': 163585,
  '[EOT]': 163593,
}

export const MODEL_CONFIGS = [
  {
    id: 'kimi-k2',
    label: 'Kimi K2 (K2.7-Code)',
    tokenizer: {
      type: 'tiktoken',
      file: '/tokenizers/kimi-k2.tiktoken',
      specialTokens: KIMI_K2_SPECIAL_TOKENS,
    },
    chatTemplate: 'kimi-k2',
  },
]

// Module-level cache: modelId -> Promise<Tiktoken> (so concurrent first calls
// share a single fetch). Resolved instances are also retrievable synchronously
// via getEncoder().
const encoderCache = new Map()
const encoderPromiseCache = new Map()

export function _resetCacheForTests() {
  encoderCache.clear()
  encoderPromiseCache.clear()
}
```

Note: `_resetCacheForTests` is the only test-only export; it exists because the cache is otherwise module-scoped and would leak between test cases. Spec section "loadTokenizer" requires a module-level cache — this is the sanctioned reset point.

- [ ] **Step 1.4: Run test to verify it passes**

Run: `npx vitest run src/tools/token-counter/token-counter.test.js`
Expected: PASS.

- [ ] **Step 1.5: Commit**

```bash
git -C E:/githome-windows/tools add src/tools/token-counter/token-counter.js src/tools/token-counter/token-counter.test.js
git -C E:/githome-windows/tools commit -m "feat(token-counter): add MODEL_CONFIGS registry and module cache scaffolding"
```

---

## Task 2: `loadTokenizer` — cache hit, fetch failure, BPE known-answer

**Files:**
- Modify: `src/tools/token-counter/token-counter.js`
- Modify: `src/tools/token-counter/token-counter.test.js`

- [ ] **Step 2.1: Add fixture helpers and failing tests**

Append to `src/tools/token-counter/token-counter.test.js` (above the closing of the file, after the existing `describe` block):

```js
import { loadTokenizer, getEncoder, _resetCacheForTests } from './token-counter.js'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURE = readFileSync(
  path.join(__dirname, '__fixtures__/mini.tiktoken'),
  'utf8',
)

function stubFetch(contents = FIXTURE) {
  const calls = []
  const fn = async (url) => {
    calls.push(url)
    return {
      ok: true,
      status: 200,
      text: async () => contents,
    }
  }
  return { fn, calls }
}

describe('loadTokenizer', () => {
  beforeEach(() => {
    _resetCacheForTests()
    vi.restoreAllMocks()
  })

  it('does not re-fetch on the second call for the same model (cache hit)', async () => {
    const { fn, calls } = stubFetch()
    vi.stubGlobal('fetch', fn)

    await loadTokenizer('kimi-k2')
    await loadTokenizer('kimi-k2')

    expect(calls.length).toBe(1)
  })

  it('throws when fetch rejects (network error)', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new Error('network')
    })
    await expect(loadTokenizer('kimi-k2')).rejects.toThrow()
  })

  it('throws when fetch returns 404', async () => {
    vi.stubGlobal('fetch', async () => ({
      ok: false,
      status: 404,
      text: async () => 'not found',
    }))
    await expect(loadTokenizer('kimi-k2')).rejects.toThrow()
  })

  it('decodes single-byte known answers: ! -> rank 0, " -> rank 1', async () => {
    const { fn } = stubFetch()
    vi.stubGlobal('fetch', fn)
    const enc = await loadTokenizer('kimi-k2')
    expect(enc.encode('!').length).toBe(1)
    expect(enc.encode('!"').length).toBe(2)
  })

  it('encodes <|im_end|> as a single special token', async () => {
    const { fn } = stubFetch()
    vi.stubGlobal('fetch', fn)
    const enc = await loadTokenizer('kimi-k2')
    // js-tiktoken encode(text, disallowedSpecial, allowedSpecial).
    // 'all' as allowedSpecial lets the encoder treat <|...|> strings
    // as single tokens rather than splitting them.
    expect(enc.encode('<|im_end|>', [], ['all']).length).toBe(1)
  })

  it('getEncoder returns null before load and the instance after load', async () => {
    expect(getEncoder('kimi-k2')).toBeNull()
    const { fn } = stubFetch()
    vi.stubGlobal('fetch', fn)
    const enc = await loadTokenizer('kimi-k2')
    expect(getEncoder('kimi-k2')).toBe(enc)
  })
})
```

Also add `import { beforeEach, vi } from 'vitest'` to the existing top-of-file imports (it currently only imports `describe, it, expect`).

- [ ] **Step 2.2: Run tests to verify they fail**

Run: `npx vitest run src/tools/token-counter/token-counter.test.js`
Expected: FAIL — `loadTokenizer is not a function` (not yet exported).

- [ ] **Step 2.3: Implement `loadTokenizer`**

Append to `src/tools/token-counter/token-counter.js`:

```js
import { loadTiktokenBPE, Tiktoken } from 'js-tiktoken'

// o200k_base-compatible BPE pre-split regex. Kimi K2's tokenizer_config.json
// does not ship a pat_str; K2's BPE mirrors o200k_base (128k ChatML-style vocab),
// so we reuse its pattern. If a divergence surfaces on specific inputs, this
// is the one line to revisit (see spec "loadTokenizer").
const O200K_PAT_STR =
  /[^\r\n\p{L}\p{N}]?[\p{L}\p{M}]+|\p{N}{1,3}| ?[^\s\p{L}\p{N}]+[\r\n]*|\s*[\r\n]+|\s+(?!\S)|\s+/u

const CONFIG_BY_ID = new Map(MODEL_CONFIGS.map((m) => [m.id, m]))

export async function loadTokenizer(modelId) {
  if (encoderCache.has(modelId)) return encoderCache.get(modelId)
  if (encoderPromiseCache.has(modelId)) return encoderPromiseCache.get(modelId)

  const config = CONFIG_BY_ID.get(modelId)
  if (!config) throw new Error(`Unknown model: ${modelId}`)

  const promise = (async () => {
    const res = await fetch(config.tokenizer.file)
    if (!res.ok) {
      throw new Error(`Failed to fetch ${config.tokenizer.file}: ${res.status}`)
    }
    const text = await res.text()
    const bpeRanks = loadTiktokenBPE(text)
    const enc = new Tiktoken(bpeRanks, config.tokenizer.specialTokens, {
      pat_str: O200K_PAT_STR,
      unk_token: null,
    })
    encoderCache.set(modelId, enc)
    return enc
  })()

  encoderPromiseCache.set(modelId, promise)
  try {
    return await promise
  } catch (err) {
    // allow a retry on the next call rather than caching the rejection
    encoderPromiseCache.delete(modelId)
    throw err
  }
}

export function getEncoder(modelId) {
  return encoderCache.get(modelId) ?? null
}
```

- [ ] **Step 2.4: Run tests to verify they pass**

Run: `npx vitest run src/tools/token-counter/token-counter.test.js`
Expected: all 7 tests PASS (5 in `loadTokenizer` describe + 2 including `getEncoder`).

If the BPE known-answer test fails with the fixture (`!` should map to rank 0 from `IQ== 0`), inspect the fixture's first three lines — they should be `IQ== 0`, `Ig== 1`, `Iw== 2`. If the field separator is `\t` rather than a space, `loadTiktokenBPE` handles both; do not edit the fixture.

If `enc.encode('<|im_end|>', [], ['all'])` throws about an unknown signature, inspect `node_modules/js-tiktoken/dist/index.d.ts` for the exact `encode` arg order in your installed version — it has shifted between releases. The test assumes the current `(text, disallowedSpecial, allowedSpecial)` form.

- [ ] **Step 2.5: Commit**

```bash
git -C E:/githome-windows/tools add src/tools/token-counter/token-counter.js src/tools/token-counter/token-counter.test.js
git -C E:/githome-windows/tools commit -m "feat(token-counter): implement loadTokenizer with cache, fetch-error handling, and BPE known-answer tests"
```

---

## Task 3: `countTokens` and `renderKimiMessages`

**Files:**
- Modify: `src/tools/token-counter/token-counter.js`
- Modify: `src/tools/token-counter/token-counter.test.js`

- [ ] **Step 3.1: Add failing tests**

Append to `src/tools/token-counter/token-counter.test.js`:

```js
import { countTokens, renderKimiMessages } from './token-counter.js'

describe('countTokens', () => {
  let enc
  beforeEach(async () => {
    _resetCacheForTests()
    vi.restoreAllMocks()
    const { fn } = stubFetch()
    vi.stubGlobal('fetch', fn)
    enc = await loadTokenizer('kimi-k2')
  })

  it('returns 0 for the empty string', () => {
    expect(countTokens('', enc)).toBe(0)
  })

  it('returns a positive count for non-empty text', () => {
    expect(countTokens('hello world', enc)).toBeGreaterThan(0)
  })

  it('counts more tokens for longer text', () => {
    const small = countTokens('hello', enc)
    const large = countTokens('hello '.repeat(50), enc)
    expect(large).toBeGreaterThan(small)
  })
})

describe('renderKimiMessages', () => {
  it('renders a single user message with the full ChatML envelope', () => {
    expect(renderKimiMessages([{ role: 'user', content: 'hi' }])).toBe(
      '<|im_user|>user<|im_middle|>hi<|im_end|><|im_assistant|>assistant<|im_middle|>',
    )
  })

  it('renders system + user in order', () => {
    expect(
      renderKimiMessages([
        { role: 'system', content: 'be helpful' },
        { role: 'user', content: 'hi' },
      ]),
    ).toBe(
      '<|im_system|>system<|im_middle|>be helpful<|im_end|>' +
        '<|im_user|>user<|im_middle|>hi<|im_end|>' +
        '<|im_assistant|>assistant<|im_middle|>',
    )
  })

  it('uses an explicit name when provided', () => {
    expect(
      renderKimiMessages([{ role: 'user', name: 'alice', content: 'hi' }]),
    ).toBe('<|im_user|>alice<|im_middle|>hi<|im_end|><|im_assistant|>assistant<|im_middle|>')
  })

  it('appends the open assistant tail exactly once', () => {
    const out = renderKimiMessages([{ role: 'user', content: 'x' }])
    const tail = '<|im_assistant|>assistant<|im_middle|>'
    expect(out.endsWith(tail)).toBe(true)
    expect(out.indexOf(tail)).toBe(out.length - tail.length)
  })
})
```

Append the end-to-end assertion (spec calls it out explicitly):

```js
describe('end-to-end: messages mode costs more tokens than plain text', () => {
  it('a single user "hi" costs strictly more tokens as a message than as bare text', async () => {
    _resetCacheForTests()
    vi.restoreAllMocks()
    const { fn } = stubFetch()
    vi.stubGlobal('fetch', fn)
    const enc = await loadTokenizer('kimi-k2')

    const plain = countTokens('hi', enc)
    const asMessage = countTokens(
      renderKimiMessages([{ role: 'user', content: 'hi' }]),
      enc,
    )
    expect(asMessage).toBeGreaterThan(plain)
  })
})
```

- [ ] **Step 3.2: Run tests to verify they fail**

Run: `npx vitest run src/tools/token-counter/token-counter.test.js`
Expected: FAIL — `countTokens` and `renderKimiMessages` are not exported.

- [ ] **Step 3.3: Implement `countTokens` and `renderKimiMessages`**

Append to `src/tools/token-counter/token-counter.js`:

```js
export function countTokens(text, encoder) {
  if (!encoder) return 0
  return encoder.encode(text).length
}

const ROLE_OPEN_TOKEN = {
  user: '<|im_user|>',
  assistant: '<|im_assistant|>',
  system: '<|im_system|>',
}
const MIDDLE = '<|im_middle|>'
const END = '<|im_end|>'
const ASSISTANT_TAIL = '<|im_assistant|>assistant<|im_middle|>'

export function renderKimiMessages(messages) {
  let out = ''
  for (const msg of messages) {
    const open = ROLE_OPEN_TOKEN[msg.role]
    if (!open) {
      throw new Error(`Unknown role: ${msg.role}`)
    }
    const name = msg.name || msg.role
    out += open + name + MIDDLE + msg.content + END
  }
  out += ASSISTANT_TAIL
  return out
}
```

- [ ] **Step 3.4: Run tests to verify they pass**

Run: `npx vitest run src/tools/token-counter/token-counter.test.js`
Expected: all tests PASS (including end-to-end).

- [ ] **Step 3.5: Commit**

```bash
git -C E:/githome-windows/tools add src/tools/token-counter/token-counter.js src/tools/token-counter/token-counter.test.js
git -C E:/githome-windows/tools commit -m "feat(token-counter): add countTokens and renderKimiMessages with chat-template tests"
```

---

## Task 4: `TokenCounter.vue` — minimal mount + plain-text mode

**Goal:** Land the smallest possible working component: title, mode toggle, plain-text textarea, result area, with the tokenizer fetched on mount. Messages mode is added in Task 5; preview in Task 6; error/loading polish in Task 7. We build the component feature-by-feature to keep each test focused, mirroring kv-cache's pattern.

**Reference before you start:** read `src/tools/kv-cache/KvCache.vue` end-to-end. It's the closest sibling — use the same `<script setup>` shape, the same `card bg-base-200` result-card pattern, and the same `watch(..., { immediate: true })` reactive flow.

**Files:**
- Create: `src/tools/token-counter/TokenCounter.vue`
- Create: `src/tools/token-counter/TokenCounter.component.test.js`

- [ ] **Step 4.1: Write the failing component-mount test**

Create `src/tools/token-counter/TokenCounter.component.test.js`:

```js
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import TokenCounter from './TokenCounter.vue'
import { _resetCacheForTests } from './token-counter.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURE = readFileSync(
  path.join(__dirname, '__fixtures__/mini.tiktoken'),
  'utf8',
)

async function mountLoaded() {
  vi.stubGlobal('fetch', async (url) => ({
    ok: true,
    status: 200,
    text: async () => FIXTURE,
  }))
  const wrapper = mount(TokenCounter)
  // flush the onMounted fetch
  await nextTick()
  await nextTick()
  return wrapper
}

beforeEach(() => {
  _resetCacheForTests()
  vi.restoreAllMocks()
})

describe('TokenCounter.vue', () => {
  it('renders the title "Token 计数器"', async () => {
    const wrapper = await mountLoaded()
    expect(wrapper.text()).toContain('Token 计数器')
  })

  it('shows the model dropdown with kimi-k2 as an option', async () => {
    const wrapper = await mountLoaded()
    const select = wrapper.find('select')
    expect(select.exists()).toBe(true)
    expect(select.text()).toContain('Kimi K2')
  })

  it('renders the plain-text input area by default', async () => {
    const wrapper = await mountLoaded()
    expect(wrapper.find('textarea').exists()).toBe(true)
  })
})
```

- [ ] **Step 4.2: Run tests to verify they fail**

Run: `npx vitest run src/tools/token-counter/TokenCounter.component.test.js`
Expected: FAIL — `Cannot find module './TokenCounter.vue'`.

- [ ] **Step 4.3: Create the minimal component**

Create `src/tools/token-counter/TokenCounter.vue`:

```vue
<script setup>
import { ref, watch, onMounted, computed } from 'vue'
import { MODEL_CONFIGS, loadTokenizer, getEncoder, countTokens } from './token-counter.js'

const mode = ref('plain') // 'plain' | 'messages'
const activeModelId = ref(MODEL_CONFIGS[0].id)
const text = ref('')
const loading = ref(false)
const error = ref(null)
const encoderReady = ref(false)

let encoder = null

async function ensureLoaded() {
  if (encoder) return
  loading.value = true
  error.value = null
  try {
    encoder = await loadTokenizer(activeModelId.value)
    encoderReady.value = true
  } catch (e) {
    error.value = e.message || String(e)
  } finally {
    loading.value = false
  }
}

onMounted(ensureLoaded)

const tokenCount = computed(() => {
  if (!encoderReady.value || !encoder) return 0
  if (mode.value !== 'plain') return 0
  return countTokens(text.value, encoder)
})

const charCount = computed(() => text.value.length)

watch(activeModelId, () => {
  encoder = null
  encoderReady.value = false
  ensureLoaded()
})
</script>

<template>
  <div class="max-w-4xl mx-auto">
    <h1 class="text-3xl font-bold mb-6">Token 计数器</h1>

    <div class="flex flex-wrap items-center gap-2 mb-4">
      <div class="join">
        <button
          class="btn btn-sm join-item"
          :class="{ 'btn-primary': mode === 'plain' }"
          @click="mode = 'plain'"
        >纯文本</button>
        <button
          class="btn btn-sm join-item"
          :class="{ 'btn-primary': mode === 'messages' }"
          @click="mode = 'messages'"
        >Messages</button>
      </div>

      <select
        v-model="activeModelId"
        class="select select-bordered select-sm"
      >
        <option v-for="m in MODEL_CONFIGS" :key="m.id" :value="m.id">
          {{ m.label }}
        </option>
      </select>
    </div>

    <div class="form-control mb-4">
      <textarea
        v-if="mode === 'plain'"
        v-model="text"
        class="textarea textarea-bordered w-full font-mono text-sm"
        rows="10"
        placeholder="输入文本..."
      />
    </div>

    <div class="card bg-base-200 mb-4">
      <div class="card-body">
        <div v-if="loading" class="text-base-content/70">
          <span class="loading loading-spinner loading-sm"></span>
          加载分词器中...
        </div>
        <div v-else-if="error" class="alert alert-error">
          分词器加载失败:{{ error }}
        </div>
        <div v-else>
          <div class="text-2xl font-bold text-primary">
            Token 数: {{ tokenCount }}
          </div>
          <div class="divider my-1"></div>
          <div class="text-sm opacity-70">
            字符: {{ charCount }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 4.4: Run tests to verify they pass**

Run: `npx vitest run src/tools/token-counter/TokenCounter.component.test.js`
Expected: 3 tests PASS.

If the title test fails because `loading` is still true on the first `nextTick`, add one more `await nextTick()` to `mountLoaded` — jsdom needs to flush microtasks for the async `loadTokenizer` to settle. (Already accounted for above with two `nextTick` calls; if still flaky, switch to `await flushPromises` from `@vue/test-utils`.)

- [ ] **Step 4.5: Commit**

```bash
git -C E:/githome-windows/tools add src/tools/token-counter/TokenCounter.vue src/tools/token-counter/TokenCounter.component.test.js
git -C E:/githome-windows/tools commit -m "feat(token-counter): minimal component with title, mode toggle, model dropdown, plain-text count"
```

---

## Task 5: Messages mode row editor

**Files:**
- Modify: `src/tools/token-counter/TokenCounter.vue`
- Modify: `src/tools/token-counter/TokenCounter.component.test.js`

- [ ] **Step 5.1: Add failing tests for messages mode**

Append to `TokenCounter.component.test.js` (after the existing `describe` block):

```js
describe('TokenCounter.vue — messages mode', () => {
  it('toggles to messages mode on click and shows a message row', async () => {
    const wrapper = await mountLoaded()
    const buttons = wrapper.findAll('button')
    const msgBtn = buttons.find((b) => b.text().includes('Messages'))
    expect(msgBtn).toBeTruthy()
    await msgBtn.trigger('click')
    await nextTick()
    const selects = wrapper.findAll('select')
    expect(selects.length).toBeGreaterThanOrEqual(2) // model dropdown + at least 1 role
    expect(wrapper.text()).toContain('system')
  })

  it('adds a new message row on "添加消息" click', async () => {
    const wrapper = await mountLoaded()
    const msgBtn = wrapper.findAll('button').find((b) => b.text().includes('Messages'))
    await msgBtn.trigger('click')
    await nextTick()

    const addBtn = wrapper.findAll('button').find((b) => b.text().includes('添加消息'))
    expect(addBtn).toBeTruthy()
    const before = wrapper.findAll('textarea').length
    await addBtn.trigger('click')
    await nextTick()
    expect(wrapper.findAll('textarea').length).toBe(before + 1)
  })

  it('deletes a row on trash button click', async () => {
    const wrapper = await mountLoaded()
    const msgBtn = wrapper.findAll('button').find((b) => b.text().includes('Messages'))
    await msgBtn.trigger('click')
    await nextTick()

    const addBtn = wrapper.findAll('button').find((b) => b.text().includes('添加消息'))
    await addBtn.trigger('click')
    await nextTick()
    const before = wrapper.findAll('textarea').length

    const delBtn = wrapper.findAll('button').find((b) => b.attributes('title') === '删除')
    expect(delBtn).toBeTruthy()
    await delBtn.trigger('click')
    await nextTick()
    expect(wrapper.findAll('textarea').length).toBe(before - 1)
  })
})
```

- [ ] **Step 5.2: Run tests to verify they fail**

Run: `npx vitest run src/tools/token-counter/TokenCounter.component.test.js`
Expected: FAIL — the messages-mode block doesn't render or "添加消息" not found.

- [ ] **Step 5.3: Implement messages mode in the component**

In `TokenCounter.vue` `<script setup>`, replace the existing `tokenCount` and `charCount` computeds and add message-row state. Add this `import` to the existing import block:

```js
import { renderKimiMessages } from './token-counter.js'
```

Then add below the existing refs:

```js
const messages = ref([])

function ensureMessagesSeed() {
  if (mode.value === 'messages' && messages.value.length === 0) {
    messages.value = [{ role: 'system', content: '' }]
  }
}

watch(mode, ensureMessagesSeed, { immediate: true })

function addMessage() {
  messages.value.push({ role: 'user', content: '' })
}

function deleteMessage(i) {
  messages.value.splice(i, 1)
}

const tokenCount = computed(() => {
  if (!encoderReady.value || !encoder) return 0
  if (mode.value === 'plain') return countTokens(text.value, encoder)
  return countTokens(renderKimiMessages(messages.value), encoder)
})

const charCount = computed(() => {
  if (mode.value === 'plain') return text.value.length
  return messages.value.reduce((n, m) => n + (m.content?.length || 0), 0)
})
```

(Remove the previous `tokenCount`/`charCount` definitions — these replace them.)

In `<template>`, replace the input section (`<div class="form-control mb-4">...</div>`) with:

```vue
<div class="form-control mb-4">
  <textarea
    v-if="mode === 'plain'"
    v-model="text"
    class="textarea textarea-bordered w-full font-mono text-sm"
    rows="10"
    placeholder="输入文本..."
  />

  <div v-else class="flex flex-col gap-2">
    <div
      v-for="(msg, i) in messages"
      :key="i"
      class="flex gap-2 items-start"
    >
      <select v-model="msg.role" class="select select-bordered select-sm w-32">
        <option value="system">system</option>
        <option value="user">user</option>
        <option value="assistant">assistant</option>
      </select>
      <textarea
        v-model="msg.content"
        class="textarea textarea-bordered w-full font-mono text-sm"
        rows="2"
        placeholder="消息内容..."
      ></textarea>
      <button
        class="btn btn-ghost btn-sm btn-square"
        title="删除"
        @click="deleteMessage(i)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
    </div>
    <button class="btn btn-sm btn-ghost w-fit" @click="addMessage">
      + 添加消息
    </button>
  </div>
</div>
```

- [ ] **Step 5.4: Run tests to verify they pass**

Run: `npx vitest run src/tools/token-counter/TokenCounter.component.test.js`
Expected: 6 tests PASS.

- [ ] **Step 5.5: Commit**

```bash
git -C E:/githome-windows/tools add src/tools/token-counter/TokenCounter.vue src/tools/token-counter/TokenCounter.component.test.js
git -C E:/githome-windows/tools commit -m "feat(token-counter): messages-mode row editor (add/delete/pre-seeded system row)"
```

---

## Task 6: Token preview chips

**Files:**
- Modify: `src/tools/token-counter/TokenCounter.vue`
- Modify: `src/tools/token-counter/TokenCounter.component.test.js`

- [ ] **Step 6.1: Add failing tests for preview + cap**

Append to `TokenCounter.component.test.js`:

```js
describe('TokenCounter.vue — preview', () => {
  it('renders colored chips for each token, capped at 500', async () => {
    const wrapper = await mountLoaded()
    await nextTick()
    const textarea = wrapper.find('textarea')
    await textarea.setValue('hello world this is a test')
    await nextTick()
    await nextTick()
    const chips = wrapper.findAll('[data-testid="token-chip"]')
    expect(chips.length).toBeGreaterThan(0)
    expect(chips.length).toBeLessThanOrEqual(500)
  })

  it('shows an overflow note when tokens exceed 500', async () => {
    const wrapper = await mountLoaded()
    const longText = 'hello '.repeat(1000)
    await wrapper.find('textarea').setValue(longText)
    await new Promise((r) => setTimeout(r, 250))
    await nextTick()
    expect(wrapper.text()).toMatch(/还有 \d+ 个 token 未显示/)
  })
})
```

- [ ] **Step 6.2: Run tests to verify they fail**

Run: `npx vitest run src/tools/token-counter/TokenCounter.component.test.js`
Expected: FAIL — no `data-testid="token-chip"` elements.

- [ ] **Step 6.3: Implement preview + debounce in the component**

In `<script setup>` add (after existing refs, before `tokenCount`):

```js
const PREVIEW_CAP = 500
const previewTokens = ref([]) // array of { id, piece, type }
const overflowCount = ref(0)

let debounceTimer = null
function schedulePreview() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(rebuildPreview, 200)
}

function classifyToken(piece) {
  if (/^\s+$/.test(piece)) return 'whitespace'
  if (/^<\|.*\|>$/.test(piece)) return 'special'
  if (/^\d+$/.test(piece)) return 'numeric'
  return 'normal'
}

function whitespaceDisplay(s) {
  return s
    .replace(/ /g, '·')
    .replace(/\n/g, '⏎')
    .replace(/\t/g, '\\t')
}

function rebuildPreview() {
  previewTokens.value = []
  overflowCount.value = 0
  if (!encoderReady.value || !encoder) return
  const source = mode.value === 'plain' ? text.value : renderKimiMessages(messages.value)
  if (!source) return
  const ids = encoder.encode(source)
  overflowCount.value = Math.max(0, ids.length - PREVIEW_CAP)
  const shown = ids.slice(0, PREVIEW_CAP)
  previewTokens.value = shown.map((id) => {
    const bytes = encoder.decode_single_token_bytes(id)
    const piece = new TextDecoder('utf8', { fatal: false }).decode(bytes)
    return { id, piece, type: classifyToken(piece) }
  })
}

watch([text, messages, mode, encoderReady], schedulePreview, { deep: true })
onMounted(schedulePreview)
```

In `<template>`, after the result card, append:

```vue
<div class="card bg-base-200">
  <div class="card-body">
    <h2 class="card-title text-lg">Token 预览</h2>
    <div class="flex flex-wrap gap-1">
      <span
        v-for="(t, i) in previewTokens"
        :key="i"
        data-testid="token-chip"
        class="px-1 py-0.5 rounded text-xs font-mono cursor-help"
        :class="{
          'bg-blue-200/40 text-blue-900': t.type === 'normal',
          'bg-orange-200/60 text-orange-900': t.type === 'special',
          'bg-gray-300/50 text-gray-700': t.type === 'whitespace',
          'bg-green-200/40 text-green-900': t.type === 'numeric',
        }"
        :title="`rank: ${t.id}, bytes: ${t.piece.length}`"
      >
        {{ t.type === 'whitespace' ? whitespaceDisplay(t.piece) : t.piece }}
      </span>
    </div>
    <div v-if="overflowCount > 0" class="text-sm opacity-70 mt-2">
      ... 还有 {{ overflowCount }} 个 token 未显示
    </div>
  </div>
</div>
```

- [ ] **Step 6.4: Run tests to verify they pass**

Run: `npx vitest run src/tools/token-counter/TokenCounter.component.test.js`
Expected: 8 tests PASS.

If `encoder.decode_single_token_bytes` is not the exported method name in the installed `js-tiktoken` version, inspect `node_modules/js-tiktoken` and use whatever the equivalent is (the WASM-backed `@dqbd/tiktoken` used `decode_single_token_bytes`; the pure-JS `js-tiktoken` `Tiktoken` class exposes the same name). If only `encode`/`decode` exist, fall back to `encoder.decode([id])` and treat the resulting string as the chip piece.

- [ ] **Step 6.5: Commit**

```bash
git -C E:/githome-windows/tools add src/tools/token-counter/TokenCounter.vue src/tools/token-counter/TokenCounter.component.test.js
git -C E:/githome-windows/tools commit -m "feat(token-counter): colored token preview chips with 500-cap and debounce"
```

---

## Task 7: Error state with retry, copy/clear buttons

**Files:**
- Modify: `src/tools/token-counter/TokenCounter.vue`
- Modify: `src/tools/token-counter/TokenCounter.component.test.js`

- [ ] **Step 7.1: Add failing tests for error + retry**

Append to `TokenCounter.component.test.js`:

```js
describe('TokenCounter.vue — error state', () => {
  it('shows error text and a retry button when fetch fails', async () => {
    _resetCacheForTests()
    vi.stubGlobal('fetch', async () => {
      throw new Error('boom')
    })
    const wrapper = mount(TokenCounter)
    await nextTick()
    await nextTick()
    expect(wrapper.text()).toContain('分词器加载失败')
    const retryBtn = wrapper.findAll('button').find((b) => b.text().includes('重试'))
    expect(retryBtn).toBeTruthy()
  })

  it('retry re-invokes loadTokenizer and clears error on success', async () => {
    _resetCacheForTests()
    let attempt = 0
    vi.stubGlobal('fetch', async (url) => {
      attempt++
      if (attempt === 1) throw new Error('boom')
      return { ok: true, status: 200, text: async () => FIXTURE }
    })
    const wrapper = mount(TokenCounter)
    await nextTick()
    await nextTick()
    const retryBtn = wrapper.findAll('button').find((b) => b.text().includes('重试'))
    await retryBtn.trigger('click')
    await nextTick()
    await nextTick()
    expect(wrapper.text()).not.toContain('分词器加载失败')
  })
})
```

- [ ] **Step 7.2: Run tests to verify they fail**

Run: `npx vitest run src/tools/token-counter/TokenCounter.component.test.js`
Expected: FAIL — no 重试 button.

- [ ] **Step 7.3: Add retry + copy/clear in `<script setup>`**

After `ensureLoaded`:

```js
function retry() {
  encoder = null
  encoderReady.value = false
  error.value = null
  ensureLoaded()
}

const copied = ref(false)
async function copyCount() {
  try {
    await navigator.clipboard.writeText(String(tokenCount.value))
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
  } catch {
    // silent — matches Base64.vue pattern
  }
}

function clearAll() {
  text.value = ''
  messages.value =
    mode.value === 'messages' ? [{ role: 'system', content: '' }] : []
}
```

Update the result-card template to include retry, copy, clear (replace the existing `v-else-if="error"` and `v-else` blocks):

```vue
<div v-else-if="error" class="alert alert-error flex flex-col items-start">
  <span>分词器加载失败:{{ error }}</span>
  <button class="btn btn-sm btn-ghost mt-1" @click="retry">重试</button>
</div>
<div v-else>
  <div class="flex items-center justify-between">
    <div class="text-2xl font-bold text-primary">
      Token 数: {{ tokenCount }}
    </div>
    <div class="flex gap-1">
      <button class="btn btn-ghost btn-xs" @click="copyCount">
        {{ copied ? '已复制' : '复制' }}
      </button>
      <button class="btn btn-ghost btn-xs" @click="clearAll">清空</button>
    </div>
  </div>
  <div class="divider my-1"></div>
  <div class="text-sm opacity-70">字符: {{ charCount }}</div>
</div>
```

- [ ] **Step 7.4: Run tests to verify they pass**

Run: `npx vitest run src/tools/token-counter/TokenCounter.component.test.js`
Expected: 10 tests PASS.

- [ ] **Step 7.5: Commit**

```bash
git -C E:/githome-windows/tools add src/tools/token-counter/TokenCounter.vue src/tools/token-counter/TokenCounter.component.test.js
git -C E:/githome-windows/tools commit -m "feat(token-counter): error state with retry, copy/clear buttons"
```

---

## Task 8: Route + sidebar registration

**Files:**
- Modify: `src/router.js`
- Modify: `src/routes.js`
- Modify: `src/tools.js`

Before starting: open each of these three files once and read them in full so the edits below land in the right place. The codebase pattern is: `routes.js` defines `{ path, meta }` (no component); `router.js` maps `path` → component via a `components` object; `tools.js` defines sidebar groups.

- [ ] **Step 8.1: Add the route metadata**

In `src/routes.js`, append to the array (after the existing kv-cache entry, mirroring its shape):

```js
{
  path: '/token-counter',
  meta: {
    title: 'Token 计数器',
    description: '估算 LLM 提示词的 token 数量，支持纯文本与 messages 对话结构，可视化展示分词结果',
  },
},
```

- [ ] **Step 8.2: Wire the component into the router**

In `src/router.js`:

1. Add to the component import block (alongside the kv-cache import):
```js
import TokenCounter from './tools/token-counter/TokenCounter.vue'
```

2. Add to the `components` map (alongside `'/kv-cache': KvCache`):
```js
'/token-counter': TokenCounter,
```

- [ ] **Step 8.3: Add the sidebar entry**

In `src/tools.js`:

1. Add to the icon import block at the top (alphabetical within the existing import list — pick a spot that doesn't conflict):
```js
import {
  // ...existing imports...
  ChatBubbleBottomCenterTextIcon,
  // ...existing imports...
} from '@heroicons/vue/24/outline'
```

(`CpuChipIcon` is taken by kv-cache; `ChatBubbleBottomCenterTextIcon` is unused and semantically fits a token/chat tool.)

2. Append to the existing `LLM` tool group (alongside KV Cache):

```js
{
  name: 'Token 计数器',
  path: '/token-counter',
  desc: '估算 LLM 提示词 token 数，支持纯文本与 messages 模式，可视化分词',
  icon: ChatBubbleBottomCenterTextIcon,
},
```

- [ ] **Step 8.4: Verify the route renders**

Run the dev server:

```bash
npm run dev
```

Open `http://localhost:5173/token-counter` in a browser. Confirm:
- Title `Token 计数器` renders
- Model dropdown shows `Kimi K2 (K2.7-Code)`
- Plain-text mode is active by default
- Typing text updates `Token 数` and renders colored chips below
- The sidebar shows the new "Token 计数器" entry under the LLM group

If the page 404s, check that `path: '/token-counter'` is identical across `routes.js` and `router.js`.

- [ ] **Step 8.5: Commit**

```bash
git -C E:/githome-windows/tools add src/router.js src/routes.js src/tools.js
git -C E:/githome-windows/tools commit -m "feat(token-counter): register route and sidebar entry"
```

---

## Task 9: Final verification — lint, full test suite, build

**Files:** none (verification only)

- [ ] **Step 9.1: Run the full test suite**

```bash
npm run test
```

Expected: all tests PASS — existing tool tests still green, plus the new `token-counter.test.js` (10 cases) and `TokenCounter.component.test.js` (10 cases).

If anything regresses, the most likely cause is the `routes.js` addition breaking `vite-plugin-prerender-k` (it prerenders every route). A fetch-on-mount component during prerender: `vite.config.js` waits for `x-app-rendered`; since `TokenCounter.vue` renders the shell synchronously (it shows 加载分词器中… while the fetch resolves), prerender should settle. If prerender hangs, the fetch is likely not resolving under puppeteer — wrap `ensureLoaded`'s fetch in a `try/catch` that silently leaves `loading: false` on failure during prerender, or guard with `if (typeof window === 'undefined') return` at the top of `ensureLoaded`.

- [ ] **Step 9.2: Run lint**

```bash
npm run lint
```

Expected: no errors. Fix any unused imports or missing commas surfaced by eslint. Common fixups in this codebase: trailing comma in object literals, import sort order in `tools.js`.

- [ ] **Step 9.3: Run the production build**

```bash
npm run build
```

Expected: build succeeds; `dist/token-counter/` directory created by the prerender step. Total bundle size increase is reasonable (~50 KB for `js-tiktoken` gzipped — the 2.8 MB BPE file is fetched at runtime, not bundled).

- [ ] **Step 9.4: Final commit if any fixups**

```bash
git -C E:/githome-windows/tools status
```

If clean, done. If fixups exist:

```bash
git -C E:/githome-windows/tools add -A
git -C E:/githome-windows/tools commit -m "chore(token-counter): lint/build fixups"
```

---

## Notes for the implementing engineer

- **Folder naming is kebab-case** (`token-counter/`), `.vue` is PascalCase (`TokenCounter.vue`), pure-logic module is kebab-case (`token-counter.js`). This matches `kv-cache/`.
- **`<script setup>` only** — no Options API anywhere in this codebase. Use `ref`, `computed`, `watch`, `onMounted`.
- **Chinese UI strings** — match kv-cache style (full-width `，` in prose, half-width in technical phrases).
- **DaisyUI v5 + Tailwind v4** — the classes in the snippets above (`btn`, `join`, `card`, `textarea-bordered`, `alert-error`, `loading loading-spinner`) are all currently in use. Tailwind v4 is CSS-first via `@tailwindcss/vite`; no `tailwind.config.js` edits needed.
- **The BPE file is large (2.8 MB)** — git-tracked, no LFS. That's intentional and fine for this repo.
- **`_resetCacheForTests` is the only test-only export** — keep its leading underscore so it's obvious.
- **If `js-tiktoken`'s API differs from the snippets** (`decode_single_token_bytes`, `Tiktoken` constructor signature, `encode` allowed-special arg) — inspect `node_modules/js-tiktoken/dist/index.d.ts` and adjust. The library is small; the surface is stable but the exact arg order has shifted between versions.
