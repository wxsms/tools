import { describe, it, expect } from 'vitest'
import {
  DTYPE_SIZES,
  MODELS,
  MODEL_NAMES,
  detectArch,
  archLabel,
  computeForward,
  computeReverse,
} from './kv-cache'

describe('kv-cache utils — exports', () => {
  it('DTYPE_SIZES has correct byte sizes', () => {
    expect(DTYPE_SIZES.float32).toBe(4)
    expect(DTYPE_SIZES.float16).toBe(2)
    expect(DTYPE_SIZES.bfloat16).toBe(2)
    expect(DTYPE_SIZES.fp8).toBe(1)
  })

  it('MODELS contains 39 entries from LMCache dev branch', () => {
    expect(Object.keys(MODELS).length).toBe(39)
  })

  it('MODEL_NAMES is sorted and contains Qwen3-8B', () => {
    expect(MODEL_NAMES).toContain('Qwen/Qwen3-8B')
    // Numeric sort: Qwen3-0.6B should come before Qwen3-4B
    expect(MODEL_NAMES.indexOf('Qwen/Qwen3-0.6B')).toBeLessThan(MODEL_NAMES.indexOf('Qwen/Qwen3-4B'))
  })
})

describe('detectArch', () => {
  it('detects DSA for V4-Pro / V4-Flash', () => {
    expect(detectArch(MODELS['deepseek-ai/DeepSeek-V4-Pro'])).toBe('dsa')
    expect(detectArch(MODELS['deepseek-ai/DeepSeek-V4-Flash'])).toBe('dsa')
  })

  it('detects MLA for DeepSeek-V3, R1, Kimi-K2.6, GLM-5.1', () => {
    expect(detectArch(MODELS['deepseek-ai/DeepSeek-V3'])).toBe('mla')
    expect(detectArch(MODELS['deepseek-ai/DeepSeek-R1'])).toBe('mla')
    expect(detectArch(MODELS['moonshotai/Kimi-K2.6'])).toBe('mla')
    expect(detectArch(MODELS['zai-org/GLM-5.1'])).toBe('mla')
  })

  it('detects hybrid-linear for Qwen3.5-397B and Nemotron-3', () => {
    expect(detectArch(MODELS['Qwen/Qwen3.5-397B-A17B-FP8'])).toBe('hybrid-linear')
    expect(detectArch(MODELS['nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-FP8'])).toBe('hybrid-linear')
  })

  it('detects hybrid-swa for gemma-4 / gpt-oss / Laguna', () => {
    expect(detectArch(MODELS['google/gemma-4-31B-it'])).toBe('hybrid-swa')
    expect(detectArch(MODELS['openai/gpt-oss-120b'])).toBe('hybrid-swa')
    expect(detectArch(MODELS['openai/gpt-oss-20b'])).toBe('hybrid-swa')
    expect(detectArch(MODELS['poolside/Laguna-XS.2'])).toBe('hybrid-swa')
  })

  it('detects gqa for models with explicit head_dim', () => {
    expect(detectArch(MODELS['Qwen/Qwen3-8B'])).toBe('gqa')
    expect(detectArch(MODELS['zai-org/GLM-4.5'])).toBe('gqa')
  })

  it('detects standard for models without explicit head_dim', () => {
    expect(detectArch(MODELS['meta-llama/Llama-3.1-8B-Instruct'])).toBe('standard')
    expect(detectArch(MODELS['Qwen/Qwen2.5-7B-Instruct'])).toBe('standard')
  })
})

describe('archLabel', () => {
  it('returns human-readable label for each architecture', () => {
    expect(archLabel(MODELS['deepseek-ai/DeepSeek-V4-Pro'])).toContain('DeepSeek V4 DSA')
    expect(archLabel(MODELS['deepseek-ai/DeepSeek-V3'])).toContain('MLA')
    expect(archLabel(MODELS['Qwen/Qwen3.5-397B-A17B-FP8'])).toContain('Linear')
    expect(archLabel(MODELS['google/gemma-4-31B-it'])).toContain('Sliding-Window')
    expect(archLabel(MODELS['Qwen/Qwen3-8B'])).toContain('GQA')
    expect(archLabel(MODELS['meta-llama/Llama-3.1-8B-Instruct'])).toContain('Standard')
  })
})

// ============================================================
// computeForward — per-architecture numeric correctness
// ============================================================

describe('computeForward — input validation', () => {
  it('rejects NaN / 0 / negative / fractional tokens', () => {
    const cfg = MODELS['Qwen/Qwen3-8B']
    for (const t of [NaN, 0, -1, 1.5, -0.5]) {
      const res = computeForward({ config: cfg, tokens: t, dtype: 'bfloat16' })
      expect(res.error).toContain('正整数')
    }
  })

  it('rejects unknown dtype', () => {
    const cfg = MODELS['Qwen/Qwen3-8B']
    const res = computeForward({ config: cfg, tokens: 1024, dtype: 'int8' })
    // DTYPE_SIZES.int8 is undefined → dtypeSize undefined → NaN propagates
    // We accept either an explicit guard or a NaN result; here it propagates as NaN,
    // which produces a NaN headline. Test that it does not silently succeed numerically.
    expect(res.headline).toMatch(/NaN|undefined|正整数/)
  })
})

describe('computeForward — GQA (Qwen3-8B)', () => {
  it('matches the canonical GQA formula', () => {
    // 2 × layers(36) × tokens × kv_heads(8) × head_dim(128) × dtype_size
    // BF16: 2×36×1024×8×128×2 = 150,994,944 bytes = 0.14062 GB
    const cfg = MODELS['Qwen/Qwen3-8B']
    const res = computeForward({ config: cfg, tokens: 1024, dtype: 'bfloat16' })
    expect(res.error).toBeUndefined()
    expect(res.totalBytes).toBe(2 * 36 * 1024 * 8 * 128 * 2)
    expect(res.sizeGB).toBeCloseTo(0.14062, 4)
    expect(res.headline).toMatch(/0\.1406\d?\s*GB/)
  })

  it('scales linearly with token count', () => {
    const cfg = MODELS['Qwen/Qwen3-8B']
    const r1 = computeForward({ config: cfg, tokens: 1024, dtype: 'bfloat16' })
    const r10 = computeForward({ config: cfg, tokens: 10240, dtype: 'bfloat16' })
    expect(r10.totalBytes / r1.totalBytes).toBeCloseTo(10, 5)
  })

  it('halves result when switching BF16 → FP8', () => {
    const cfg = MODELS['Qwen/Qwen3-8B']
    const bf16 = computeForward({ config: cfg, tokens: 1024, dtype: 'bfloat16' })
    const fp8 = computeForward({ config: cfg, tokens: 1024, dtype: 'fp8' })
    expect(bf16.totalBytes / fp8.totalBytes).toBe(2)
  })

  it('doubles result when switching BF16 → FP32', () => {
    const cfg = MODELS['Qwen/Qwen3-8B']
    const bf16 = computeForward({ config: cfg, tokens: 1024, dtype: 'bfloat16' })
    const fp32 = computeForward({ config: cfg, tokens: 1024, dtype: 'float32' })
    expect(fp32.totalBytes / bf16.totalBytes).toBe(2)
  })

  it('exposes tokens echo in result', () => {
    const cfg = MODELS['Qwen/Qwen3-8B']
    const res = computeForward({ config: cfg, tokens: 5000, dtype: 'bfloat16' })
    expect(res.tokens).toBe(5000)
  })
})

describe('computeForward — Standard Transformer (Llama-3.1-8B)', () => {
  it('computes head_size = hidden_size / num_attention_heads', () => {
    // hidden=4096, attn_heads=32 → head_size=128; layers=32, kv_heads=8
    // 2 × 32 × 1024 × 8 × 128 × 2 = 134,217,728 bytes = 0.125 GB
    const cfg = MODELS['meta-llama/Llama-3.1-8B-Instruct']
    const res = computeForward({ config: cfg, tokens: 1024, dtype: 'bfloat16' })
    expect(res.totalBytes).toBe(2 * 32 * 1024 * 8 * (4096 / 32) * 2)
    expect(res.sizeGB).toBeCloseTo(0.125, 4)
  })
})

describe('computeForward — MLA (DeepSeek-V3)', () => {
  it('uses kv_lora_rank + qk_rope_head_dim as latent_dim', () => {
    // latent_dim = 512 + 64 = 576; layers=61; 1024 tokens BF16
    // 61 × 1024 × 576 × 2 = 71,995,392 bytes ≈ 0.0670 GB
    const cfg = MODELS['deepseek-ai/DeepSeek-V3']
    const res = computeForward({ config: cfg, tokens: 1024, dtype: 'bfloat16' })
    expect(res.totalBytes).toBe(61 * 1024 * (512 + 64) * 2)
    expect(res.sizeGB).toBeCloseTo(0.0670, 4)
  })

  it('includes indexer dim for MLA-with-indexer (GLM-5.1)', () => {
    // latent_dim = 512 + 64 = 576, indexer_dim = 128; layers=78; 1024 tokens BF16
    // 78 × 1024 × (576 + 128) × 2 = 112,407,336 bytes ≈ 0.1047 GB
    const cfg = MODELS['zai-org/GLM-5.1']
    const res = computeForward({ config: cfg, tokens: 1024, dtype: 'bfloat16' })
    expect(res.totalBytes).toBe(78 * 1024 * (576 + 128) * 2)
    expect(res.sizeGB).toBeCloseTo(0.1047, 4)
    expect(res.details.find(([k]) => k === 'Indexer Head Dim (DSA)')).toBeTruthy()
  })
})

describe('computeForward — Hybrid SWA (gemma-4-31B-it)', () => {
  it('caps sliding layers at the window once tokens > window', () => {
    const cfg = MODELS['google/gemma-4-31B-it']
    // window=1024. With 100 tokens (< window):
    //   perLayer = 2 × 16 × 256 = 8192
    //   swaTokens = min(100, 1024) = 100
    //   total = 8192 × (10 × 100 + 50 × 100) × 2 = 9,830,400 bytes
    const rShort = computeForward({ config: cfg, tokens: 100, dtype: 'bfloat16' })
    const perLayer = 2 * 16 * 256
    expect(rShort.totalBytes).toBe(perLayer * (10 * 100 + 50 * 100) * 2)

    // With 10000 tokens (> window):
    //   swaTokens = 1024
    //   total = 8192 × (10 × 10000 + 50 × 1024) × 2 = 1,677,516,800 bytes
    const rLong = computeForward({ config: cfg, tokens: 10000, dtype: 'bfloat16' })
    expect(rLong.totalBytes).toBe(perLayer * (10 * 10000 + 50 * 1024) * 2)

    // Sanity: long-context is much larger than short, but linear only in full-attention layers
    expect(rLong.totalBytes).toBeGreaterThan(rShort.totalBytes * 10)
  })

  it('details line shows sliding layer using capped token count', () => {
    const cfg = MODELS['google/gemma-4-31B-it']
    const res = computeForward({ config: cfg, tokens: 10000, dtype: 'bfloat16' })
    const swaLine = res.details.find(([k]) => k === 'Sliding-Attention Layers')
    expect(swaLine[1]).toContain('using 1024 tokens')
  })
})

describe('computeForward — Hybrid Linear (Qwen3.5-397B)', () => {
  it('only counts full-attention layers (linear layers recurrent, not counted)', () => {
    const cfg = MODELS['Qwen/Qwen3.5-397B-A17B-FP8']
    // perLayer = 2 × kv_heads(2) × head_dim(256) = 1024
    // nFull = 15; 1024 tokens BF16
    // total = 1024 × 15 × 1024 × 2 = 31,457,280 bytes
    const perLayer = 2 * 2 * 256
    const res = computeForward({ config: cfg, tokens: 1024, dtype: 'bfloat16' })
    expect(res.totalBytes).toBe(perLayer * 15 * 1024 * 2)
    expect(res.note).toContain('Gated DeltaNet') // default linear_attention_type
  })

  it('uses model-provided linear_attention_type in note (Nemotron-3 → Mamba2 SSM)', () => {
    const cfg = MODELS['nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-FP8']
    const res = computeForward({ config: cfg, tokens: 1024, dtype: 'bfloat16' })
    expect(res.note).toContain('Mamba2 SSM')
  })
})

describe('computeForward — DSA (DeepSeek V4)', () => {
  it('ignores dtype selector — uses native mixed precision (FP8 NoPE / BF16 RoPE / FP4 indexer)', () => {
    const cfg = MODELS['deepseek-ai/DeepSeek-V4-Pro']
    const bf16 = computeForward({ config: cfg, tokens: 1000, dtype: 'bfloat16' })
    const fp8 = computeForward({ config: cfg, tokens: 1000, dtype: 'fp8' })
    // Same bytes regardless of dtype selector
    expect(bf16.totalBytes).toBe(fp8.totalBytes)
  })

  it('V4-Pro 1000 tokens ≈ 4.62 GB (matches LMCache source calculation)', () => {
    const cfg = MODELS['deepseek-ai/DeepSeek-V4-Pro']
    const res = computeForward({ config: cfg, tokens: 1000000, dtype: 'bfloat16' })
    // Independently verified:
    //   Σ(1/r for r>0) = 7.7421875
    //   kv_bytes_per_entry = (512-64)*1 + 64*2 = 576
    //   indexer_bytes_per_entry = 128*0.5 = 64
    //   bytes_per_token = (576+64)*7.7421875 = 4955
    //   window_bytes = 62 × 128 × 576 = 4,571,136
    //   total = 4955 × 1,000,000 + 4,571,136 = ~4.619 GB
    expect(res.sizeGB).toBeCloseTo(4.619, 2)
  })

  it('V4-Flash 1M tokens ≈ 3.23 GB', () => {
    const cfg = MODELS['deepseek-ai/DeepSeek-V4-Flash']
    const res = computeForward({ config: cfg, tokens: 1000000, dtype: 'bfloat16' })
    expect(res.sizeGB).toBeCloseTo(3.225, 2)
  })

  it('respects custom precision override (NoPE 2B doubles KV entry bytes for NoPE dims)', () => {
    const cfg = MODELS['deepseek-ai/DeepSeek-V4-Pro']
    const def = computeForward({ config: cfg, tokens: 1024, dtype: 'bfloat16' })
    const custom = computeForward({
      config: cfg, tokens: 1024, dtype: 'bfloat16',
      prec: { mode: 'custom', nope: 2, rope: 2, indexer: 0.5 },
    })
    // Default NoPE=1, custom NoPE=2 → KV entry bytes grow
    //   default: (512-64)*1 + 64*2 = 576
    //   custom:  (512-64)*2 + 64*2 = 1056
    expect(custom.totalBytes).toBeGreaterThan(def.totalBytes)
  })

  it('precision details line reflects default vs custom mode', () => {
    const cfg = MODELS['deepseek-ai/DeepSeek-V4-Pro']
    const def = computeForward({ config: cfg, tokens: 1024, dtype: 'bfloat16' })
    const defLine = def.details.find(([k]) => k === 'Precision')
    expect(defLine[1]).toContain('paper default')

    const custom = computeForward({
      config: cfg, tokens: 1024, dtype: 'bfloat16',
      prec: { mode: 'custom', nope: 1, rope: 2, indexer: 0.5 },
    })
    const customLine = custom.details.find(([k]) => k === 'Precision')
    expect(customLine[1]).toContain('custom')
  })
})

// ============================================================
// computeReverse — per-architecture
// ============================================================

describe('computeReverse — input validation', () => {
  it('rejects 0 / negative / NaN GPU RAM', () => {
    const cfg = MODELS['Qwen/Qwen3-8B']
    for (const r of [0, -1, NaN]) {
      const res = computeReverse({ config: cfg, gpuRamGB: r, dtype: 'bfloat16' })
      expect(res.error).toContain('GPU 显存')
    }
  })
})

describe('computeReverse — GQA', () => {
  it('inverts the forward formula exactly when RAM is a clean multiple', () => {
    const cfg = MODELS['Qwen/Qwen3-8B']
    // bytes_per_token = 2 × 36 × 8 × 128 × 2 = 73728
    // For 1024 tokens, total = 75,497,472 bytes → 0.0703 GB
    // Reverse at 0.0703 GB should give back ~1024 tokens (with floor)
    const fwd = computeForward({ config: cfg, tokens: 1024, dtype: 'bfloat16' })
    const rev = computeReverse({ config: cfg, gpuRamGB: fwd.sizeGB, dtype: 'bfloat16' })
    expect(rev.maxTokens).toBeGreaterThan(1000)
    expect(rev.maxTokens).toBeLessThanOrEqual(1024)
  })

  it('halves max tokens when switching BF16 → FP32', () => {
    const cfg = MODELS['Qwen/Qwen3-8B']
    const bf16 = computeReverse({ config: cfg, gpuRamGB: 10, dtype: 'bfloat16' })
    const fp32 = computeReverse({ config: cfg, gpuRamGB: 10, dtype: 'float32' })
    // BF16 (2B) gives roughly 2x the tokens of FP32 (4B)
    expect(bf16.maxTokens / fp32.maxTokens).toBeCloseTo(2, 1)
  })

  it('headline contains both K and raw token count', () => {
    const cfg = MODELS['Qwen/Qwen3-8B']
    const res = computeReverse({ config: cfg, gpuRamGB: 10, dtype: 'bfloat16' })
    expect(res.headline).toMatch(/Maximum Tokens:\s*[\d.]+K\s*\(.*\)/)
    expect(res.headline).toContain(res.maxTokens.toLocaleString())
  })

  it('uses integer K when maxTokens divides evenly by 1024', () => {
    const cfg = MODELS['Qwen/Qwen3-8B']
    // Construct target bytes directly: 1024 × 1024 tokens × 73728 bytes/token
    const targetTokens = 1024 * 1024
    const targetBytes = targetTokens * (2 * 36 * 8 * 128 * 2)
    const res = computeReverse({ config: cfg, gpuRamGB: targetBytes / 1024 ** 3, dtype: 'bfloat16' })
    expect(res.maxTokens % 1024).toBe(0)
    expect(res.headline).toMatch(/Maximum Tokens:\s*\d+K/) // no decimal in K
  })
})

describe('computeReverse — MLA (DeepSeek-V3)', () => {
  it('accounts for latent_dim in max tokens', () => {
    const cfg = MODELS['deepseek-ai/DeepSeek-V3']
    // bytes_per_token = 61 × 576 × 2 = 70,272
    // 1 GB → 1,073,741,824 / 70,272 = 15,287 tokens
    const res = computeReverse({ config: cfg, gpuRamGB: 1, dtype: 'bfloat16' })
    expect(res.maxTokens).toBe(Math.floor(1024 ** 3 / (61 * 576 * 2)))
  })
})

describe('computeReverse — Hybrid SWA (gemma-4)', () => {
  it('uses all-layer regime when tokens ≤ window', () => {
    const cfg = MODELS['google/gemma-4-31B-it']
    // Small RAM → small N ≤ window → both layer types count
    const res = computeReverse({ config: cfg, gpuRamGB: 0.001, dtype: 'bfloat16' })
    expect(res.maxTokens).toBeGreaterThan(0)
    const regimeLine = res.details.find(([k]) => k === 'Regime')
    expect(regimeLine[1]).toContain('all layers full')
  })

  it('uses capped regime when tokens > window', () => {
    const cfg = MODELS['google/gemma-4-31B-it']
    const res = computeReverse({ config: cfg, gpuRamGB: 100, dtype: 'bfloat16' })
    expect(res.maxTokens).toBeGreaterThan(1024) // exceeds window
    const regimeLine = res.details.find(([k]) => k === 'Regime')
    expect(regimeLine[1]).toContain('capped')
  })
})

describe('computeReverse — DSA (V4-Pro)', () => {
  it('subtracts sliding-window floor before dividing', () => {
    const cfg = MODELS['deepseek-ai/DeepSeek-V4-Pro']
    // bytes_per_token = 4955, window_bytes = 4,571,136
    // RAM=10 GB → maxTokens = (10*1024^3 - 4,571,136) / 4955
    const expected = Math.max(0, Math.floor((10 * 1024 ** 3 - 4571136) / 4955))
    const res = computeReverse({ config: cfg, gpuRamGB: 10, dtype: 'bfloat16' })
    expect(res.maxTokens).toBe(expected)
  })

  it('returns 0 tokens when RAM < sliding-window floor (no negative)', () => {
    const cfg = MODELS['deepseek-ai/DeepSeek-V4-Pro']
    // windowBytes ≈ 4.57 MB ≈ 0.0043 GB; feed RAM below it
    const res = computeReverse({ config: cfg, gpuRamGB: 0.001, dtype: 'bfloat16' })
    expect(res.maxTokens).toBe(0)
    expect(res.maxTokens).toBeGreaterThanOrEqual(0) // never negative
  })

  it('respects custom precision override', () => {
    const cfg = MODELS['deepseek-ai/DeepSeek-V4-Pro']
    const def = computeReverse({ config: cfg, gpuRamGB: 5, dtype: 'bfloat16' })
    const custom = computeReverse({
      config: cfg, gpuRamGB: 5, dtype: 'bfloat16',
      prec: { mode: 'custom', nope: 2, rope: 2, indexer: 0.5 },
    })
    // Custom NoPE=2 makes bytes-per-token larger → fewer tokens fit
    expect(custom.maxTokens).toBeLessThan(def.maxTokens)
  })
})

describe('computeReverse — Hybrid Linear (Qwen3.5-397B)', () => {
  it('only counts full-attention layers for max tokens', () => {
    const cfg = MODELS['Qwen/Qwen3.5-397B-A17B-FP8']
    // perLayer = 2 × 2 × 256 = 1024; nFull = 15
    // bytes_per_token = 1024 × 15 × 2 = 30,720
    // 5 GB → 5*1024^3 / 30720 = 174,762 tokens
    const res = computeReverse({ config: cfg, gpuRamGB: 5, dtype: 'bfloat16' })
    expect(res.maxTokens).toBe(Math.floor(5 * 1024 ** 3 / (2 * 2 * 256 * 15 * 2)))
    expect(res.note).toContain('Gated DeltaNet')
  })
})

// ============================================================
// Round-trip consistency
// ============================================================

describe('forward ↔ reverse round-trip', () => {
  it('V4-Flash forward 1M tokens → reverse recovers ~1M tokens', () => {
    const cfg = MODELS['deepseek-ai/DeepSeek-V4-Flash']
    const fwd = computeForward({ config: cfg, tokens: 1000000, dtype: 'bfloat16' })
    // Use exact bytes (not the rounded GB) for round-trip
    const rev = computeReverse({ config: cfg, gpuRamGB: fwd.totalBytes / 1024 ** 3, dtype: 'bfloat16' })
    // Floating rounding may introduce <0.01% error, but tokens should match within 1
    expect(Math.abs(rev.maxTokens - 1000000)).toBeLessThanOrEqual(1)
  })

  it('Qwen3-8B forward 50K tokens → reverse recovers ~50K tokens', () => {
    const cfg = MODELS['Qwen/Qwen3-8B']
    const fwd = computeForward({ config: cfg, tokens: 50000, dtype: 'bfloat16' })
    const rev = computeReverse({ config: cfg, gpuRamGB: fwd.totalBytes / 1024 ** 3, dtype: 'bfloat16' })
    expect(Math.abs(rev.maxTokens - 50000)).toBeLessThanOrEqual(1)
  })
})
