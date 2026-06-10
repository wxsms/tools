<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">
      MD5 Hash
    </h1>
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
            @click="copyInput"
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
        <ArrowDownIcon class="w-6 h-6" />
      </div>

      <div class="form-control">
        <label class="label"><span class="label-text font-semibold">MD5 Hash</span></label>
        <div class="relative">
          <input
            v-model="output"
            class="input input-bordered w-full font-mono text-sm"
            readonly
          >
          <button
            v-if="output"
            class="btn btn-ghost btn-xs btn-square absolute right-2 top-1/2 -translate-y-1/2"
            :title="outputCopied ? 'Copied!' : 'Copy'"
            @click="copyOutput"
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
import { ArrowDownIcon, ClipboardDocumentIcon, CheckIcon, TrashIcon } from '@heroicons/vue/24/outline'
import { computeMd5 } from '../utils/md5.js'

const input = ref('')
const output = ref('')
const inputCopied = ref(false)
const outputCopied = ref(false)

function onInputChange() {
  if (!input.value) {
    output.value = ''
    return
  }
  const hash = computeMd5(input.value)
  output.value = hash
}

function clear() {
  input.value = ''
  output.value = ''
}

async function copyInput() {
  try {
    await navigator.clipboard.writeText(input.value)
    inputCopied.value = true
    setTimeout(() => inputCopied.value = false, 1500)
  } catch { /* clipboard not available */ }
}

async function copyOutput() {
  try {
    await navigator.clipboard.writeText(output.value)
    outputCopied.value = true
    setTimeout(() => outputCopied.value = false, 1500)
  } catch { /* clipboard not available */ }
}
</script>
