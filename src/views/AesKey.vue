<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">
      AES Key Generator
    </h1>
    <div class="flex flex-col gap-4 max-w-2xl">
      <div class="form-control">
        <label class="label"><span class="label-text font-semibold">Key Length</span></label>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="size in keySizes"
            :key="size"
            class="btn btn-sm"
            :class="selectedSize === size ? 'btn-primary' : 'btn-outline'"
            @click="selectedSize = size"
          >
            {{ size }}-bit
          </button>
        </div>
      </div>

      <button
        class="btn btn-primary w-fit"
        @click="generate"
      >
        <SparklesIcon class="w-5 h-5" />
        Generate
      </button>

      <div v-if="result">
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">Result</span></label>
          <div class="relative">
            <textarea
              :value="result"
              class="textarea textarea-bordered w-full font-mono text-sm"
              readonly
              rows="3"
            />
            <button
              class="btn btn-ghost btn-xs btn-square absolute bottom-2 right-2"
              :title="copied ? 'Copied!' : 'Copy'"
              @click="copy"
            >
              <CheckIcon
                v-if="copied"
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
import { SparklesIcon, ClipboardDocumentIcon, CheckIcon } from '@heroicons/vue/24/outline'

const keySizes = [64, 128, 192, 256, 512, 1024, 2048, 4096]
const selectedSize = ref(256)
const result = ref('')
const copied = ref(false)

function generate() {
  const byteLength = selectedSize.value / 8
  const bytes = new Uint8Array(byteLength)
  crypto.getRandomValues(bytes)
  result.value = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function copy() {
  try {
    await navigator.clipboard.writeText(result.value)
    copied.value = true
    setTimeout(() => copied.value = false, 1500)
  } catch { /* clipboard not available */ }
}
</script>
