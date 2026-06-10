<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">
      Crypto
    </h1>

    <!-- Tabs -->
    <div
      role="tablist"
      class="tabs tabs-boxed mb-6 w-fit"
    >
      <button
        role="tab"
        class="tab"
        :class="{ 'tab-active': activeTab === 'encrypt' }"
        @click="activeTab = 'encrypt'"
      >
        Encrypt / Decrypt
      </button>
      <button
        role="tab"
        class="tab"
        :class="{ 'tab-active': activeTab === 'hash' }"
        @click="activeTab = 'hash'"
      >
        Hash / HMAC
      </button>
    </div>

    <!-- Encrypt / Decrypt Tab -->
    <div
      v-if="activeTab === 'encrypt'"
      class="flex flex-col gap-4 max-w-2xl"
    >
      <!-- Algorithm -->
      <div class="form-control">
        <label class="label"><span class="label-text font-semibold">Algorithm</span></label>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="algo in AES_ALGORITHMS"
            :key="algo"
            class="btn btn-sm"
            :class="encAlgo === algo ? 'btn-primary' : 'btn-outline'"
            @click="encAlgo = algo; regenerateIv()"
          >
            {{ algo }}
          </button>
        </div>
      </div>

      <!-- Password -->
      <div class="form-control">
        <label class="label"><span class="label-text font-semibold">Password</span></label>
        <input
          v-model="password"
          type="text"
          class="input input-bordered w-full font-mono text-sm"
          placeholder="Enter password..."
          @input="processEnc()"
        >
      </div>

      <!-- Advanced Options (collapsible) -->
      <div class="collapse collapse-arrow bg-base-200">
        <input
          v-model="advancedOpen"
          type="checkbox"
        >
        <div class="collapse-title text-sm font-semibold py-2 min-h-0">
          Advanced Options
        </div>
        <div class="collapse-content">
          <div class="flex flex-col gap-4 pt-2">
            <!-- Key Mode -->
            <div class="form-control">
              <label class="label"><span class="label-text font-semibold">Key Mode</span></label>
              <div class="flex gap-2">
                <button
                  class="btn btn-sm"
                  :class="keyMode === 'passphrase' ? 'btn-primary' : 'btn-outline'"
                  @click="keyMode = 'passphrase'; processEnc()"
                >
                  Passphrase
                </button>
                <button
                  class="btn btn-sm"
                  :class="keyMode === 'hex' ? 'btn-primary' : 'btn-outline'"
                  @click="keyMode = 'hex'; processEnc()"
                >
                  Hex Key
                </button>
              </div>
            </div>

            <!-- Hex Key (advanced only) -->
            <div
              v-if="keyMode === 'hex'"
              class="form-control"
            >
              <label class="label">
                <span class="label-text font-semibold">Hex Key</span>
                <button
                  class="btn btn-ghost btn-xs"
                  @click="regenerateHexKey"
                >
                  Regenerate
                </button>
              </label>
              <input
                v-model="hexKey"
                class="input input-bordered w-full font-mono text-sm"
                placeholder="32/48/64 hex chars for AES-128/192/256"
                @input="processEnc()"
              >
              <p
                v-if="hexKeyError"
                class="text-error text-sm mt-1"
              >
                {{ hexKeyError }}
              </p>
            </div>

            <!-- Salt (passphrase mode, advanced only) -->
            <div
              v-if="keyMode === 'passphrase'"
              class="form-control"
            >
              <label class="label">
                <span class="label-text font-semibold">Salt</span>
                <button
                  class="btn btn-ghost btn-xs"
                  @click="regenerateSalt"
                >
                  Regenerate
                </button>
              </label>
              <div class="relative">
                <input
                  v-model="saltHex"
                  class="input input-bordered w-full font-mono text-sm"
                  placeholder="Auto-generated salt"
                  @input="processEnc()"
                >
                <button
                  v-if="saltHex"
                  class="btn btn-ghost btn-xs btn-square absolute right-2 top-1/2 -translate-y-1/2"
                  :title="saltCopied ? 'Copied!' : 'Copy'"
                  @click="copySalt"
                >
                  <CheckIcon
                    v-if="saltCopied"
                    class="w-4 h-4 text-success"
                  />
                  <ClipboardDocumentIcon
                    v-else
                    class="w-4 h-4"
                  />
                </button>
              </div>
            </div>

            <!-- Key Size (passphrase mode, advanced only) -->
            <div
              v-if="keyMode === 'passphrase'"
              class="form-control"
            >
              <label class="label"><span class="label-text font-semibold">Key Size</span></label>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="size in AES_KEY_SIZES"
                  :key="size"
                  class="btn btn-sm"
                  :class="keySize === size ? 'btn-primary' : 'btn-outline'"
                  @click="keySize = size; processEnc()"
                >
                  {{ size }}-bit
                </button>
              </div>
            </div>

            <!-- Iterations (passphrase mode, advanced only) -->
            <div
              v-if="keyMode === 'passphrase'"
              class="form-control"
            >
              <label class="label"><span class="label-text font-semibold">PBKDF2 Iterations</span></label>
              <input
                v-model.number="iterations"
                type="number"
                class="input input-bordered w-full font-mono text-sm"
                min="1"
                step="10000"
                @input="processEnc()"
              >
              <p class="text-xs text-base-content/50 mt-1">
                Default: {{ DEFAULT_ITERATIONS.toLocaleString() }}. Higher = more secure but slower.
              </p>
            </div>

            <!-- IV / Nonce (advanced only) -->
            <div class="form-control">
              <label class="label">
                <span class="label-text font-semibold">{{ encAlgo === 'AES-GCM' ? 'Nonce' : 'IV' }}</span>
                <button
                  class="btn btn-ghost btn-xs"
                  @click="regenerateIv"
                >
                  Regenerate
                </button>
              </label>
              <div class="relative">
                <input
                  v-model="ivHex"
                  class="input input-bordered w-full font-mono text-sm"
                  :placeholder="encAlgo === 'AES-GCM' ? '24 hex chars (12 bytes)' : '32 hex chars (16 bytes)'"
                  @input="processEnc()"
                >
                <button
                  v-if="ivHex"
                  class="btn btn-ghost btn-xs btn-square absolute right-2 top-1/2 -translate-y-1/2"
                  :title="ivCopied ? 'Copied!' : 'Copy'"
                  @click="copyIv"
                >
                  <CheckIcon
                    v-if="ivCopied"
                    class="w-4 h-4 text-success"
                  />
                  <ClipboardDocumentIcon
                    v-else
                    class="w-4 h-4"
                  />
                </button>
              </div>
              <p
                v-if="ivError"
                class="text-error text-sm mt-1"
              >
                {{ ivError }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Plaintext (input) -->
      <div class="form-control">
        <label class="label"><span class="label-text font-semibold">Plaintext</span></label>
        <div class="relative">
          <textarea
            v-model="plaintext"
            class="textarea textarea-bordered w-full font-mono text-sm"
            placeholder="Enter plaintext..."
            rows="6"
            @input="onPlaintextInput"
          />
          <div
            v-if="encLoading && lastEdit === 'ciphertext'"
            class="absolute inset-0 bg-base-100/60 flex items-center justify-center rounded-btn"
          >
            <span class="loading loading-spinner loading-md text-primary" />
          </div>
          <button
            v-if="plaintext && !(encLoading && lastEdit === 'ciphertext')"
            class="btn btn-ghost btn-xs btn-square absolute bottom-2 right-2"
            :title="plaintextCopied ? 'Copied!' : 'Copy'"
            @click="copyPlaintext"
          >
            <CheckIcon
              v-if="plaintextCopied"
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

      <!-- Ciphertext (output / bidirectional) -->
      <div class="form-control">
        <label class="label"><span class="label-text font-semibold">Ciphertext (hex)</span></label>
        <div class="relative">
          <textarea
            v-model="ciphertext"
            class="textarea textarea-bordered w-full font-mono text-sm"
            placeholder="Enter ciphertext to decrypt..."
            rows="6"
            @input="onCiphertextInput"
          />
          <div
            v-if="encLoading && lastEdit === 'plaintext'"
            class="absolute inset-0 bg-base-100/60 flex items-center justify-center rounded-btn"
          >
            <span class="loading loading-spinner loading-md text-primary" />
          </div>
          <button
            v-if="ciphertext && !(encLoading && lastEdit === 'plaintext')"
            class="btn btn-ghost btn-xs btn-square absolute bottom-2 right-2"
            :title="ciphertextCopied ? 'Copied!' : 'Copy'"
            @click="copyCiphertext"
          >
            <CheckIcon
              v-if="ciphertextCopied"
              class="w-4 h-4 text-success"
            />
            <ClipboardDocumentIcon
              v-else
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
          @click="clearEnc"
        >
          <TrashIcon class="w-4 h-4" />
          Clear
        </button>
      </div>
    </div>

    <!-- Hash / HMAC Tab -->
    <div
      v-if="activeTab === 'hash'"
      class="flex flex-col gap-4 max-w-2xl"
    >
      <!-- Algorithm -->
      <div class="form-control">
        <label class="label"><span class="label-text font-semibold">Algorithm</span></label>
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

      <!-- Mode -->
      <div class="form-control">
        <label class="label"><span class="label-text font-semibold">Mode</span></label>
        <div class="flex gap-2">
          <button
            class="btn btn-sm"
            :class="hashMode === 'hash' ? 'btn-primary' : 'btn-outline'"
            @click="hashMode = 'hash'; onHashInputChange()"
          >
            Hash
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

      <!-- HMAC Key -->
      <div
        v-if="hashMode === 'hmac'"
        class="form-control"
      >
        <label class="label"><span class="label-text font-semibold">HMAC Key</span></label>
        <input
          v-model="hmacKey"
          type="text"
          class="input input-bordered w-full font-mono text-sm"
          placeholder="Enter HMAC key..."
          @input="onHashInputChange"
        >
      </div>

      <!-- Input -->
      <div class="form-control">
        <label class="label"><span class="label-text font-semibold">Input</span></label>
        <div class="relative">
          <textarea
            v-model="hashInput"
            class="textarea textarea-bordered w-full font-mono text-sm"
            placeholder="Enter text to hash..."
            rows="6"
            @input="onHashInputChange"
          />
          <button
            v-if="hashInput"
            class="btn btn-ghost btn-xs btn-square absolute bottom-2 right-2"
            :title="hashInputCopied ? 'Copied!' : 'Copy'"
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
        <label class="label"><span class="label-text font-semibold">{{ hashMode === 'hmac' ? 'HMAC' : 'Hash' }}</span></label>
        <div class="relative">
          <input
            v-model="hashOutput"
            class="input input-bordered w-full font-mono text-sm"
            readonly
          >
          <button
            v-if="hashOutput"
            class="btn btn-ghost btn-xs btn-square absolute right-2 top-1/2 -translate-y-1/2"
            :title="hashOutputCopied ? 'Copied!' : 'Copy'"
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
          Clear
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import {
  ArrowsUpDownIcon,
  ArrowDownIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  TrashIcon,
} from '@heroicons/vue/24/outline'
import {
  computeHash,
  computeHmac,
  aesEncrypt,
  aesDecrypt,
  aesEncryptRaw,
  aesDecryptRaw,
  deriveKey,
  generateIv,
  generateSalt,
  bytesToHex,
  hexToBytes,
  randomBytes,
  HASH_ALGORITHMS,
  AES_ALGORITHMS,
  AES_KEY_SIZES,
  DEFAULT_ITERATIONS,
} from '../utils/crypto.js'

// --- Shared ---
const activeTab = ref('encrypt')

function copiedHelper(flag) {
  flag.value = true
  setTimeout(() => flag.value = false, 1500)
}

// --- Encrypt / Decrypt ---
const encAlgo = ref('AES-CBC')
const password = ref('')
const plaintext = ref('')
const ciphertext = ref('')
const encError = ref('')
const encLoading = ref(false)
const plaintextCopied = ref(false)
const ciphertextCopied = ref(false)

// Advanced options
const advancedOpen = ref(false)
const keyMode = ref('passphrase')
const hexKey = ref(bytesToHex(randomBytes(32)))
const hexKeyError = ref('')
const saltHex = ref(bytesToHex(generateSalt()))
const saltCopied = ref(false)
const keySize = ref(256)
const iterations = ref(DEFAULT_ITERATIONS)
const ivHex = ref(bytesToHex(generateIv('AES-CBC')))
const ivCopied = ref(false)
const ivError = ref('')

let encDebounce = null
// Track which direction the user is editing (reactive for template)
const lastEdit = ref('plaintext')

function regenerateIv() {
  ivHex.value = bytesToHex(generateIv(encAlgo.value))
  ivError.value = ''
  processEnc()
}

function regenerateSalt() {
  saltHex.value = bytesToHex(generateSalt())
  processEnc()
}

function regenerateHexKey() {
  hexKey.value = bytesToHex(randomBytes(32))
  hexKeyError.value = ''
  processEnc()
}

function onPlaintextInput() {
  lastEdit.value = 'plaintext'
  processEnc()
}

function onCiphertextInput() {
  lastEdit.value = 'ciphertext'
  processEnc()
}

async function processEnc() {
  encError.value = ''
  clearTimeout(encDebounce)

  // Snapshot values
  const algo = encAlgo.value
  const pwd = password.value
  const pt = plaintext.value
  const ct = ciphertext.value
  const isAdvanced = advancedOpen.value
  const kMode = keyMode.value
  const iter = iterations.value || DEFAULT_ITERATIONS
  const direction = lastEdit.value

  if (!pwd && kMode === 'passphrase') {
    if (direction === 'plaintext') ciphertext.value = ''
    else plaintext.value = ''
    encLoading.value = false
    return
  }

  if (isAdvanced && kMode === 'hex' && !hexKey.value) {
    if (direction === 'plaintext') ciphertext.value = ''
    else plaintext.value = ''
    encLoading.value = false
    return
  }

  const inputEmpty = direction === 'plaintext' ? !pt : !ct
  if (inputEmpty) {
    if (direction === 'plaintext') ciphertext.value = ''
    else plaintext.value = ''
    encLoading.value = false
    return
  }

  // Show loading immediately
  encLoading.value = true

  encDebounce = setTimeout(async () => {
    try {
      if (isAdvanced) {
        await processAdvanced(algo, pwd, kMode, direction, pt, ct, iter)
      } else {
        await processSimple(algo, pwd, direction, pt, ct, iter)
      }
    } catch (e) {
      encError.value = e.message
      if (direction === 'plaintext') ciphertext.value = ''
      else plaintext.value = ''
    } finally {
      encLoading.value = false
    }
  }, 300)
}

async function processSimple(algo, pwd, direction, pt, ct, iter) {
  if (direction === 'plaintext') {
    ciphertext.value = await aesEncrypt(algo, pwd, pt, iter)
  } else {
    plaintext.value = await aesDecrypt(algo, pwd, ct.trim(), iter)
  }
}

async function processAdvanced(algo, pwd, kMode, direction, pt, ct, iter) {
  if (kMode === 'hex') {
    hexKeyError.value = ''
    const hex = hexKey.value.trim()
    if (!/^[0-9a-fA-F]+$/.test(hex)) {
      hexKeyError.value = 'Invalid hex characters'
      return
    }
    if (hex.length !== 32 && hex.length !== 48 && hex.length !== 64) {
      hexKeyError.value = 'Key must be 32, 48, or 64 hex chars (128/192/256-bit)'
      return
    }
    const key = hexToBytes(hex)
    ivError.value = ''
    const expectedIvLen = algo === 'AES-GCM' ? 24 : 32
    if (!ivHex.value || !/^[0-9a-fA-F]+$/.test(ivHex.value) || ivHex.value.length !== expectedIvLen) {
      ivError.value = `${algo === 'AES-GCM' ? 'Nonce' : 'IV'} must be ${expectedIvLen} hex chars`
      return
    }
    const iv = hexToBytes(ivHex.value)
    if (direction === 'plaintext') {
      ciphertext.value = aesEncryptRaw(algo, key, iv, pt)
    } else {
      plaintext.value = aesDecryptRaw(algo, key, iv, ct.trim())
    }
  } else {
    // Passphrase + explicit salt/IV
    if (!pwd) return
    ivError.value = ''
    const expectedIvLen = algo === 'AES-GCM' ? 24 : 32
    if (!ivHex.value || !/^[0-9a-fA-F]+$/.test(ivHex.value) || ivHex.value.length !== expectedIvLen) {
      ivError.value = `${algo === 'AES-GCM' ? 'Nonce' : 'IV'} must be ${expectedIvLen} hex chars`
      return
    }
    const salt = hexToBytes(saltHex.value)
    const iv = hexToBytes(ivHex.value)
    const key = await deriveKey(pwd, salt, keySize.value / 8, iter)
    if (direction === 'plaintext') {
      ciphertext.value = aesEncryptRaw(algo, key, iv, pt)
    } else {
      plaintext.value = aesDecryptRaw(algo, key, iv, ct.trim())
    }
  }
}

function clearEnc() {
  password.value = ''
  plaintext.value = ''
  ciphertext.value = ''
  encError.value = ''
  hexKey.value = bytesToHex(randomBytes(32))
  hexKeyError.value = ''
  ivError.value = ''
  iterations.value = DEFAULT_ITERATIONS
  regenerateIv()
  regenerateSalt()
}

async function copyPlaintext() {
  try { await navigator.clipboard.writeText(plaintext.value); copiedHelper(plaintextCopied) } catch { /* clipboard not available */ }
}
async function copyCiphertext() {
  try { await navigator.clipboard.writeText(ciphertext.value); copiedHelper(ciphertextCopied) } catch { /* clipboard not available */ }
}
async function copySalt() {
  try { await navigator.clipboard.writeText(saltHex.value); copiedHelper(saltCopied) } catch { /* clipboard not available */ }
}
async function copyIv() {
  try { await navigator.clipboard.writeText(ivHex.value); copiedHelper(ivCopied) } catch { /* clipboard not available */ }
}

// --- Hash / HMAC ---
const hashAlgo = ref('SHA-256')
const hashMode = ref('hash')
const hmacKey = ref('')
const hashInput = ref('')
const hashOutput = ref('')
const hashInputCopied = ref(false)
const hashOutputCopied = ref(false)

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

async function copyHashInput() {
  try { await navigator.clipboard.writeText(hashInput.value); copiedHelper(hashInputCopied) } catch { /* clipboard not available */ }
}
async function copyHashOutput() {
  try { await navigator.clipboard.writeText(hashOutput.value); copiedHelper(hashOutputCopied) } catch { /* clipboard not available */ }
}
</script>
