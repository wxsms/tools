<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">
      SVG 预览
    </h1>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Left: code input -->
      <div class="flex flex-col gap-3">
        <div class="flex flex-wrap items-center gap-2">
          <button
            class="btn btn-sm gap-1"
            @click="formatSvg"
          >
            <Icon
              icon="lucide:sparkles"
              class="w-4 h-4"
            />
            美化
          </button>
          <button
            class="btn btn-sm gap-1"
            @click="minifySvg"
          >
            <Icon
              icon="lucide:minimize-2"
              class="w-4 h-4"
            />
            压缩
          </button>
          <button
            class="btn btn-sm gap-1"
            @click="copyRaw"
          >
            <Icon
              icon="lucide:clipboard"
              class="w-4 h-4"
            />
            {{ rawCopied ? '已复制' : '复制' }}
          </button>
          <button
            class="btn btn-sm gap-1"
            @click="downloadSvg"
          >
            <Icon
              icon="lucide:download"
              class="w-4 h-4"
            />
            下载
          </button>
          <button
            class="btn btn-ghost btn-sm gap-1"
            @click="clear"
          >
            <Icon
              icon="lucide:trash-2"
              class="w-4 h-4"
            />
            清空
          </button>
        </div>

        <textarea
          v-model="source"
          class="textarea textarea-bordered w-full font-mono text-sm leading-relaxed"
          placeholder="粘贴 SVG 代码..."
          rows="20"
          spellcheck="false"
        />

        <div class="flex flex-wrap items-center gap-3 text-sm">
          <span
            v-if="parseError"
            class="text-error"
          >{{ parseError }}</span>
          <span
            v-else
            class="opacity-60"
          >{{ source.length }} 字符{{ compressedSize != null ? ` · 压缩后 ${compressedSize} 字符` : '' }}</span>
        </div>

        <!-- Color override -->
        <div
          v-if="!parseError && parsed"
          class="collapse collapse-arrow bg-base-200"
        >
          <input
            v-model="colorOverrideOpen"
            type="checkbox"
          >
          <div class="collapse-title text-sm font-semibold py-2 min-h-0">
            颜色覆盖
          </div>
          <div class="collapse-content">
            <div class="flex flex-col gap-2 pt-2">
              <label class="label cursor-pointer justify-start gap-2 py-0">
                <input
                  v-model="overrideEnabled"
                  type="checkbox"
                  class="checkbox checkbox-sm checkbox-primary"
                >
                <span class="label-text">启用</span>
              </label>
              <div class="flex items-center gap-2">
                <input
                  v-model="overrideColor"
                  type="color"
                  class="input input-bordered input-sm w-10 h-8 p-0.5 cursor-pointer"
                  :disabled="!overrideEnabled"
                >
                <input
                  v-model="overrideColor"
                  type="text"
                  class="input input-bordered input-sm w-full font-mono"
                  :disabled="!overrideEnabled"
                >
              </div>
              <p class="text-xs opacity-60">
                给 fill/stroke 没有显式 none 的元素强制上色,便于在白底/黑底看清楚轮廓
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: preview -->
      <div class="flex flex-col gap-3">
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-sm font-semibold opacity-70 mr-1">背景:</span>
          <button
            v-for="bg in bgOptions"
            :key="bg.value"
            class="btn btn-sm"
            :class="background === bg.value ? 'btn-primary' : 'btn-outline'"
            @click="background = bg.value"
          >
            {{ bg.label }}
          </button>
        </div>

        <div
          class="rounded-lg border border-base-300 overflow-auto"
          :style="previewStyle"
        >
          <div
            v-if="parseError"
            class="flex items-center justify-center h-64 text-error text-sm p-4"
          >
            无法解析 SVG
          </div>
          <div
            v-else-if="!source.trim()"
            class="flex items-center justify-center h-64 text-sm opacity-40 p-4"
          >
            在左侧粘贴 SVG 代码即可预览
          </div>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div
            v-else
            class="min-h-64 flex items-center justify-center p-4"
            v-html="renderedSvg"
          />
        </div>

        <div
          v-if="parsed && !parseError"
          class="flex flex-wrap gap-x-6 gap-y-1 text-sm"
        >
          <span><span class="opacity-60">宽:</span> {{ dims.width ?? '?' }}</span>
          <span><span class="opacity-60">高:</span> {{ dims.height ?? '?' }}</span>
          <span><span class="opacity-60">viewBox:</span> {{ dims.viewBox ?? '无' }}</span>
        </div>

        <!-- data URI -->
        <div
          v-if="parsed && !parseError"
          class="form-control"
        >
          <label class="label"><span class="label-text font-semibold">Data URI</span></label>
          <div class="relative">
            <textarea
              :value="dataUri"
              class="textarea textarea-bordered w-full font-mono text-xs"
              rows="3"
              readonly
            />
            <button
              class="btn btn-ghost btn-xs btn-square absolute bottom-2 right-2"
              :title="uriCopied ? '已复制!' : '复制'"
              @click="copyDataUri"
            >
              <Icon
                v-if="uriCopied"
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
          <p class="text-xs opacity-60 mt-1">
            URL 编码版本,可直接做 <code>background-image</code> / <code>&lt;img src&gt;</code>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Icon } from '@iconify/vue'
import { ref, computed, watch } from 'vue'
import { optimize } from 'svgo/browser'
const DEFAULT = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="10"/>
  <path d="M8 12h8M12 8v8"/>
</svg>`

const source = ref(DEFAULT)
const parseError = ref('')
const overrideEnabled = ref(false)
const overrideColor = ref('#ff6b35')
const colorOverrideOpen = ref(false)
const background = ref('checker')
const rawCopied = ref(false)
const uriCopied = ref(false)
const compressedSize = ref(null)

const bgOptions = [
  { value: 'checker', label: '棋盘格' },
  { value: 'white', label: '白' },
  { value: 'black', label: '黑' },
]

const previewStyle = computed(() => {
  if (background.value === 'white') return { background: '#ffffff' }
  if (background.value === 'black') return { background: '#000000' }
  return {
    backgroundImage:
      'linear-gradient(45deg, #d4d4d4 25%, transparent 25%), linear-gradient(-45deg, #d4d4d4 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #d4d4d4 75%), linear-gradient(-45deg, transparent 75%, #d4d4d4 75%)',
    backgroundSize: '16px 16px',
    backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
    backgroundColor: '#ffffff',
  }
})

// Parse SVG into a DOM element for inspection / safe-ish rendering.
// We render via v-html using a parsed + re-serialized copy so the rendered
// markup is bounded to what's actually in <svg>…</svg>.
const parsed = ref(null)

function tryParse() {
  parseError.value = ''
  const text = source.value.trim()
  if (!text) {
    parsed.value = null
    return
  }
  try {
    const doc = new DOMParser().parseFromString(text, 'image/svg+xml')
    const errEl = doc.querySelector('parsererror')
    if (errEl) {
      parseError.value = 'SVG 解析失败'
      parsed.value = null
      return
    }
    const svg = doc.documentElement
    if (!svg || svg.tagName.toLowerCase() !== 'svg') {
      parseError.value = '未找到 <svg> 根元素'
      parsed.value = null
      return
    }
    parsed.value = svg
  } catch {
    parseError.value = 'SVG 解析失败'
    parsed.value = null
  }
}

watch(source, tryParse, { immediate: true })

const dims = computed(() => {
  const svg = parsed.value
  if (!svg) return {}
  return {
    width: svg.getAttribute('width'),
    height: svg.getAttribute('height'),
    viewBox: svg.getAttribute('viewBox'),
  }
})

function applyColorOverride(svg, color) {
  // 统一上色:current-color 链 + 所有显式 fill/stroke 非 none 的元素
  svg.style.color = color
  svg.querySelectorAll('[fill]').forEach(el => {
    if (el.getAttribute('fill') !== 'none') el.setAttribute('fill', color)
  })
  svg.querySelectorAll('[stroke]').forEach(el => {
    if (el.getAttribute('stroke') !== 'none') el.setAttribute('stroke', color)
  })
}

const renderedSvg = computed(() => {
  const svg = parsed.value
  // touch reactive refs so this recomputes when override settings change
  const enabled = overrideEnabled.value
  const color = overrideColor.value
  if (!svg) return ''
  const clone = svg.cloneNode(true)
  if (enabled) applyColorOverride(clone, color)
  return clone.outerHTML
})

const dataUri = computed(() => {
  const svg = parsed.value
  const enabled = overrideEnabled.value
  const color = overrideColor.value
  if (!svg) return ''
  const clone = svg.cloneNode(true)
  if (enabled) applyColorOverride(clone, color)
  const html = clone.outerHTML
  return 'data:image/svg+xml,' + encodeURIComponent(html)
})

async function runSvgo(mode) {
  if (!source.value.trim()) return
  try {
    const result = optimize(source.value, {
      multipass: true,
      js2svg: mode === 'pretty' ? { indent: 2, pretty: true } : {},
      floatPrecision: 3,
    })
    if (result.data) {
      source.value = result.data
      compressedSize.value = result.data.length
    }
  } catch (e) {
    parseError.value = 'svgo 失败:' + (e.message || String(e))
  }
}

function formatSvg() { runSvgo('pretty') }
function minifySvg() { runSvgo('minify') }

function clear() {
  source.value = ''
  parseError.value = ''
  compressedSize.value = null
}

async function copyText(text, flag) {
  try {
    await navigator.clipboard.writeText(text)
    if (flag === 'raw') {
      rawCopied.value = true
      setTimeout(() => rawCopied.value = false, 1500)
    } else {
      uriCopied.value = true
      setTimeout(() => uriCopied.value = false, 1500)
    }
  } catch { /* clipboard unavailable */ }
}

function copyRaw() { copyText(source.value, 'raw') }
function copyDataUri() { copyText(dataUri.value, 'uri') }

function downloadSvg() {
  if (!parsed.value) return
  const blob = new Blob([source.value], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'image.svg'
  a.click()
  URL.revokeObjectURL(url)
}
</script>
