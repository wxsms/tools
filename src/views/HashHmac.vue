<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">
      哈希 / 散列
    </h1>
    <div class="flex flex-col gap-4 max-w-2xl">
      <!-- 算法 -->
      <div class="form-control">
        <label class="label"><span class="label-text font-semibold">算法</span></label>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="algo in HASH_ALGORITHMS"
            :key="algo"
            class="btn btn-sm"
            :class="hashAlgo === algo ? 'btn-primary' : 'btn-outline'"
            @click="hashAlgo = algo; onHashInputChange()"
          >
            {{ algo }}
          </button>
        </div>
      </div>

      <!-- 模式 -->
      <div class="form-control">
        <label class="label"><span class="label-text font-semibold">模式</span></label>
        <div class="flex gap-2">
          <button
            class="btn btn-sm"
            :class="hashMode === 'hash' ? 'btn-primary' : 'btn-outline'"
            @click="hashMode = 'hash'; onHashInputChange()"
          >
            哈希
          </button>
          <button
            class="btn btn-sm"
            :class="hashMode === 'hmac' ? 'btn-primary' : 'btn-outline'"
            @click="hashMode = 'hmac'; onHashInputChange()"
          >
            HMAC
          </button>
        </div>
      </div>

      <!-- HMAC 密钥 -->
      <div
        v-if="hashMode === 'hmac'"
        class="form-control"
      >
        <label class="label"><span class="label-text font-semibold">HMAC 密钥</span></label>
        <input
          v-model="hmacKey"
          type="text"
          class="input input-bordered w-full font-mono text-sm"
          placeholder="输入 HMAC 密钥..."
          @input="onHashInputChange"
        >
      </div>

      <!-- HMAC 密钥生成 -->
      <div
        v-if="hashMode === 'hmac'"
        class="flex items-center gap-4 flex-wrap"
      >
        <label
          v-for="size in KEYGEN_SIZES"
          :key="size"
          class="flex items-center gap-1 cursor-pointer text-sm"
        >
          <input
            v-model="keygenSize"
            type="radio"
            name="keygenSize"
            :value="size"
            class="radio radio-xs radio-primary"
            @change="generateHmacKey"
          >
          {{ size }}
        </label>
        <button
          class="btn btn-primary btn-sm gap-1"
          @click="generateHmacKey"
        >
          <SparklesIcon class="w-4 h-4" />
          生成
        </button>
      </div>

      <!-- 输入 -->
      <div class="form-control">
        <label class="label"><span class="label-text font-semibold">输入</span></label>
        <div class="relative">
          <textarea
            v-model="hashInput"
            class="textarea textarea-bordered w-full font-mono text-sm"
            placeholder="输入要哈希的文本..."
            rows="6"
            @input="onHashInputChange"
          />
          <button
            v-if="hashInput"
            class="btn btn-ghost btn-xs btn-square absolute bottom-2 right-2"
            :title="hashInputCopied ? '已复制！' : '复制'"
            @click="copyHashInput"
          >
            <CheckIcon
              v-if="hashInputCopied"
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
        <ArrowDownIcon class="w-6 h-6" />
      </div>

      <!-- Output -->
      <div class="form-control">
        <label class="label"><span class="label-text font-semibold">{{ hashMode === 'hmac' ? 'HMAC' : '哈希' }}</span></label>
        <div class="relative">
          <input
            v-model="hashOutput"
            class="input input-bordered w-full font-mono text-sm"
            readonly
          >
          <button
            v-if="hashOutput"
            class="btn btn-ghost btn-xs btn-square absolute right-2 top-1/2 -translate-y-1/2"
            :title="hashOutputCopied ? '已复制！' : '复制'"
            @click="copyHashOutput"
          >
            <CheckIcon
              v-if="hashOutputCopied"
              class="w-4 h-4 text-success"
            />
            <ClipboardDocumentIcon
              v-else
              class="w-4 h-4"
            />
          </button>
        </div>
      </div>

      <div class="flex justify-end">
        <button
          class="btn btn-ghost btn-sm gap-1"
          @click="clearHash"
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
import {
  ArrowDownIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  SparklesIcon,
  TrashIcon,
} from '@heroicons/vue/24/outline'
import {
  computeHash,
  computeHmac,
  HASH_ALGORITHMS,
  bytesToHex,
  randomBytes,
} from '../utils/crypto.js'

const hashAlgo = ref('SHA-256')
const hashMode = ref('hash')
const hmacKey = ref('')
const hashInput = ref('')
const hashOutput = ref('')
const hashInputCopied = ref(false)
const hashOutputCopied = ref(false)

const KEYGEN_SIZES = [128, 192, 256, 512]
const keygenSize = ref(256)

function onHashInputChange() {
  if (!hashInput.value) {
    hashOutput.value = ''
    return
  }
  try {
    if (hashMode.value === 'hmac') {
      if (!hmacKey.value) {
        hashOutput.value = ''
        return
      }
      hashOutput.value = computeHmac(hashAlgo.value, hmacKey.value, hashInput.value)
    } else {
      hashOutput.value = computeHash(hashAlgo.value, hashInput.value)
    }
  } catch {
    hashOutput.value = ''
  }
}

function clearHash() {
  hashInput.value = ''
  hashOutput.value = ''
  hmacKey.value = ''
}

function generateHmacKey() {
  hmacKey.value = bytesToHex(randomBytes(keygenSize.value / 8))
  onHashInputChange()
}

generateHmacKey()

function copiedHelper(flag) {
  flag.value = true
  setTimeout(() => flag.value = false, 1500)
}

async function copyHashInput() {
  try { await navigator.clipboard.writeText(hashInput.value); copiedHelper(hashInputCopied) } catch { /* clipboard not available */ }
}
async function copyHashOutput() {
  try { await navigator.clipboard.writeText(hashOutput.value); copiedHelper(hashOutputCopied) } catch { /* clipboard not available */ }
}
</script>
