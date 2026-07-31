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
