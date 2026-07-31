<template>
  <div>
    <h1 class="text-3xl font-bold mb-2">
      KV Cache Calculator
    </h1>
    <p class="opacity-60 mb-6 text-sm">
      估算给定 token 数下 KV Cache 占用的显存。算法与模型表来自
      <a
        href="https://kvcache.ai/tools/kv-cache-size-calculator/"
        target="_blank"
        class="link"
      >kvcache.ai</a>，源码
      <a
        href="https://github.com/kvcache-ai/kvcache-blog"
        target="_blank"
        class="link"
      >kvcache-ai/kvcache-blog</a>。
    </p>

    <div class="grid md:grid-cols-2 gap-6 max-w-5xl">
      <!-- Input panel -->
      <div class="space-y-4">
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">模型</span></label>
          <select
            v-model="modelId"
            class="select select-bordered w-full font-mono text-sm"
          >
            <optgroup
              v-for="(models, family) in groupedModels"
              :key="family"
              :label="family"
            >
              <option
                v-for="m in models"
                :key="m.id"
                :value="m.id"
              >
                {{ m.label }}
              </option>
            </optgroup>
          </select>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="form-control">
            <label class="label"><span class="label-text font-semibold">Tokens / 序列</span></label>
            <input
              v-model.number="tokens"
              type="number"
              min="1"
              step="1"
              class="input input-bordered w-full font-mono"
            >
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text font-semibold">Sequences (batch)</span></label>
            <input
              v-model.number="sequences"
              type="number"
              min="1"
              step="1"
              class="input input-bordered w-full font-mono"
            >
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="form-control">
            <label class="label"><span class="label-text font-semibold">KV 精度</span></label>
            <select
              v-model="precision"
              class="select select-bordered w-full"
            >
              <option
                v-for="opt in precisionOptionsList"
                :key="opt.id"
                :value="opt.id"
              >
                {{ opt.label }}
              </option>
            </select>
          </div>
          <div
            v-if="showIndexerPrecision"
            class="form-control"
          >
            <label class="label"><span class="label-text font-semibold">Indexer 精度</span></label>
            <select
              v-model="indexerPrecision"
              class="select select-bordered w-full"
            >
              <option
                v-for="opt in indexerPrecisionOptionsList"
                :key="opt.id"
                :value="opt.id"
              >
                {{ opt.label }}
              </option>
            </select>
          </div>
        </div>

        <div
          v-if="showDraftToggle"
          class="form-control"
        >
          <label class="label cursor-pointer justify-start gap-3">
            <input
              v-model="includeDraftKvCache"
              type="checkbox"
              class="checkbox checkbox-sm"
            >
            <span class="label-text">Include draft KV cache (MTP / Next-N)</span>
          </label>
        </div>

        <div
          v-if="showLinearStateToggle"
          class="form-control"
        >
          <label class="label cursor-pointer justify-start gap-3">
            <input
              v-model="includeLinearAttentionState"
              type="checkbox"
              class="checkbox checkbox-sm"
            >
            <span class="label-text">Include linear-attention state</span>
          </label>
        </div>

        <div
          v-if="showKdaPolicy"
          class="form-control bg-base-200 p-3 rounded"
        >
          <div class="text-sm font-semibold mb-2">
            KDA Checkpoint Policy
          </div>
          <label class="label cursor-pointer justify-start gap-3">
            <input
              v-model="kdaCheckpointPolicy"
              type="radio"
              :value="KDA_CHECKPOINT_POLICY_PROMPT_END"
              class="radio radio-sm"
            >
            <span class="label-text">Prompt-End State (single checkpoint)</span>
          </label>
          <label class="label cursor-pointer justify-start gap-3">
            <input
              v-model="kdaCheckpointPolicy"
              type="radio"
              :value="KDA_CHECKPOINT_POLICY_FIXED_INTERVAL"
              class="radio radio-sm"
            >
            <span class="label-text">Fixed Interval Checkpoints</span>
          </label>
          <div
            v-if="kdaCheckpointPolicy === KDA_CHECKPOINT_POLICY_FIXED_INTERVAL"
            class="form-control mt-2"
          >
            <label class="label"><span class="label-text text-xs">Checkpoint interval (tokens)</span></label>
            <input
              v-model="kdaCheckpointIntervalInput"
              type="text"
              class="input input-bordered input-sm w-full font-mono"
              placeholder="e.g. 10240 or ∞"
            >
          </div>
        </div>
      </div>

      <!-- Result panel -->
      <div v-if="result">
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
              {{ formatBytes(result.totalBytes) }}
            </div>
            <div class="text-sm opacity-60 font-mono">
              {{ result.totalBytes.toLocaleString() }} bytes · {{ result.totalGiB.toFixed(5) }} GiB
            </div>
            <div class="divider my-2" />
            <div class="text-sm leading-relaxed opacity-80 kv-details">
              <div
                v-for="(line, i) in resultDetails"
                :key="i"
                class="kv-line"
              >
                <span class="font-semibold">{{ line.k }}</span>
                <span class="font-mono">{{ line.v }}</span>
              </div>
            </div>
            <div
              v-if="result.elementPlan && result.elementPlan.note"
              class="text-xs opacity-70 mt-3 italic"
            >
              {{ result.elementPlan.note }}
            </div>
            <details class="mt-3">
              <summary class="text-sm cursor-pointer opacity-70">
                Formula breakdown
              </summary>
              <pre class="text-xs mt-2 p-3 bg-base-100 rounded overflow-x-auto whitespace-pre-wrap">{{ result.elementPlan.formulaText }}</pre>
            </details>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import {
  MODEL_BY_ID,
  PRECISION_OPTIONS,
  INDEXER_PRECISION_OPTIONS,
  groupModelsByFamily,
  hasIndexerCache,
  hasDraftKvCache,
  hasLinearAttentionState,
  hasKdaCheckpointInterval,
  defaultPrecisionId,
  defaultIndexerPrecisionId,
  calculate,
  KDA_CHECKPOINT_POLICY_PROMPT_END,
  KDA_CHECKPOINT_POLICY_FIXED_INTERVAL,
  BYTES_PER_GIB,
} from './kv-cache'

const groupedModels = groupModelsByFamily()

const modelId = ref('qwen3-8b')
const tokens = ref(1024)
const sequences = ref(1)
const precision = ref(defaultPrecisionId(MODEL_BY_ID['qwen3-8b']))
const indexerPrecision = ref(defaultIndexerPrecisionId(MODEL_BY_ID['qwen3-8b']))
const includeDraftKvCache = ref(false)
const includeLinearAttentionState = ref(false)
const kdaCheckpointPolicy = ref(KDA_CHECKPOINT_POLICY_PROMPT_END)
const kdaCheckpointIntervalInput = ref('10240')

const result = ref(null)

const precisionOptionsList = Object.entries(PRECISION_OPTIONS).map(([id, v]) => ({ id, ...v }))
const indexerPrecisionOptionsList = Object.entries(INDEXER_PRECISION_OPTIONS).map(([id, v]) => ({ id, ...v }))

const model = computed(() => MODEL_BY_ID[modelId.value])
const showIndexerPrecision = computed(() => hasIndexerCache(model.value))
const showDraftToggle = computed(() => hasDraftKvCache(model.value))
const showLinearStateToggle = computed(() => hasLinearAttentionState(model.value))
const showKdaPolicy = computed(() => hasKdaCheckpointInterval(model.value))

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return '—'
  if (bytes >= BYTES_PER_GIB) return `${(bytes / BYTES_PER_GIB).toFixed(5)} GiB`
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(5)} MiB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(5)} KiB`
  return `${bytes.toFixed(5)} B`
}

const resultDetails = computed(() => {
  if (!result.value || result.value.error) return []
  const r = result.value
  const lines = []
  lines.push({ k: 'Model', v: `${r.modelLabel} (${r.modelId})` })
  lines.push({ k: 'Formula', v: r.formulaLabel })
  lines.push({ k: 'KV precision', v: r.precisionLabel })
  if (r.indexerPrecisionLabel) lines.push({ k: 'Indexer precision', v: r.indexerPrecisionLabel })
  lines.push({ k: 'Tokens × Sequences', v: `${r.tokens.toLocaleString()} × ${r.sequences} = ${r.totalCachedTokens.toLocaleString()}` })
  if (r.cacheGroups.length > 1) {
    for (const g of r.cacheGroups) {
      lines.push({ k: g.label, v: formatBytes(g.bytes) })
    }
  }
  lines.push({ k: 'Per token', v: formatBytes(r.bytesPerToken) })
  if (Number.isFinite(r.hitRateBytesPerToken)) {
    lines.push({ k: 'Reusable MLA / token', v: formatBytes(r.hitRateBytesPerToken) })
  }
  if (r.tensorParallel > 1) {
    lines.push({ k: 'Per device', v: formatBytes(r.perDeviceBytes) })
  }
  return lines
})

function recompute() {
  result.value = calculate(model.value, {
    tokens: tokens.value,
    sequences: sequences.value,
    precision: precision.value,
    indexerPrecision: indexerPrecision.value,
    includeDraftKvCache: includeDraftKvCache.value,
    includeLinearAttentionState: includeLinearAttentionState.value,
    kdaCheckpointPolicy: kdaCheckpointPolicy.value,
    kdaCheckpointInterval: kdaCheckpointIntervalInput.value,
  })
}

watch(modelId, (newId) => {
  const m = MODEL_BY_ID[newId]
  precision.value = defaultPrecisionId(m)
  indexerPrecision.value = defaultIndexerPrecisionId(m)
  if (!hasKdaCheckpointInterval(m)) {
    kdaCheckpointPolicy.value = KDA_CHECKPOINT_POLICY_PROMPT_END
  }
})

watch(
  [modelId, tokens, sequences, precision, indexerPrecision, includeDraftKvCache,
   includeLinearAttentionState, kdaCheckpointPolicy, kdaCheckpointIntervalInput],
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
