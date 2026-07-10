# DeepSeek V4 Flash model — token counter

## Context

`src/tools/token-counter/` already supports Kimi K2 and DeepSeek V4 Pro via a
registry pattern: each model lives in `tokenizers/<model>.js`, exporting
`{ config, load, renderMessages }`, and `token-counter.js` registers them in a
single `MODELS` array. Adding a model is meant to be "add a file + register
it, no other edits."

DeepSeek V4 Flash (https://modelscope.cn/models/deepseek-ai/DeepSeek-V4-Flash)
ships only safetensors weights — no `tokenizer.json` of its own — and its
README's chat-template example loads the V4 Pro tokenizer
(`deepseek-ai/DeepSeek-V4-Pro`). Conclusion: Flash shares the V4 Pro
tokenizer byte-for-byte and uses the same chat template.

## Goal

Let users pick "DeepSeek V4 Flash" in the model dropdown. Token counts and
chat-template rendering must match V4 Pro exactly, because the tokenizer and
template are the same.

## Design

### New module: `src/tools/token-counter/tokenizers/deepseek-v4-flash.js`

Imports `load` and `renderMessages` (and `default`) from `./deepseek-v4.js`
and exports its own default object with a Flash-specific `config`:

```js
import deepseekV4, { load, renderMessages } from './deepseek-v4.js'

const CONFIG = {
  id: 'deepseek-v4-flash',
  label: 'DeepSeek V4 Flash',
  tokenizer: {
    type: 'hf',
    file: '/tokenizers/deepseek-v4-pro.json', // shared with V4 Pro
  },
  chatTemplate: 'deepseek-v4',
}

export default { config: CONFIG, load, renderMessages }
```

`tokenizer.file` intentionally points at the V4 Pro asset — Flash has no
tokenizer file of its own and shares V4 Pro's vocab/template. `chatTemplate`
stays `'deepseek-v4'` since the chat template is identical.

### Registry: `src/tools/token-counter/token-counter.js`

Add the import and append to `MODELS`:

```js
import deepseekV4Flash from './tokenizers/deepseek-v4-flash.js'
const MODELS = [kimiK2, deepseekV4, deepseekV4Flash]
```

No other changes — `MODEL_CONFIGS`, `BY_ID`, caching, and `renderMessages`
dispatch are all driven off `MODELS`.

### Tests: `src/tools/token-counter/tokenizers/deepseek-v4-flash.test.js`

Mirror the config-shape block from `deepseek-v4.test.js`, but with Flash's
expected values, plus a minimal smoke test of `load()` + `renderMessages()`
to catch wiring regressions (not a full re-run of the V4 Pro adapter suite,
since the implementation is literally the same function):

- config.id === 'deepseek-v4-flash'
- config.label === 'DeepSeek V4 Flash'
- config.tokenizer.file === '/tokenizers/deepseek-v4-pro.json'
- config.chatTemplate === 'deepseek-v4'
- `load()` (with fetch stubbed to the v4-pro fixture) returns an adapter
  whose `encode('hello world').length > 0`
- `renderMessages([{role:'user',content:'hi'}])` starts with BOS and ends
  with the assistant tail (same constants as the v4-pro test)

## Out of scope

- No new tokenizer asset downloaded (Flash reuses v4-pro.json).
- No UI changes to `TokenCounter.vue` — the dropdown already iterates
  `MODEL_CONFIGS`, so Flash appears automatically.
- No changes to `kimi-k2.js` or `deepseek-v4.js`.

## Risks

- If DeepSeek later ships a Flash-specific tokenizer, `config.file` will need
  updating and a new asset downloaded. Single line change.
- The `label` "DeepSeek V4 Flash" is my best guess from the repo URL; if the
  official product name differs we can tweak `config.label` any time.
