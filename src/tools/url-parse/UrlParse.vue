<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">
      URL 解析
    </h1>
    <div class="flex flex-col gap-4 max-w-2xl">
      <div class="form-control">
        <input
          v-model="input"
          class="input input-bordered w-full font-mono text-sm"
          placeholder="输入 URL..."
          @input="parse"
        >
        <p
          v-if="error"
          class="text-error text-sm mt-1"
        >
          {{ error }}
        </p>
      </div>

      <div
        v-if="tokens.length"
        class="font-mono text-sm break-all bg-base-200 rounded-lg p-3 leading-relaxed"
      >
        <span
          v-for="(t, i) in tokens"
          :key="i"
          :class="t.color"
        >{{ t.text }}</span>
      </div>

      <div
        v-if="components.length"
        class="card bg-base-200"
      >
        <div class="card-body gap-2">
          <div
            v-for="c in components"
            :key="c.key"
            class="flex items-center gap-2"
          >
            <span class="text-sm font-semibold w-20 shrink-0">{{ c.label }}</span>
            <span :class="['font-mono text-sm break-all flex-1', c.color]">{{ c.value }}</span>
            <button
              v-if="c.value"
              class="btn btn-ghost btn-xs btn-square shrink-0"
              :title="copied[c.key] ? '已复制！' : '复制'"
              @click="copy(c.value, c.key)"
            >
              <Icon
                v-if="copied[c.key]"
                icon="lucide:check"
                class="w-4 h-4 text-success"
              />
              <Icon
                v-else
                icon="lucide:clipboard"
                class="w-4 h-4"
              />
            </button>
          </div>
        </div>
      </div>

      <div
        v-if="params.length"
        class="card bg-base-200"
      >
        <div class="card-body gap-2">
          <h2 class="card-title text-base">
            Query 参数
          </h2>
          <div
            v-for="p in params"
            :key="p.key"
            class="flex items-center gap-2"
          >
            <span class="font-mono text-sm text-rose-400">{{ p.key }}=</span>
            <span class="font-mono text-sm text-rose-400 break-all flex-1">{{ p.value }}</span>
            <button
              class="btn btn-ghost btn-xs btn-square shrink-0"
              :title="copied['param-' + p.key] ? '已复制！' : '复制'"
              @click="copy(p.value, 'param-' + p.key)"
            >
              <Icon
                v-if="copied['param-' + p.key]"
                icon="lucide:check"
                class="w-4 h-4 text-success"
              />
              <Icon
                v-else
                icon="lucide:clipboard"
                class="w-4 h-4"
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Icon } from '@iconify/vue'
import { ref, reactive } from 'vue'
import { tokenizeUrl, COMPONENT_COLORS } from './url-tokenize.js'

const input = ref('https://example.com:8080/path/to/page?name=张三&lang=zh&id=42#section')
const error = ref('')
const components = ref([])
const params = ref([])
const tokens = ref([])
const copied = reactive({})

const LABELS = [
  { key: 'protocol', label: 'Protocol', color: COMPONENT_COLORS.protocol },
  { key: 'hostname', label: 'Hostname', color: COMPONENT_COLORS.hostname },
  { key: 'port', label: 'Port', color: COMPONENT_COLORS.port },
  { key: 'pathname', label: 'Pathname', color: COMPONENT_COLORS.pathname },
  { key: 'hash', label: 'Hash', color: COMPONENT_COLORS.hash },
]

function parse() {
  error.value = ''
  components.value = []
  params.value = []
  if (!input.value.trim()) {
    tokens.value = []
    return
  }
  try {
    const url = new URL(input.value)
    components.value = LABELS.map(({ key, label, color }) => ({
      key,
      label,
      color,
      value: key === 'protocol' ? url.protocol.replace(/:$/, '') : url[key],
    }))
    const p = []
    url.searchParams.forEach((value, key) => {
      p.push({ key, value })
    })
    params.value = p
    tokens.value = tokenizeUrl(input.value, url)
  } catch {
    error.value = '无效的 URL'
    tokens.value = []
  }
}

async function copy(text, flag) {
  try {
    await navigator.clipboard.writeText(text)
    copied[flag] = true
    setTimeout(() => copied[flag] = false, 1500)
  } catch { /* clipboard not available */ }
}

parse()
</script>
