<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">
      cURL 生成器
    </h1>

    <div class="flex flex-col gap-4">
      <!-- Method + URL -->
      <div class="flex gap-2">
        <div class="dropdown">
          <button
            tabindex="0"
            aria-label="Method"
            class="input input-bordered flex items-center justify-between gap-2 w-32 shrink-0 font-mono font-semibold cursor-pointer"
            @click="$event.currentTarget.focus()"
          >
            <span :class="methodClass">{{ method }}</span>
            <Icon
              icon="lucide:chevron-down"
              class="w-4 h-4 text-base-content/60"
            />
          </button>
          <ul
            tabindex="0"
            class="dropdown-content menu bg-base-200 rounded-box w-44 p-2 shadow-lg z-50 gap-0.5"
          >
            <li
              v-for="m in allMethods"
              :key="m"
            >
              <button
                :class="['font-mono font-semibold', colorOf(m)]"
                @click="pick(m)"
              >
                <Icon
                  v-if="m === method"
                  icon="lucide:check"
                  class="w-4 h-4"
                />
                <span
                  v-else
                  class="w-4"
                />
                {{ m }}
              </button>
            </li>
            <li class="border-t border-base-300 mt-1 pt-1">
              <input
                v-model="customMethod"
                class="input input-xs w-full font-mono"
                placeholder="Type a new method"
                @keydown.enter.prevent="commitCustom"
              >
            </li>
          </ul>
        </div>
        <input
          v-model="url"
          type="text"
          class="input input-bordered w-full font-mono text-sm"
          placeholder="https://api.example.com/users"
        >
        <button
          class="btn btn-primary shrink-0 min-w-24"
          title="复制生成的 cURL 命令"
          @click="copyCmd"
        >
          <Icon
            v-if="copied"
            icon="lucide:check"
            class="w-4 h-4"
          />
          <Icon
            v-else
            icon="lucide:copy"
            class="w-4 h-4"
          />
          {{ copied ? '已复制' : '复制命令' }}
        </button>
      </div>

      <!-- Tabs -->
      <div
        role="tablist"
        class="tabs tabs-box tabs-sm w-fit"
      >
        <button
          v-for="t in tabs"
          :key="t.key"
          role="tab"
          class="tab gap-1.5"
          :class="{ 'tab-active': activeTab === t.key }"
          @click="activeTab = t.key"
        >
          {{ t.label }}
          <span
            v-if="t.count > 0"
            class="badge badge-xs badge-ghost font-mono"
          >{{ t.count }}</span>
        </button>
      </div>

      <!-- Params -->
      <div v-show="activeTab === 'params'">
        <div class="flex items-center justify-between mb-2">
          <span class="font-semibold text-sm">Query Params</span>
          <button
            v-if="hasUrlQuery"
            class="btn btn-ghost btn-xs gap-1"
            title="把 URL 中的 query 拆到下方参数表格"
            @click="extractQuery"
          >
            <Icon
              icon="lucide:scissors"
              class="w-3.5 h-3.5"
            />
            拆出参数
          </button>
        </div>
        <KeyValueRows
          v-model="queryParams"
          key-label="Key"
          value-label="Value"
          key-placeholder="参数名"
          value-placeholder="值"
        />
      </div>

      <!-- Headers -->
      <div v-show="activeTab === 'headers'">
        <KeyValueRows
          v-model="headers"
          key-label="Key"
          value-label="Value"
          key-placeholder="Header 名称"
          value-placeholder="值"
        />
      </div>

      <!-- Body -->
      <div v-show="activeTab === 'body'">
        <!-- Body 模式 radio -->
        <div class="flex flex-wrap items-center gap-x-4 gap-y-2 mb-3 text-sm">
          <label class="label cursor-pointer gap-2 px-0 py-0">
            <input
              v-model="bodyMode"
              type="radio"
              name="body-mode"
              value="none"
              class="radio radio-xs radio-primary"
            >
            none
          </label>
          <label class="label cursor-pointer gap-2 px-0 py-0">
            <input
              v-model="bodyMode"
              type="radio"
              name="body-mode"
              value="form-data"
              class="radio radio-xs radio-primary"
            >
            form-data
          </label>
          <label class="label cursor-pointer gap-2 px-0 py-0">
            <input
              v-model="bodyMode"
              type="radio"
              name="body-mode"
              value="urlencoded"
              class="radio radio-xs radio-primary"
            >
            x-www-form-urlencoded
          </label>
          <label class="label cursor-pointer gap-2 px-0 py-0">
            <input
              v-model="bodyMode"
              type="radio"
              name="body-mode"
              value="raw"
              class="radio radio-xs radio-primary"
            >
            raw
          </label>
          <select
            v-if="bodyMode === 'raw'"
            v-model="rawLang"
            class="select select-bordered select-xs w-32 font-mono"
          >
            <option value="text">
              Text
            </option>
            <option value="json">
              JSON
            </option>
            <option value="xml">
              XML
            </option>
            <option value="html">
              HTML
            </option>
            <option value="javascript">
              JavaScript
            </option>
          </select>
        </div>

        <div v-if="bodyMode === 'form-data' || bodyMode === 'urlencoded'">
          <KeyValueRows
            v-model="formPairs"
            key-label="Key"
            value-label="Value"
            key-placeholder="字段名"
            value-placeholder="值"
          />
        </div>

        <div v-else-if="bodyMode === 'raw'">
          <BodyEditor
            v-model="rawBody"
            height="200px"
            :language="rawLanguage"
          />
          <p
            v-if="rawJsonError"
            class="text-error text-sm mt-1"
          >
            JSON 语法错误:{{ rawJsonError }}
          </p>
        </div>

        <div
          v-else
          class="text-sm opacity-50 border border-dashed border-base-300 rounded-lg p-6 text-center"
        >
          该请求不包含 Body
        </div>
      </div>

      <!-- Output -->
      <div class="form-control">
        <label class="label"><span class="label-text font-semibold">cURL 命令</span></label>
        <div class="relative">
          <div class="cm-container border border-base-300">
            <CodeMirrorEditor
              :model-value="cmd"
              :language="shellLang"
              :read-only="true"
              :bordered="false"
              min-height="80px"
            />
          </div>
          <button
            class="btn btn-ghost btn-xs btn-square absolute right-2 top-2 z-10"
            :title="copied ? '已复制！' : '复制'"
            @click="copyCmd"
          >
            <Icon
              v-if="copied"
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
</template>

<script setup>
import { Icon } from '@iconify/vue'
import { computed, ref } from 'vue'
import { buildCurl, splitUrlQuery } from './curl.js'
import KeyValueRows from './KeyValueRows.vue'
import BodyEditor from './BodyEditor.vue'
import CodeMirrorEditor from '../../components/CodeMirrorEditor.vue'
import { StreamLanguage } from '@codemirror/language'
import { shell } from '@codemirror/legacy-modes/mode/shell'
import { json } from '@codemirror/lang-json'
import { xml } from '@codemirror/lang-xml'
import { html } from '@codemirror/lang-html'
import { javascript } from '@codemirror/lang-javascript'

const shellLang = StreamLanguage.define(shell)

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']

const url = ref('https://api.example.com/users')
const method = ref('GET')
const customMethod = ref('')
const allMethods = computed(() => {
  const extra = customMethod.value.trim().toUpperCase()
  return (extra && !METHODS.includes(extra)) ? [...METHODS, extra] : METHODS
})
const queryParams = ref([])
const headers = ref([{ key: 'Authorization', value: 'Bearer <token>' }])
const activeTab = ref('params')
const bodyMode = ref('none')
const rawLang = ref('text')
const rawBody = ref('')
const formPairs = ref([{ key: 'username', value: 'wxsm' }])
const copied = ref(false)

/** Postman 风格的 Method 语义色 */
const METHOD_COLORS = {
  GET: 'text-success',
  POST: 'text-warning',
  PUT: 'text-info',
  PATCH: 'text-warning',
  DELETE: 'text-error',
  HEAD: 'text-base-content/60',
  OPTIONS: 'text-base-content/60',
}
function colorOf(m) {
  return METHOD_COLORS[m] || 'text-secondary'
}
const methodClass = computed(() => colorOf(method.value))

const hasUrlQuery = computed(() => url.value.includes('?'))

/** Tab 定义,计数用于徽标 */
const activeCount = computed(() => ({
  params: queryParams.value.filter(p => p.key.trim() !== '').length,
  headers: headers.value.filter(h => h.key.trim() !== '').length,
  body: bodyMode.value !== 'none' ? 1 : 0,
}))
const tabs = computed(() => [
  { key: 'params', label: 'Params', count: activeCount.value.params },
  { key: 'headers', label: 'Headers', count: activeCount.value.headers },
  { key: 'body', label: 'Body', count: activeCount.value.body },
])

/** raw 语言 → CodeMirror 扩展 */
const RAW_LANGUAGES = {
  json: json,
  xml: xml,
  html: html,
  javascript: () => javascript(),
}
const rawLanguage = computed(() => RAW_LANGUAGES[rawLang.value] || null)

const rawJsonError = computed(() => {
  if (bodyMode.value !== 'raw' || rawLang.value !== 'json' || rawBody.value.trim() === '') return ''
  try {
    JSON.parse(rawBody.value)
    return ''
  } catch (e) {
    return e.message
  }
})

function pick(m) {
  method.value = m
  customMethod.value = ''
  // 关闭 dropdown:移除焦点元素的 tabindex 状态(daisyUI 依赖 focus)
  document.activeElement?.blur()
}

function commitCustom() {
  const m = customMethod.value.trim().toUpperCase()
  if (m) {
    method.value = m
    customMethod.value = ''
    document.activeElement?.blur()
  }
}

/**
 * 把 URL 中的 query 部分拆到参数表格,与已有参数合并。
 */
function extractQuery() {
  const { base, queryParams: params } = splitUrlQuery(url.value)
  url.value = base
  if (params.length > 0) {
    queryParams.value = [
      ...queryParams.value.filter(p => p.key !== '' || p.value !== ''),
      ...params,
    ]
  }
}

const cmd = computed(() => buildCurl({
  method: method.value,
  url: url.value,
  headers: headers.value,
  queryParams: queryParams.value,
  bodyMode: bodyMode.value,
  rawLang: rawLang.value,
  rawBody: rawBody.value,
  formPairs: formPairs.value,
  formEncoding: bodyMode.value,
}))

async function copyCmd() {
  try {
    await navigator.clipboard.writeText(cmd.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
  } catch { /* clipboard not available */ }
}
</script>

<style scoped>
/* 输出区容器,与 box-shadow 等工具的 .cm-container 一致 */
.cm-container {
  border-radius: var(--radius-field, 0.5rem);
  overflow: hidden;
}

.cm-container :deep(.cm-editor) {
  font-size: 0.875rem;
}

.cm-container :deep(.cm-editor.cm-focused) {
  outline: none;
}

:not([data-theme='dark']) .cm-container :deep(.cm-editor) {
  background: var(--color-base-200);
}
</style>

