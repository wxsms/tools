# Kimi K2.5 + K2.6 models — token counter

## Context

`src/tools/token-counter/` already ships a Kimi K2 entry whose underlying
tokenizer is actually from Kimi K2.7-Code (see comment in
`tokenizers/kimi-k2.js` and `config.id === 'kimi-k2'`,
`config.label === 'Kimi K2 (K2.7-Code)'`). The same registry pattern that
added DeepSeek V4 Flash in the previous spec applies here.

Kimi K2.5 (https://modelscope.cn/models/moonshotai/Kimi-K2.5) and
Kimi K2.6 (https://modelscope.cn/models/moonshotai/Kimi-K2.6) ship only
safetensors weights on ModelScope — no `tokenizer.json` / `tokenizer_config.json`
listed in their file manifests. Both report a 160K vocabulary, the same
ChatML-style envelope tokens (`<|im_user|>`, `<|im_assistant|>`, etc.),
and the K2.6 page explicitly says "Kimi-K2.6 has the same architecture as
Kimi-K2.5." The K2.5 page says it was "built through continual pretraining…
atop Kimi-K2-Base." Conclusion: the K2.x family shares one tokenizer, and
our existing `kimi-k2.tiktoken` (sourced from K2.7-Code) is byte-compatible.

K2.5/K2.6 also support a `thinking` mode toggled via chat_template_kwargs,
which their raw `chat_template` field exposes. We are NOT porting that
template; we reuse the simple ChatML envelope renderer from `kimi-k2.js`.
Token counts will match instant-mode usage closely. (User decision.)

## Goal

Let users pick "Kimi K2.5" and "Kimi K2.6" in the model dropdown.
Counts and previews should be visually + numerically identical to the
existing Kimi K2 entry for the same input, since the tokenizer and renderer
are literally the same functions.

## Design

### Small prerequisite edit: export `KIMI_K2_SPECIAL_TOKENS` from `kimi-k2.js`

Currently `KIMI_K2_SPECIAL_TOKENS` is a module-private const in
`tokenizers/kimi-k2.js`. The new K2.5/K2.6 configs need to reference the
same 8-entry special-token map (BOS/EOS/EOT + the five ChatML envelope
tokens) so the encoder collapses them to single ids instead of byte-BPE'ing
them. To avoid duplicating the literal in two new files (DRY), add a named
export to `kimi-k2.js`:

```js
export const KIMI_K2_SPECIAL_TOKENS = { /* unchanged */ }
```

This is one keyword added to one existing line. No behavior change to
`kimi-k2.js`.

### New module: `src/tools/token-counter/tokenizers/kimi-k2-5.js`

```js
import kimiK2, { KIMI_K2_SPECIAL_TOKENS } from './kimi-k2.js'

const { load, renderMessages } = kimiK2

const CONFIG = {
  id: 'kimi-k2-5',
  label: 'Kimi K2.5',
  tokenizer: {
    type: 'tiktoken',
    file: '/tokenizers/kimi-k2.tiktoken',
    specialTokens: KIMI_K2_SPECIAL_TOKENS,
  },
  chatTemplate: 'kimi-k2',
}

export default { config: CONFIG, load, renderMessages }
```

### New module: `src/tools/token-counter/tokenizers/kimi-k2-6.js`

Identical shape to K2.5 with `id: 'kimi-k2-6'`, `label: 'Kimi K2.6'`.

### Registry: `src/tools/token-counter/token-counter.js`

Add imports and append to `MODELS` so the final array is:

```js
const MODELS = [kimiK2, deepseekV4, deepseekV4Flash, kimiK2_5, kimiK2_6]
```

### Tests: `tokenizers/kimi-k2-5.test.js` and `kimi-k2-6.test.js`

Mirror the deepseek-v4-flash test structure — config-shape assertions
followed by a load() smoke test and a renderMessages() smoke test. Use the
existing `__fixtures__/mini.tiktoken` (not the real ~5MB kimi-k2.tiktoken)
so the test fixture stays tiny. Each file:

- asserts config.id, config.label, config.tokenizer.type ('tiktoken'),
  config.tokenizer.file ('/tokenizers/kimi-k2.tiktoken'),
  config.chatTemplate ('kimi-k2'), and that
  config.tokenizer.specialTokens === KIMI_K2_SPECIAL_TOKENS (same ref,
  proving no drift).
- stubs `fetch` to return mini.tiktoken, calls `load()`, asserts
  `adapter.encode('hello world').length > 0`.
- calls `renderMessages([{role:'user', content:'hi'}])` and asserts the
  string starts with `<|im_user|>` and ends with the assistant tail.

### Orchestrator test update: `token-counter.test.js:50`

The aggregator currently expects
`['kimi-k2', 'deepseek-v4-pro', 'deepseek-v4-flash']`. After registering
both new models, it must read
`['kimi-k2', 'deepseek-v4-pro', 'deepseek-v4-flash', 'kimi-k2-5', 'kimi-k2-6']`.

## Out of scope

- No new tokenizer asset downloaded — K2.5/K2.6 reuse `kimi-k2.tiktoken`.
- No UI changes to `TokenCounter.vue` (dropdown iterates `MODEL_CONFIGS`).
- No porting of K2.5/K2.6's `thinking` mode chat template — instant-mode
  counts only.
- No changes to the DeepSeek modules.

## Risks

- If K2.5/K2.6 actually ship a slightly different special-token map (e.g. an
  extra `<|media_begin|>` token the page mentions), counts on inputs
  containing those literals would diverge by a few tokens. Easy fix later if
  it surfaces: extend `KIMI_K2_SPECIAL_TOKENS` or add a per-model override.
- Label "Kimi K2.5" / "Kimi K2.6" are my best guess from the repo URLs; can
  be tweaked any time via `config.label`.
