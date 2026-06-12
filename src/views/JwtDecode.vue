<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">
      JWT 解码
    </h1>

    <div class="alert alert-info text-sm py-2 mb-4 max-w-2xl">
      此工具仅解码 JWT，不验证签名
    </div>

    <div class="flex flex-col gap-4 max-w-2xl">
      <div class="form-control">
        <label class="label"><span class="label-text font-semibold">JWT Token</span></label>
        <div class="relative">
          <textarea
            v-model="token"
            class="textarea textarea-bordered w-full font-mono text-sm"
            placeholder="粘贴 JWT Token..."
            rows="6"
            @input="parse"
          />
        </div>
        <p
          v-if="error"
          class="text-error text-sm mt-1"
        >
          {{ error }}
        </p>
      </div>

      <div
        v-if="header !== null"
        class="card bg-base-200"
      >
        <div class="card-body p-4">
          <div class="flex items-center justify-between mb-2">
            <span class="font-semibold text-sm">Header</span>
            <button
              class="btn btn-ghost btn-xs btn-square"
              :title="headerCopied ? '已复制！' : '复制'"
              @click="copyText(header, 'headerCopied')"
            >
              <CheckIcon
                v-if="headerCopied"
                class="w-4 h-4 text-success"
              />
              <ClipboardDocumentIcon
                v-else
                class="w-4 h-4"
              />
            </button>
          </div>
          <pre class="font-mono text-sm whitespace-pre-wrap break-all">{{ header }}</pre>
        </div>
      </div>

      <div
        v-if="payload !== null"
        class="card bg-base-200"
      >
        <div class="card-body p-4">
          <div class="flex items-center justify-between mb-2">
            <span class="font-semibold text-sm">Payload</span>
            <button
              class="btn btn-ghost btn-xs btn-square"
              :title="payloadCopied ? '已复制！' : '复制'"
              @click="copyText(payload, 'payloadCopied')"
            >
              <CheckIcon
                v-if="payloadCopied"
                class="w-4 h-4 text-success"
              />
              <ClipboardDocumentIcon
                v-else
                class="w-4 h-4"
              />
            </button>
          </div>
          <pre class="font-mono text-sm whitespace-pre-wrap break-all">{{ payload }}</pre>
        </div>
      </div>

      <div
        v-if="signature !== null"
        class="card bg-base-200"
      >
        <div class="card-body p-4">
          <div class="flex items-center justify-between mb-2">
            <span class="font-semibold text-sm">Signature</span>
            <button
              class="btn btn-ghost btn-xs btn-square"
              :title="signatureCopied ? '已复制！' : '复制'"
              @click="copyText(signature, 'signatureCopied')"
            >
              <CheckIcon
                v-if="signatureCopied"
                class="w-4 h-4 text-success"
              />
              <ClipboardDocumentIcon
                v-else
                class="w-4 h-4"
              />
            </button>
          </div>
          <pre class="font-mono text-sm whitespace-pre-wrap break-all">{{ signature }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ClipboardDocumentIcon, CheckIcon } from '@heroicons/vue/24/outline'

const token = ref('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IuW8oOS4iSIsImlhdCI6MTczMjg2NDAwMCwiZXhwIjoxNzY0NDAwMDAwfQ.4DLecMqe5D8R8F64fF8LZ9Kq3VK7nJaPENPK9xXkx6Y')
const error = ref('')
const header = ref(null)
const payload = ref(null)
const signature = ref(null)
const headerCopied = ref(false)
const payloadCopied = ref(false)
const signatureCopied = ref(false)

function decodeBase64url(str) {
  let s = str.replace(/-/g, '+').replace(/_/g, '/')
  const pad = s.length % 4
  if (pad) {
    s += '='.repeat(4 - pad)
  }
  return atob(s)
}

function annotateTimeFields(obj) {
  const timeKeys = new Set(['exp', 'iat', 'nbf'])
  for (const key of Object.keys(obj)) {
    if (timeKeys.has(key) && typeof obj[key] === 'number' && obj[key] > 1000000000 && obj[key] < 9999999999) {
      const date = new Date(obj[key] * 1000)
      const y = date.getUTCFullYear()
      const m = String(date.getUTCMonth() + 1).padStart(2, '0')
      const d = String(date.getUTCDate()).padStart(2, '0')
      const h = String(date.getUTCHours()).padStart(2, '0')
      const min = String(date.getUTCMinutes()).padStart(2, '0')
      const sec = String(date.getUTCSeconds()).padStart(2, '0')
      obj[key] = `${obj[key]} // ${y}-${m}-${d} ${h}:${min}:${sec} UTC`
    }
  }
}

function parse() {
  error.value = ''
  header.value = null
  payload.value = null
  signature.value = null

  const trimmed = token.value.trim()
  if (!trimmed) return

  const parts = trimmed.split('.')
  if (parts.length !== 3) {
    error.value = '无效的 JWT：必须由 3 个以 . 分隔的部分组成'
    return
  }

  // Header
  try {
    const decoded = decodeBase64url(parts[0])
    try {
      const obj = JSON.parse(decoded)
      annotateTimeFields(obj)
      header.value = JSON.stringify(obj, null, 2)
    } catch {
      header.value = decoded
    }
  } catch (e) {
    header.value = '[解码失败：' + e.message + ']'
  }

  // Payload
  try {
    const decoded = decodeBase64url(parts[1])
    try {
      const obj = JSON.parse(decoded)
      annotateTimeFields(obj)
      payload.value = JSON.stringify(obj, null, 2)
    } catch {
      payload.value = decoded
    }
  } catch (e) {
    payload.value = '[解码失败：' + e.message + ']'
  }

  // Signature
  try {
    const raw = decodeBase64url(parts[2])
    const hex = Array.from(raw, c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('')
    signature.value = hex
  } catch (e) {
    signature.value = '[解码失败：' + e.message + ']'
  }
}

async function copyText(text, flag) {
  try {
    await navigator.clipboard.writeText(text)
    const ref = flag === 'headerCopied' ? headerCopied : flag === 'payloadCopied' ? payloadCopied : signatureCopied
    ref.value = true
    setTimeout(() => ref.value = false, 1500)
  } catch { /* clipboard not available */ }
}

parse()
</script>
