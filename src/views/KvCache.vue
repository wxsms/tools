<template>
  <div>
    <h1 class="text-3xl font-bold mb-2">
      KV Cache 尺寸计算器
    </h1>
    <p class="opacity-60 mb-6 text-sm">
      估算给定 token 数下 KV Cache 占用的显存,或反推在指定 GPU 显存下最多可缓存的 token 数。参考
      <a
        href="https://docs.lmcache.ai/getting_started/kv_cache_calculator.html"
        target="_blank"
        class="link"
      >LMCache</a>。
    </p>

    <!-- Mode switch -->
    <div
      role="tablist"
      class="tabs tabs-boxed mb-6 w-fit"
    >
      <a
        role="tab"
        class="tab"
        :class="{ 'tab-active': mode === 'forward' }"
        @click="mode = 'forward'"
      >正向：tokens → 显存</a>
      <a
        role="tab"
        class="tab"
        :class="{ 'tab-active': mode === 'reverse' }"
        @click="mode = 'reverse'"
      >反算：显存 → tokens</a>
    </div>

    <!-- Shared model + dtype selectors -->
    <div class="grid md:grid-cols-2 gap-4 max-w-3xl">
      <div class="form-control">
        <label class="label"><span class="label-text font-semibold">模型</span></label>
        <select
          v-model="model"
          class="select select-bordered w-full font-mono text-sm"
        >
          <option
            v-for="name in modelNames"
            :key="name"
            :value="name"
          >
            {{ name }}
          </option>
        </select>
      </div>

      <div class="form-control">
        <label class="label"><span class="label-text font-semibold">KV 数据类型</span></label>
        <select
          v-model="dtype"
          class="select select-bordered w-full"
          :disabled="isDSA"
        >
          <option value="float16">
            float16 (FP16)
          </option>
          <option value="bfloat16">
            bfloat16 (BF16)
          </option>
          <option value="float32">
            float32 (FP32)
          </option>
          <option value="int8">
            int8 (INT8)
          </option>
        </select>
        <p
          v-if="isDSA"
          class="text-xs opacity-60 mt-1"
        >
          DeepSeek V4 使用原生混合精度，数据类型选项不生效
        </p>
      </div>
    </div>

    <!-- DSA precision customization -->
    <div
      v-if="isDSA"
      class="mt-4 max-w-3xl card bg-base-200"
    >
      <div class="card-body p-4 gap-3">
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">V4 KV 精度（bytes / dim）</span></label>
          <select
            v-model="precisionMode"
            class="select select-bordered w-full"
          >
            <option value="default">
              Paper default — FP8 NoPE / BF16 RoPE / FP4 indexer
            </option>
            <option value="custom">
              自定义…
            </option>
          </select>
        </div>
        <div
          v-if="precisionMode === 'custom'"
          class="grid grid-cols-3 gap-3"
        >
          <div class="form-control">
            <label class="label"><span class="label-text text-xs">NoPE bytes/dim</span></label>
            <input
              v-model.number="nopeBytes"
              type="number"
              min="0"
              step="0.1"
              class="input input-bordered input-sm w-full"
            >
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text text-xs">RoPE bytes/dim</span></label>
            <input
              v-model.number="ropeBytes"
              type="number"
              min="0"
              step="0.1"
              class="input input-bordered input-sm w-full"
            >
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text text-xs">Indexer bytes/dim</span></label>
            <input
              v-model.number="indexerBytes"
              type="number"
              min="0"
              step="0.1"
              class="input input-bordered input-sm w-full"
            >
          </div>
        </div>
      </div>
    </div>

    <!-- Forward mode -->
    <div
      v-if="mode === 'forward'"
      class="mt-4 max-w-3xl"
    >
      <div class="form-control">
        <label class="label"><span class="label-text font-semibold">Token 数</span></label>
        <input
          v-model.number="tokens"
          type="number"
          min="1"
          placeholder="e.g. 1000"
          class="input input-bordered w-full font-mono"
          @keydown.enter="computeForward"
        >
      </div>
      <button
        class="btn btn-primary mt-4"
        @click="computeForward"
      >
        计算 KV Cache 尺寸
      </button>
    </div>

    <!-- Reverse mode -->
    <div
      v-if="mode === 'reverse'"
      class="mt-4 max-w-3xl"
    >
      <div class="form-control">
        <label class="label"><span class="label-text font-semibold">GPU 显存 (GB)</span></label>
        <input
          v-model.number="gpuRam"
          type="number"
          min="0.1"
          step="0.1"
          placeholder="e.g. 20"
          class="input input-bordered w-full font-mono"
          @keydown.enter="computeReverse"
        >
      </div>
      <button
        class="btn btn-primary mt-4"
        @click="computeReverse"
      >
        计算最大 Token 数
      </button>
    </div>

    <!-- Result -->
    <div
      v-if="result"
      class="mt-6 max-w-3xl"
    >
      <div
        v-if="result.error"
        class="alert alert-error"
      >
        {{ result.error }}
      </div>
      <div
        v-else
        class="card bg-base-200"
      >
        <div class="card-body">
          <div class="text-2xl font-bold text-primary">
            {{ result.headline }}
          </div>
          <div class="divider my-2" />
          <div class="text-sm leading-relaxed opacity-80 kv-details">
            <div
              v-for="(line, i) in result.details"
              :key="i"
              class="kv-line"
            >
              <span class="font-semibold">{{ line.k }}</span>
              <span class="font-mono">{{ line.v }}</span>
            </div>
            <div
              v-if="result.note"
              class="text-xs opacity-70 mt-3 italic"
            >
              {{ result.note }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const DTYPE_SIZES = {
  float32: 4,
  float16: 2,
  bfloat16: 2,
  int8: 1,
}

// Model configs — verbatim copy from LMCache's modelconfig.json (dev branch).
// Source: https://docs.lmcache.ai/_static/modelconfig.json
// Keys are HF model ids; values follow the original config schema, including
// DSA (DeepSeek V4), MLA-with-indexer (GLM-5.1), Hybrid SWA (gemma-4 / gpt-oss /
// Laguna), and Hybrid Linear (Qwen3.5 / Nemotron-3) architectures.
const modelConfigs = {
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
const modelNames = Object.keys(modelConfigs).sort(collator.compare)

const mode = ref('forward')
const model = ref('Qwen/Qwen3-8B')
const dtype = ref('bfloat16')

// DSA / V4 precision state
const precisionMode = ref('default')
const nopeBytes = ref(1)
const ropeBytes = ref(2)
const indexerBytes = ref(0.5)

const tokens = ref(1000)
const gpuRam = ref(20)
const result = ref(null)

const config = computed(() => modelConfigs[model.value] || {})

const isDSA = computed(() =>
  Array.isArray(config.value.compress_ratios) && Number.isFinite(config.value.head_dim),
)
const isMLA = computed(() =>
  Number.isFinite(config.value.kv_lora_rank) && Number.isFinite(config.value.qk_rope_head_dim),
)
const isHybridSWA = computed(() =>
  Number.isFinite(config.value.full_attention_layers) &&
  Number.isFinite(config.value.sliding_attention_layers) &&
  Number.isFinite(config.value.sliding_window) &&
  Number.isFinite(config.value.num_key_value_heads) &&
  Number.isFinite(config.value.head_dim),
)
const isHybridLinear = computed(() =>
  Number.isFinite(config.value.full_attention_layers) &&
  Number.isFinite(config.value.linear_attention_layers) &&
  Number.isFinite(config.value.num_key_value_heads) &&
  Number.isFinite(config.value.head_dim),
)
const hasHeadDim = computed(() =>
  Number.isFinite(config.value.head_dim) && Number.isFinite(config.value.num_key_value_heads),
)

function getDSAPrecision(cfg) {
  const def = {
    nope: Number.isFinite(cfg.nope_bytes) ? cfg.nope_bytes : 1,
    rope: Number.isFinite(cfg.rope_bytes) ? cfg.rope_bytes : 2,
    indexer: Number.isFinite(cfg.indexer_bytes) ? cfg.indexer_bytes : 0.5,
    mode: 'default',
  }
  if (precisionMode.value !== 'custom') return def
  return {
    nope: Number.isFinite(nopeBytes.value) ? nopeBytes.value : def.nope,
    rope: Number.isFinite(ropeBytes.value) ? ropeBytes.value : def.rope,
    indexer: Number.isFinite(indexerBytes.value) ? indexerBytes.value : def.indexer,
    mode: 'custom',
  }
}

function arcLabel() {
  if (isDSA.value) return 'DeepSeek V4 DSA (CSA + HCA)'
  if (isMLA.value) return 'Multi-head Latent Attention (MLA)'
  if (isHybridLinear.value) return 'Linear / Full Hybrid'
  if (isHybridSWA.value) return 'Sliding-Window / Full Hybrid'
  if (hasHeadDim.value) return 'GQA / explicit head_dim'
  return 'Standard Transformer'
}

function computeForward() {
  const cfg = config.value
  const n = tokens.value
  if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) {
    result.value = { error: '请输入有效的 token 数（正整数）' }
    return
  }
  const dtypeSize = DTYPE_SIZES[dtype.value]
  const details = []
  let totalBytes
  let headline
  let note = ''

  if (isDSA.value) {
    const activeRatios = cfg.compress_ratios.filter(r => r > 0)
    const compressFactor = activeRatios.reduce((s, r) => s + 1 / r, 0)
    const ropeDim = Number.isFinite(cfg.qk_rope_head_dim) ? cfg.qk_rope_head_dim : 0
    const indexerDim = Number.isFinite(cfg.index_head_dim) ? cfg.index_head_dim : 0
    const prec = getDSAPrecision(cfg)
    const kvBytesPerEntry = (cfg.head_dim - ropeDim) * prec.nope + ropeDim * prec.rope
    const indexerBytesPerEntry = indexerDim * prec.indexer
    const bytesPerToken = (kvBytesPerEntry + indexerBytesPerEntry) * compressFactor
    const numLayers = cfg.compress_ratios.length
    const windowBytes = numLayers * cfg.sliding_window * kvBytesPerEntry
    totalBytes = bytesPerToken * n + windowBytes
    const sizeGB = totalBytes / 1024 ** 3
    headline = `KV Cache Size: ${sizeGB.toFixed(4)} GB`
    details.push(['架构', arcLabel()])
    details.push(['Hidden Layers', cfg.num_hidden_layers])
    details.push(['Head Dimension', `${cfg.head_dim} (RoPE ${ropeDim} @ ${prec.rope}B, NoPE ${cfg.head_dim - ropeDim} @ ${prec.nope}B)`])
    details.push(['Compressed Layers (r>0)', `${activeRatios.length} / ${numLayers}`])
    details.push(['Sliding Window (per layer)', cfg.sliding_window])
    details.push(['KV Bytes / Entry', `(${cfg.head_dim} − ${ropeDim}) × ${prec.nope} + ${ropeDim} × ${prec.rope} = ${kvBytesPerEntry} B`])
    if (indexerDim) details.push(['Indexer Key (CSA, compressed)', `${indexerDim} × ${prec.indexer} × Σ(1/r) = ${(indexerBytesPerEntry * compressFactor).toFixed(1)} B/token`])
    const precLabel = prec.mode === 'custom'
      ? `custom (NoPE ${prec.nope} / RoPE ${prec.rope} / indexer ${prec.indexer} B/dim)`
      : `paper default (NoPE ${prec.nope}=FP8 / RoPE ${prec.rope}=BF16 / indexer ${prec.indexer}=FP4)`
    details.push(['Precision', precLabel])
    details.push(['Bytes per Token', `(${kvBytesPerEntry} + ${indexerBytesPerEntry}) × Σ(1/r) = ${bytesPerToken.toFixed(1)} B`])
    details.push(['Sliding-Window Floor', `${numLayers} × ${cfg.sliding_window} × ${kvBytesPerEntry} = ${windowBytes} B`])
    details.push(['Total Bytes', `${bytesPerToken.toFixed(1)} × ${n} + ${windowBytes} = ${totalBytes.toFixed(0)} bytes`])
    details.push(['KV Cache Size', `${totalBytes.toFixed(0)} / 1024³ ≈ ${sizeGB.toFixed(4)} GB`])
  } else if (isMLA.value) {
    const latentDim = cfg.kv_lora_rank + cfg.qk_rope_head_dim
    const indexerDim = Number.isFinite(cfg.index_head_dim) ? cfg.index_head_dim : 0
    const elementsPerToken = cfg.num_hidden_layers * (latentDim + indexerDim)
    const totalElements = elementsPerToken * n
    totalBytes = totalElements * dtypeSize
    const sizeGB = totalBytes / 1024 ** 3
    headline = `KV Cache Size: ${sizeGB.toFixed(4)} GB`
    details.push(['架构', arcLabel()])
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
  } else if (isHybridLinear.value) {
    const perLayer = 2 * cfg.num_key_value_heads * cfg.head_dim
    const nFull = cfg.full_attention_layers
    const nLin = cfg.linear_attention_layers
    const totalElements = perLayer * nFull * n
    totalBytes = totalElements * dtypeSize
    const sizeGB = totalBytes / 1024 ** 3
    const linType = typeof cfg.linear_attention_type === 'string' ? cfg.linear_attention_type : 'Gated DeltaNet'
    headline = `KV Cache Size: ${sizeGB.toFixed(4)} GB`
    note = `仅计算 full-attention 层；${linType} 循环状态尚未计入（待 LMCache 决定存储方式）`
    details.push(['架构', arcLabel()])
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
  } else if (isHybridSWA.value) {
    const perLayer = 2 * cfg.num_key_value_heads * cfg.head_dim
    const nFull = cfg.full_attention_layers
    const nSwa = cfg.sliding_attention_layers
    const win = cfg.sliding_window
    const swaTokens = Math.min(n, win)
    const totalElements = perLayer * (nFull * n + nSwa * swaTokens)
    totalBytes = totalElements * dtypeSize
    const sizeGB = totalBytes / 1024 ** 3
    headline = `KV Cache Size: ${sizeGB.toFixed(4)} GB`
    details.push(['架构', arcLabel()])
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
  } else if (hasHeadDim.value) {
    const totalElements = 2 * cfg.num_hidden_layers * n * cfg.num_key_value_heads * cfg.head_dim
    totalBytes = totalElements * dtypeSize
    const sizeGB = totalBytes / 1024 ** 3
    headline = `KV Cache Size: ${sizeGB.toFixed(4)} GB`
    details.push(['架构', arcLabel()])
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
    const headSize = cfg.hidden_size / cfg.num_attention_heads
    const totalElements = 2 * cfg.num_hidden_layers * n * cfg.num_key_value_heads * headSize
    totalBytes = totalElements * dtypeSize
    const sizeGB = totalBytes / 1024 ** 3
    headline = `KV Cache Size: ${sizeGB.toFixed(4)} GB`
    details.push(['架构', arcLabel()])
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

  result.value = {
    headline,
    details: details.map(([k, v]) => ({ k, v: String(v) })),
    note,
  }
}

function computeReverse() {
  const cfg = config.value
  const ram = gpuRam.value
  if (!Number.isFinite(ram) || ram <= 0) {
    result.value = { error: '请输入有效的 GPU 显存（大于 0）' }
    return
  }
  const dtypeSize = DTYPE_SIZES[dtype.value]
  const totalBytes = ram * 1024 ** 3
  const details = []
  let maxTokens
  let headline
  let note = ''

  if (isDSA.value) {
    const activeRatios = cfg.compress_ratios.filter(r => r > 0)
    const compressFactor = activeRatios.reduce((s, r) => s + 1 / r, 0)
    const ropeDim = Number.isFinite(cfg.qk_rope_head_dim) ? cfg.qk_rope_head_dim : 0
    const indexerDim = Number.isFinite(cfg.index_head_dim) ? cfg.index_head_dim : 0
    const prec = getDSAPrecision(cfg)
    const kvBytesPerEntry = (cfg.head_dim - ropeDim) * prec.nope + ropeDim * prec.rope
    const indexerBytesPerEntry = indexerDim * prec.indexer
    const bytesPerToken = (kvBytesPerEntry + indexerBytesPerEntry) * compressFactor
    const numLayers = cfg.compress_ratios.length
    const windowBytes = numLayers * cfg.sliding_window * kvBytesPerEntry
    maxTokens = Math.max(0, Math.floor((totalBytes - windowBytes) / bytesPerToken))
    headline = `Maximum Tokens: ${maxTokens.toLocaleString()}`
    details.push(['架构', arcLabel()])
    details.push(['GPU RAM Size', `${ram} GB`])
    details.push(['Hidden Layers', cfg.num_hidden_layers])
    details.push(['Head Dimension', `${cfg.head_dim} (RoPE ${ropeDim} @ ${prec.rope}B, NoPE ${cfg.head_dim - ropeDim} @ ${prec.nope}B)`])
    details.push(['Compressed Layers (r>0)', `${activeRatios.length} / ${numLayers}`])
    details.push(['Sliding Window (per layer)', cfg.sliding_window])
    details.push(['KV Bytes / Entry', `(${cfg.head_dim} − ${ropeDim}) × ${prec.nope} + ${ropeDim} × ${prec.rope} = ${kvBytesPerEntry} B`])
    if (indexerDim) details.push(['Indexer Key (CSA, compressed)', `${indexerDim} × ${prec.indexer} × Σ(1/r) = ${(indexerBytesPerEntry * compressFactor).toFixed(1)} B/token`])
    const precLabel = prec.mode === 'custom'
      ? `custom (NoPE ${prec.nope} / RoPE ${prec.rope} / indexer ${prec.indexer} B/dim)`
      : `paper default (NoPE ${prec.nope}=FP8 / RoPE ${prec.rope}=BF16 / indexer ${prec.indexer}=FP4)`
    details.push(['Precision', precLabel])
    details.push(['Bytes per Token', `(${kvBytesPerEntry} + ${indexerBytesPerEntry}) × Σ(1/r) = ${bytesPerToken.toFixed(1)} B`])
    details.push(['Sliding-Window Floor', `${numLayers} × ${cfg.sliding_window} × ${kvBytesPerEntry} = ${windowBytes} B`])
    details.push(['Maximum Tokens', `(${totalBytes} − ${windowBytes}) / ${bytesPerToken.toFixed(1)} = ${maxTokens} tokens`])
  } else if (isMLA.value) {
    const latentDim = cfg.kv_lora_rank + cfg.qk_rope_head_dim
    const indexerDim = Number.isFinite(cfg.index_head_dim) ? cfg.index_head_dim : 0
    const elementsPerToken = cfg.num_hidden_layers * (latentDim + indexerDim)
    const bytesPerToken = elementsPerToken * dtypeSize
    maxTokens = Math.floor(totalBytes / bytesPerToken)
    headline = `Maximum Tokens: ${maxTokens.toLocaleString()}`
    details.push(['架构', arcLabel()])
    details.push(['GPU RAM Size', `${ram} GB`])
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
  } else if (isHybridLinear.value) {
    const perLayer = 2 * cfg.num_key_value_heads * cfg.head_dim
    const nFull = cfg.full_attention_layers
    const nLin = cfg.linear_attention_layers
    const availElements = totalBytes / dtypeSize
    maxTokens = Math.max(0, Math.floor(availElements / (perLayer * nFull)))
    const linType = typeof cfg.linear_attention_type === 'string' ? cfg.linear_attention_type : 'Gated DeltaNet'
    headline = `Maximum Tokens: ${maxTokens.toLocaleString()}`
    note = `仅按 full-attention 层计算；${linType} 循环状态尚未计入`
    details.push(['架构', arcLabel()])
    details.push(['GPU RAM Size', `${ram} GB`])
    details.push(['Hidden Layers', cfg.num_hidden_layers])
    details.push(['KV Heads', cfg.num_key_value_heads])
    details.push(['Head Dimension', cfg.head_dim])
    details.push(['Full-Attention Layers', `${nFull} (growing KV)`])
    details.push([`Linear (${linType}) Layers`, `${nLin} (循环状态 — 未计入)`])
    details.push(['Data Type Size', `${dtypeSize} bytes`])
    details.push(['Elements / Token / Layer', `2 × ${cfg.num_key_value_heads} × ${cfg.head_dim} = ${perLayer}`])
    details.push(['Maximum Tokens (full only)', `${availElements} / (${perLayer} × ${nFull}) = ${maxTokens} tokens`])
  } else if (isHybridSWA.value) {
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
    headline = `Maximum Tokens: ${maxTokens.toLocaleString()}`
    details.push(['架构', arcLabel()])
    details.push(['GPU RAM Size', `${ram} GB`])
    details.push(['Hidden Layers', cfg.num_hidden_layers])
    details.push(['KV Heads', cfg.num_key_value_heads])
    details.push(['Head Dimension', cfg.head_dim])
    details.push(['Full-Attention Layers', nFull])
    details.push(['Sliding-Attention Layers', `${nSwa} (window ${win})`])
    details.push(['Data Type Size', `${dtypeSize} bytes`])
    details.push(['Elements / Token / Layer', `2 × ${cfg.num_key_value_heads} × ${cfg.head_dim} = ${perLayer}`])
    details.push(['Regime', regime])
    details.push(['Maximum Tokens', `${maxTokens} tokens`])
  } else if (hasHeadDim.value) {
    const elementsPerToken = 2 * cfg.num_hidden_layers * cfg.num_key_value_heads * cfg.head_dim
    const bytesPerToken = elementsPerToken * dtypeSize
    maxTokens = Math.floor(totalBytes / bytesPerToken)
    headline = `Maximum Tokens: ${maxTokens.toLocaleString()}`
    details.push(['架构', arcLabel()])
    details.push(['GPU RAM Size', `${ram} GB`])
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
    const headSize = cfg.hidden_size / cfg.num_attention_heads
    const elementsPerToken = 2 * cfg.num_hidden_layers * cfg.num_key_value_heads * headSize
    const bytesPerToken = elementsPerToken * dtypeSize
    maxTokens = Math.floor(totalBytes / bytesPerToken)
    headline = `Maximum Tokens: ${maxTokens.toLocaleString()}`
    details.push(['架构', arcLabel()])
    details.push(['GPU RAM Size', `${ram} GB`])
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

  result.value = {
    headline,
    details: details.map(([k, v]) => ({ k, v: String(v) })),
    note,
  }
}
</script>

<style scoped>
.kv-line {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.15rem 0;
}
.kv-line .font-semibold {
  flex-shrink: 0;
}
.kv-line .font-mono {
  text-align: right;
  word-break: break-all;
}
</style>
