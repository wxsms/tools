<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">
      RSA
    </h1>

    <!-- Tabs -->
    <div
      role="tablist"
      class="tabs tabs-boxed mb-6 w-fit"
    >
      <button
        role="tab"
        class="tab"
        :class="{ 'tab-active': activeTab === 'keygen' }"
        @click="activeTab = 'keygen'"
      >
        KeyGen
      </button>
      <button
        role="tab"
        class="tab"
        :class="{ 'tab-active': activeTab === 'encrypt' }"
        @click="activeTab = 'encrypt'"
      >
        Encrypt
      </button>
      <button
        role="tab"
        class="tab"
        :class="{ 'tab-active': activeTab === 'decrypt' }"
        @click="activeTab = 'decrypt'"
      >
        Decrypt
      </button>
    </div>

    <!-- KeyGen Tab -->
    <div
      v-if="activeTab === 'keygen'"
      class="flex flex-col gap-4 max-w-2xl"
    >
      <div class="form-control">
        <label class="label"><span class="label-text font-semibold">Key Size</span></label>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="size in RSA_KEY_SIZES"
            :key="size"
            class="btn btn-sm"
            :class="keySize === size ? 'btn-primary' : 'btn-outline'"
            @click="keySize = size"
          >
            {{ size }}-bit
          </button>
        </div>
      </div>

      <button
        class="btn btn-primary w-fit"
        :disabled="generating"
        @click="generateKeys"
      >
        <SparklesIcon class="w-5 h-5" />
        {{ generating ? 'Generating...' : 'Generate' }}
      </button>

      <div
        v-if="publicKeyPem"
        class="form-control"
      >
        <label class="label"><span class="label-text font-semibold">Public Key</span></label>
        <div class="relative">
          <textarea
            v-model="publicKeyPem"
            class="textarea textarea-bordered w-full font-mono text-sm"
            rows="6"
            readonly
          />
          <button
            class="btn btn-ghost btn-xs btn-square absolute bottom-2 right-2"
            :title="pubCopied ? 'Copied!' : 'Copy'"
            @click="copyPub"
          >
            <CheckIcon
              v-if="pubCopied"
              class="w-4 h-4 text-success"
            />
            <ClipboardDocumentIcon
              v-else
              class="w-4 h-4"
            />
          </button>
        </div>
      </div>

      <div
        v-if="privateKeyPem"
        class="form-control"
      >
        <label class="label"><span class="label-text font-semibold">Private Key</span></label>
        <div class="relative">
          <textarea
            v-model="privateKeyPem"
            class="textarea textarea-bordered w-full font-mono text-sm"
            rows="10"
            readonly
          />
          <button
            class="btn btn-ghost btn-xs btn-square absolute bottom-2 right-2"
            :title="priCopied ? 'Copied!' : 'Copy'"
            @click="copyPri"
          >
            <CheckIcon
              v-if="priCopied"
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

    <!-- Encrypt Tab -->
    <div
      v-if="activeTab === 'encrypt'"
      class="flex flex-col gap-4 max-w-2xl"
    >
      <div class="form-control">
        <label class="label"><span class="label-text font-semibold">Public Key</span></label>
        <textarea
          v-model="encPublicKey"
          class="textarea textarea-bordered w-full font-mono text-sm"
          placeholder="Paste PEM public key..."
          rows="6"
        />
      </div>

      <div class="form-control">
        <label class="label"><span class="label-text font-semibold">Plaintext</span></label>
        <textarea
          v-model="plaintext"
          class="textarea textarea-bordered w-full font-mono text-sm"
          placeholder="Enter text to encrypt..."
          rows="4"
        />
      </div>

      <button
        class="btn btn-primary w-fit"
        :disabled="!encPublicKey || !plaintext || encLoading"
        @click="doEncrypt"
      >
        {{ encLoading ? 'Encrypting...' : 'Encrypt' }}
      </button>

      <div
        v-if="ciphertext"
        class="form-control"
      >
        <label class="label"><span class="label-text font-semibold">Ciphertext (Base64)</span></label>
        <div class="relative">
          <textarea
            v-model="ciphertext"
            class="textarea textarea-bordered w-full font-mono text-sm"
            rows="6"
            readonly
          />
          <button
            class="btn btn-ghost btn-xs btn-square absolute bottom-2 right-2"
            :title="encOutCopied ? 'Copied!' : 'Copy'"
            @click="copyEncOut"
          >
            <CheckIcon
              v-if="encOutCopied"
              class="w-4 h-4 text-success"
            />
            <ClipboardDocumentIcon
              v-else
              class="w-4 h-4"
            />
          </button>
        </div>
      </div>

      <p
        v-if="encError"
        class="text-error text-sm"
      >
        {{ encError }}
      </p>

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

    <!-- Decrypt Tab -->
    <div
      v-if="activeTab === 'decrypt'"
      class="flex flex-col gap-4 max-w-2xl"
    >
      <div class="form-control">
        <label class="label"><span class="label-text font-semibold">Private Key</span></label>
        <textarea
          v-model="decPrivateKey"
          class="textarea textarea-bordered w-full font-mono text-sm"
          placeholder="Paste PEM private key..."
          rows="10"
        />
      </div>

      <div class="form-control">
        <label class="label"><span class="label-text font-semibold">Ciphertext (Base64)</span></label>
        <textarea
          v-model="decCiphertext"
          class="textarea textarea-bordered w-full font-mono text-sm"
          placeholder="Paste Base64 ciphertext..."
          rows="4"
        />
      </div>

      <button
        class="btn btn-primary w-fit"
        :disabled="!decPrivateKey || !decCiphertext || decLoading"
        @click="doDecrypt"
      >
        {{ decLoading ? 'Decrypting...' : 'Decrypt' }}
      </button>

      <div
        v-if="decResult"
        class="form-control"
      >
        <label class="label"><span class="label-text font-semibold">Plaintext</span></label>
        <div class="relative">
          <textarea
            v-model="decResult"
            class="textarea textarea-bordered w-full font-mono text-sm"
            rows="4"
            readonly
          />
          <button
            class="btn btn-ghost btn-xs btn-square absolute bottom-2 right-2"
            :title="decOutCopied ? 'Copied!' : 'Copy'"
            @click="copyDecOut"
          >
            <CheckIcon
              v-if="decOutCopied"
              class="w-4 h-4 text-success"
            />
            <ClipboardDocumentIcon
              v-else
              class="w-4 h-4"
            />
          </button>
        </div>
      </div>

      <p
        v-if="decError"
        class="text-error text-sm"
      >
        {{ decError }}
      </p>

      <div class="flex justify-end">
        <button
          class="btn btn-ghost btn-sm gap-1"
          @click="clearDec"
        >
          <TrashIcon class="w-4 h-4" />
          Clear
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { ClipboardDocumentIcon, CheckIcon, TrashIcon, SparklesIcon } from '@heroicons/vue/24/outline'
import { RSA_KEY_SIZES, generateKeyPair, encrypt, decrypt } from '../utils/rsa.js'

// --- Shared ---
const activeTab = ref('keygen')
const publicKeyPem = ref('')
const privateKeyPem = ref('')

function copiedHelper(flag) {
  flag.value = true
  setTimeout(() => flag.value = false, 1500)
}

// Sync generated keys to encrypt/decrypt tabs
watch(publicKeyPem, (val) => {
  encPublicKey.value = val
})
watch(privateKeyPem, (val) => {
  decPrivateKey.value = val
})

// --- KeyGen ---
const keySize = ref(2048)
const generating = ref(false)
const pubCopied = ref(false)
const priCopied = ref(false)

async function generateKeys() {
  generating.value = true
  try {
    const pair = await generateKeyPair(keySize.value)
    publicKeyPem.value = pair.publicKeyPem
    privateKeyPem.value = pair.privateKeyPem
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

// --- Encrypt ---
const encPublicKey = ref('')
const plaintext = ref('')
const ciphertext = ref('')
const encLoading = ref(false)
const encError = ref('')
const encOutCopied = ref(false)

async function doEncrypt() {
  encError.value = ''
  encLoading.value = true
  try {
    ciphertext.value = await encrypt(plaintext.value, encPublicKey.value)
  } catch (e) {
    encError.value = e.message || 'Encryption failed'
    ciphertext.value = ''
  } finally {
    encLoading.value = false
  }
}

async function copyEncOut() {
  try { await navigator.clipboard.writeText(ciphertext.value); copiedHelper(encOutCopied) } catch { /* clipboard not available */ }
}

function clearEnc() {
  encPublicKey.value = ''
  plaintext.value = ''
  ciphertext.value = ''
  encError.value = ''
}

// --- Decrypt ---
const decPrivateKey = ref('')
const decCiphertext = ref('')
const decResult = ref('')
const decLoading = ref(false)
const decError = ref('')
const decOutCopied = ref(false)

async function doDecrypt() {
  decError.value = ''
  decLoading.value = true
  try {
    decResult.value = await decrypt(decCiphertext.value.trim(), decPrivateKey.value)
  } catch (e) {
    decError.value = e.message || 'Decryption failed'
    decResult.value = ''
  } finally {
    decLoading.value = false
  }
}

async function copyDecOut() {
  try { await navigator.clipboard.writeText(decResult.value); copiedHelper(decOutCopied) } catch { /* clipboard not available */ }
}

function clearDec() {
  decPrivateKey.value = ''
  decCiphertext.value = ''
  decResult.value = ''
  decError.value = ''
}
</script>
