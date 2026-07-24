<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">
      RSA 加密 / 解密
    </h1>
    <div class="flex flex-col gap-6 max-w-2xl">
      <!-- Key Generation -->
      <div class="flex items-center gap-4 flex-wrap">
        <div class="flex items-center gap-3">
          <label
            v-for="size in RSA_KEY_SIZES"
            :key="size"
            class="flex items-center gap-1 cursor-pointer text-sm"
          >
            <input
              v-model="keySize"
              type="radio"
              name="keySize"
              :value="size"
              class="radio radio-xs radio-primary"
              @change="clearAll()"
            >
            {{ size }}
          </label>
        </div>
        <button
          class="btn btn-primary btn-sm gap-1"
          :disabled="generating"
          @click="generateKeys"
        >
          <Icon
            icon="lucide:sparkles"
            class="w-4 h-4"
          />
          {{ generating ? '生成中...' : '生成' }}
        </button>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">公钥</span></label>
          <div class="relative">
            <textarea
              v-model="publicKeyPem"
              class="textarea textarea-bordered w-full font-mono text-sm"
              placeholder="粘贴或生成公钥..."
              rows="5"
              @input="onKeyChange"
            />
            <button
              v-if="publicKeyPem"
              class="btn btn-ghost btn-xs btn-square absolute bottom-2 right-2"
              :title="pubCopied ? '已复制！' : '复制'"
              @click="copyPub"
            >
              <Icon
                v-if="pubCopied"
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
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">私钥</span></label>
          <div class="relative">
            <textarea
              v-model="privateKeyPem"
              class="textarea textarea-bordered w-full font-mono text-sm"
              placeholder="粘贴或生成私钥..."
              rows="5"
              @input="onKeyChange"
            />
            <button
              v-if="privateKeyPem"
              class="btn btn-ghost btn-xs btn-square absolute bottom-2 right-2"
              :title="priCopied ? '已复制！' : '复制'"
              @click="copyPri"
            >
              <Icon
                v-if="priCopied"
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

      <div class="divider" />

      <!-- 明文 ↔ Ciphertext -->
      <div class="form-control">
        <label class="label"><span class="label-text font-semibold">明文</span></label>
        <div class="relative">
          <textarea
            v-model="plaintext"
            class="textarea textarea-bordered w-full font-mono text-sm"
            placeholder="输入要加密的明文..."
            rows="6"
            @input="onPlaintextInput"
          />
          <div
            v-if="loading && lastEdit === 'ciphertext'"
            class="absolute inset-0 bg-base-100/60 flex items-center justify-center rounded-btn"
          >
            <span class="loading loading-spinner loading-md text-primary" />
          </div>
          <button
            v-if="plaintext && !(loading && lastEdit === 'ciphertext')"
            class="btn btn-ghost btn-xs btn-square absolute bottom-2 right-2"
            :title="ptCopied ? '已复制！' : '复制'"
            @click="copyPt"
          >
            <Icon
              v-if="ptCopied"
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

      <div class="flex justify-center opacity-40">
        <Icon
          icon="lucide:arrow-up-down"
          class="w-6 h-6"
        />
      </div>

      <div class="form-control">
        <label class="label"><span class="label-text font-semibold">密文 (Base64)</span></label>
        <div class="relative">
          <textarea
            v-model="ciphertext"
            class="textarea textarea-bordered w-full font-mono text-sm"
            placeholder="输入 Base64 密文以解密..."
            rows="6"
            @input="onCiphertextInput"
          />
          <div
            v-if="loading && lastEdit === 'plaintext'"
            class="absolute inset-0 bg-base-100/60 flex items-center justify-center rounded-btn"
          >
            <span class="loading loading-spinner loading-md text-primary" />
          </div>
          <button
            v-if="ciphertext && !(loading && lastEdit === 'plaintext')"
            class="btn btn-ghost btn-xs btn-square absolute bottom-2 right-2"
            :title="ctCopied ? '已复制！' : '复制'"
            @click="copyCt"
          >
            <Icon
              v-if="ctCopied"
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
        <p
          v-if="encError"
          class="text-error text-sm mt-1"
        >
          {{ encError }}
        </p>
      </div>

      <div class="flex justify-end">
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
    </div>
  </div>
</template>

<script setup>
import { Icon } from '@iconify/vue'
import { ref } from 'vue'
import { RSA_KEY_SIZES, generateKeyPair, encrypt, decrypt } from './rsa.js'

function copiedHelper(flag) {
  flag.value = true
  setTimeout(() => flag.value = false, 1500)
}

// --- KeyGen ---
const keySize = ref(2048)
const generating = ref(false)
const publicKeyPem = ref('')
const privateKeyPem = ref('')
const pubCopied = ref(false)
const priCopied = ref(false)

async function generateKeys() {
  generating.value = true
  try {
    const pair = await generateKeyPair(keySize.value)
    publicKeyPem.value = pair.publicKeyPem
    privateKeyPem.value = pair.privateKeyPem
    processEnc()
  } catch (e) {
    console.error('Key generation failed:', e)
  } finally {
    generating.value = false
  }
}

async function copyPub() {
  try { await navigator.clipboard.writeText(publicKeyPem.value); copiedHelper(pubCopied) } catch { /* clipboard not available */ }
}
async function copyPri() {
  try { await navigator.clipboard.writeText(privateKeyPem.value); copiedHelper(priCopied) } catch { /* clipboard not available */ }
}

// --- Encrypt / Decrypt ---
const plaintext = ref('')
const ciphertext = ref('')
const loading = ref(false)
const lastEdit = ref('plaintext')
const encError = ref('')
const ptCopied = ref(false)
const ctCopied = ref(false)

let debounce = null

function onPlaintextInput() {
  lastEdit.value = 'plaintext'
  processEnc()
}

function onCiphertextInput() {
  lastEdit.value = 'ciphertext'
  processEnc()
}

function onKeyChange() {
  processEnc()
}

function processEnc() {
  encError.value = ''
  clearTimeout(debounce)

  const direction = lastEdit.value
  const pt = plaintext.value
  const ct = ciphertext.value
  const pub = publicKeyPem.value.trim()
  const pri = privateKeyPem.value.trim()

  if (direction === 'plaintext') {
    if (!pt || !pub) {
      ciphertext.value = ''
      loading.value = false
      return
    }
  } else {
    if (!ct || !pri) {
      plaintext.value = ''
      loading.value = false
      return
    }
  }

  loading.value = true
  debounce = setTimeout(async () => {
    try {
      if (direction === 'plaintext') {
        ciphertext.value = await encrypt(pt, pub)
      } else {
        plaintext.value = await decrypt(ct.trim(), pri)
      }
    } catch (e) {
      encError.value = e.message || (direction === 'plaintext' ? '加密失败' : '解密失败')
      if (direction === 'plaintext') ciphertext.value = ''
      else plaintext.value = ''
    } finally {
      loading.value = false
    }
  }, 300)
}

async function copyPt() {
  try { await navigator.clipboard.writeText(plaintext.value); copiedHelper(ptCopied) } catch { /* clipboard not available */ }
}
async function copyCt() {
  try { await navigator.clipboard.writeText(ciphertext.value); copiedHelper(ctCopied) } catch { /* clipboard not available */ }
}

function clearAll() {
  publicKeyPem.value = ''
  privateKeyPem.value = ''
  plaintext.value = ''
  ciphertext.value = ''
  encError.value = ''
}

function clear() {
  clearAll()
}
</script>
