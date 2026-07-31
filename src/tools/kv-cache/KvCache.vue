<template>
  <div>
    <h1 class="text-3xl font-bold mb-2">
      KVCache 尺寸计算器
    </h1>
    <p class="opacity-60 mb-6 text-sm">
      估算给定 token 数下 KV Cache 占用的显存。
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

        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">输入长度（tokens）</span></label>
          <input
            v-model.number="tokens"
            type="number"
            min="1"
            step="1"
            class="input input-bordered w-full font-mono"
          >
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
            <span class="label-text">包含 draft KV cache (MTP / Next-N)</span>
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
            <span class="label-text">包含 linear-attention 状态</span>
          </label>
        </div>

        <div
          v-if="showKdaPolicy"
          class="form-control bg-base-200 p-3 rounded"
        >
          <div class="text-sm font-semibold mb-2">
            KDA 检查点策略
          </div>
          <label class="label cursor-pointer justify-start gap-3">
            <input
              v-model="kdaCheckpointPolicy"
              type="radio"
              :value="KDA_CHECKPOINT_POLICY_PROMPT_END"
              class="radio radio-sm"
            >
            <span class="label-text">Prompt 末尾状态（单个检查点）</span>
          </label>
          <label class="label cursor-pointer justify-start gap-3">
            <input
              v-model="kdaCheckpointPolicy"
              type="radio"
              :value="KDA_CHECKPOINT_POLICY_FIXED_INTERVAL"
              class="radio radio-sm"
            >
            <span class="label-text">固定间隔检查点</span>
          </label>
          <div
            v-if="kdaCheckpointPolicy === KDA_CHECKPOINT_POLICY_FIXED_INTERVAL"
            class="form-control mt-2"
          >
            <label class="label"><span class="label-text text-xs">检查点间隔（tokens）</span></label>
            <input
              v-model="kdaCheckpointIntervalInput"
              type="text"
              class="input input-bordered input-sm w-full font-mono"
              placeholder="如 10240 或 ∞"
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
                公式详情
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
const firstModelId = Object.values(groupedModels)[0][0].id

const modelId = ref(firstModelId)
const tokens = ref(1024)
const sequences = ref(1)
const precision = ref(defaultPrecisionId(MODEL_BY_ID[firstModelId]))
const indexerPrecision = ref(defaultIndexerPrecisionId(MODEL_BY_ID[firstModelId]))
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
  lines.push({ k: '模型', v: r.modelLabel })
  lines.push({ k: '公式', v: r.formulaLabel })
  lines.push({ k: 'KV 精度', v: r.precisionLabel })
  if (r.indexerPrecisionLabel) lines.push({ k: 'Indexer 精度', v: r.indexerPrecisionLabel })
  lines.push({ k: 'Tokens × 序列数', v: `${r.tokens.toLocaleString()} × ${r.sequences} = ${r.totalCachedTokens.toLocaleString()}` })
  if (r.cacheGroups.length > 1) {
    for (const g of r.cacheGroups) {
      lines.push({ k: g.label, v: formatBytes(g.bytes) })
    }
  }
  lines.push({ k: '每 token 占用', v: formatBytes(r.bytesPerToken) })
  if (Number.isFinite(r.hitRateBytesPerToken)) {
    lines.push({ k: '可复用 MLA / token', v: formatBytes(r.hitRateBytesPerToken) })
  }
  if (r.tensorParallel > 1) {
    lines.push({ k: '每张卡占用', v: formatBytes(r.perDeviceBytes) })
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

watch(modelId, (newId, oldId) => {
  // KV precision is intentionally preserved across model switches — the
  // user's last choice (bf16/fp8/fp4) survives. Indexer precision is also
  // preserved, but only when both the previous and new models have an
  // indexer cache. When transitioning into an indexer model from a non-
  // indexer one, fall back to the new model's default indexer precision.
  const m = MODEL_BY_ID[newId]
  const prev = oldId ? MODEL_BY_ID[oldId] : null
  const prevHadIndexer = prev ? hasIndexerCache(prev) : false
  const newHasIndexer = hasIndexerCache(m)
  if (newHasIndexer && !prevHadIndexer) {
    indexerPrecision.value = defaultIndexerPrecisionId(m)
  }
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
