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
          <option value="fp8">
            fp8 (FP8)
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
        <label class="label"><span class="label-text font-semibold">Token 数 (K)</span></label>
        <input
          v-model.number="tokensK"
          type="number"
          min="0.001"
          step="1"
          placeholder="e.g. 1 (= 1024 tokens)"
          class="input input-bordered w-full font-mono"
        >
        <p class="text-xs opacity-60 mt-1">
          以 K 为单位，1K = 1024 tokens
        </p>
      </div>
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
        >
      </div>
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
import { ref, computed, watch } from 'vue'
import { MODELS, MODEL_NAMES, detectArch, computeForward, computeReverse } from '../utils/kv-cache.js'

const mode = ref('forward')
const model = ref('Qwen/Qwen3-8B')
const dtype = ref('bfloat16')

// DSA / V4 precision state
const precisionMode = ref('default')
const nopeBytes = ref(1)
const ropeBytes = ref(2)
const indexerBytes = ref(0.5)

const tokensK = ref(1)
const gpuRam = ref(20)
const result = ref(null)

const modelNames = MODEL_NAMES
const config = computed(() => MODELS[model.value] || {})
const isDSA = computed(() => detectArch(config.value) === 'dsa')

const dsaPrec = computed(() => precisionMode.value === 'custom'
  ? { mode: 'custom', nope: nopeBytes.value, rope: ropeBytes.value, indexer: indexerBytes.value }
  : { mode: 'default' })

function recompute() {
  let res
  if (mode.value === 'forward') {
    const k = tokensK.value
    const n = Number.isFinite(k) && k > 0 ? Math.round(k * 1024) : 0
    res = computeForward({
      config: config.value,
      tokens: n,
      dtype: dtype.value,
      prec: dsaPrec.value,
    })
    if (!res.error) {
      // Prepend input echo line (K + raw token count) for clarity in the UI
      res.details = [['Token 数', `${k} K (${n.toLocaleString()} tokens)`], ...res.details]
    }
  } else {
    res = computeReverse({
      config: config.value,
      gpuRamGB: gpuRam.value,
      dtype: dtype.value,
      prec: dsaPrec.value,
    })
  }
  // Convert [k, v] pairs to { k, v } for template binding
  if (res.details) res.details = res.details.map(([k, v]) => ({ k, v: String(v) }))
  result.value = res
}

watch(mode, recompute)
watch(
  [model, dtype, precisionMode, nopeBytes, ropeBytes, indexerBytes, tokensK, gpuRam],
  recompute,
  { immediate: true },
)
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
