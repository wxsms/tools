# KV Cache Calculator — kvcache.ai Mirror

**Date**: 2026-07-31
**Branch**: `feat/kv-cache-ai-mirror`
**Target**: Replace the current `src/tools/kv-cache/` implementation with a faithful port of [kvcache.ai's KV cache size calculator](https://kvcache.ai/tools/kv-cache-size-calculator/), using the public source from [`kvcache-ai/kvcache-blog`](https://github.com/kvcache-ai/kvcache-blog).

## Goal

Rewrite the existing KV Cache tool to be a complete mirror of kvcache.ai's algorithm, formulas, model list, and feature set. The current LMCache-derived implementation (reverse mode, DSA custom precision, 39 models, no batch/draft/linear-state/KDA support) will be fully replaced.

## Source of Truth

| Artifact | Path in upstream repo | Local use |
|---|---|---|
| Model table | `data/kv_cache_calculator/models.yaml` | Copy verbatim to `src/tools/kv-cache/models.yaml`; convert to JSON at build time |
| JS calculator | `assets/js/kv-cache-calculator.js` (1544 lines) | Port algorithm to `kv-cache.js` |
| Python reference | `packages/kvcache-simulator/src/kvcache_sim/calculator.py` (524 lines) | Cross-check formula semantics |

53 models across 12 families: DeepSeek (5), GLM (3), Kimi (3), Qwen3.6 (2), Qwen3.5 (8), Qwen3 (8), Qwen2.5 (5), Llama (3), Gemma (4), Cohere (5), MiMo (2), MiniMax (5).

## Non-Goals

- Reverse mode (GPU RAM → tokens). kvcache.ai does not have it; dropped per "完全参照" principle.
- DSA custom per-dim precision (NoPE/RoPE/Indexer bytes). kvcache.ai only offers three preset precision options (bf16/fp8/fp4); dropped.
- Architecture auto-detection (`detectArch`). kvcache.ai uses `model.formula` explicitly; dropped.
- LMCache-only models not present in kvcache.ai's table (e.g. `poolside/Laguna-XS.2`, `nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-FP8`, `openai/gpt-oss-120b`, `tencent/Hy3-preview`, `moonshotai/Kimi-K2.6` [kvcache.ai has K2.5/K2.6 but different config]). Dropped.
- Runtime YAML parsing. Use build-time conversion to JSON to avoid bundling `js-yaml`.

## File Structure

```
src/tools/kv-cache/
├── KvCache.vue                 # Rewritten: new UI matching kvcache.ai's input set
├── kv-cache.js                 # Rewritten: port of calculator.js
├── models.yaml                 # New: verbatim copy from upstream
├── models.json                 # New: generated at build time, committed to git
├── kv-cache.test.js            # Rewritten: one test case per model + per-formula edge cases
└── KvCache.component.test.js   # Rewritten: new UI interaction tests
```

Additional changes:
- `scripts/build-models-json.mjs` — new build script, runs in `vite.config.js` `buildStart` and on `npm run dev` boot.
- `vite.config.js` — add build script invocation.
- `src/tools.js` — update sidebar entry name (e.g. "KV Cache 尺寸计算器" → "KV Cache Calculator").
- Route `/kv-cache` unchanged.

## Architecture

### Module layout (`kv-cache.js`)

Single flat module, no Vue dependency. Exports:

```js
// Constants
export const BYTES_PER_GB = 1e9
export const BYTES_PER_GIB = 1024 ** 3
export const QWEN_LINEAR_CONV_BYTES = 2
export const QWEN_LINEAR_RECURRENT_BYTES = 4
export const KIMI_KDA_CONV_BYTES = 2
export const KIMI_KDA_RECURRENT_BYTES = 4

export const PRECISION_OPTIONS = { bf16_fp16: {label, bytesPerElement: 2}, fp8_int8: {...1}, fp4_int4: {...0.5} }
export const INDEXER_PRECISION_OPTIONS = { ...same shape }

export const KDA_CHECKPOINT_POLICY_PROMPT_END = 'prompt_end'
export const KDA_CHECKPOINT_POLICY_FIXED_INTERVAL = 'fixed_interval'
export const KDA_CHECKPOINT_INFINITY = Infinity

// Data
export const MODELS = [...from models.json...]
export const MODEL_BY_ID = Object.fromEntries(MODELS.map(m => [m.id, m]))
export function groupModelsByFamily(models) { ... }  // returns { DeepSeek: [...], GLM: [...], ... }

// Predicates
export function isDeepSeekV4(model) { return model.formula === 'deepseek_v4_hybrid' }
export function hasIndexerCache(model) { ... }
export function hasDraftKvCache(model) { ... }
export function hasLinearAttentionState(model) { ... }  // formula is qwen_linear_full_hybrid OR kimi_kda_mla_hybrid
export function hasKdaCheckpointInterval(model) { ... } // formula is kimi_kda_mla_hybrid
export function draftLayerCount(model) { ... }

// Field accessors (throw on missing required fields)
export function getField(model, name) { ... }
export function optionalField(model, name, fallback) { ... }

// Precision resolution
export function defaultPrecisionId(model, options) { ... }
export function defaultIndexerPrecisionId(model, options, fallbackPrecisionId) { ... }

// KDA checkpoint interval parsing
export function parseKdaCheckpointInterval(value, fallback) { ... }  // returns Infinity or positive int
export function defaultKdaCheckpointInterval(model) { ... }

// Indexer layer plan (for dsa_mla)
export function indexerLayerPlan(model, layers, draftLayers) {
  // returns { mainIndexerLayers, sharedIndexerLayers, draftIndexerLayers, activeIndexerLayers }
}

// Core: per-sequence element calculation, 8 formula branches
export function calculateElementsPerSequence(model, tokens, settings) {
  // settings: { includeDraftKvCache, includeLinearAttentionState, kdaCheckpointInterval }
  // returns: { elementsPerSequence, elementsPerToken, byteGroups, formulaLabel,
  //            formulaText, formulaRows, note, components, hitRateElementsPerToken? }
}

// Top-level entry
export function calculate(model, input, options) {
  // input: { tokens, sequences, tensorParallel?, precision?, indexerPrecision?,
  //          includeDraftKvCache?, includeLinearAttentionState?,
  //          kdaCheckpointPolicy?, kdaCheckpointInterval? }
  // options: { precisionOptions, indexerPrecisionOptions } (default to PRECISION_OPTIONS)
  // returns: full result object (see §2.9 of design)
}
```

### Build script (`scripts/build-models-json.mjs`)

- Reads `src/tools/kv-cache/models.yaml`.
- Parses with `js-yaml` (already a transitive dep through other tools? — verify; if not, add as devDep).
- Writes `src/tools/kv-cache/models.json` with stable key ordering (matches yaml order).
- Idempotent: if output matches existing file, don't touch it (avoids spurious diffs).
- Exits non-zero on parse error.

`vite.config.js` change:
```js
import { buildModelsJson } from './scripts/build-models-json.mjs'
// in defineConfig:
plugins: [vue(), tailwindcss()],
buildStart() { buildModelsJson() },
```
`buildStart` runs in both `vite dev` and `vite build`, so the JSON is always fresh.

## Formulas

Direct port from `calculator.py` / `calculator.js`. All 8 formula types:

### `standard_gqa`
```
active_layers = num_hidden_layers + (include_draft ? draftLayerCount(model) : 0)
elements_per_token = active_layers × 2 × num_key_value_heads × head_dim
byteGroups: [{ role: 'kv', elements: elements_per_token × tokens }]
total_bytes = sequences × elements_per_token × tokens × kv_precision_bytes
```
Models: Qwen3全系列, Qwen2.5全系列, Llama 3.1/3.3, Cohere Command R/R+, MiniMax M2/M2.1/M2.5/M2.7.

### `mla`
```
active_layers = num_hidden_layers + (include_draft ? draftLayerCount(model) : 0)
elements_per_token = active_layers × (kv_lora_rank + qk_rope_head_dim)
byteGroups: [{ role: 'kv', elements: elements_per_token × tokens }]
```
Models: DeepSeek V3, R1; Kimi K2.5, K2.6.

### `dsa_mla`
```
active_layers = num_hidden_layers + (include_draft ? draftLayerCount(model) : 0)
plan = indexerLayerPlan(model, layers, draft_layers)
active_indexer_layers = plan.mainIndexerLayers + (include_draft ? plan.draftIndexerLayers : 0)
kv_elements_per_token = active_layers × (kv_lora_rank + qk_rope_head_dim)
indexer_elements_per_token = active_indexer_layers × index_head_dim
byteGroups: [
  { role: 'kv', elements: kv_elements_per_token × tokens },
  { role: 'indexer', elements: indexer_elements_per_token × tokens },
]
```
`indexerLayerPlan`:
- `mainIndexerLayers = optionalField(model, 'indexer_full_layers', layers)`
- `sharedIndexerLayers = optionalField(model, 'indexer_shared_layers', max(0, layers - main))`
- `draftIndexerLayers = draftLayers > 0 ? optionalField(model, 'draft_indexer_layers', draftLayers) : 0`
- `activeIndexerLayers = mainIndexerLayers + draftIndexerLayers`

Models: DeepSeek V3.2, GLM-5, GLM-5.1, GLM-5.2.

### `kimi_kda_mla_hybrid`
```
mla_elements_per_token = full_attention_layers × (kv_lora_rank + qk_rope_head_dim)
mla_elements = mla_elements_per_token × tokens

if include_linear_attention_state:
  interval = (kdaCheckpointPolicy === 'fixed_interval')
              ? parseKdaCheckpointInterval(input.kdaCheckpointInterval, defaultKdaCheckpointInterval(model))
              : Infinity
  kda_checkpoint_count = isFinite(interval) ? ceil(tokens / interval) : 1
  kda_conv_elements = kda_layers × (kda_conv_kernel_size - 1)
                     × (kda_num_heads×kda_head_dim + kda_num_key_heads×kda_key_head_dim
                        + kda_num_value_heads×kda_value_head_dim)
  kda_recurrent_elements = kda_layers × kda_num_value_heads × kda_value_head_dim × kda_key_head_dim
  kda_state_bytes_per_checkpoint = kda_conv_elements × 2 + kda_recurrent_elements × 4
  kda_checkpoint_bytes_per_sequence = kda_checkpoint_count × kda_state_bytes_per_checkpoint
  byteGroups: [
    { role: 'kv', label: 'MLA latent KV cache', elements: mla_elements },
    { role: 'linear_state', label: 'KDA checkpoint state', bytesPerSequence: kda_checkpoint_bytes_per_sequence },
  ]
else:
  byteGroups: [{ role: 'kv', label: 'MLA latent KV cache', elements: mla_elements }]

hitRateElementsPerToken = mla_elements_per_token  // for "Reusable MLA per token" metric
```

Field fallbacks (per upstream):
- `kda_num_key_heads` → fallback to `kda_num_heads`
- `kda_key_head_dim` → fallback to `kda_head_dim`
- `kda_num_value_heads` → fallback to `kda_num_heads`
- `kda_value_head_dim` → fallback to `kda_head_dim`
- `kda_conv_state_bytes_per_element` → fallback to `KIMI_KDA_CONV_BYTES` (2)
- `kda_recurrent_state_bytes_per_element` → fallback to `KIMI_KDA_RECURRENT_BYTES` (4)

Models: Kimi K3.

### `qwen_linear_full_hybrid`
```
elements_per_token = full_attention_layers × 2 × num_key_value_heads × head_dim
full_elements = elements_per_token × tokens

if include_linear_attention_state:
  linear_conv_elements = linear_attention_layers × linear_conv_kernel_dim
                        × (2 × linear_num_key_heads × linear_key_head_dim
                           + linear_num_value_heads × linear_value_head_dim)
  linear_recurrent_elements = linear_attention_layers × linear_num_value_heads
                             × linear_key_head_dim × linear_value_head_dim
  linear_state_bytes_per_sequence = linear_conv_elements × 2 + linear_recurrent_elements × 4
  byteGroups: [
    { role: 'kv', label: 'Full-attention KV cache', elements: full_elements },
    { role: 'linear_state', label: 'Linear-attention state', bytesPerSequence: linear_state_bytes_per_sequence },
  ]
else:
  byteGroups: [{ role: 'kv', label: 'Full-attention KV cache', elements: full_elements }]
```

Models: Qwen3.5全系列 (8), Qwen3.6全系列 (2).

### `mixed_full_sliding_gqa`
```
retained_sliding_tokens = min(tokens, sliding_window)
full_kv_heads     = optionalField('num_global_key_value_heads', num_key_value_heads)
full_head_dim     = optionalField('global_head_dim', head_dim)
full_v_dim        = optionalField('global_v_head_dim', optionalField('v_head_dim', full_head_dim))
sliding_kv_heads  = optionalField('swa_num_key_value_heads', optionalField('sliding_num_key_value_heads', num_key_value_heads))
sliding_head_dim  = optionalField('swa_head_dim', optionalField('sliding_head_dim', head_dim))
sliding_v_dim     = optionalField('swa_v_head_dim', optionalField('sliding_v_head_dim', optionalField('v_head_dim', sliding_head_dim)))

full_elements    = tokens × full_attention_layers × full_kv_heads × (full_head_dim + full_v_dim)
sliding_elements = retained_sliding_tokens × sliding_attention_layers × sliding_kv_heads × (sliding_head_dim + sliding_v_dim)
byteGroups: [
  { role: 'kv', label: 'Full-attention KV cache', elements: full_elements },
  { role: 'kv', label: 'Sliding-window KV cache', elements: sliding_elements },
]
```

Models: Gemma 4全系列 (4), Cohere Command A / A Plus / R7B (3), MiMo-V2.5 / V2.5-Pro (2).

### `minimax_msa`
```
kv_elements_per_token = num_hidden_layers × 2 × num_key_value_heads × head_dim
indexer_elements_per_token = sparse_attention_layers × index_head_dim
byteGroups: [
  { role: 'kv', elements: kv_elements_per_token × tokens },
  { role: 'indexer', elements: indexer_elements_per_token × tokens },
]
```

Models: MiniMax M3.

### `deepseek_v4_hybrid`
```
all_ratios = compress_ratios
main_ratios = all_ratios.slice(0, num_hidden_layers)
draft_ratios = all_ratios.slice(num_hidden_layers)
active_ratios = include_draft ? main_ratios.concat(draft_ratios) : main_ratios

window_elements = 0; compressed_elements = 0; indexer_elements = 0
for ratio in active_ratios:
    window_elements += sliding_window × head_dim          # every layer
    if ratio > 0:
        compressed_elements += floor(tokens / ratio) × head_dim
    if ratio === 4:
        indexer_elements += floor(tokens / 4) × index_head_dim

attention_elements = window_elements + compressed_elements
byteGroups: [
  { role: 'kv', label: 'KV cache', elements: attention_elements },
  { role: 'indexer', label: 'Indexer cache', elements: indexer_elements },
]
```

Models: DeepSeek V4 Pro, V4 Flash.

### Top-level `calculate`

```
tokens        = toPositiveInteger(input.tokens, model.default_tokens || 4096)
sequences     = toPositiveInteger(input.sequences, 1)
tensor_par    = toPositiveInteger(input.tensorParallel, 1)
precision_id  = input.precision || defaultPrecisionId(model, options)
precision     = resolvePrecisionProfile(precision_id, options)
indexer_prec  = hasIndexerCache(model) ? resolveIndexerPrecision(input.indexerPrecision, model, options, precision_id) : null
cache_prec    = indexer_prec ? { ...precision, kvBytesPerElement: precision.bytesPerElement, indexerBytesPerElement: indexer_prec.bytesPerElement } : precision

element_plan = calculateElementsPerSequence(model, tokens, {
  includeDraftKvCache: hasDraftKvCache(model) && toBoolean(input.includeDraftKvCache),
  includeLinearAttentionState: hasLinearAttentionState(model) && toBoolean(input.includeLinearAttentionState),
  kdaCheckpointInterval: hasKdaCheckpointInterval(model)
    ? (input.kdaCheckpointPolicy === 'fixed_interval'
        ? parseKdaCheckpointInterval(input.kdaCheckpointInterval, defaultKdaCheckpointInterval(model))
        : Infinity)
    : undefined,
})

cache_groups_per_seq = element_plan.byteGroups.map(g => ({
  role: g.role,
  label: g.label,
  elements: g.elements,  // per-sequence
  bytesPerSequence: Number.isFinite(g.bytesPerSequence)
    ? g.bytesPerSequence
    : g.elements × bytesPerElementForGroup(cache_prec, g.role),
}))

bytes_per_sequence = sum(cache_groups_per_seq.bytesPerSequence)
total_bytes = bytes_per_sequence × sequences

kv_bytes = sum(g.bytesPerSequence for g in cache_groups_per_seq if g.role in ['kv', 'attention', 'cache'])
indexer_bytes = sum(g.bytesPerSequence for g in cache_groups_per_seq if g.role === 'indexer')

return {
  modelId: model.id,
  modelLabel: model.label,
  formulaLabel: element_plan.formulaLabel,
  precisionLabel: precision.label,
  indexerPrecisionLabel: indexer_prec?.label,
  tokens, sequences, totalCachedTokens: tokens × sequences,
  tensorParallel: tensor_par,
  totalBytes: total_bytes,
  totalGB: total_bytes / 1e9,
  totalGiB: total_bytes / 1024^3,
  kvBytes: kv_bytes × sequences,
  kvGiB: kv_bytes × sequences / 1024^3,
  indexerBytes: indexer_bytes × sequences,
  indexerGiB: indexer_bytes × sequences / 1024^3,
  bytesPerSequence,
  bytesPerToken: bytes_per_sequence / tokens,
  perDeviceBytes: total_bytes / tensor_par,
  perDeviceGiB: total_bytes / tensor_par / 1024^3,
  hitRateBytesPerToken: Number.isFinite(element_plan.hitRateElementsPerToken)
    ? element_plan.hitRateElementsPerToken × bytesPerElementForGroup(cache_prec, 'kv')
    : undefined,
  cacheGroups: cache_groups_per_seq.map(g => ({...g, elements: g.elements × sequences, bytes: g.bytesPerSequence × sequences})),
  elementPlan: element_plan,
  components: element_plan.components.concat(precisionComponents(cache_prec)),
}
```

### Default precision rules

`defaultPrecisionId(model, options)`:
1. `model.fields.default_precision_id` (if string and in options) → use it
2. `isDeepSeekV4(model) && options.fp8_int8` → `fp8_int8`
3. else `options.bf16_fp16` → `bf16_fp16`
4. else first option key

`defaultIndexerPrecisionId(model, options, fallback)`:
1. `model.fields.indexer_fixed_precision_id` (if string and in options) → use it
2. `isDeepSeekV4(model) && options.fp4_int4` → `fp4_int4`
3. `fallback` (KV precision id) if in options → use it
4. else `options.bf16_fp16` → `bf16_fp16`
5. else `fp4_int4` if in options
6. else first option key

### `draftLayerCount` and `hasDraftKvCache`

```
draftLayerCount(model):
  if fields.disable_draft_kv_cache === true: return 0
  if Number(fields.num_nextn_predict_layers) > 0: return num_nextn_predict_layers
  if fields.use_mtp === true:
    return Number(fields.num_mtp_modules) × Number(fields.mtp_transformer_layers)
  return 0

hasDraftKvCache(model):
  if isDeepSeekV4(model):
    return Array.isArray(compress_ratios) && compress_ratios.length > num_hidden_layers
  return draftLayerCount(model) > 0
```

## UI / UX

Layout based on kvcache.ai's input set, styled with existing DaisyUI patterns from other tools in this repo.

### Input panel (left column on wide layout)

1. **Model selector** — `<select>` with `<optgroup>` per family. Families ordered: DeepSeek, GLM, Kimi, Qwen3.6, Qwen3.5, Qwen3, Qwen2.5, Llama, Gemma, Cohere, MiMo, MiniMax. Models within family sorted by parameter size (numeric). Default: `qwen3-8b`.

2. **Tokens per sequence** — `<input type="number">`, min 1, default from `model.default_tokens` (1024 for most models).

3. **Sequences (batch size)** — `<input type="number">`, min 1, default 1.

4. **KV precision** — `<select>` with three options (BF16/FP16, FP8/INT8, FP4/INT4). Default per `defaultPrecisionId(model)`.

5. **Indexer precision** — `<select>`, only visible when `hasIndexerCache(model)`. Same three options. Default per `defaultIndexerPrecisionId(model)`.

6. **Include draft KV cache** — `<input type="checkbox">`, only visible when `hasDraftKvCache(model)`. Default unchecked.

7. **Include linear-attention state** — `<input type="checkbox">`, only visible when `hasLinearAttentionState(model)`. Default unchecked.

8. **KDA checkpoint policy** — `<input type="radio">` pair (Prompt-End State / Fixed Interval Checkpoints), only visible when `hasKdaCheckpointInterval(model)`. Default: Prompt-End State.
   - When "Fixed Interval Checkpoints" selected, show additional **KDA checkpoint interval** `<input type="number">` (default 10240, the upstream default `KDA_CUSTOM_INTERVAL_DEFAULT`).
   - Allow `∞` / "infinity" string input → maps to `Infinity` (one final checkpoint).

Auto-recompute on any input change (existing pattern, no compute button).

### Result panel (right column on wide layout)

- **Headline**: `KV Cache Size: <X.XXXXX> GB` (using 10^9 bytes, 5 digits).
- Sub-headline: `<X.XXXXX> GiB` (1024^3 bytes).
- If `indexerPrecisionLabel` set: show `KV cache: <X> GiB` and `Indexer cache: <X> GiB` separately.
- If multiple cacheGroups and no indexer: show each group's bytes.
- **Per token size**: `formatBytes(bytesPerToken)`.
- If `hitRateBytesPerToken` is finite (Kimi K3 only): `Reusable MLA per token: <X>`.
- **Components / formula breakdown**: collapsible `<details>` block listing `element_plan.components` (the `["label", value, "description?"]` triples from upstream). Format as a definition list.
- **Formula text**: pre-formatted block showing `element_plan.formulaText` and `formulaRows`.
- **Note**: `element_plan.note` shown as italic caption.
- **Per-device**: if `tensorParallel > 1`, show `Per device: <X> GiB`.

### Header / description

Tool title stays "KV Cache Calculator" (English) or "KV Cache 显存计算器" (Chinese). Sub-description mentions the upstream source: "算法与模型表来自 [kvcache.ai](https://kvcache.ai/tools/kv-cache-size-calculator/)，源码 [kvcache-ai/kvcache-blog](https://github.com/kvcache-ai/kvcache-blog)".

## Input Validation

- `tokens`: positive integer ≥ 1. Invalid → `error` result.
- `sequences`: positive integer ≥ 1. Invalid → `error` result.
- `tensorParallel`: positive integer ≥ 1 (optional, default 1).
- `precision`: must be a key in `PRECISION_OPTIONS`. Unknown → `error`.
- `indexerPrecision`: required when `hasIndexerCache(model)`. Unknown → `error`.
- `kdaCheckpointInterval`: required when policy is `fixed_interval`. Must be positive integer or `∞`. Invalid → `error`.

Error results follow the existing pattern: `{ error: '中文消息' }`, UI shows `alert alert-error`.

## Testing Strategy

### Unit tests (`kv-cache.test.js`)

**Per-model correctness tests** — one test case per model (53 tests). Each test uses a fixed input:
```
tokens: 1024, sequences: 1, precision: defaultPrecisionId(model),
indexerPrecision: defaultIndexerPrecisionId(model) (if applicable),
includeDraftKvCache: false, includeLinearAttentionState: false,
kdaCheckpointPolicy: 'prompt_end'
```

Expected values computed **independently** (not by re-running the implementation) by hand-calculating from the formula spec above, using the model's fields from `models.yaml`. Each test asserts:
- `result.totalBytes` matches the hand-calculated value (exact integer match).
- `result.totalGB` matches `totalBytes / 1e9` to 5 decimals.
- `result.kvBytes + result.indexerBytes === result.totalBytes` (when no linear_state group).
- `result.cacheGroups` length and roles match expected.
- `result.formulaLabel` matches the model's `formula` human label.

**Per-formula edge case tests** (one describe block per formula type, picking a representative model):
- Draft KV toggle on/off → `totalBytes` diff matches expected draft layer contribution.
- Linear attention state toggle on/off → `totalBytes` diff matches expected linear state bytes.
- KDA: prompt-end vs fixed-interval vs infinity interval.
- KDA: interval that doesn't divide tokens evenly → `ceil(tokens / interval)` checkpoints.
- Sliding window: tokens < window → all layers full; tokens > window → sliding layers capped.
- DeepSeek V4: ratio=0 layer contributes only sliding-window KV; ratio=4 layer adds indexer cache; ratio=128 layer adds compressed KV only.
- Sequences scaling: `sequences=4` → `totalBytes = 4 × bytes_per_sequence` exactly.
- Tensor parallel: `tensorParallel=2` → `perDeviceBytes = totalBytes / 2`.
- Precision switch: bf16 → fp8 halves KV bytes; fp8 → fp4 halves again.
- Indexer precision independent of KV precision (for dsa_mla / minimax_msa / deepseek_v4_hybrid).
- Invalid inputs (tokens=0, sequences=-1, unknown precision) → `result.error` set.

**Export tests** — `MODELS.length === 53`, `groupModelsByFamily` returns 12 families, predicate functions return correct booleans for representative models.

**Round-trip / sanity tests**:
- `bytesPerToken × tokens === bytesPerSequence` (within float tolerance).
- `totalBytes === bytesPerSequence × sequences`.
- `totalGB` and `totalGiB` consistent with `totalBytes`.

### Component tests (`KvCache.component.test.js`)

Mount-based, no network. Tests:
1. Renders title and source link.
2. Model `<select>` has 12 `<optgroup>` families with correct counts.
3. Default model `qwen3-8b` auto-computes on mount, shows "KV Cache Size" headline.
4. Changing tokens input recomputes (1K → 10K produces different result).
5. Changing sequences input scales result linearly.
6. Switching to `deepseek-v4-pro` shows indexer precision selector + draft KV toggle (V4 has draft layers via compress_ratios.length > num_hidden_layers).
7. Switching to `kimi-k3` shows KDA checkpoint policy radios + linear-attention-state toggle.
8. Selecting KDA "Fixed Interval" reveals interval input; entering a value and toggling back to "Prompt-End" hides it.
9. Switching to `qwen3.5-397b-a17b` shows linear-attention-state toggle but no KDA policy.
10. Switching to `minimax-m3` shows indexer precision but no draft KV toggle (disable_draft_kv_cache=true).
11. Invalid tokens input shows error alert.
12. No "compute" button — auto-recompute only.
13. Mode tabs (forward/reverse) from old UI are gone — no reverse mode.

### Manual verification

After implementation, run `npm run dev`, pick 5 representative models (Qwen3-8B, DeepSeek-V3, DeepSeek-V4-Pro, Kimi-K3, MiniMax-M3), enter the same inputs in both our tool and kvcache.ai, confirm total GB matches to 5 decimals. Document any discrepancies as bugs.

## Migration / Compatibility

This is a breaking rewrite of an internal tool. No migration path needed — the URL `/kv-cache` stays the same, but all old behavior (reverse mode, DSA custom precision, old model list) is gone.

Old tests are replaced wholesale; no attempt to preserve old test cases.

## Risks

1. **YAML parsing dep**: `js-yaml` may not be a current dep. If not, add as `devDependency` (build-time only, not bundled).
2. **Number formatting**: kvcache.ai uses `toLocaleString(undefined, {maximumFractionDigits: 5, minimumFractionDigits: 5})`. Replicate exactly to match displayed values.
3. **`floor(tokens / ratio)` integer division**: JS `Math.floor(tokens / ratio)` matches Python's `math.floor(tokens / ratio)` for positive ints. Verified.
4. **`compress_ratios` parsing**: yaml parses them as a JS array of numbers. Confirm `Number.isFinite` for each entry.
5. **`disable_draft_kv_cache: true`** on MiniMax M3 — make sure the draft checkbox stays hidden (not just disabled) for this model.
6. **` Infinity` serialization**: `JSON.stringify(Infinity)` returns `null`. Don't serialize the resolved interval; only the input string. The `KDA_CHECKPOINT_INFINITY` sentinel (`"∞"`) is only for display, not storage.
