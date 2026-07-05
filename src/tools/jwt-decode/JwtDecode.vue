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
import { decodeJwt } from './jwt-decode.js'

const token = ref('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IuW8oOS4iSIsImlhdCI6MTczMjg2NDAwMCwiZXhwIjoxNzY0NDAwMDAwfQ.4DLecMqe5D8R8F64fF8LZ9Kq3VK7nJaPENPK9xXkx6Y')
const error = ref('')
const header = ref(null)
const payload = ref(null)
const signature = ref(null)
const headerCopied = ref(false)
const payloadCopied = ref(false)
const signatureCopied = ref(false)

function parse() {
  const result = decodeJwt(token.value)
  header.value = result.header
  payload.value = result.payload
  signature.value = result.signature
  error.value = result.error
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
