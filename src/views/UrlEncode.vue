<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">
      URL Encode / Decode
    </h1>

    <!-- Toolbar -->
    <div class="flex flex-wrap gap-2 mb-4">
      <button
        :class="['btn btn-sm gap-1', method === 'uri' ? 'btn-primary' : '']"
        @click="setMethod('uri')"
      >
        encodeURI / decodeURI
      </button>
      <button
        :class="['btn btn-sm gap-1', method === 'component' ? 'btn-primary' : '']"
        @click="setMethod('component')"
      >
        encodeURIComponent / decodeURIComponent
      </button>
    </div>
    <div class="flex flex-col gap-4 max-w-2xl">
      <div class="form-control">
        <label class="label"><span class="label-text font-semibold">Plain Text</span></label>
        <div class="relative">
          <textarea
            v-model="input"
            class="textarea textarea-bordered w-full font-mono text-sm"
            placeholder="Enter plain text..."
            rows="6"
            @input="onInputChange"
          />
          <button
            v-if="input"
            class="btn btn-ghost btn-xs btn-square absolute bottom-2 right-2"
            :title="inputCopied ? 'Copied!' : 'Copy'"
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
        <label class="label"><span class="label-text font-semibold">URL Encoded</span></label>
        <div class="relative">
          <textarea
            v-model="output"
            class="textarea textarea-bordered w-full font-mono text-sm"
            placeholder="Enter URL encoded string..."
            rows="6"
            @input="onOutputChange"
          />
          <button
            v-if="output"
            class="btn btn-ghost btn-xs btn-square absolute bottom-2 right-2"
            :title="outputCopied ? 'Copied!' : 'Copy'"
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
          Clear
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ArrowsUpDownIcon, ClipboardDocumentIcon, CheckIcon, TrashIcon } from '@heroicons/vue/24/outline'

const input = ref('https://example.com/path?name=张三&lang=中文')
const output = ref('')
const method = ref('uri')
const error = ref('')
const inputCopied = ref(false)
const outputCopied = ref(false)

const encodeFn = () => method.value === 'component' ? encodeURIComponent : encodeURI
const decodeFn = () => method.value === 'component' ? decodeURIComponent : decodeURI

function onInputChange() {
  error.value = ''
  if (!input.value) {
    output.value = ''
    return
  }
  try {
    output.value = input.value.split('\n').map(encodeFn()).join('\n')
  } catch (e) {
    error.value = 'Encoding failed: ' + e.message
  }
}

function onOutputChange() {
  error.value = ''
  if (!output.value) {
    input.value = ''
    return
  }
  try {
    input.value = output.value.split('\n').map(decodeFn()).join('\n')
  } catch (e) {
    error.value = 'Decoding failed: ' + e.message
  }
}

function setMethod(m) {
  method.value = m
  onInputChange()
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
