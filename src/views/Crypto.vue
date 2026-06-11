<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">
      加密解密
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
        加密 / 解密
      </button>
      <button
        role="tab"
        class="tab"
        :class="{ 'tab-active': activeTab === 'hash' }"
        @click="activeTab = 'hash'"
      >
        哈希 / HMAC
      </button>
      <button
        role="tab"
        class="tab"
        :class="{ 'tab-active': activeTab === 'keygen' }"
        @click="activeTab = 'keygen'"
      >
        密钥生成
      </button>
    </div>

    <!-- Encrypt / Decrypt Tab -->
    <div
      v-if="activeTab === 'encrypt'"
      class="flex flex-col gap-4 max-w-2xl"
    >
      <!-- 算法 -->
      <div class="form-control">
        <label class="label"><span class="label-text font-semibold">算法</span></label>
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

      <!-- 密码 -->
      <div class="form-control">
        <label class="label"><span class="label-text font-semibold">密码</span></label>
        <input
          v-model="password"
          type="text"
          class="input input-bordered w-full font-mono text-sm"
          placeholder="输入密码..."
          @input="processEnc()"
        >
      </div>

      <!-- 高级选项 (collapsible) -->
      <div class="collapse collapse-arrow bg-base-200">
        <input
          v-model="advancedOpen"
          type="checkbox"
        >
        <div class="collapse-title text-sm font-semibold py-2 min-h-0">
          高级选项
        </div>
        <div class="collapse-content">
          <div class="flex flex-col gap-4 pt-2">
            <!-- 密钥模式 -->
            <div class="form-control">
              <label class="label"><span class="label-text font-semibold">密钥模式</span></label>
              <div class="flex gap-2">
                <button
                  class="btn btn-sm"
                  :class="keyMode === 'passphrase' ? 'btn-primary' : 'btn-outline'"
                  @click="keyMode = 'passphrase'; processEnc()"
                >
                  密码短语
                </button>
                <button
                  class="btn btn-sm"
                  :class="keyMode === 'hex' ? 'btn-primary' : 'btn-outline'"
                  @click="keyMode = 'hex'; processEnc()"
                >
                  Hex 密钥
                </button>
              </div>
            </div>

            <!-- Hex 密钥 (advanced only) -->
            <div
              v-if="keyMode === 'hex'"
              class="form-control"
            >
              <label class="label">
                <span class="label-text font-semibold">Hex 密钥</span>
                <button
                  class="btn btn-ghost btn-xs"
                  @click="regenerateHexKey"
                >
                  重新生成
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

            <!-- 盐值 (passphrase mode, advanced only) -->
            <div
              v-if="keyMode === 'passphrase'"
              class="form-control"
            >
              <label class="label">
                <span class="label-text font-semibold">盐值</span>
                <button
                  class="btn btn-ghost btn-xs"
                  @click="regenerateSalt"
                >
                  重新生成
                </button>
              </label>
              <div class="relative">
                <input
                  v-model="saltHex"
                  class="input input-bordered w-full font-mono text-sm"
                  placeholder="自动生成的盐值"
                  @input="processEnc()"
                >
                <button
                  v-if="saltHex"
                  class="btn btn-ghost btn-xs btn-square absolute right-2 top-1/2 -translate-y-1/2"
                  :title="saltCopied ? '已复制！' : '复制'"
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

            <!-- 密钥长度 (passphrase mode, advanced only) -->
            <div
              v-if="keyMode === 'passphrase'"
              class="form-control"
            >
              <label class="label"><span class="label-text font-semibold">密钥长度</span></label>
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
              <label class="label"><span class="label-text font-semibold">PBKDF2 迭代次数</span></label>
              <input
                v-model.number="iterations"
                type="number"
                class="input input-bordered w-full font-mono text-sm"
                min="1"
                step="10000"
                @input="processEnc()"
              >
              <p class="text-xs text-base-content/50 mt-1">
                默认：{{ DEFAULT_ITERATIONS.toLocaleString() }}。值越大越安全，但速度越慢。
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
                  重新生成
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
                  :title="ivCopied ? '已复制！' : '复制'"
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

      <!-- 明文 (input) -->
      <div class="form-control">
        <label class="label"><span class="label-text font-semibold">明文</span></label>
        <div class="relative">
          <textarea
            v-model="plaintext"
            class="textarea textarea-bordered w-full font-mono text-sm"
            placeholder="输入明文..."
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
            :title="plaintextCopied ? '已复制！' : '复制'"
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
        <label class="label"><span class="label-text font-semibold">密文 (hex)</span></label>
        <div class="relative">
          <textarea
            v-model="ciphertext"
            class="textarea textarea-bordered w-full font-mono text-sm"
            placeholder="输入密文以解密..."
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
            :title="ciphertextCopied ? '已复制！' : '复制'"
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
          清空
        </button>
      </div>
    </div>

    <!-- 哈希 / HMAC Tab -->
    <div
      v-if="activeTab === 'hash'"
      class="flex flex-col gap-4 max-w-2xl"
    >
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

    <!-- KeyGen Tab -->
    <div
      v-if="activeTab === 'keygen'"
      class="flex flex-col gap-4 max-w-2xl"
    >
      <div class="form-control">
        <label class="label"><span class="label-text font-semibold">密钥长度</span></label>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="size in KEYGEN_SIZES"
            :key="size"
            class="btn btn-sm"
            :class="keygenSize === size ? 'btn-primary' : 'btn-outline'"
            @click="keygenSize = size"
          >
            {{ size }}-bit
          </button>
        </div>
      </div>

      <button
        class="btn btn-primary w-fit"
        @click="generateKey"
      >
        <SparklesIcon class="w-5 h-5" />
        生成
      </button>

      <div v-if="keygenResult">
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">结果</span></label>
          <div class="relative">
            <textarea
              :value="keygenResult"
              class="textarea textarea-bordered w-full font-mono text-sm"
              readonly
              rows="3"
            />
            <button
              class="btn btn-ghost btn-xs btn-square absolute bottom-2 right-2"
              :title="keygenCopied ? '已复制！' : '复制'"
              @click="copyKeygen"
            >
              <CheckIcon
                v-if="keygenCopied"
                class="w-4 h-4 text-success"
              />
              <ClipboardDocumentIcon
                v-else
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
import { ref } from 'vue'
import {
  ArrowsUpDownIcon,
  ArrowDownIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  TrashIcon,
  SparklesIcon,
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
      hexKeyError.value = '无效的十六进制字符'
      return
    }
    if (hex.length !== 32 && hex.length !== 48 && hex.length !== 64) {
      hexKeyError.value = '密钥必须为 32、48 或 64 个十六进制字符（128/192/256 位）'
      return
    }
    const key = hexToBytes(hex)
    ivError.value = ''
    const expectedIvLen = algo === 'AES-GCM' ? 24 : 32
    if (!ivHex.value || !/^[0-9a-fA-F]+$/.test(ivHex.value) || ivHex.value.length !== expectedIvLen) {
      ivError.value = `${algo === 'AES-GCM' ? 'Nonce' : 'IV'} 必须为 ${expectedIvLen} 个十六进制字符`
      return
    }
    const iv = hexToBytes(ivHex.value)
    if (direction === 'plaintext') {
      ciphertext.value = aesEncryptRaw(algo, key, iv, pt)
    } else {
      plaintext.value = aesDecryptRaw(algo, key, iv, ct.trim())
    }
  } else {
    // 密码短语 + explicit salt/IV
    if (!pwd) return
    ivError.value = ''
    const expectedIvLen = algo === 'AES-GCM' ? 24 : 32
    if (!ivHex.value || !/^[0-9a-fA-F]+$/.test(ivHex.value) || ivHex.value.length !== expectedIvLen) {
      ivError.value = `${algo === 'AES-GCM' ? 'Nonce' : 'IV'} 必须为 ${expectedIvLen} 个十六进制字符`
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

// --- 哈希 / HMAC ---
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

// --- KeyGen ---
const KEYGEN_SIZES = [64, 128, 192, 256, 512, 1024, 2048, 4096]
const keygenSize = ref(256)
const keygenResult = ref('')
const keygenCopied = ref(false)

function generateKey() {
  keygenResult.value = bytesToHex(randomBytes(keygenSize.value / 8))
}

async function copyKeygen() {
  try { await navigator.clipboard.writeText(keygenResult.value); copiedHelper(keygenCopied) } catch { /* clipboard not available */ }
}
</script>
