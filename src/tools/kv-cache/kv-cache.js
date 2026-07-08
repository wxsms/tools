/**
 * KV Cache size calculator — pure logic, no Vue dependency.
 *
 * Formulas are aligned with LMCache's kv_cache_calculator:
 * https://docs.lmcache.ai/_static/kv_cache_calculator.html
 *
 * Supports 5 attention architectures, auto-detected from model config:
 *   - DSA (DeepSeek V4 CSA + HCA, native mixed precision)
 *   - MLA (DeepSeek V3/R1, GLM-5.x; optional DSA lightning-indexer)
 *   - Hybrid SWA (Gemma-style interleaved sliding-window + full attention)
 *   - Hybrid Linear (Qwen3-Next / Nemotron-3 recurrent + full attention)
 *   - GQA / Standard Transformer (with or without explicit head_dim)
 */

// Bytes per element for each selectable KV dtype.
// 4-bit formats (mxfp4 / nvfp4) use 0.5 byte per element.
export const DTYPE_SIZES = {
  fp32: 4,
  fp16: 2,
  bf16: 2,
  fp8: 1,
  int8: 1,
  mxfp4: 0.5,
  nvfp4: 0.5,
}

// Model configs — verbatim copy from LMCache's modelconfig.json (dev branch).
// Source: https://docs.lmcache.ai/_static/modelconfig.json
export const MODELS = {
  'meta-llama/Llama-3.1-8B-Instruct': { hidden_size: 4096, num_attention_heads: 32, num_hidden_layers: 32, num_key_value_heads: 8 },
  'meta-llama/Llama-3.1-70B-Instruct': { hidden_size: 8192, num_attention_heads: 64, num_hidden_layers: 80, num_key_value_heads: 8 },
  'mistralai/Mistral-7B-Instruct-v0.2': { hidden_size: 4096, num_attention_heads: 32, num_hidden_layers: 32, num_key_value_heads: 8 },
  'mistralai/Mistral-Large-Instruct-2407': { hidden_size: 12288, num_attention_heads: 96, num_hidden_layers: 88, num_key_value_heads: 8 },
  'lmsys/longchat-7b-16k': { hidden_size: 4096, num_attention_heads: 32, num_hidden_layers: 32, num_key_value_heads: 32 },
  'Sao10K/L3-8B-Lunaris-v1': { hidden_size: 4096, num_attention_heads: 32, num_hidden_layers: 32, num_key_value_heads: 8 },
  'meta-llama/Llama-3.2-3B-Instruct': { hidden_size: 3072, num_attention_heads: 24, num_hidden_layers: 28, num_key_value_heads: 8 },
  'deepseek-ai/DeepSeek-V3': { hidden_size: 7168, num_attention_heads: 128, num_hidden_layers: 61, num_key_value_heads: 128, kv_lora_rank: 512, qk_rope_head_dim: 64 },
  'deepseek-ai/DeepSeek-R1': { hidden_size: 7168, num_attention_heads: 128, num_hidden_layers: 61, num_key_value_heads: 128, kv_lora_rank: 512, qk_rope_head_dim: 64 },
  'moonshotai/Kimi-K2.6': { hidden_size: 7168, num_attention_heads: 64, num_hidden_layers: 61, num_key_value_heads: 64, kv_lora_rank: 512, qk_rope_head_dim: 64 },
  'deepseek-ai/DeepSeek-V4-Pro': {
    num_hidden_layers: 61,
    head_dim: 512,
    qk_rope_head_dim: 64,
    sliding_window: 128,
    index_head_dim: 128,
    nope_bytes: 1,
    rope_bytes: 2,
    indexer_bytes: 0.5,
    compress_ratios: [128, 128, 4, 128, 4, 128, 4, 128, 4, 128, 4, 128, 4, 128, 4, 128, 4, 128, 4, 128, 4, 128, 4, 128, 4, 128, 4, 128, 4, 128, 4, 128, 4, 128, 4, 128, 4, 128, 4, 128, 4, 128, 4, 128, 4, 128, 4, 128, 4, 128, 4, 128, 4, 128, 4, 128, 4, 128, 4, 128, 4, 0],
  },
  'deepseek-ai/DeepSeek-V4-Flash': {
    num_hidden_layers: 43,
    head_dim: 512,
    qk_rope_head_dim: 64,
    sliding_window: 128,
    index_head_dim: 128,
    nope_bytes: 1,
    rope_bytes: 2,
    indexer_bytes: 0.5,
    compress_ratios: [0, 0, 4, 128, 4, 128, 4, 128, 4, 128, 4, 128, 4, 128, 4, 128, 4, 128, 4, 128, 4, 128, 4, 128, 4, 128, 4, 128, 4, 128, 4, 128, 4, 128, 4, 128, 4, 128, 4, 128, 4, 128, 4, 0],
  },
  'zai-org/GLM-5.1': { num_hidden_layers: 78, kv_lora_rank: 512, qk_rope_head_dim: 64, index_head_dim: 128 },
  'MiniMaxAI/MiniMax-M2.5': { hidden_size: 3072, num_attention_heads: 48, num_hidden_layers: 62, num_key_value_heads: 8, head_dim: 128 },
  'MiniMaxAI/MiniMax-M2.7': { hidden_size: 3072, num_attention_heads: 48, num_hidden_layers: 62, num_key_value_heads: 8, head_dim: 128 },
  'Qwen/Qwen3-235B-A22B': { hidden_size: 4096, num_attention_heads: 64, num_hidden_layers: 94, num_key_value_heads: 4, head_dim: 128 },
  'Qwen/Qwen3.5-397B-A17B-FP8': {
    hidden_size: 4096,
    num_attention_heads: 32,
    num_hidden_layers: 60,
    num_key_value_heads: 2,
    head_dim: 256,
    full_attention_layers: 15,
    linear_attention_layers: 45,
    linear_num_value_heads: 64,
    linear_key_head_dim: 128,
    linear_value_head_dim: 128,
  },
  'Qwen/Qwen3-30B-A3B': { hidden_size: 2048, num_attention_heads: 32, num_hidden_layers: 48, num_key_value_heads: 4, head_dim: 128 },
  'Qwen/Qwen3-Coder-30B-A3B-Instruct': { hidden_size: 2048, num_attention_heads: 32, num_hidden_layers: 48, num_key_value_heads: 4, head_dim: 128 },
  'Qwen/Qwen3-Coder-480B-A35B-Instruct-FP8': { hidden_size: 6144, num_attention_heads: 96, num_hidden_layers: 62, num_key_value_heads: 8, head_dim: 128 },
  'meta-llama/Llama-3.1-405B': { hidden_size: 16384, num_attention_heads: 128, num_hidden_layers: 126, num_key_value_heads: 8 },
  'meta-llama/Llama-3.2-1B-Instruct': { hidden_size: 2048, num_attention_heads: 32, num_hidden_layers: 16, num_key_value_heads: 8 },
  'Qwen/Qwen3-32B': { hidden_size: 5120, num_attention_heads: 64, num_hidden_layers: 64, num_key_value_heads: 8, head_dim: 128 },
  'Qwen/Qwen3-14B': { hidden_size: 5120, num_attention_heads: 40, num_hidden_layers: 40, num_key_value_heads: 8, head_dim: 128 },
  'Qwen/Qwen3-8B': { hidden_size: 4096, num_attention_heads: 32, num_hidden_layers: 36, num_key_value_heads: 8, head_dim: 128 },
  'Qwen/Qwen3-4B': { hidden_size: 2560, num_attention_heads: 32, num_hidden_layers: 36, num_key_value_heads: 8, head_dim: 128 },
  'Qwen/Qwen3-0.6B': { hidden_size: 1024, num_attention_heads: 16, num_hidden_layers: 28, num_key_value_heads: 8, head_dim: 128 },
  'Qwen/Qwen2.5-7B-Instruct': { hidden_size: 3584, num_attention_heads: 28, num_hidden_layers: 28, num_key_value_heads: 4 },
  'Qwen/Qwen2.5-3B-Instruct': { hidden_size: 2048, num_attention_heads: 16, num_hidden_layers: 36, num_key_value_heads: 2 },
  'Qwen/Qwen2.5-0.5B': { hidden_size: 896, num_attention_heads: 14, num_hidden_layers: 24, num_key_value_heads: 2 },
  'Qwen/Qwen-7B': { hidden_size: 4096, num_attention_heads: 32, num_hidden_layers: 32, num_key_value_heads: 32 },
  'zai-org/GLM-4.5': { hidden_size: 5120, num_attention_heads: 96, num_hidden_layers: 92, num_key_value_heads: 8, head_dim: 128 },
  'zai-org/GLM-4.6': { hidden_size: 5120, num_attention_heads: 96, num_hidden_layers: 92, num_key_value_heads: 8, head_dim: 128 },
  'google/gemma-4-31B-it': { hidden_size: 5376, num_attention_heads: 32, num_hidden_layers: 60, num_key_value_heads: 16, head_dim: 256, sliding_window: 1024, full_attention_layers: 10, sliding_attention_layers: 50 },
  'openai/gpt-oss-120b': { hidden_size: 2880, num_attention_heads: 64, num_hidden_layers: 36, num_key_value_heads: 8, head_dim: 64, sliding_window: 128, full_attention_layers: 18, sliding_attention_layers: 18 },
  'openai/gpt-oss-20b': { hidden_size: 2880, num_attention_heads: 64, num_hidden_layers: 24, num_key_value_heads: 8, head_dim: 64, sliding_window: 128, full_attention_layers: 12, sliding_attention_layers: 12 },
  'poolside/Laguna-XS.2': { hidden_size: 2048, num_attention_heads: 48, num_hidden_layers: 40, num_key_value_heads: 8, head_dim: 128, sliding_window: 512, full_attention_layers: 10, sliding_attention_layers: 30 },
  'tencent/Hy3-preview': { hidden_size: 4096, num_attention_heads: 64, num_hidden_layers: 80, num_key_value_heads: 8, head_dim: 128 },
  'nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-FP8': {
    hidden_size: 4096,
    num_attention_heads: 32,
    num_hidden_layers: 88,
    num_key_value_heads: 2,
    head_dim: 128,
    full_attention_layers: 8,
    linear_attention_layers: 40,
    linear_attention_type: 'Mamba2 SSM',
  },
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })
export const MODEL_NAMES = Object.keys(MODELS).sort(collator.compare)

/**
 * Detect which attention architecture a model config uses.
 * Returns one of: 'dsa' | 'mla' | 'hybrid-swa' | 'hybrid-linear' | 'gqa' | 'standard'
 */
export function detectArch(cfg) {
  if (Array.isArray(cfg.compress_ratios) && Number.isFinite(cfg.head_dim)) return 'dsa'
  if (Number.isFinite(cfg.kv_lora_rank) && Number.isFinite(cfg.qk_rope_head_dim)) return 'mla'
  if (Number.isFinite(cfg.full_attention_layers) &&
      Number.isFinite(cfg.linear_attention_layers) &&
      Number.isFinite(cfg.num_key_value_heads) &&
      Number.isFinite(cfg.head_dim)) return 'hybrid-linear'
  if (Number.isFinite(cfg.full_attention_layers) &&
      Number.isFinite(cfg.sliding_attention_layers) &&
      Number.isFinite(cfg.sliding_window) &&
      Number.isFinite(cfg.num_key_value_heads) &&
      Number.isFinite(cfg.head_dim)) return 'hybrid-swa'
  if (Number.isFinite(cfg.head_dim) && Number.isFinite(cfg.num_key_value_heads)) return 'gqa'
  return 'standard'
}

const ARCH_LABELS = {
  'dsa': 'DeepSeek V4 DSA (CSA + HCA)',
  'mla': 'Multi-head Latent Attention (MLA)',
  'hybrid-linear': 'Linear / Full Hybrid',
  'hybrid-swa': 'Sliding-Window / Full Hybrid',
  'gqa': 'GQA / explicit head_dim',
  'standard': 'Standard Transformer',
}

export function archLabel(cfg) {
  return ARCH_LABELS[detectArch(cfg)]
}

/**
 * Resolve DSA per-dimension byte widths from config defaults, optionally
 * overridden by custom user input.
 *   prec.mode === 'default' → use config's nope_bytes / rope_bytes / indexer_bytes
 *   prec.mode === 'custom'  → use customnope / customrope / customindexer
 */
function resolveDSAPrecision(cfg, prec) {
  const def = {
    nope: Number.isFinite(cfg.nope_bytes) ? cfg.nope_bytes : 1,
    rope: Number.isFinite(cfg.rope_bytes) ? cfg.rope_bytes : 2,
    indexer: Number.isFinite(cfg.indexer_bytes) ? cfg.indexer_bytes : 0.5,
    mode: 'default',
  }
  if (!prec || prec.mode !== 'custom') return def
  return {
    nope: Number.isFinite(prec.nope) ? prec.nope : def.nope,
    rope: Number.isFinite(prec.rope) ? prec.rope : def.rope,
    indexer: Number.isFinite(prec.indexer) ? prec.indexer : def.indexer,
    mode: 'custom',
  }
}

/**
 * Forward calculation: tokens → KV Cache size.
 *
 * @param {object} opts
 * @param {object} opts.config   model config (a value from MODELS)
 * @param {number} opts.tokens   raw token count (must be a positive integer)
 * @param {string} opts.dtype    one of DTYPE_SIZES keys; ignored for DSA
 * @param {object} [opts.prec]   DSA precision override { mode: 'custom'|'default',
 *                               nope, rope, indexer }
 * @returns {{ headline: string, details: Array<[string,string]>, note: string,
 *            sizeGB: number, totalBytes: number, tokens: number }}
 *         or { error: string } when input is invalid.
 */
export function computeForward({ config, tokens, dtype, prec }) {
  const cfg = config || {}
  if (!Number.isFinite(tokens) || tokens <= 0 || !Number.isInteger(tokens)) {
    return { error: '请输入有效的 Token 数（正整数）' }
  }
  const dtypeSize = DTYPE_SIZES[dtype]
  if (dtypeSize === undefined) {
    return { error: `未知的数据类型：${dtype}` }
  }
  const arch = detectArch(cfg)
  const details = []
  let totalBytes
  let note = ''
  const n = tokens

  if (arch === 'dsa') {
    const activeRatios = cfg.compress_ratios.filter(r => r > 0)
    const compressFactor = activeRatios.reduce((s, r) => s + 1 / r, 0)
    const ropeDim = Number.isFinite(cfg.qk_rope_head_dim) ? cfg.qk_rope_head_dim : 0
    const indexerDim = Number.isFinite(cfg.index_head_dim) ? cfg.index_head_dim : 0
    const p = resolveDSAPrecision(cfg, prec)
    const kvBytesPerEntry = (cfg.head_dim - ropeDim) * p.nope + ropeDim * p.rope
    const indexerBytesPerEntry = indexerDim * p.indexer
    const bytesPerToken = (kvBytesPerEntry + indexerBytesPerEntry) * compressFactor
    const numLayers = cfg.compress_ratios.length
    const windowBytes = numLayers * cfg.sliding_window * kvBytesPerEntry
    totalBytes = bytesPerToken * n + windowBytes
    const sizeGB = totalBytes / 1024 ** 3
    details.push(['架构', archLabel(cfg)])
    details.push(['Hidden Layers', cfg.num_hidden_layers])
    details.push(['Head Dimension', `${cfg.head_dim} (RoPE ${ropeDim} @ ${p.rope}B, NoPE ${cfg.head_dim - ropeDim} @ ${p.nope}B)`])
    details.push(['Compressed Layers (r>0)', `${activeRatios.length} / ${numLayers}`])
    details.push(['Sliding Window (per layer)', cfg.sliding_window])
    details.push(['KV Bytes / Entry', `(${cfg.head_dim} − ${ropeDim}) × ${p.nope} + ${ropeDim} × ${p.rope} = ${kvBytesPerEntry} B`])
    if (indexerDim) details.push(['Indexer Key (CSA, compressed)', `${indexerDim} × ${p.indexer} × Σ(1/r) = ${(indexerBytesPerEntry * compressFactor).toFixed(1)} B/token`])
    const precLabel = p.mode === 'custom'
      ? `custom (NoPE ${p.nope} / RoPE ${p.rope} / indexer ${p.indexer} B/dim)`
      : `paper default (NoPE ${p.nope}=FP8 / RoPE ${p.rope}=BF16 / indexer ${p.indexer}=FP4)`
    details.push(['Precision', precLabel])
    details.push(['Bytes per Token', `(${kvBytesPerEntry} + ${indexerBytesPerEntry}) × Σ(1/r) = ${bytesPerToken.toFixed(1)} B`])
    details.push(['Sliding-Window Floor', `${numLayers} × ${cfg.sliding_window} × ${kvBytesPerEntry} = ${windowBytes} B`])
    details.push(['Total Bytes', `${bytesPerToken.toFixed(1)} × ${n} + ${windowBytes} = ${totalBytes.toFixed(0)} bytes`])
    details.push(['KV Cache Size', `${totalBytes.toFixed(0)} / 1024³ ≈ ${sizeGB.toFixed(4)} GB`])
  } else if (arch === 'mla') {
    const latentDim = cfg.kv_lora_rank + cfg.qk_rope_head_dim
    const indexerDim = Number.isFinite(cfg.index_head_dim) ? cfg.index_head_dim : 0
    const elementsPerToken = cfg.num_hidden_layers * (latentDim + indexerDim)
    const totalElements = elementsPerToken * n
    totalBytes = totalElements * dtypeSize
    const sizeGB = totalBytes / 1024 ** 3
    details.push(['架构', archLabel(cfg)])
    details.push(['Hidden Layers', cfg.num_hidden_layers])
    details.push(['KV LoRA Rank', cfg.kv_lora_rank])
    details.push(['QK RoPE Head Dim', cfg.qk_rope_head_dim])
    if (indexerDim) details.push(['Indexer Head Dim (DSA)', indexerDim])
    details.push(['Data Type Size', `${dtypeSize} bytes`])
    const latentExpr = indexerDim
      ? `(${cfg.kv_lora_rank} + ${cfg.qk_rope_head_dim} + ${indexerDim})`
      : `(${cfg.kv_lora_rank} + ${cfg.qk_rope_head_dim})`
    details.push(['Total Elements', `${cfg.num_hidden_layers} × ${n} × ${latentExpr} = ${totalElements}`])
    details.push(['Total Bytes', `${totalElements} × ${dtypeSize} = ${totalBytes} bytes`])
    details.push(['KV Cache Size', `${totalBytes} / 1024³ ≈ ${sizeGB.toFixed(4)} GB`])
  } else if (arch === 'hybrid-linear') {
    const perLayer = 2 * cfg.num_key_value_heads * cfg.head_dim
    const nFull = cfg.full_attention_layers
    const nLin = cfg.linear_attention_layers
    const totalElements = perLayer * nFull * n
    totalBytes = totalElements * dtypeSize
    const sizeGB = totalBytes / 1024 ** 3
    const linType = typeof cfg.linear_attention_type === 'string' ? cfg.linear_attention_type : 'Gated DeltaNet'
    note = `仅计算 full-attention 层；${linType} 循环状态尚未计入（待 LMCache 决定存储方式）`
    details.push(['架构', archLabel(cfg)])
    details.push(['Hidden Layers', cfg.num_hidden_layers])
    details.push(['KV Heads', cfg.num_key_value_heads])
    details.push(['Head Dimension', cfg.head_dim])
    details.push(['Full-Attention Layers', `${nFull} (growing KV)`])
    details.push([`Linear (${linType}) Layers`, `${nLin} (循环状态 — 未计入)`])
    details.push(['Data Type Size', `${dtypeSize} bytes`])
    details.push(['Elements / Token / Layer', `2 × ${cfg.num_key_value_heads} × ${cfg.head_dim} = ${perLayer}`])
    details.push(['Total Elements', `${perLayer} × ${nFull} × ${n} = ${totalElements}`])
    details.push(['Total Bytes', `${totalElements} × ${dtypeSize} = ${totalBytes} bytes`])
    details.push(['KV Cache Size (full only)', `${totalBytes} / 1024³ ≈ ${sizeGB.toFixed(4)} GB`])
  } else if (arch === 'hybrid-swa') {
    const perLayer = 2 * cfg.num_key_value_heads * cfg.head_dim
    const nFull = cfg.full_attention_layers
    const nSwa = cfg.sliding_attention_layers
    const win = cfg.sliding_window
    const swaTokens = Math.min(n, win)
    const totalElements = perLayer * (nFull * n + nSwa * swaTokens)
    totalBytes = totalElements * dtypeSize
    const sizeGB = totalBytes / 1024 ** 3
    details.push(['架构', archLabel(cfg)])
    details.push(['Hidden Layers', cfg.num_hidden_layers])
    details.push(['KV Heads', cfg.num_key_value_heads])
    details.push(['Head Dimension', cfg.head_dim])
    details.push(['Full-Attention Layers', `${nFull} (cache full sequence)`])
    details.push(['Sliding-Attention Layers', `${nSwa} (window ${win}; using ${swaTokens} tokens)`])
    details.push(['Data Type Size', `${dtypeSize} bytes`])
    details.push(['Elements / Token / Layer', `2 × ${cfg.num_key_value_heads} × ${cfg.head_dim} = ${perLayer}`])
    details.push(['Total Elements', `${perLayer} × (${nFull} × ${n} + ${nSwa} × ${swaTokens}) = ${totalElements}`])
    details.push(['Total Bytes', `${totalElements} × ${dtypeSize} = ${totalBytes} bytes`])
    details.push(['KV Cache Size', `${totalBytes} / 1024³ ≈ ${sizeGB.toFixed(4)} GB`])
  } else if (arch === 'gqa') {
    const totalElements = 2 * cfg.num_hidden_layers * n * cfg.num_key_value_heads * cfg.head_dim
    totalBytes = totalElements * dtypeSize
    const sizeGB = totalBytes / 1024 ** 3
    details.push(['架构', archLabel(cfg)])
    details.push(['Hidden Size', cfg.hidden_size])
    details.push(['Attention Heads', cfg.num_attention_heads])
    details.push(['Hidden Layers', cfg.num_hidden_layers])
    details.push(['KV Heads', cfg.num_key_value_heads])
    details.push(['Head Dimension', cfg.head_dim])
    details.push(['Data Type Size', `${dtypeSize} bytes`])
    details.push(['Total Elements', `2 × ${cfg.num_hidden_layers} × ${n} × ${cfg.num_key_value_heads} × ${cfg.head_dim} = ${totalElements}`])
    details.push(['Total Bytes', `${totalElements} × ${dtypeSize} = ${totalBytes} bytes`])
    details.push(['KV Cache Size', `${totalBytes} / 1024³ ≈ ${sizeGB.toFixed(4)} GB`])
  } else {
    // standard transformer
    const headSize = cfg.hidden_size / cfg.num_attention_heads
    const totalElements = 2 * cfg.num_hidden_layers * n * cfg.num_key_value_heads * headSize
    totalBytes = totalElements * dtypeSize
    const sizeGB = totalBytes / 1024 ** 3
    details.push(['架构', archLabel(cfg)])
    details.push(['Hidden Size', cfg.hidden_size])
    details.push(['Attention Heads', cfg.num_attention_heads])
    details.push(['Hidden Layers', cfg.num_hidden_layers])
    details.push(['KV Heads', cfg.num_key_value_heads])
    details.push(['Head Size', `${headSize} (Hidden / Attention)`])
    details.push(['Data Type Size', `${dtypeSize} bytes`])
    details.push(['Total Elements', `2 × ${cfg.num_hidden_layers} × ${n} × ${cfg.num_key_value_heads} × ${headSize} = ${totalElements}`])
    details.push(['Total Bytes', `${totalElements} × ${dtypeSize} = ${totalBytes} bytes`])
    details.push(['KV Cache Size', `${totalBytes} / 1024³ ≈ ${sizeGB.toFixed(4)} GB`])
  }

  const sizeGB = totalBytes / 1024 ** 3
  return {
    headline: `KV Cache Size: ${sizeGB.toFixed(4)} GB`,
    details,
    note,
    sizeGB,
    totalBytes,
    tokens: n,
  }
}

/**
 * Reverse calculation: GPU RAM → maximum tokens.
 *
 * @param {object} opts
 * @param {object} opts.config   model config
 * @param {number} opts.gpuRamGB GPU RAM in GB (positive finite number)
 * @param {string} opts.dtype    one of DTYPE_SIZES keys; ignored for DSA
 * @param {object} [opts.prec]   DSA precision override (see computeForward)
 * @returns {{ headline: string, details: Array<[string,string]>, note: string,
 *            maxTokens: number }}
 *         or { error: string } when input is invalid.
 */
export function computeReverse({ config, gpuRamGB, dtype, prec }) {
  const cfg = config || {}
  if (!Number.isFinite(gpuRamGB) || gpuRamGB <= 0) {
    return { error: '请输入有效的 GPU 显存（大于 0）' }
  }
  const dtypeSize = DTYPE_SIZES[dtype]
  if (dtypeSize === undefined) {
    return { error: `未知的数据类型：${dtype}` }
  }
  const totalBytes = gpuRamGB * 1024 ** 3
  const arch = detectArch(cfg)
  const details = []
  let maxTokens

  if (arch === 'dsa') {
    const activeRatios = cfg.compress_ratios.filter(r => r > 0)
    const compressFactor = activeRatios.reduce((s, r) => s + 1 / r, 0)
    const ropeDim = Number.isFinite(cfg.qk_rope_head_dim) ? cfg.qk_rope_head_dim : 0
    const indexerDim = Number.isFinite(cfg.index_head_dim) ? cfg.index_head_dim : 0
    const p = resolveDSAPrecision(cfg, prec)
    const kvBytesPerEntry = (cfg.head_dim - ropeDim) * p.nope + ropeDim * p.rope
    const indexerBytesPerEntry = indexerDim * p.indexer
    const bytesPerToken = (kvBytesPerEntry + indexerBytesPerEntry) * compressFactor
    const numLayers = cfg.compress_ratios.length
    const windowBytes = numLayers * cfg.sliding_window * kvBytesPerEntry
    maxTokens = Math.max(0, Math.floor((totalBytes - windowBytes) / bytesPerToken))
    details.push(['架构', archLabel(cfg)])
    details.push(['GPU RAM Size', `${gpuRamGB} GB`])
    details.push(['Hidden Layers', cfg.num_hidden_layers])
    details.push(['Head Dimension', `${cfg.head_dim} (RoPE ${ropeDim} @ ${p.rope}B, NoPE ${cfg.head_dim - ropeDim} @ ${p.nope}B)`])
    details.push(['Compressed Layers (r>0)', `${activeRatios.length} / ${numLayers}`])
    details.push(['Sliding Window (per layer)', cfg.sliding_window])
    details.push(['KV Bytes / Entry', `(${cfg.head_dim} − ${ropeDim}) × ${p.nope} + ${ropeDim} × ${p.rope} = ${kvBytesPerEntry} B`])
    if (indexerDim) details.push(['Indexer Key (CSA, compressed)', `${indexerDim} × ${p.indexer} × Σ(1/r) = ${(indexerBytesPerEntry * compressFactor).toFixed(1)} B/token`])
    const precLabel = p.mode === 'custom'
      ? `custom (NoPE ${p.nope} / RoPE ${p.rope} / indexer ${p.indexer} B/dim)`
      : `paper default (NoPE ${p.nope}=FP8 / RoPE ${p.rope}=BF16 / indexer ${p.indexer}=FP4)`
    details.push(['Precision', precLabel])
    details.push(['Bytes per Token', `(${kvBytesPerEntry} + ${indexerBytesPerEntry}) × Σ(1/r) = ${bytesPerToken.toFixed(1)} B`])
    details.push(['Sliding-Window Floor', `${numLayers} × ${cfg.sliding_window} × ${kvBytesPerEntry} = ${windowBytes} B`])
    details.push(['Maximum Tokens', `(${totalBytes} − ${windowBytes}) / ${bytesPerToken.toFixed(1)} = ${maxTokens} tokens`])
  } else if (arch === 'mla') {
    const latentDim = cfg.kv_lora_rank + cfg.qk_rope_head_dim
    const indexerDim = Number.isFinite(cfg.index_head_dim) ? cfg.index_head_dim : 0
    const elementsPerToken = cfg.num_hidden_layers * (latentDim + indexerDim)
    const bytesPerToken = elementsPerToken * dtypeSize
    maxTokens = Math.floor(totalBytes / bytesPerToken)
    details.push(['架构', archLabel(cfg)])
    details.push(['GPU RAM Size', `${gpuRamGB} GB`])
    details.push(['Hidden Layers', cfg.num_hidden_layers])
    details.push(['KV LoRA Rank', cfg.kv_lora_rank])
    details.push(['QK RoPE Head Dim', cfg.qk_rope_head_dim])
    if (indexerDim) details.push(['Indexer Head Dim (DSA)', indexerDim])
    details.push(['Data Type Size', `${dtypeSize} bytes`])
    const latentExpr = indexerDim
      ? `(${cfg.kv_lora_rank} + ${cfg.qk_rope_head_dim} + ${indexerDim})`
      : `(${cfg.kv_lora_rank} + ${cfg.qk_rope_head_dim})`
    details.push(['Elements per Token', `${cfg.num_hidden_layers} × ${latentExpr} = ${elementsPerToken}`])
    details.push(['Bytes per Token', `${elementsPerToken} × ${dtypeSize} = ${bytesPerToken} bytes`])
    details.push(['Maximum Tokens', `${totalBytes} / ${bytesPerToken} = ${maxTokens} tokens`])
  } else if (arch === 'hybrid-linear') {
    const perLayer = 2 * cfg.num_key_value_heads * cfg.head_dim
    const nFull = cfg.full_attention_layers
    const nLin = cfg.linear_attention_layers
    const availElements = totalBytes / dtypeSize
    maxTokens = Math.max(0, Math.floor(availElements / (perLayer * nFull)))
    const linType = typeof cfg.linear_attention_type === 'string' ? cfg.linear_attention_type : 'Gated DeltaNet'
    const note = `仅按 full-attention 层计算；${linType} 循环状态尚未计入`
    details.push(['架构', archLabel(cfg)])
    details.push(['GPU RAM Size', `${gpuRamGB} GB`])
    details.push(['Hidden Layers', cfg.num_hidden_layers])
    details.push(['KV Heads', cfg.num_key_value_heads])
    details.push(['Head Dimension', cfg.head_dim])
    details.push(['Full-Attention Layers', `${nFull} (growing KV)`])
    details.push([`Linear (${linType}) Layers`, `${nLin} (循环状态 — 未计入)`])
    details.push(['Data Type Size', `${dtypeSize} bytes`])
    details.push(['Elements / Token / Layer', `2 × ${cfg.num_key_value_heads} × ${cfg.head_dim} = ${perLayer}`])
    details.push(['Maximum Tokens (full only)', `${availElements} / (${perLayer} × ${nFull}) = ${maxTokens} tokens`])
    return withHeadline({ details, note, maxTokens })
  } else if (arch === 'hybrid-swa') {
    const perLayer = 2 * cfg.num_key_value_heads * cfg.head_dim
    const nFull = cfg.full_attention_layers
    const nSwa = cfg.sliding_attention_layers
    const win = cfg.sliding_window
    const availElements = totalBytes / dtypeSize
    let n = Math.floor(availElements / (perLayer * (nFull + nSwa)))
    let regime = 'tokens ≤ window (all layers full)'
    if (n > win) {
      n = Math.floor((availElements / perLayer - nSwa * win) / nFull)
      regime = 'tokens > window (sliding layers capped)'
    }
    maxTokens = Math.max(0, n)
    details.push(['架构', archLabel(cfg)])
    details.push(['GPU RAM Size', `${gpuRamGB} GB`])
    details.push(['Hidden Layers', cfg.num_hidden_layers])
    details.push(['KV Heads', cfg.num_key_value_heads])
    details.push(['Head Dimension', cfg.head_dim])
    details.push(['Full-Attention Layers', nFull])
    details.push(['Sliding-Attention Layers', `${nSwa} (window ${win})`])
    details.push(['Data Type Size', `${dtypeSize} bytes`])
    details.push(['Elements / Token / Layer', `2 × ${cfg.num_key_value_heads} × ${cfg.head_dim} = ${perLayer}`])
    details.push(['Regime', regime])
    details.push(['Maximum Tokens', `${maxTokens} tokens`])
  } else if (arch === 'gqa') {
    const elementsPerToken = 2 * cfg.num_hidden_layers * cfg.num_key_value_heads * cfg.head_dim
    const bytesPerToken = elementsPerToken * dtypeSize
    maxTokens = Math.floor(totalBytes / bytesPerToken)
    details.push(['架构', archLabel(cfg)])
    details.push(['GPU RAM Size', `${gpuRamGB} GB`])
    details.push(['Hidden Size', cfg.hidden_size])
    details.push(['Attention Heads', cfg.num_attention_heads])
    details.push(['Hidden Layers', cfg.num_hidden_layers])
    details.push(['KV Heads', cfg.num_key_value_heads])
    details.push(['Head Dimension', cfg.head_dim])
    details.push(['Data Type Size', `${dtypeSize} bytes`])
    details.push(['Elements per Token', `2 × ${cfg.num_hidden_layers} × ${cfg.num_key_value_heads} × ${cfg.head_dim} = ${elementsPerToken}`])
    details.push(['Bytes per Token', `${elementsPerToken} × ${dtypeSize} = ${bytesPerToken} bytes`])
    details.push(['Maximum Tokens', `${totalBytes} / ${bytesPerToken} = ${maxTokens} tokens`])
  } else {
    // standard transformer
    const headSize = cfg.hidden_size / cfg.num_attention_heads
    const elementsPerToken = 2 * cfg.num_hidden_layers * cfg.num_key_value_heads * headSize
    const bytesPerToken = elementsPerToken * dtypeSize
    maxTokens = Math.floor(totalBytes / bytesPerToken)
    details.push(['架构', archLabel(cfg)])
    details.push(['GPU RAM Size', `${gpuRamGB} GB`])
    details.push(['Hidden Size', cfg.hidden_size])
    details.push(['Attention Heads', cfg.num_attention_heads])
    details.push(['Hidden Layers', cfg.num_hidden_layers])
    details.push(['KV Heads', cfg.num_key_value_heads])
    details.push(['Head Size', `${headSize} (Hidden / Attention)`])
    details.push(['Data Type Size', `${dtypeSize} bytes`])
    details.push(['Elements per Token', `2 × ${cfg.num_hidden_layers} × ${cfg.num_key_value_heads} × ${headSize} = ${elementsPerToken}`])
    details.push(['Bytes per Token', `${elementsPerToken} × ${dtypeSize} = ${bytesPerToken} bytes`])
    details.push(['Maximum Tokens', `${totalBytes} / ${bytesPerToken} = ${maxTokens} tokens`])
  }

  return withHeadline({ details, note: '', maxTokens })
}

function withHeadline({ details, note, maxTokens }) {
  const maxTokensK = (maxTokens / 1024).toFixed(maxTokens % 1024 === 0 ? 0 : 2)
  const headline = `Maximum Tokens: ${maxTokensK}K (${maxTokens.toLocaleString()})`
  return { headline, details, note, maxTokens }
}
