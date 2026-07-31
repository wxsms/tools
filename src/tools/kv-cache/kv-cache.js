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
// calculateElementsPerSequence — added in Task 5
// calculate — added in Task 6
// ============================================================
