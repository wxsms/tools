/**
 * KV Cache size calculator — port of kvcache.ai's calculator.js.
 *
 * Source: https://github.com/kvcache-ai/kvcache-blog
 *   - data/kv_cache_calculator/models.yaml (verbatim copy in ./models.yaml)
 *   - assets/js/kv-cache-calculator.js (algorithm ported below)
 *   - packages/kvcache-simulator/src/kvcache_sim/calculator.py (cross-check)
 */

import modelsData from './models.json'

export const BYTES_PER_GB = 1e9
export const BYTES_PER_GIB = 1024 ** 3
export const RESULT_DIGITS = 5

export const QWEN_LINEAR_CONV_BYTES_PER_ELEMENT = 2
export const QWEN_LINEAR_RECURRENT_BYTES_PER_ELEMENT = 4
export const KIMI_KDA_CONV_BYTES_PER_ELEMENT = 2
export const KIMI_KDA_RECURRENT_BYTES_PER_ELEMENT = 4

export const KDA_CHECKPOINT_INFINITY = '∞'
export const KDA_CHECKPOINT_POLICY_PROMPT_END = 'prompt_end'
export const KDA_CHECKPOINT_POLICY_FIXED_INTERVAL = 'fixed_interval'
export const KDA_CUSTOM_INTERVAL_DEFAULT = 10240

export const PRECISION_OPTIONS = Object.fromEntries(
  (modelsData.precision_options || []).map(opt => [
    opt.id,
    { label: opt.label, bytesPerElement: Number(opt.bytes_per_element) },
  ]),
)

export const INDEXER_PRECISION_OPTIONS = Object.fromEntries(
  (modelsData.indexer_precision_options || modelsData.precision_options || []).map(opt => [
    opt.id,
    { label: opt.label, bytesPerElement: Number(opt.bytes_per_element) },
  ]),
)

export const MODELS = modelsData.models || []
export const MODEL_BY_ID = Object.fromEntries(MODELS.map(m => [m.id, m]))

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

export function groupModelsByFamily(models = MODELS) {
  const groups = {}
  for (const model of models) {
    const family = model.family || 'Other'
    if (!groups[family]) groups[family] = []
    groups[family].push(model)
  }
  const FAMILY_ORDER = ['DeepSeek', 'GLM', 'Kimi', 'Qwen3.6', 'Qwen3.5', 'Qwen3', 'Qwen2.5', 'Llama', 'Gemma', 'Cohere', 'MiMo', 'MiniMax', 'Other']
  const ordered = {}
  for (const f of FAMILY_ORDER) if (groups[f]) ordered[f] = groups[f]
  for (const f of Object.keys(groups).sort(collator.compare)) if (!ordered[f]) ordered[f] = groups[f]
  for (const f of Object.keys(ordered)) {
    ordered[f] = ordered[f].slice().sort((a, b) => collator.compare(a.label, b.label))
  }
  return ordered
}

// ============================================================
// Predicates
// ============================================================

export function isDeepSeekV4(model) {
  return Boolean(model && model.formula === 'deepseek_v4_hybrid')
}

export function hasIndexerCache(model) {
  return Boolean(model && model.fields && Number.isFinite(Number(model.fields.index_head_dim)))
}

export function safeNumber(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function draftLayerCount(model) {
  if (!model || !model.fields) return 0
  if (model.fields.disable_draft_kv_cache === true) return 0
  const nextnLayers = safeNumber(model.fields.num_nextn_predict_layers, 0)
  if (nextnLayers > 0) return nextnLayers
  if (model.fields.use_mtp === true) {
    return safeNumber(model.fields.num_mtp_modules, 0) * safeNumber(model.fields.mtp_transformer_layers, 0)
  }
  return 0
}

export function hasDraftKvCache(model) {
  if (!model || !model.fields) return false
  if (isDeepSeekV4(model)) {
    const layers = safeNumber(model.fields.num_hidden_layers, 0)
    return Array.isArray(model.fields.compress_ratios) && model.fields.compress_ratios.length > layers
  }
  return draftLayerCount(model) > 0
}

export function hasLinearAttentionState(model) {
  return Boolean(model && (model.formula === 'qwen_linear_full_hybrid' || model.formula === 'kimi_kda_mla_hybrid'))
}

export function hasKdaCheckpointInterval(model) {
  return Boolean(model && model.formula === 'kimi_kda_mla_hybrid')
}

// ============================================================
// Field accessors
// ============================================================

export function getField(model, name) {
  if (!model || !model.fields || !Number.isFinite(Number(model.fields[name]))) {
    throw new Error(`Model ${model ? model.id : ''} is missing numeric field ${name}`)
  }
  return Number(model.fields[name])
}

export function optionalField(model, name, fallback) {
  if (model && model.fields && Number.isFinite(Number(model.fields[name]))) {
    return Number(model.fields[name])
  }
  return fallback
}

export function fieldList(model, names) {
  const fields = model && model.fields
  if (!fields || typeof fields !== 'object') return ''
  return names
    .filter(name => Object.prototype.hasOwnProperty.call(fields, name))
    .map(name => `${name}=${fields[name]}`)
    .join(', ')
}

// ============================================================
// Precision resolution
// ============================================================

function fixedIndexerPrecisionId(model) {
  return model && model.fields && typeof model.fields.indexer_fixed_precision_id === 'string'
    ? model.fields.indexer_fixed_precision_id
    : undefined
}

export function defaultPrecisionId(model, options = PRECISION_OPTIONS) {
  const modelDefault = model && model.fields && typeof model.fields.default_precision_id === 'string'
    ? model.fields.default_precision_id
    : undefined
  if (modelDefault && options[modelDefault]) return modelDefault
  if (isDeepSeekV4(model) && options.fp8_int8) return 'fp8_int8'
  if (options.bf16_fp16) return 'bf16_fp16'
  return Object.keys(options)[0]
}

export function defaultIndexerPrecisionId(model, options = INDEXER_PRECISION_OPTIONS, fallbackPrecisionId) {
  const fixed = fixedIndexerPrecisionId(model)
  if (fixed && options[fixed]) return fixed
  if (isDeepSeekV4(model) && options.fp4_int4) return 'fp4_int4'
  if (fallbackPrecisionId && options[fallbackPrecisionId]) return fallbackPrecisionId
  if (options.bf16_fp16) return 'bf16_fp16'
  if (options.fp4_int4) return 'fp4_int4'
  return Object.keys(options)[0]
}

export function getPrecisionProfile(precisionId, options = PRECISION_OPTIONS, fallbackId) {
  const selected = options[precisionId] || options[fallbackId] || PRECISION_OPTIONS.bf16_fp16
  return { label: selected.label, bytesPerElement: selected.bytesPerElement }
}

export function getIndexerPrecisionProfile(precisionId, options = INDEXER_PRECISION_OPTIONS, model, fallbackPrecisionId) {
  const fixed = fixedIndexerPrecisionId(model)
  const selected =
    (fixed && options[fixed]) ||
    options[precisionId] ||
    options[defaultIndexerPrecisionId(model, options, fallbackPrecisionId)] ||
    PRECISION_OPTIONS.fp4_int4
  return { label: selected.label, bytesPerElement: selected.bytesPerElement }
}

// ============================================================
// KDA checkpoint interval
// ============================================================

export function parseKdaCheckpointInterval(value, fallback = Infinity) {
  if (
    value === Infinity ||
    value === KDA_CHECKPOINT_INFINITY ||
    (typeof value === 'string' && value.toLowerCase() === 'infinity')
  ) {
    return Infinity
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? Math.max(1, Math.floor(parsed)) : fallback
}

export function defaultKdaCheckpointInterval(model) {
  const value = model && model.fields ? model.fields.default_kda_checkpoint_interval : undefined
  return parseKdaCheckpointInterval(value, Infinity)
}

export function formatKdaCheckpointInterval(value) {
  return Number.isFinite(value) ? String(value) : KDA_CHECKPOINT_INFINITY
}

// ============================================================
// Indexer layer plan (for dsa_mla)
// ============================================================

export function indexerLayerPlan(model, layers, draftLayers) {
  const mainIndexerLayers = optionalField(model, 'indexer_full_layers', layers)
  const sharedIndexerLayers = optionalField(model, 'indexer_shared_layers', Math.max(0, layers - mainIndexerLayers))
  const draftIndexerLayers = draftLayers > 0 ? optionalField(model, 'draft_indexer_layers', draftLayers) : 0
  return {
    mainIndexerLayers,
    sharedIndexerLayers,
    draftIndexerLayers,
    activeIndexerLayers: mainIndexerLayers + draftIndexerLayers,
  }
}

// ============================================================
// Input coercion
// ============================================================

export function toPositiveNumber(value, fallback) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export function toPositiveInteger(value, fallback) {
  return Math.max(1, Math.floor(toPositiveNumber(value, fallback)))
}

export function toBoolean(value) {
  return value === true || value === 'true' || value === 'on' || value === '1'
}

// ============================================================
// calculateElementsPerSequence — 8 formula branches
// ============================================================

export const FORMULA_LABELS = {
  standard_gqa: 'Standard MHA/GQA',
  mla: 'MLA latent KV',
  dsa_mla: 'DSA/MLA with indexer',
  kimi_kda_mla_hybrid: 'Kimi KDA/MLA hybrid',
  qwen_linear_full_hybrid: 'Qwen linear/full hybrid',
  mixed_full_sliding_gqa: 'Mixed full/sliding GQA',
  minimax_msa: 'MiniMax MSA sparse attention',
  deepseek_v4_hybrid: 'DeepSeek V4 hybrid sparse attention',
}

function countByValue(values, target) {
  return values.filter(v => Number(v) === target).length
}

export function calculateElementsPerSequence(model, tokens, settings = {}) {
  const formula = model.formula
  const includeDraftKvCache = toBoolean(settings.includeDraftKvCache)
  const includeLinearAttentionState = toBoolean(settings.includeLinearAttentionState)
  const draftLayers = includeDraftKvCache ? draftLayerCount(model) : 0

  if (formula === 'standard_gqa') {
    const layers = getField(model, 'num_hidden_layers')
    const activeLayers = layers + draftLayers
    const kvHeads = getField(model, 'num_key_value_heads')
    const headDim = getField(model, 'head_dim')
    const elementsPerToken = activeLayers * 2 * kvHeads * headDim
    return {
      elementsPerSequence: elementsPerToken * tokens,
      elementsPerToken,
      formulaLabel: FORMULA_LABELS[formula],
      formulaText: 'active_layers = main_layers + draft_layers_if_enabled\ntotal_bytes = tokens * sequences * active_layers * 2 * num_key_value_heads * head_dim * precision_bytes',
      formulaRows: [
        { name: 'active_layers', expression: 'main_layers + draft_layers_if_enabled' },
        { name: 'total_bytes', expression: 'tokens x sequences x active_layers x 2 x num_key_value_heads x head_dim x precision_bytes' },
      ],
      note: 'Production estimate of base KV payload; allocator and memory-pool bytes are excluded. Draft KV is included only when the checkbox is enabled.',
      byteGroups: [{ role: 'kv', label: 'KV cache', elements: elementsPerToken * tokens }],
      components: [
        ['Main layers', layers],
        ['Draft layers included', draftLayers],
        ['Per-token elements', elementsPerToken],
        ['Model fields', fieldList(model, ['num_hidden_layers', 'num_key_value_heads', 'head_dim'])],
      ],
    }
  }

  if (formula === 'mla') {
    const layers = getField(model, 'num_hidden_layers')
    const activeLayers = layers + draftLayers
    const kvRank = getField(model, 'kv_lora_rank')
    const ropeDim = getField(model, 'qk_rope_head_dim')
    const elementsPerToken = activeLayers * (kvRank + ropeDim)
    return {
      elementsPerSequence: elementsPerToken * tokens,
      elementsPerToken,
      formulaLabel: FORMULA_LABELS[formula],
      formulaText: 'active_layers = main_layers + draft_layers_if_enabled\ntotal_bytes = tokens * sequences * active_layers * (kv_lora_rank + qk_rope_head_dim) * precision_bytes',
      formulaRows: [
        { name: 'active_layers', expression: 'main_layers + draft_layers_if_enabled' },
        { name: 'total_bytes', expression: 'tokens x sequences x active_layers x (kv_lora_rank + qk_rope_head_dim) x precision_bytes' },
      ],
      note: 'Production estimate of MLA latent KV payload; allocator and memory-pool bytes are excluded. Draft KV is included only when the checkbox is enabled.',
      byteGroups: [{ role: 'kv', label: 'KV cache', elements: elementsPerToken * tokens }],
      components: [
        ['Main layers', layers],
        ['Draft layers included', draftLayers],
        ['Per-token elements', elementsPerToken],
        ['Model fields', fieldList(model, ['num_hidden_layers', 'kv_lora_rank', 'qk_rope_head_dim'])],
      ],
    }
  }

  if (formula === 'dsa_mla') {
    const layers = getField(model, 'num_hidden_layers')
    const plan = indexerLayerPlan(model, layers, draftLayers)
    const indexDim = getField(model, 'index_head_dim')
    const kvRank = getField(model, 'kv_lora_rank')
    const ropeDim = getField(model, 'qk_rope_head_dim')
    const activeLayers = layers + draftLayers
    const activeIndexerLayers = plan.mainIndexerLayers + (includeDraftKvCache ? plan.draftIndexerLayers : 0)
    const kvElementsPerToken = activeLayers * (kvRank + ropeDim)
    const indexerElementsPerToken = activeIndexerLayers * indexDim
    const elementsPerToken = kvElementsPerToken + indexerElementsPerToken
    return {
      elementsPerSequence: elementsPerToken * tokens,
      elementsPerToken,
      formulaLabel: FORMULA_LABELS[formula],
      formulaText: 'kv_bytes = tokens * sequences * active_layers * (kv_lora_rank + qk_rope_head_dim) * kv_precision_bytes\nindexer_bytes = tokens * sequences * active_indexer_layers * index_head_dim * indexer_precision_bytes\ntotal_bytes = kv_bytes + indexer_bytes',
      formulaRows: [
        { name: 'active_layers', expression: 'main_layers + draft_layers_if_enabled' },
        { name: 'active_indexer_layers', expression: 'main_indexer_layers + draft_indexer_layers_if_enabled' },
        { name: 'kv_bytes', expression: 'tokens x sequences x active_layers x (kv_lora_rank + qk_rope_head_dim) x kv_precision_bytes' },
        { name: 'indexer_bytes', expression: 'tokens x sequences x active_indexer_layers x index_head_dim x indexer_precision_bytes' },
        { name: 'total_bytes', expression: 'kv_bytes + indexer_bytes' },
      ],
      note: plan.sharedIndexerLayers > 0
        ? 'Production estimate uses latent KV plus independently stored indexer state; shared indexer layers reuse the full indexer layers\' selection. Expanded HF-compatible cache is not included.'
        : 'Production estimate uses latent KV plus indexer state; expanded HF-compatible cache is not included.',
      byteGroups: [
        { role: 'kv', label: 'KV cache', elements: kvElementsPerToken * tokens },
        { role: 'indexer', label: 'Indexer cache', elements: indexerElementsPerToken * tokens },
      ],
      components: [
        ['Main layers', layers],
        ['Draft layers included', draftLayers],
        ['Main indexer layers', plan.mainIndexerLayers],
        ['Shared indexer layers', plan.sharedIndexerLayers],
        ['Draft indexer layers included', includeDraftKvCache ? plan.draftIndexerLayers : 0],
        ['KV elements per token', kvElementsPerToken],
        ['Indexer elements per token', indexerElementsPerToken],
        ['Per-token elements', elementsPerToken],
        ['Model fields', fieldList(model, ['num_hidden_layers', 'kv_lora_rank', 'qk_rope_head_dim', 'index_head_dim', 'indexer_full_layers', 'indexer_shared_layers', 'draft_indexer_layers'])],
      ],
    }
  }

  if (formula === 'kimi_kda_mla_hybrid') {
    const layers = getField(model, 'num_hidden_layers')
    const fullLayers = getField(model, 'full_attention_layers')
    const kdaLayers = getField(model, 'kda_layers')
    const kdaCheckpointInterval = parseKdaCheckpointInterval(
      settings.kdaCheckpointInterval,
      defaultKdaCheckpointInterval(model),
    )
    const kdaCheckpointCount = includeLinearAttentionState
      ? Number.isFinite(kdaCheckpointInterval)
        ? Math.ceil(tokens / kdaCheckpointInterval)
        : 1
      : 0
    const kvRank = getField(model, 'kv_lora_rank')
    const ropeDim = getField(model, 'qk_rope_head_dim')
    const kdaHeads = getField(model, 'kda_num_heads')
    const kdaHeadDim = getField(model, 'kda_head_dim')
    const kdaKeyHeads = optionalField(model, 'kda_num_key_heads', kdaHeads)
    const kdaKeyDim = optionalField(model, 'kda_key_head_dim', kdaHeadDim)
    const kdaValueHeads = optionalField(model, 'kda_num_value_heads', kdaHeads)
    const kdaValueDim = optionalField(model, 'kda_value_head_dim', kdaHeadDim)
    const kdaConvKernel = getField(model, 'kda_conv_kernel_size')
    const convBytesPerElement = optionalField(model, 'kda_conv_state_bytes_per_element', KIMI_KDA_CONV_BYTES_PER_ELEMENT)
    const recurrentBytesPerElement = optionalField(model, 'kda_recurrent_state_bytes_per_element', KIMI_KDA_RECURRENT_BYTES_PER_ELEMENT)

    const mlaElementsPerToken = fullLayers * (kvRank + ropeDim)
    const mlaElements = mlaElementsPerToken * tokens
    const kdaConvElements = kdaLayers * (kdaConvKernel - 1) * (kdaHeads * kdaHeadDim + kdaKeyHeads * kdaKeyDim + kdaValueHeads * kdaValueDim)
    const kdaRecurrentElements = kdaLayers * kdaValueHeads * kdaValueDim * kdaKeyDim
    const kdaStateBytes = kdaConvElements * convBytesPerElement + kdaRecurrentElements * recurrentBytesPerElement
    const kdaCheckpointBytesPerSequence = kdaCheckpointCount * kdaStateBytes

    const byteGroups = [{ role: 'kv', label: 'MLA latent KV cache', elements: mlaElements }]
    if (includeLinearAttentionState) {
      byteGroups.push({ role: 'linear_state', label: 'KDA checkpoint state', bytesPerSequence: kdaCheckpointBytesPerSequence })
    }
    return {
      elementsPerSequence: mlaElements + (includeLinearAttentionState ? kdaCheckpointCount * (kdaConvElements + kdaRecurrentElements) : 0),
      elementsPerToken: mlaElementsPerToken,
      hitRateElementsPerToken: mlaElementsPerToken,
      formulaLabel: FORMULA_LABELS[formula],
      formulaText: 'mla_kv_bytes = tokens * sequences * full_attention_layers * (kv_lora_rank + qk_rope_head_dim) * precision_bytes\nkda_checkpoint_count = interval_is_infinity ? 1 : ceil(tokens / kda_checkpoint_interval)\ntotal_bytes = mla_kv_bytes + optional_kda_checkpoint_bytes',
      formulaRows: [
        { name: 'mla_kv_bytes', expression: 'tokens x sequences x full_attention_layers x (kv_lora_rank + qk_rope_head_dim) x precision_bytes' },
        { name: 'kda_checkpoint_count', expression: 'interval is infinity ? 1 : ceil(tokens / kda_checkpoint_interval)' },
        { name: 'total_bytes', expression: 'mla_kv_bytes + optional_kda_checkpoint_bytes' },
      ],
      note: includeLinearAttentionState
        ? 'Includes the 24-layer token-addressable MLA latent cache and retained BF16-convolution/FP32-recurrent KDA checkpoints. Active, ping-pong, and speculative runtime buffers are excluded.'
        : 'Includes the 24-layer token-addressable MLA latent cache. The 69 KDA layers\' sequence-level state is excluded.',
      byteGroups,
      components: [
        ['Main layers', layers],
        ['MLA full-attention layers', fullLayers],
        ['KDA linear-attention layers', kdaLayers],
        ['KDA state included', includeLinearAttentionState ? 'Yes' : 'No'],
        ['KDA checkpoint interval', formatKdaCheckpointInterval(kdaCheckpointInterval)],
        ['KDA checkpoints per sequence', kdaCheckpointCount],
        ['MLA elements per token', mlaElementsPerToken],
        ['KDA conv elements per checkpoint', kdaConvElements],
        ['KDA recurrent elements per checkpoint', kdaRecurrentElements],
        ['KDA bytes per checkpoint', kdaStateBytes],
        ['KDA checkpoint bytes per sequence', kdaCheckpointBytesPerSequence],
        ['KDA conv-state bytes', convBytesPerElement],
        ['KDA recurrent-state bytes', recurrentBytesPerElement],
        ['Model fields', fieldList(model, ['num_hidden_layers', 'full_attention_layers', 'kda_layers', 'kv_lora_rank', 'qk_rope_head_dim', 'kda_num_heads', 'kda_head_dim', 'kda_conv_kernel_size', 'default_kda_checkpoint_interval'])],
      ],
    }
  }

  if (formula === 'qwen_linear_full_hybrid') {
    const layers = getField(model, 'num_hidden_layers')
    const fullLayers = getField(model, 'full_attention_layers')
    const linearLayers = getField(model, 'linear_attention_layers')
    const kvHeads = getField(model, 'num_key_value_heads')
    const headDim = getField(model, 'head_dim')
    const linearKeyHeads = getField(model, 'linear_num_key_heads')
    const linearKeyDim = getField(model, 'linear_key_head_dim')
    const linearValueHeads = getField(model, 'linear_num_value_heads')
    const linearValueDim = getField(model, 'linear_value_head_dim')
    const linearConvKernel = getField(model, 'linear_conv_kernel_dim')
    const mtpLayers = optionalField(model, 'mtp_num_hidden_layers', 0)
    const elementsPerToken = fullLayers * 2 * kvHeads * headDim
    const fullElements = elementsPerToken * tokens
    const linearConvElements = linearLayers * linearConvKernel * (2 * linearKeyHeads * linearKeyDim + linearValueHeads * linearValueDim)
    const linearRecurrentElements = linearLayers * linearValueHeads * linearKeyDim * linearValueDim
    const linearStateBytesPerSequence = includeLinearAttentionState
      ? linearConvElements * QWEN_LINEAR_CONV_BYTES_PER_ELEMENT + linearRecurrentElements * QWEN_LINEAR_RECURRENT_BYTES_PER_ELEMENT
      : 0
    const byteGroups = [{ role: 'kv', label: 'Full-attention KV cache', elements: fullElements }]
    if (includeLinearAttentionState) {
      byteGroups.push({ role: 'linear_state', label: 'Linear-attention state', bytesPerSequence: linearStateBytesPerSequence })
    }
    return {
      elementsPerSequence: fullElements + (includeLinearAttentionState ? linearConvElements + linearRecurrentElements : 0),
      elementsPerToken: elementsPerToken,
      formulaLabel: FORMULA_LABELS[formula],
      formulaText: 'full_kv_bytes = tokens * sequences * full_attention_layers * 2 * num_key_value_heads * head_dim * precision_bytes\ntotal_bytes = full_kv_bytes + optional_linear_attention_state_bytes',
      formulaRows: [
        { name: 'full_kv_bytes', expression: 'tokens x sequences x full_attention_layers x 2 x num_key_value_heads x head_dim x precision_bytes' },
        { name: 'linear_conv_state_bytes', expression: 'sequences x linear_attention_layers x linear_conv_kernel_dim x (2 x linear_num_key_heads x linear_key_head_dim + linear_num_value_heads x linear_value_head_dim) x 2' },
        { name: 'linear_recurrent_state_bytes', expression: 'sequences x linear_attention_layers x linear_num_value_heads x linear_key_head_dim x linear_value_head_dim x 4' },
        { name: 'total_bytes', expression: 'full_kv_bytes + optional_linear_attention_state_bytes' },
      ],
      note: includeLinearAttentionState
        ? 'Qwen3.5/3.6 linear-attention state is sequence-level runtime state, not per-token KV. It does not grow linearly with tokens, so it matters more for short prompts and is diluted by full-attention KV at long context.'
        : 'Qwen3.5/3.6 linear-attention recurrent/conv state is not ordinary per-token KV and is excluded by default. Enable the linear-attention state option to add a fixed runtime-state estimate.',
      byteGroups,
      components: [
        ['Main layers', layers],
        ['Full-attention layers', fullLayers],
        ['Linear-attention layers', linearLayers],
        ['Linear state included', includeLinearAttentionState ? 'Yes' : 'No'],
        ['Linear conv elements', linearConvElements],
        ['Linear recurrent elements', linearRecurrentElements],
        ['MTP layers not included', mtpLayers],
        ['Per-token elements', elementsPerToken],
        ['Model fields', fieldList(model, ['num_hidden_layers', 'full_attention_layers', 'linear_attention_layers', 'num_key_value_heads', 'head_dim', 'linear_num_key_heads', 'linear_key_head_dim', 'linear_num_value_heads', 'linear_value_head_dim', 'linear_conv_kernel_dim'])],
      ],
    }
  }

  if (formula === 'mixed_full_sliding_gqa') {
    const layers = getField(model, 'num_hidden_layers')
    const fullLayers = getField(model, 'full_attention_layers')
    const slidingLayers = getField(model, 'sliding_attention_layers')
    const kvHeads = getField(model, 'num_key_value_heads')
    const headDim = getField(model, 'head_dim')
    const fullKvHeads = optionalField(model, 'num_global_key_value_heads', kvHeads)
    const fullHeadDim = optionalField(model, 'global_head_dim', headDim)
    const fullVHeadDim = optionalField(model, 'global_v_head_dim', optionalField(model, 'v_head_dim', fullHeadDim))
    const slidingKvHeads = optionalField(model, 'swa_num_key_value_heads', optionalField(model, 'sliding_num_key_value_heads', kvHeads))
    const slidingHeadDim = optionalField(model, 'swa_head_dim', optionalField(model, 'sliding_head_dim', headDim))
    const slidingVHeadDim = optionalField(model, 'swa_v_head_dim', optionalField(model, 'sliding_v_head_dim', optionalField(model, 'v_head_dim', slidingHeadDim)))
    const slidingWindow = getField(model, 'sliding_window')
    const retainedSlidingTokens = Math.min(tokens, slidingWindow)
    const fullElements = tokens * fullLayers * fullKvHeads * (fullHeadDim + fullVHeadDim)
    const slidingElements = retainedSlidingTokens * slidingLayers * slidingKvHeads * (slidingHeadDim + slidingVHeadDim)
    const elementsPerSequence = fullElements + slidingElements
    return {
      elementsPerSequence,
      elementsPerToken: elementsPerSequence / tokens,
      formulaLabel: FORMULA_LABELS[formula],
      formulaText: 'full_kv_bytes = tokens * sequences * full_layers * full_kv_heads * (full_head_dim + full_v_head_dim) * precision_bytes\nsliding_kv_bytes = min(tokens, sliding_window) * sequences * sliding_layers * sliding_kv_heads * (sliding_head_dim + sliding_v_head_dim) * precision_bytes\ntotal_bytes = full_kv_bytes + sliding_kv_bytes',
      formulaRows: [
        { name: 'full_kv_bytes', expression: 'tokens x sequences x full_layers x full_kv_heads x (full_head_dim + full_v_head_dim) x precision_bytes' },
        { name: 'sliding_kv_bytes', expression: 'min(tokens, sliding_window) x sequences x sliding_layers x sliding_kv_heads x (sliding_head_dim + sliding_v_head_dim) x precision_bytes' },
        { name: 'total_bytes', expression: 'full_kv_bytes + sliding_kv_bytes' },
      ],
      note: 'Production estimate counts text-generation KV payload only. Vision/audio encoder activations and allocator memory are excluded.',
      byteGroups: [
        { role: 'kv', label: 'Full-attention KV cache', elements: fullElements },
        { role: 'kv', label: 'Sliding-window KV cache', elements: slidingElements },
      ],
      components: [
        ['Main layers', layers],
        ['Stored layers', optionalField(model, 'stored_layers', fullLayers + slidingLayers)],
        ['Full-attention layers', fullLayers],
        ['Sliding-attention layers', slidingLayers],
        ['Retained sliding tokens', retainedSlidingTokens],
        ['Full K+V dims', fullHeadDim + fullVHeadDim],
        ['Sliding K+V dims', slidingHeadDim + slidingVHeadDim],
        ['Full-attention elements', fullElements],
        ['Sliding-window elements', slidingElements],
        ['Model fields', fieldList(model, ['num_hidden_layers', 'full_attention_layers', 'sliding_attention_layers', 'num_key_value_heads', 'num_global_key_value_heads', 'head_dim', 'global_head_dim', 'v_head_dim', 'global_v_head_dim', 'swa_num_key_value_heads', 'swa_head_dim', 'swa_v_head_dim', 'sliding_window'])],
      ],
    }
  }

  if (formula === 'minimax_msa') {
    const layers = getField(model, 'num_hidden_layers')
    const fullLayers = getField(model, 'full_attention_layers')
    const sparseLayers = getField(model, 'sparse_attention_layers')
    const kvHeads = getField(model, 'num_key_value_heads')
    const headDim = getField(model, 'head_dim')
    const indexDim = getField(model, 'index_head_dim')
    const indexHeads = optionalField(model, 'index_n_heads', kvHeads)
    const blockSize = getField(model, 'index_block_size')
    const topkBlocks = getField(model, 'index_topk_blocks')
    const localBlocks = optionalField(model, 'index_local_blocks', 0)
    const mtpModules = optionalField(model, 'num_mtp_modules', 0)
    const nextnLayers = optionalField(model, 'num_nextn_predict_layers', 0)
    const kvElementsPerToken = layers * 2 * kvHeads * headDim
    const indexerElementsPerToken = sparseLayers * indexDim
    const elementsPerToken = kvElementsPerToken + indexerElementsPerToken
    const kvElements = kvElementsPerToken * tokens
    const indexerElements = indexerElementsPerToken * tokens
    return {
      elementsPerSequence: elementsPerToken * tokens,
      elementsPerToken,
      formulaLabel: FORMULA_LABELS[formula],
      formulaText: 'kv_bytes = tokens * sequences * layers * 2 * num_key_value_heads * head_dim * kv_precision_bytes\nindexer_bytes = tokens * sequences * sparse_attention_layers * index_head_dim * indexer_precision_bytes\ntotal_bytes = kv_bytes + indexer_bytes',
      formulaRows: [
        { name: 'kv_bytes', expression: 'tokens x sequences x layers x 2 x num_key_value_heads x head_dim x kv_precision_bytes' },
        { name: 'indexer_bytes', expression: 'tokens x sequences x sparse_attention_layers x index_head_dim x indexer_precision_bytes' },
        { name: 'total_bytes', expression: 'kv_bytes + indexer_bytes' },
      ],
      note: 'MiniMax Sparse Attention (MSA) uses a lightweight indexer to pick the most relevant KV blocks for each query, so long-context attention can read a sparse subset of the cached tokens while keeping a separate indexer cache for block selection.',
      byteGroups: [
        { role: 'kv', label: 'KV cache', elements: kvElements },
        { role: 'indexer', label: 'Indexer cache', elements: indexerElements },
      ],
      components: [
        ['Main layers', layers],
        ['Full-attention layers', fullLayers],
        ['Sparse-attention layers', sparseLayers],
        ['KV elements per token', kvElementsPerToken],
        ['Indexer elements per token', indexerElementsPerToken],
        ['Index heads', indexHeads],
        ['Index block size', blockSize],
        ['Top-k blocks', topkBlocks],
        ['Local blocks', localBlocks],
        ['MTP modules not included', mtpModules],
        ['Next-N layers not included', nextnLayers],
        ['Model fields', fieldList(model, ['num_hidden_layers', 'full_attention_layers', 'sparse_attention_layers', 'num_key_value_heads', 'head_dim', 'index_head_dim', 'index_n_heads', 'index_block_size', 'index_topk_blocks', 'index_local_blocks', 'indexer_fixed_precision_id'])],
      ],
    }
  }

  if (formula === 'deepseek_v4_hybrid') {
    const headDim = getField(model, 'head_dim')
    const indexDim = getField(model, 'index_head_dim')
    const slidingWindow = getField(model, 'sliding_window')
    const layers = getField(model, 'num_hidden_layers')
    const allRatios = Array.isArray(model.fields.compress_ratios)
      ? model.fields.compress_ratios.map(r => Number(r))
      : []
    const mainRatios = allRatios.slice(0, layers)
    const draftRatios = allRatios.slice(layers)
    const activeRatios = includeDraftKvCache ? mainRatios.concat(draftRatios) : mainRatios
    if (!activeRatios.length) {
      throw new Error(`Model ${model.id} is missing compress_ratios`)
    }
    let windowElements = 0
    let compressedElements = 0
    let indexerElements = 0
    const ratioZeroLayers = countByValue(activeRatios, 0)
    const ratioFourLayers = countByValue(activeRatios, 4)
    const ratio128Layers = countByValue(activeRatios, 128)
    const ratioZeroElements = ratioZeroLayers * slidingWindow * headDim
    for (const ratio of activeRatios) {
      windowElements += slidingWindow * headDim
      if (ratio > 0) {
        compressedElements += Math.floor(tokens / ratio) * headDim
      }
      if (ratio === 4) {
        indexerElements += Math.floor(tokens / 4) * indexDim
      }
    }
    const attentionElements = windowElements + compressedElements
    const elementsPerSequence = attentionElements + indexerElements
    return {
      elementsPerSequence,
      elementsPerToken: elementsPerSequence / tokens,
      formulaLabel: FORMULA_LABELS[formula],
      formulaText: 'sliding_kv_bytes = active_layers * sliding_window * head_dim * kv_precision_bytes\ncompressed_kv_bytes = sum_ratio>0(floor(tokens / compress_ratio) * head_dim) * kv_precision_bytes\nkv_bytes = sliding_kv_bytes + compressed_kv_bytes\nindexer_bytes = ratio4_layers * floor(tokens / 4) * index_head_dim * indexer_precision_bytes\ntotal_bytes = sequences * (kv_bytes + indexer_bytes)',
      formulaRows: [
        { name: 'sliding_kv_bytes', expression: 'active_layers x sliding_window x head_dim x kv_precision_bytes' },
        { name: 'compressed_kv_bytes', expression: 'sum over ratio>0 layers: floor(tokens / compress_ratio) x head_dim x kv_precision_bytes' },
        { name: 'kv_bytes', expression: 'sliding_kv_bytes + compressed_kv_bytes' },
        { name: 'indexer_bytes', expression: 'ratio4_layers x floor(tokens / 4) x index_head_dim x indexer_precision_bytes' },
        { name: 'total_bytes', expression: 'sequences x (kv_bytes + indexer_bytes)' },
      ],
      note: 'Production estimate uses the official sliding-window/compressed-cache layout. The default DeepSeek V4 setting uses FP8 attention cache and FP4 indexer cache.',
      byteGroups: [
        { role: 'kv', label: 'KV cache', elements: attentionElements },
        { role: 'indexer', label: 'Indexer cache', elements: indexerElements },
      ],
      components: [
        ['Main layers', mainRatios.length],
        ['Draft layers included', includeDraftKvCache ? draftRatios.length : 0],
        ['Ratio=4 layers', ratioFourLayers],
        ['Ratio=128 layers', ratio128Layers],
        ['Ratio=0 layers', ratioZeroLayers],
        ['Ratio=0 KV elements', ratioZeroElements],
        ['Sliding-window elements', windowElements],
        ['Compressed elements', compressedElements],
        ['KV elements', attentionElements],
        ['Indexer elements', indexerElements],
      ],
    }
  }

  throw new Error(`Unsupported formula: ${formula}`)
}

// ============================================================
// calculate — added in Task 6
// ============================================================
