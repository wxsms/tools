# LLM Token 计数器 (v1: Kimi K2)

## Problem

wxsm's Kit is a pure client-side toolset with no backend. There is currently no tool for counting LLM prompt tokens. Users who want to estimate request cost / context-window usage before sending a prompt to an LLM API have to guess or use external paid services.

The user wants a token counter that supports mainstream models including OpenAI, DeepSeek, Kimi, GLM and other domestic Chinese models. But vendor tokenizer availability varies wildly:

- OpenAI: ✅ official `tiktoken` BPE files public
- Kimi K2 (Moonshot): ✅ `tiktoken.model` BPE file public on ModelScope. Verified via `moonshotai/Kimi-K2.7-Code` repo (2.8 MB, ASCII); `moonshotai/Kimi-K2` repo also carries an equivalent `tiktoken.model`. v1 vendors the K2.7-Code version.
- DeepSeek-V3: ✅ HF `tokenizer.json` public but requires HF-tokenizer runtime
- Llama 3: ✅ HF `tokenizer.json` public, same path as DeepSeek
- Claude: ❌ Anthropic has not published a browser-runnable tokenizer
- GLM-4: ❌ open-source GLM uses Python custom loader (`trust_remote_code`), no JS port

Verification during design confirmed that Kimi K2.7-Code's `tiktoken.model` (2.8 MB, downloaded from ModelScope resolve path) is standard tiktoken BPE text format (`<base64>\t<rank>` per line), directly loadable by `js-tiktoken`.

## Goal

Build a v1 that proves the architecture with a single working model (Kimi K2), with a declarative model registry so adding OpenAI / DeepSeek / Llama 3 later is a config-only change. GLM and Claude stay out of scope.

Tool must support:
1. Plain-text mode — count tokens of a single text blob
2. Messages mode — count tokens of a `[{role, content}]` array using Kimi K2's chat template
3. Visual token preview — each token rendered as a colored chip, types distinguished by color
4. Both modes share the same tokenizer; switching modes is a UI-level concern only

## Non-goals (v1)

- No Claude / GLM support (no browser-runnable tokenizer published by vendor)
- No tool_calls / image / reasoning_content rendering in messages mode (only plain-text `content`)
- No cost calculation (price × tokens) — can be added later as a UI extension
- No Web Worker — single-threaded JS is fast enough for expected inputs with debounce
- No virtual scrolling for preview — hard cap at 500 tokens in the preview DOM

## Approach

Use `js-tiktoken` (pure JS port, no WASM, ~50 KB minified) to parse the vendored `tiktoken.model` BPE file. The file lives in `public/tokenizers/` and is fetch-loaded lazily on first use, then cached for the session. Special tokens (from `tokenizer_config.json`'s `added_tokens_decoder`) are merged into the encoder at construction time.

Messages-mode tokenization uses a hand-written JS port of Kimi K2's `chat_template.jinja`, valid for the plain-text-content subset only.

A declarative `MODEL_CONFIGS` array is the only place to edit when adding a model.

## File structure

```
src/tools/token-counter/
├── TokenCounter.vue              # View: tab switch + input + result + token preview
├── token-counter.js              # Core pure functions:
│                                 #   - MODEL_CONFIGS (declarative model registry)
│                                 #   - loadTokenizer(modelId) → Promise<Tiktoken>, cached
│                                 #   - countTokens(text, encoder) → number
│                                 #   - renderKimiMessages(messages) → string
│                                 #   - getEncoder(modelId) → sync cached accessor
├── token-counter.test.js         # Pure-function unit tests
├── TokenCounter.component.test.js # Component interaction tests
└── __fixtures__/
    └── mini.tiktoken             # First 100 lines of kimi-k2.tiktoken, test fixture

public/tokenizers/
└── kimi-k2.tiktoken              # Vendored BPE file (2.8 MB, ASCII text)
```

## Core API (`token-counter.js`)

### Model registry

```js
export const MODEL_CONFIGS = [
  {
    id: 'kimi-k2',
    label: 'Kimi K2 (K2.7-Code)',
    tokenizer: {
      type: 'tiktoken',
      file: '/tokenizers/kimi-k2.tiktoken',
      specialTokens: {
        '<|im_end|>': 163586,
        '<|im_user|>': 163587,
        '<|im_assistant|>': 163588,
        '<|im_system|>': 163594,
        '<|im_middle|>': 163601,
        '[BOS]': 163584,
        '[EOS]': 163585,
        '[EOT]': 163593,
        // ... full set from tokenizer_config.json added_tokens_decoder
      },
    },
    chatTemplate: 'kimi-k2',
  },
]
```

Adding OpenAI / DeepSeek / Llama 3 later = add one entry to this array + vendor the vocab file. No core code changes.

### `loadTokenizer(modelId) → Promise<Tiktoken>`

- Module-level `Map<modelId, Tiktoken>` cache; second call returns cached, no re-fetch
- `fetch(config.tokenizer.file)` → `loadTiktokenBPE(text)` from `js-tiktoken` → construct `Tiktoken` with BPE ranks + `special_tokens` map + `pat_str` regex pattern
- The `pat_str` (BPE pre-split regex) for Kimi K2 is not published as a tidy string; `tokenizer_config.json` does not carry it. v1 uses the same pattern as `o200k_base` (OpenAI's latest encoding, which Kimi's tokenizer closely mirrors — both are 128k vocab ChatML-style BPE). If implementation reveals a divergence on specific inputs, this is the place to revisit.
- Throws on fetch failure or parse failure; caller (component) catches and shows error UI

### `countTokens(text, encoder) → number`

- `encoder.encode(text).length`
- Pure, no side effects

### `renderKimiMessages(messages) → string`

JS port of Kimi K2's `chat_template.jinja`, v1 subset (plain-text content only). Template:

```
for each msg in messages:
  role_token = {
    'user':      '<|im_user|>',
    'assistant': '<|im_assistant|>',
    'system':    '<|im_system|>',
  }[msg.role]
  name = msg.name || msg.role
  output += role_token + name + '<|im_middle|>' + msg.content + '<|im_end|>'

# append open assistant header (simulates API request awaiting response)
output += '<|im_assistant|>assistant<|im_middle|>'
```

Tool calls, images, reasoning_content — not in v1.

### `getEncoder(modelId)`

Sync accessor returning the cached `Tiktoken` (or `null` if not yet loaded). The component uses this in its reactive compute path; if `null`, kicks off `loadTokenizer` and re-computes when ready.

## UI (`TokenCounter.vue`)

### Layout

```
┌─────────────────────────────────────────┐
│ Token 计数器                              │
│ [纯文本] [Messages]  [模型: Kimi K2 ▾]   │
│                                          │
│ ┌─ 输入区 ────────────────────────┐    │
│ │ textarea (plain-text mode)      │    │
│ │  or messages row editor         │    │
│ └───────────────────────────────┘    │
│                                          │
│ ┌─ 结果 ─────────────────────────┐     │
│ │ Token 数: 123   字符: 456      │     │
│ └────────────────────────────────┘     │
│                                          │
│ ┌─ Token 预览 ────────────────────┐    │
│ │ [He][llo ][, ][wor][ld!]...    │    │
│ └────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

### Mode switch

Two buttons (`纯文本` / `Messages`) toggle `mode` ref, mirroring existing tools' pattern (`url-encode` uri/component, `timestamp` 10/13). Both modes share the same result + preview area below.

### Model dropdown

v1 has one option (Kimi K2). Dropdown control is kept (not a disabled button) so adding models later is just registry extension. Switching model triggers `loadTokenizer` for the new id; loading state shown.

### Input area

**Plain-text mode:** single large `textarea`, placeholder `"输入文本..."`.

**Messages mode:** vertical list of message rows. Each row:
- Role dropdown: `system` / `user` / `assistant`
- Content `textarea`
- Delete button (trash icon)
- "Add message" button at bottom appends a new row (default role `user`).
- One empty `system` row is pre-populated when entering messages mode with an empty message list (matches common LLM playground habits). Switching back and forth does not wipe existing messages.

### Result area

- Total token count, large text
- Character count + byte count as secondary info
- Copy button (clipboard pattern from `Base64.vue`)
- Clear button (trash icon, bottom right) clears all input

### Token preview

Always visible (no collapse). Renders each token as a colored chip:

**Color by token type:**
- Normal text token → blue-tinted background
- Special token (`<|im_end|>` etc.) → orange/red-tinted background
- Whitespace token (space / newline / tab) → grey background, displayed as `·` / `⏎` / `\t` placeholders
- Numeric token → green-tinted background

**Per-chip tooltip (hover):** shows `rank: 1234, bytes: 3`.

**Large input cap:** only first 500 tokens rendered. If total exceeds 500, a footer note `... 还有 N 个 token 未显示` appears.

### Loading state

On first mount or model switch, while `loadTokenizer` resolves, result + preview show `加载分词器中...` with a spinner. Input area remains editable; recompute happens when load completes.

### Error state

If tokenizer fetch/parse fails:
- Result area shows red error text `分词器加载失败`
- A `重试` button appears; clicking clears the cache entry and re-invokes `loadTokenizer`.

### Lifecycle

- `onMounted`: pre-fetch `loadTokenizer('kimi-k2')` so first input has zero wait
- Encoder is module-level cached, never evicted during page session (memory cost ~5–10 MB, acceptable)

## Performance

- **Debounce 200 ms** on textarea input; avoids re-encoding on every keystroke for large inputs
- **Encoder cached** at module scope — one-time 2.8 MB parse per session
- **Preview cap 500 tokens** — DOM stays bounded
- **No Web Worker** — single-threaded encode is sub-100 ms even for 100k-char inputs; debounce absorbs the rest. Worker complexity not justified.

## Error handling

- `fetch` failure (404 / network) → error state UI with retry button
- Parse failure (corrupt file) → same error state
- Empty input → token count 0, preview empty, no error
- Clipboard write failure → silent catch (matches `Base64.vue` pattern)

## Routing & menu

Register the tool in three places (per CLAUDE.md):

1. **`src/router.js`** — import `TokenCounter.vue` and add to `components` map: `'/token-counter': TokenCounter`
2. **`src/routes.js`** — add: `{ path: '/token-counter', meta: { title: 'Token 计数器', description: '估算 LLM 提示词的 token 数量,支持纯文本与 messages 对话结构,可视化展示分词结果' } }`
3. **`src/tools.js`** — add to existing `LLM` group (alongside `kv-cache`):
   ```js
   {
     name: 'Token 计数器',
     path: '/token-counter',
     desc: '估算 LLM 提示词 token 数,支持纯文本与 messages 模式,可视化分词',
     icon: ChatBubbleBottomCenterTextIcon,
   }
   ```
   Import `ChatBubbleBottomCenterTextIcon` from `@heroicons/vue/24/outline` (doesn't conflict with `kv-cache`'s `CpuChipIcon`).

## Dependencies

Add to `package.json` `dependencies`:
- `js-tiktoken` — pure JS tiktoken port, no WASM, browser-bundler friendly

No other new deps. `@heroicons/vue` already in project.

## Testing

### `token-counter.test.js` (pure functions)

Fixtures: `__fixtures__/mini.tiktoken` = first 100 lines of `kimi-k2.tiktoken`. Test `fetch` by stubbing global with fixture content.

Cases:
- `loadTokenizer` second call does not re-fetch (cache hit)
- `loadTokenizer` throws on fetch failure (mock `fetch` to reject / 404)
- BPE known-answer: from file head `IQ== 0` (byte `!` 0x21 → rank 0), `Ig== 1` (byte `"` 0x22 → rank 1) — assert `encoder.encode('!').length === 1`, `encoder.encode('!"').length === 2`
- Special token encoded as single token: `encoder.encode('<|im_end|>').length === 1`
- `countTokens('hello', enc) > 0`; `countTokens('', enc) === 0`
- `renderKimiMessages` single user message → `<|im_user|>user<|im_middle|>hi<|im_end|>`
- `renderKimiMessages` system + user → correct order and concatenation
- `renderKimiMessages` appends open `<|im_assistant|>assistant<|im_middle|>` at end
- End-to-end: `countTokens(renderKimiMessages([{role:'user',content:'hi'}]), encoder) > countTokens('hi', encoder)` — at least 4 special tokens (`<|im_user|>`, `user`, `<|im_middle|>`, `<|im_end|>`, plus trailing `<|im_assistant|>...`) make this strictly greater. Assert `>` (strict).

### `TokenCounter.component.test.js` (UI interactions)

Mount with global `fetch` stubbed to return `mini.tiktoken` content. Cases (mirroring `kv-cache` component test scope):
- Renders title `Token 计数器`
- Tab switch 纯文本 ↔ Messages toggles input area
- Plain-text input updates token count reactively
- Messages mode: add / delete message rows
- Token preview chips render with type-distinguishing classes (at least: presence of chip container, count of chips ≤ 500)
- Error state: stub `fetch` to reject → error text + retry button visible
- Model dropdown renders (single option v1)

## Open questions / future work

- v2: add OpenAI (`o200k_base`, `cl100k_base`) — same `js-tiktoken` path, just new vocab file + registry entry
- v2: add DeepSeek-V3 / Llama 3 via `@mlc-ai/tokenizers` HF runtime (~5 MB per model `tokenizer.json`)
- v2: tool_calls / image / reasoning_content rendering in messages mode
- v2: cost calculation (price × token count, with per-model pricing table)
- Future: if Anthropic / Zhipu publish browser-runnable tokenizers, add via registry; current architecture supports it without core changes

## Scope change log

### 2026-07-09 — DeepSeek-V4-Pro added to v1

Originally listed as v2 future work; pulled into v1 after the user requested it.

- **Tokenizer source**: `tokenizer.json` (6.4 MB, HuggingFace format) vendored at `public/tokenizers/deepseek-v4-pro.json`. Downloaded from `modelscope.cn/models/deepseek-ai/DeepSeek-V4-Pro`.
- **Runtime**: New `@huggingface/tokenizers` 0.1.3 dependency (pure-JS, no WASM, ~300 KB unpacked). The `MODEL_CONFIGS` `tokenizer.type` field now selects between `'tiktoken'` (Kimi K2 path) and `'hf'` (DeepSeek path). `loadTokenizer(modelId)` returns a uniform adapter `{ encode(text), decodeId(id) }` regardless of runtime, so the component never branches on runtime.
- **Chat template**: Ported from `encoding_dsv4.py` on the ModelScope repo — `renderDeepSeekV4Messages(messages)` covers the chat-mode (`thinking_mode="chat"`), plain-text-content subset. Renders BOS once at start, system content unwrapped, user turns wrapped in `<｜User｜>`, completed assistant turns wrapped in `<｜Assistant｜>` + thinking-end + content + EOS, and an open-assistant tail `<｜Assistant｜>` + thinking-end appended at the end.
- **Deviation from upstream**: The HF tokenizer.json does not auto-insert BOS/EOS via post-processor (only via `add_special_tokens=true`, but our config doesn't trigger that path). So when the rendered envelope (which contains the BOS string `<｜begin▁of▁sentence｜>` as a literal substring) is fed to `adapter.encode`, the special-token text is byte-BPE'd rather than collapsed to single IDs. This inflates the count by ~5–10 tokens per envelope; acceptable for v1 "estimate" semantics. Revisit if exact-match with server-side counts becomes a requirement.
- **Chat-template dispatch**: `renderMessages(modelId, messages)` is the new public renderer; `renderKimiMessages` is kept exported for back-compat with existing tests.
- **Test impact**: 10 new tests added (4 HF-loader behavior, 5 chat-template dispatch + DeepSeek render, 1 DeepSeek end-to-end). The pre-existing "encodes `<|im_end|>` as a single special token" test was removed — it relied on calling the raw `Tiktoken.encode` with runtime-specific args, which the adapter interface deliberately hides. Special-token registration is now verified indirectly via the end-to-end test.
- **Component test tick bumps**: Error-state tests now flush 6 `nextTick()`s (was 4) because the adapter-wrapping adds ~2 more microtask drains on the rejection path.

