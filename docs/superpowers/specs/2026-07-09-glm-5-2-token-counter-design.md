# GLM-5.2 model — token counter

## Context

`src/tools/token-counter/` ships a registry-based orchestrator where each model
lives in `tokenizers/<model>.js` exporting `{ config, load, renderMessages }`.
Two precedents exist for adding a model: `kimi-k2-5.js` / `kimi-k2-6.js` (reuse
an existing `.tiktoken` from a sibling model) and `deepseek-v4-flash.js` (reuse
V4 Pro's `tokenizer.json`). Both reuse an existing tokenizer asset.

GLM-5.2 (https://modelscope.cn/models/ZhipuAI/GLM-5.2) is a new model family
with a **distinct 154,820-token BPE vocabulary** — it cannot reuse Kimi's
163k ChatML `.tiktoken` or DeepSeek's vocab. The repo ships its own
`tokenizer.json` (~20 MB, HF native BPE) plus a `chat_template.jinja`. So this
is the **first** model in the tool that requires (a) downloading a new tokenizer
asset and (b) writing a fresh renderer rather than reusing one.

Verified facts about the model (sourced from `config.json` + `tokenizer.json`
in the repo):

- `vocab_size`: 154,820
- `eos_token_id`: [154820, 154827, 154829]
- `pad_token_id`: 154820
- `model_max_length`: 1,048,576 (1M context)
- `tokenizer.json` `model.type`: `BPE`
- `pre_tokenizer` regex equals o200k_base (`(?i:'s|'t|'re|'ve|'m|'ll|'d)|[^\r\n\p{L}\p{N}]?\p{L}+|\p{N}{1,3}| ?[^\s\p{L}\p{N}]+[\r\n]*|\s*[\r\n]+|\s+(?!\S)|\s+`), with a `ByteLevel` step
- `added_tokens` lists 18 special tokens (ids 154820–154837) plus 18 non-special control tokens (154838–154855). Renderer-relevant role tags (verified from tokenizer.json): `[|system|]` (id 154826), `[|user|]` (id 154827), `[|assistant|]` (id 154828), `[|observation|]` (id 154829). EOS/pad: `[|endoftext|]` (154820), `[|sop|]` (154824), `[|eop|]` (154825). The renderer below emits the *string* forms; `add_special_tokens: true` lets the encoder collapse them to those ids.

### Chat template

The full `chat_template.jinja` (5,076 bytes, fetched during exploration) supports
tools, multi-modal content, and a "thinking" mode toggled by `enable_thinking`.
The minimal *instant-style* subset, dropping tools / multi-modal / reasoning
content (same scope as DeepSeek V4's renderer), is:

- `system`     → `[|system|]` + content
- `user`        → `[|user|]` + content
- `assistant`   → `[|assistant|]` + content (no `[|think|]`/`[|/think|]` wrapper)
- final tail    → `[|assistant|]` (open assistant turn awaiting response)

The `[|think|]` / `[|/think|]` wrappers from the jinja are **not** emitted, and
the final assistant tail is the bare `[|assistant|]` tag alone. This is a
deliberate **narrowing** of the jinja's default (which is
`[|assistant|][|think|]`) so that plain-text token counts are not inflated by
thinking-mode scaffolding. Restoring the `[|think|]` tail is a one-line change
in `renderMessages` if real chat API usage requires it.

## Goal

Let users pick "GLM 5.2" in the model dropdown and get token counts grounded in
the real GLM-5.2 tokenizer, with a plain-text ChatML-style envelope that
matches the model's instant-usage rendering.

## Design

### 1. Tokenizer asset: `public/tokenizers/glm-5-2.json`

Download the original `tokenizer.json` from
`https://modelscope.cn/api/v1/models/ZhipuAI/GLM-5.2/repo?Revision=master&FilePath=tokenizer.json`
once, save as `public/tokenizers/glm-5-2.json`. The Vite dev/prod servers expose
`public/` at the site root; the loader will `fetch('/tokenizers/glm-5-2.json')`.
Size is ~20 MB — larger than DeepSeek V4's 6 MB but the same hosting pattern.

### 2. New module: `src/tools/token-counter/tokenizers/glm-5-2.js`

Structure mirrors `deepseek-v4.js`. It uses the HF `tokenizers` wrapper (not
`tiktoken`) because the repo's `tokenizer.json` is HF-native. Key points:

- `load()` fetches `/tokenizers/glm-5-2.json`, then builds
  `new HFTokenizer(json, { additional_special_tokens: [...] })` where the
  array is derived from `json.added_tokens` filtered to `special: true` (same
  recipe as `deepseek-v4.js`). Wrap with the standard `{ encode, decodeId }`
  adapter, `add_special_tokens: true` on encode (so the ChatML envelopes the
  renderer emits as plain substrings are collapsed to single ids where
  appropriate — matching what the model sees).
- `renderMessages(messages)` produces the instant-mode envelope shown above,
  ignoring unknown roles by throwing (same convention as the other modules —
  forces the caller to filter). The role-tag constants (`[|system|]`,
  `[|user|]`, `[|assistant|]`) are plain string literals in the module, *not*
  imported ids; the tokenizer's `added_tokens` lets the encoder map them to
  single ids on its own — `add_special_tokens: true` does the lookup.

```js
const SYSTEM = '[|system|]'
const USER = '[|user|]'
const ASSISTANT = '[|assistant|]'

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
```

Config:

```js
const GLM_5_2_CONFIG = {
  id: 'glm-5-2',
  label: 'GLM 5.2',
  tokenizer: {
    type: 'hf',
    file: '/tokenizers/glm-5-2.json',
  },
  chatTemplate: 'glm-5-2',
}
```

Export `{ config: GLM_5_2_CONFIG, load, renderMessages }`.

### 3. Registry: `src/tools/token-counter/token-counter.js`

Add an import and append to `MODELS` (GLM is a new family, listed after the
existing two):

```js
import glm5_2 from './tokenizers/glm-5-2.js'
const MODELS = [kimiK2_5, kimiK2_6, kimiK2, deepseekV4, deepseekV4Flash, glm5_2]
```

### 4. Per-model test: `src/tools/token-counter/tokenizers/glm-5-2.test.js`

Mirror `kimi-k2-5.test.js` (mini-fixture pattern) **for the adapter-renderer
unit behavior**, plus a small additional real-file integration test. Specifically:

- Add a tiny synthetic JSON fixture `__fixtures__/mini-glm.json` (a few
  vocab entries + a couple of `<|...|>` special tokens) so the unit test stays
  fast (sub-200 ms). The fixture's structure mirrors the real file's
  `model.vocab`, `added_tokens`, `normalizer`, `pre_tokenizer`, `post_processor`,
  `decoder` keys, but with only the tokens needed to exercise the adapter —
  enough that `encode('hello world')` returns multiple ids and
  `encode('[|user|]')` collapses to the registered id.
- Assert config fields: `id`, `label`, `tokenizer.type === 'hf'`,
  `tokenizer.file === '/tokenizers/glm-5-2.json'`, `chatTemplate === 'glm-5-2'`.
- With the mini fixture: `adapter.encode('hello world').length > 0`, and
  `renderMessages([{role:'user', content:'hi'}])` equals
  `'[|user|]hi[|assistant|]'`.

### 5. Orchestrator test update: `src/tools/token-counter/token-counter.test.js`

Append `'glm-5-2'` to the aggregator-ids assertion:

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

Also add one cross-cutting integration test that **fetches the real
`/tokenizers/glm-5-2.json`** (cached once via `beforeAll`), loads the
adapter, and asserts: (a) `encode('[|user|]')` is a single id (proving the
real file's special-token wiring works), and (b)
`renderMessages([{role:'user', content:'hi'}])` encodes to more tokens than
the bare string `'hi'`. This is the analog of the existing
"messages cost more than bare text" checks.

## Out of scope

- No `thinking` mode, no tools, no multi-modal — instant-style plain-text
  rendering only (user-confirmed).
- No UI changes to `TokenCounter.vue` (dropdown iterates `MODEL_CONFIGS`).
- No `model_max_length` / context-window UI (DeepSeek V4 doesn't expose one
  either).
- No `.tiktoken` build of the GLM tokenizer — we use the repo's original
  `tokenizer.json` directly via the `@huggingface/tokenizers` wrapper.

## Risks

- **20 MB tokenizer asset** makes the cross-cutting integration test slow (~1-3 s
  on first load). Mitigation: only one such test, fetch cached; the per-model
  unit tests use the mini fixture.
- The instant-mode envelope is a *manual narrowing* of the full jinja: we drop
  `[|think|]`/`[|/think|]` wrappers. If the production chat API always inserts
  them even in non-thinking mode, counts drift by a fixed delta per assistant
  turn. One-line renderer tweak restores them.
- The role-tag strings are added by hand from `tokenizer.json`'s
  `added_tokens`. If GLM-5.2 ships a differing tag (e.g. `<|imm_user|>`), those
  substrings would byte-BPE rather than collapsing. The integration test guards
  against this by asserting `encode('[|user|]')` produces exactly one id.
