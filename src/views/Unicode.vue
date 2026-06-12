<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">
      Unicode 编码 / 解码
    </h1>

    <!-- Toolbar -->
    <div class="flex flex-wrap gap-2 mb-4">
      <button
        :class="['btn btn-sm', format === 'js' ? 'btn-primary' : '']"
        @click="setFormat('js')"
      >
        \uXXXX (JS/JSON)
      </button>
      <button
        :class="['btn btn-sm', format === 'html' ? 'btn-primary' : '']"
        @click="setFormat('html')"
      >
        &amp;#xXXXX; (HTML)
      </button>
    </div>
    <div class="flex flex-col gap-4 max-w-2xl">
      <div class="form-control">
        <label class="label"><span class="label-text font-semibold">明文</span></label>
        <div class="relative">
          <textarea
            v-model="input"
            class="textarea textarea-bordered w-full font-mono text-sm"
            placeholder="输入明文..."
            rows="6"
            @input="onInputChange"
          />
          <button
            v-if="input"
            class="btn btn-ghost btn-xs btn-square absolute bottom-2 right-2"
            :title="inputCopied ? '已复制！' : '复制'"
            @click="copyText(input, 'inputCopied')"
          >
            <CheckIcon
              v-if="inputCopied"
              class="w-4 h-4 text-success"
            />
            <ClipboardDocumentIcon
              v-else
              class="w-4 h-4"
            />
          </button>
        </div>
      </div>

      <div class="flex justify-center opacity-40">
        <ArrowsUpDownIcon class="w-6 h-6" />
      </div>

      <div class="form-control">
        <label class="label"><span class="label-text font-semibold">Unicode 编码</span></label>
        <div class="relative">
          <textarea
            v-model="output"
            class="textarea textarea-bordered w-full font-mono text-sm"
            placeholder="输入 Unicode 编码字符串..."
            rows="6"
            @input="onOutputChange"
          />
          <button
            v-if="output"
            class="btn btn-ghost btn-xs btn-square absolute bottom-2 right-2"
            :title="outputCopied ? '已复制！' : '复制'"
            @click="copyText(output, 'outputCopied')"
          >
            <CheckIcon
              v-if="outputCopied"
              class="w-4 h-4 text-success"
            />
            <ClipboardDocumentIcon
              v-else
              class="w-4 h-4"
            />
          </button>
        </div>
        <p
          v-if="error"
          class="text-error text-sm mt-1"
        >
          {{ error }}
        </p>
      </div>

      <div class="flex justify-end">
        <button
          class="btn btn-ghost btn-sm gap-1"
          @click="clear"
        >
          <TrashIcon class="w-4 h-4" />
          清空
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ArrowsUpDownIcon, ClipboardDocumentIcon, CheckIcon, TrashIcon } from '@heroicons/vue/24/outline'

const input = ref('你好，世界！😀')
const output = ref('')
const format = ref('js')
const error = ref('')
const inputCopied = ref(false)
const outputCopied = ref(false)

function encodeUnicode(str) {
  if (format.value === 'js') {
    let result = ''
    for (const ch of str) {
      const cp = ch.codePointAt(0)
      if (cp > 0xFFFF) {
        // Surrogate pair encoding
        const hi = Math.floor((cp - 0x10000) / 0x400) + 0xD800
        const lo = ((cp - 0x10000) % 0x400) + 0xDC00
        result += '\\u' + hi.toString(16).padStart(4, '0') + '\\u' + lo.toString(16).padStart(4, '0')
      } else {
        result += '\\u' + cp.toString(16).padStart(4, '0')
      }
    }
    return result
  } else {
    let result = ''
    for (const ch of str) {
      const cp = ch.codePointAt(0)
      result += '&#x' + cp.toString(16) + ';'
    }
    return result
  }
}

function decodeUnicode(str) {
  if (format.value === 'js') {
    // Decode \uXXXX sequences, handling surrogate pairs
    const surrogateRegex = /\\u([0-9a-fA-F]{4})\\u([0-9a-fA-F]{4})/g
    const singleRegex = /\\u([0-9a-fA-F]{4})/g

    let result = str
    // First pass: replace surrogate pairs
    result = result.replace(surrogateRegex, (_, hi, lo) => {
      const hiVal = parseInt(hi, 16)
      const loVal = parseInt(lo, 16)
      if (hiVal >= 0xD800 && hiVal <= 0xDBFF && loVal >= 0xDC00 && loVal <= 0xDFFF) {
        const cp = (hiVal - 0xD800) * 0x400 + (loVal - 0xDC00) + 0x10000
        return String.fromCodePoint(cp)
      }
      // Not a valid surrogate pair, return as-is
      return '\\u' + hi + '\\u' + lo
    })
    // Second pass: replace remaining single \uXXXX
    result = result.replace(singleRegex, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    return result
  } else {
    // Decode &#xXXXX; sequences
    return str.replace(/&#x([0-9a-fA-F]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
  }
}

function autoDetectDirection(str) {
  if (format.value === 'js') {
    return /\\u[0-9a-fA-F]{4}/.test(str)
  } else {
    return /&#x[0-9a-fA-F]+;/i.test(str)
  }
}

function onInputChange() {
  error.value = ''
  if (!input.value) { output.value = ''; return }
  try {
    output.value = encodeUnicode(input.value)
  } catch (e) {
    error.value = '编码失败：' + e.message
  }
}

function onOutputChange() {
  error.value = ''
  if (!output.value) { input.value = ''; return }
  try {
    input.value = decodeUnicode(output.value)
  } catch (e) {
    error.value = '解码失败：' + e.message
  }
}

function setFormat(f) {
  format.value = f
  // Re-convert based on current content with auto-detect
  if (output.value && autoDetectDirection(output.value)) {
    onOutputChange()
  } else if (input.value) {
    onInputChange()
  }
}

function clear() {
  input.value = ''
  output.value = ''
  error.value = ''
}

async function copyText(text, flag) {
  try {
    await navigator.clipboard.writeText(text)
    if (flag === 'inputCopied') {
      inputCopied.value = true
      setTimeout(() => inputCopied.value = false, 1500)
    } else {
      outputCopied.value = true
      setTimeout(() => outputCopied.value = false, 1500)
    }
  } catch { /* clipboard not available */ }
}

// Initialize output from default input
onInputChange()
</script>
