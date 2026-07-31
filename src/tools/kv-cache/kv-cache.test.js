import { describe, it, expect } from 'vitest'
import {
  BYTES_PER_GB,
  BYTES_PER_GIB,
  PRECISION_OPTIONS,
  INDEXER_PRECISION_OPTIONS,
  MODELS,
  MODEL_BY_ID,
  groupModelsByFamily,
  isDeepSeekV4,
  hasIndexerCache,
  hasDraftKvCache,
  hasLinearAttentionState,
  hasKdaCheckpointInterval,
  draftLayerCount,
  defaultPrecisionId,
  defaultIndexerPrecisionId,
  parseKdaCheckpointInterval,
  defaultKdaCheckpointInterval,
  indexerLayerPlan,
} from './kv-cache'

describe('constants', () => {
  it('uses 1e9 for GB and 1024^3 for GiB (kvcache.ai convention)', () => {
    expect(BYTES_PER_GB).toBe(1e9)
    expect(BYTES_PER_GIB).toBe(1024 ** 3)
  })

  it('exposes three precision options with correct byte sizes', () => {
    expect(PRECISION_OPTIONS.bf16_fp16.bytesPerElement).toBe(2)
    expect(PRECISION_OPTIONS.fp8_int8.bytesPerElement).toBe(1)
    expect(PRECISION_OPTIONS.fp4_int4.bytesPerElement).toBe(0.5)
    expect(INDEXER_PRECISION_OPTIONS.fp4_int4.bytesPerElement).toBe(0.5)
  })
})

describe('models data', () => {
  it('contains 53 models from kvcache.ai', () => {
    expect(MODELS.length).toBe(53)
  })

  it('indexes models by id', () => {
    expect(MODEL_BY_ID['qwen3-8b'].formula).toBe('standard_gqa')
    expect(MODEL_BY_ID['deepseek-v4-pro'].formula).toBe('deepseek_v4_hybrid')
  })

  it('groups models into 12 families in stable order', () => {
    const groups = groupModelsByFamily()
    const families = Object.keys(groups)
    expect(families).toEqual([
      'DeepSeek', 'GLM', 'Kimi', 'Qwen3.6', 'Qwen3.5',
      'Qwen3', 'Qwen2.5', 'Llama', 'Gemma', 'Cohere', 'MiMo', 'MiniMax',
    ])
    expect(groups.DeepSeek.length).toBe(5)
    expect(groups.Qwen3.length).toBe(8)
    expect(groups.MiniMax.length).toBe(5)
  })

  it('sorts models within family by numeric label', () => {
    const groups = groupModelsByFamily()
    const qwen3Labels = groups.Qwen3.map(m => m.label)
    expect(qwen3Labels.indexOf('Qwen3-0.6B')).toBeLessThan(qwen3Labels.indexOf('Qwen3-8B'))
    expect(qwen3Labels.indexOf('Qwen3-8B')).toBeLessThan(qwen3Labels.indexOf('Qwen3-235B-A22B'))
  })
})

describe('isDeepSeekV4', () => {
  it('returns true for V4 Pro and V4 Flash', () => {
    expect(isDeepSeekV4(MODEL_BY_ID['deepseek-v4-pro'])).toBe(true)
    expect(isDeepSeekV4(MODEL_BY_ID['deepseek-v4-flash'])).toBe(true)
  })

  it('returns false for V3 and R1', () => {
    expect(isDeepSeekV4(MODEL_BY_ID['deepseek-v3'])).toBe(false)
    expect(isDeepSeekV4(MODEL_BY_ID['deepseek-r1'])).toBe(false)
  })
})

describe('hasIndexerCache', () => {
  it('true for dsa_mla, minimax_msa, and deepseek_v4_hybrid models', () => {
    expect(hasIndexerCache(MODEL_BY_ID['deepseek-v3.2'])).toBe(true)
    expect(hasIndexerCache(MODEL_BY_ID['glm-5'])).toBe(true)
    expect(hasIndexerCache(MODEL_BY_ID['minimax-m3'])).toBe(true)
    expect(hasIndexerCache(MODEL_BY_ID['deepseek-v4-pro'])).toBe(true)
  })

  it('false for plain mla and standard_gqa models', () => {
    expect(hasIndexerCache(MODEL_BY_ID['deepseek-v3'])).toBe(false)
    expect(hasIndexerCache(MODEL_BY_ID['qwen3-8b'])).toBe(false)
  })
})

describe('hasDraftKvCache', () => {
  it('true for DeepSeek V4 (compress_ratios has draft layer)', () => {
    expect(hasDraftKvCache(MODEL_BY_ID['deepseek-v4-pro'])).toBe(true)
    expect(hasDraftKvCache(MODEL_BY_ID['deepseek-v4-flash'])).toBe(true)
  })

  it('true for DeepSeek V3 (num_nextn_predict_layers=1)', () => {
    expect(hasDraftKvCache(MODEL_BY_ID['deepseek-v3'])).toBe(true)
  })

  it('false for MiniMax M3 (disable_draft_kv_cache=true)', () => {
    expect(hasDraftKvCache(MODEL_BY_ID['minimax-m3'])).toBe(false)
  })

  it('false for Qwen3-8B (no draft fields)', () => {
    expect(hasDraftKvCache(MODEL_BY_ID['qwen3-8b'])).toBe(false)
  })
})

describe('draftLayerCount', () => {
  it('returns num_nextn_predict_layers when set', () => {
    expect(draftLayerCount(MODEL_BY_ID['deepseek-v3'])).toBe(1)
  })

  it('returns 0 when disable_draft_kv_cache=true', () => {
    expect(draftLayerCount(MODEL_BY_ID['minimax-m3'])).toBe(0)
  })
})

describe('hasLinearAttentionState', () => {
  it('true for qwen_linear_full_hybrid and kimi_kda_mla_hybrid', () => {
    expect(hasLinearAttentionState(MODEL_BY_ID['qwen3.5-397b-a17b'])).toBe(true)
    expect(hasLinearAttentionState(MODEL_BY_ID['kimi-k3'])).toBe(true)
  })

  it('false for standard_gqa', () => {
    expect(hasLinearAttentionState(MODEL_BY_ID['qwen3-8b'])).toBe(false)
  })
})

describe('hasKdaCheckpointInterval', () => {
  it('true only for kimi_kda_mla_hybrid', () => {
    expect(hasKdaCheckpointInterval(MODEL_BY_ID['kimi-k3'])).toBe(true)
    expect(hasKdaCheckpointInterval(MODEL_BY_ID['qwen3.5-397b-a17b'])).toBe(false)
  })
})

describe('defaultPrecisionId', () => {
  it('uses model default when set', () => {
    expect(defaultPrecisionId(MODEL_BY_ID['kimi-k3'])).toBe('bf16_fp16')
  })

  it('defaults to fp8_int8 for DeepSeek V4', () => {
    expect(defaultPrecisionId(MODEL_BY_ID['deepseek-v4-pro'])).toBe('fp8_int8')
  })

  it('defaults to bf16_fp16 for everything else', () => {
    expect(defaultPrecisionId(MODEL_BY_ID['qwen3-8b'])).toBe('bf16_fp16')
  })
})

describe('defaultIndexerPrecisionId', () => {
  it('defaults to fp4_int4 for DeepSeek V4', () => {
    expect(defaultIndexerPrecisionId(MODEL_BY_ID['deepseek-v4-pro'])).toBe('fp4_int4')
  })

  it('falls back to KV precision when no fixed default', () => {
    expect(defaultIndexerPrecisionId(MODEL_BY_ID['deepseek-v3.2'], undefined, 'bf16_fp16')).toBe('bf16_fp16')
  })
})

describe('parseKdaCheckpointInterval', () => {
  it('returns Infinity for "infinity" string', () => {
    expect(parseKdaCheckpointInterval('infinity')).toBe(Infinity)
  })

  it('returns Infinity for "∞" sentinel', () => {
    expect(parseKdaCheckpointInterval('∞')).toBe(Infinity)
  })

  it('returns positive integer for numeric input', () => {
    expect(parseKdaCheckpointInterval(10240)).toBe(10240)
    expect(parseKdaCheckpointInterval('10240')).toBe(10240)
  })

  it('floors non-integer numeric input', () => {
    expect(parseKdaCheckpointInterval(10240.9)).toBe(10240)
  })

  it('returns fallback for invalid input', () => {
    expect(parseKdaCheckpointInterval(0, 512)).toBe(512)
    expect(parseKdaCheckpointInterval(-1, 512)).toBe(512)
    expect(parseKdaCheckpointInterval('abc', 512)).toBe(512)
  })
})

describe('defaultKdaCheckpointInterval', () => {
  it('returns Infinity for Kimi K3 (default "infinity" in yaml)', () => {
    expect(defaultKdaCheckpointInterval(MODEL_BY_ID['kimi-k3'])).toBe(Infinity)
  })
})

describe('indexerLayerPlan', () => {
  it('uses indexer_full_layers when set, derives shared from remainder', () => {
    const plan = indexerLayerPlan(MODEL_BY_ID['glm-5.2'], 78, 1)
    expect(plan.mainIndexerLayers).toBe(21)
    expect(plan.sharedIndexerLayers).toBe(57)
    expect(plan.draftIndexerLayers).toBe(1)
    expect(plan.activeIndexerLayers).toBe(22)
  })

  it('defaults main to num_hidden_layers when no indexer_full_layers field', () => {
    const plan = indexerLayerPlan(MODEL_BY_ID['deepseek-v3.2'], 61, 0)
    expect(plan.mainIndexerLayers).toBe(61)
    expect(plan.sharedIndexerLayers).toBe(0)
    expect(plan.draftIndexerLayers).toBe(0)
    expect(plan.activeIndexerLayers).toBe(61)
  })
})

import { calculateElementsPerSequence } from './kv-cache'

// ============================================================
// calculateElementsPerSequence — per-formula correctness
// ============================================================

describe('calculateElementsPerSequence — standard_gqa (Qwen3-8B)', () => {
  const model = MODEL_BY_ID['qwen3-8b']
  it('computes correct elementsPerToken for 1024 tokens, no draft', () => {
    const r = calculateElementsPerSequence(model, 1024, {})
    expect(r.elementsPerToken).toBe(36 * 2 * 8 * 128)
    expect(r.elementsPerSequence).toBe(73728 * 1024)
    expect(r.formulaLabel).toBe('Standard MHA/GQA')
    expect(r.byteGroups.length).toBe(1)
    expect(r.byteGroups[0].role).toBe('kv')
  })

  it('does not add draft layers when model has no draft fields', () => {
    const r = calculateElementsPerSequence(model, 1024, { includeDraftKvCache: true })
    expect(r.elementsPerToken).toBe(36 * 2 * 8 * 128)
  })
})

describe('calculateElementsPerSequence — mla (DeepSeek V3)', () => {
  const model = MODEL_BY_ID['deepseek-v3']
  it('computes correct elementsPerToken', () => {
    const r = calculateElementsPerSequence(model, 1024, {})
    expect(r.elementsPerToken).toBe(61 * (512 + 64))
    expect(r.elementsPerSequence).toBe(35136 * 1024)
    expect(r.formulaLabel).toBe('MLA latent KV')
  })

  it('adds draft layer when includeDraftKvCache=true (num_nextn_predict_layers=1)', () => {
    const r = calculateElementsPerSequence(model, 1024, { includeDraftKvCache: true })
    expect(r.elementsPerToken).toBe(62 * (512 + 64))
  })
})

describe('calculateElementsPerSequence — dsa_mla (DeepSeek V3.2)', () => {
  const model = MODEL_BY_ID['deepseek-v3.2']
  it('computes correct split between KV and indexer elements', () => {
    const r = calculateElementsPerSequence(model, 1024, {})
    expect(r.elementsPerToken).toBe(35136 + 7808)
    expect(r.byteGroups.length).toBe(2)
    expect(r.byteGroups[0].role).toBe('kv')
    expect(r.byteGroups[1].role).toBe('indexer')
  })
})

describe('calculateElementsPerSequence — kimi_kda_mla_hybrid (Kimi K3)', () => {
  const model = MODEL_BY_ID['kimi-k3']
  it('computes MLA elements per token without linear state', () => {
    const r = calculateElementsPerSequence(model, 1024, {})
    expect(r.elementsPerToken).toBe(13824)
    expect(r.byteGroups.length).toBe(1)
    expect(r.byteGroups[0].role).toBe('kv')
  })

  it('adds KDA checkpoint state with prompt-end (Infinity) interval = 1 checkpoint', () => {
    const r = calculateElementsPerSequence(model, 1024, {
      includeLinearAttentionState: true,
      kdaCheckpointInterval: Infinity,
    })
    expect(r.byteGroups.length).toBe(2)
    expect(r.byteGroups[1].role).toBe('linear_state')
    // kda_conv_elements = 69 × 3 × (96×128 + 96×128 + 96×128) = 7,630,848
    // kda_recurrent_elements = 69 × 96 × 128 × 128 = 108,527,616
    // kda_state_bytes = 7,630,848 × 2 + 108,527,616 × 4 = 15,261,696 + 434,110,464 = 449,372,160
    expect(r.byteGroups[1].bytesPerSequence).toBe(449372160)
  })

  it('uses ceil(tokens/interval) checkpoints for finite interval', () => {
    const r = calculateElementsPerSequence(model, 1024, {
      includeLinearAttentionState: true,
      kdaCheckpointInterval: 100,
    })
    expect(r.byteGroups[1].bytesPerSequence).toBe(11 * 449372160)
  })
})

describe('calculateElementsPerSequence — qwen_linear_full_hybrid (Qwen3.5-397B)', () => {
  const model = MODEL_BY_ID['qwen3.5-397b-a17b']
  it('computes full-attention elements without linear state', () => {
    const r = calculateElementsPerSequence(model, 1024, {})
    expect(r.elementsPerToken).toBe(15360)
    expect(r.byteGroups.length).toBe(1)
  })

  it('adds linear-attention state when enabled', () => {
    const r = calculateElementsPerSequence(model, 1024, { includeLinearAttentionState: true })
    expect(r.byteGroups.length).toBe(2)
    expect(r.byteGroups[1].role).toBe('linear_state')
    expect(r.byteGroups[1].bytesPerSequence).toBe(193167360)
  })
})

describe('calculateElementsPerSequence — mixed_full_sliding_gqa (Gemma 4 31B)', () => {
  const model = MODEL_BY_ID['gemma-4-31b']
  it('caps sliding tokens at sliding_window when tokens > window', () => {
    const r = calculateElementsPerSequence(model, 10000, {})
    // full_elements = 10000 × 10 × 4 × (512 + 512) = 409,600,000
    // sliding_elements = 1024 × 50 × 16 × (256 + 256) = 419,430,400
    expect(r.byteGroups[0].elements).toBe(409600000)
    expect(r.byteGroups[1].elements).toBe(419430400)
  })

  it('uses full tokens for sliding when tokens < window', () => {
    const r = calculateElementsPerSequence(model, 500, {})
    expect(r.byteGroups[0].elements).toBe(20480000)
    expect(r.byteGroups[1].elements).toBe(204800000)
  })
})

describe('calculateElementsPerSequence — minimax_msa (MiniMax M3)', () => {
  const model = MODEL_BY_ID['minimax-m3']
  it('computes correct KV and indexer elements', () => {
    const r = calculateElementsPerSequence(model, 1024, {})
    expect(r.elementsPerToken).toBe(61440 + 7296)
    expect(r.byteGroups[0].role).toBe('kv')
    expect(r.byteGroups[1].role).toBe('indexer')
  })
})

describe('calculateElementsPerSequence — deepseek_v4_hybrid (V4 Pro)', () => {
  const model = MODEL_BY_ID['deepseek-v4-pro']
  it('matches an independent computation for 1024 tokens with draft enabled', () => {
    const ratios = model.fields.compress_ratios.map(Number)
    const layers = 61
    const mainRatios = ratios.slice(0, layers)
    const draftRatios = ratios.slice(layers)
    const activeRatios = mainRatios.concat(draftRatios)
    let windowElements = 0
    let compressedElements = 0
    let indexerElements = 0
    for (const ratio of activeRatios) {
      windowElements += 128 * 512
      if (ratio > 0) compressedElements += Math.floor(1024 / ratio) * 512
      if (ratio === 4) indexerElements += Math.floor(1024 / 4) * 128
    }
    const expectedAttention = windowElements + compressedElements
    const r = calculateElementsPerSequence(model, 1024, { includeDraftKvCache: true })
    expect(r.byteGroups[0].elements).toBe(expectedAttention)
    expect(r.byteGroups[1].elements).toBe(indexerElements)
  })

  it('excludes draft ratio when includeDraftKvCache=false', () => {
    const rWith = calculateElementsPerSequence(model, 1024, { includeDraftKvCache: true })
    const rWithout = calculateElementsPerSequence(model, 1024, { includeDraftKvCache: false })
    expect(rWith.byteGroups[0].elements - rWithout.byteGroups[0].elements).toBe(65536)
  })
})

import { calculate, KDA_CHECKPOINT_POLICY_PROMPT_END, KDA_CHECKPOINT_POLICY_FIXED_INTERVAL } from './kv-cache'

// ============================================================
// calculate — top-level integration
// ============================================================

describe('calculate — input validation', () => {
  const model = MODEL_BY_ID['qwen3-8b']

  it('returns error for unknown precision', () => {
    const res = calculate(model, { tokens: 1024, precision: 'fp7' })
    expect(res.error).toContain('未知精度')
  })

  it('returns error for unknown indexer precision', () => {
    const res = calculate(MODEL_BY_ID['deepseek-v3.2'], { tokens: 1024, indexerPrecision: 'fp7' })
    expect(res.error).toContain('未知 indexer 精度')
  })

  it('coerces invalid tokens to default', () => {
    const res = calculate(model, { tokens: -1 })
    expect(res.tokens).toBe(model.default_tokens)
  })

  it('coerces invalid sequences to 1', () => {
    const res = calculate(model, { tokens: 1024, sequences: 0 })
    expect(res.sequences).toBe(1)
  })
})

describe('calculate — Qwen3-8B (standard_gqa, 1024 tokens, bf16, 1 seq)', () => {
  const model = MODEL_BY_ID['qwen3-8b']
  const res = calculate(model, { tokens: 1024, sequences: 1, precision: 'bf16_fp16' })

  it('produces correct totalBytes', () => {
    expect(res.totalBytes).toBe(36 * 2 * 8 * 128 * 1024 * 2)
  })

  it('reports totalGB (10^9) and totalGiB (1024^3)', () => {
    // totalBytes = 150,994,944 (36×2×8×128×1024×2 bytes for bf16)
    expect(res.totalGB).toBeCloseTo(150994944 / 1e9, 5)
    expect(res.totalGiB).toBeCloseTo(150994944 / 1024 ** 3, 5)
  })

  it('reports bytesPerToken = bytesPerSequence / tokens', () => {
    expect(res.bytesPerToken).toBeCloseTo(res.bytesPerSequence / 1024, 5)
  })

  it('kvBytes equals totalBytes (no indexer)', () => {
    expect(res.kvBytes).toBe(res.totalBytes)
    expect(res.indexerBytes).toBe(0)
  })

  it('precisionLabel is BF16 / FP16', () => {
    expect(res.precisionLabel).toBe('BF16 / FP16')
  })
})

describe('calculate — sequences scaling', () => {
  const model = MODEL_BY_ID['qwen3-8b']

  it('totalBytes scales linearly with sequences', () => {
    const r1 = calculate(model, { tokens: 1024, sequences: 1 })
    const r4 = calculate(model, { tokens: 1024, sequences: 4 })
    expect(r4.totalBytes).toBe(r1.totalBytes * 4)
    expect(r4.totalCachedTokens).toBe(4096)
  })
})

describe('calculate — tensor parallel splits bytes', () => {
  const model = MODEL_BY_ID['qwen3-8b']

  it('perDeviceBytes = totalBytes / tensorParallel', () => {
    const r = calculate(model, { tokens: 1024, sequences: 1, tensorParallel: 2 })
    expect(r.perDeviceBytes).toBe(r.totalBytes / 2)
    expect(r.perDeviceGiB).toBeCloseTo(r.totalBytes / 2 / 1024 ** 3, 5)
  })
})

describe('calculate — precision switch halves bytes', () => {
  const model = MODEL_BY_ID['qwen3-8b']

  it('bf16 → fp8 halves totalBytes', () => {
    const bf16 = calculate(model, { tokens: 1024, precision: 'bf16_fp16' })
    const fp8 = calculate(model, { tokens: 1024, precision: 'fp8_int8' })
    expect(bf16.totalBytes / fp8.totalBytes).toBe(2)
  })

  it('fp8 → fp4 halves again', () => {
    const fp8 = calculate(model, { tokens: 1024, precision: 'fp8_int8' })
    const fp4 = calculate(model, { tokens: 1024, precision: 'fp4_int4' })
    expect(fp8.totalBytes / fp4.totalBytes).toBe(2)
  })
})

describe('calculate — DeepSeek V3.2 (dsa_mla) separates KV and indexer bytes', () => {
  const model = MODEL_BY_ID['deepseek-v3.2']
  const res = calculate(model, { tokens: 1024, sequences: 1 })

  it('kvBytes and indexerBytes sum to totalBytes', () => {
    expect(res.kvBytes + res.indexerBytes).toBe(res.totalBytes)
  })

  it('indexerBytes > 0', () => {
    expect(res.indexerBytes).toBeGreaterThan(0)
  })

  it('indexer precision defaults to bf16 (no fixed default for V3.2)', () => {
    expect(res.indexerPrecisionLabel).toBe('BF16 / FP16')
  })
})

describe('calculate — DeepSeek V4 Pro defaults to fp8 KV + fp4 indexer', () => {
  const model = MODEL_BY_ID['deepseek-v4-pro']

  it('default precision is fp8_int8', () => {
    const res = calculate(model, { tokens: 1024 })
    expect(res.precisionLabel).toBe('FP8 / INT8')
    expect(res.indexerPrecisionLabel).toBe('FP4 / INT4')
  })

  it('indexer bytes use 0.5 bytes/element, KV uses 1 byte/element', () => {
    const res = calculate(model, { tokens: 1024 })
    const plan = calculateElementsPerSequence(model, 1024, {})
    expect(res.kvBytes).toBe(plan.byteGroups[0].elements * 1)
    expect(res.indexerBytes).toBe(plan.byteGroups[1].elements * 0.5)
  })
})

describe('calculate — Kimi K3 prompt-end vs fixed-interval', () => {
  const model = MODEL_BY_ID['kimi-k3']

  it('prompt-end (default Infinity) → 1 checkpoint', () => {
    const res = calculate(model, {
      tokens: 1024,
      includeLinearAttentionState: true,
      kdaCheckpointPolicy: KDA_CHECKPOINT_POLICY_PROMPT_END,
    })
    expect(res.elementPlan.components.find(c => c[0] === 'KDA checkpoints per sequence')[1]).toBe(1)
  })

  it('fixed-interval=500 → ceil(1024/500) = 3 checkpoints', () => {
    const res = calculate(model, {
      tokens: 1024,
      includeLinearAttentionState: true,
      kdaCheckpointPolicy: KDA_CHECKPOINT_POLICY_FIXED_INTERVAL,
      kdaCheckpointInterval: 500,
    })
    expect(res.elementPlan.components.find(c => c[0] === 'KDA checkpoints per sequence')[1]).toBe(3)
  })

  it('without linear-attention-state, KDA bytes are excluded', () => {
    const res = calculate(model, { tokens: 1024, includeLinearAttentionState: false })
    expect(res.cacheGroups.length).toBe(1)
    expect(res.cacheGroups[0].role).toBe('kv')
  })
})

describe('calculate — MiniMax M3 disables draft KV', () => {
  const model = MODEL_BY_ID['minimax-m3']

  it('hasDraftKvCache is false (disable_draft_kv_cache=true)', () => {
    expect(hasDraftKvCache(model)).toBe(false)
  })

  it('calculate ignores includeDraftKvCache=true', () => {
    const rOff = calculate(model, { tokens: 1024, includeDraftKvCache: false })
    const rOn = calculate(model, { tokens: 1024, includeDraftKvCache: true })
    expect(rOn.totalBytes).toBe(rOff.totalBytes)
  })
})
