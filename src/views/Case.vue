<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">
      Case Converter
    </h1>
    <div class="flex flex-col gap-4 max-w-2xl">
      <div class="form-control">
        <label class="label"><span class="label-text font-semibold">Input</span></label>
        <div class="relative">
          <textarea
            v-model="input"
            class="textarea textarea-bordered w-full font-mono text-sm"
            placeholder="e.g. hello world, helloWorld, hello_world, HELLO_WORLD..."
            rows="3"
            @input="convert"
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

      <div class="flex justify-end">
        <button
          class="btn btn-ghost btn-sm gap-1"
          @click="clear"
        >
          <TrashIcon class="w-4 h-4" />
          Clear
        </button>
      </div>

      <!-- Results -->
      <div
        v-for="item in results"
        :key="item.key"
        class="form-control"
      >
        <label class="label">
          <span class="label-text font-semibold">{{ item.label }}</span>
          <span class="label-text-alt opacity-50">{{ item.desc }}</span>
        </label>
        <div class="relative">
          <input
            :value="item.value"
            class="input input-bordered w-full font-mono text-sm"
            readonly
          >
          <button
            v-if="item.value"
            class="btn btn-ghost btn-xs btn-square absolute right-1 top-1"
            :title="item.copied ? 'Copied!' : 'Copy'"
            @click="copyText(item.value, item.key)"
          >
            <CheckIcon
              v-if="item.copied"
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
</template>

<script setup>
import { ref, reactive } from 'vue'
import { ClipboardDocumentIcon, CheckIcon, TrashIcon } from '@heroicons/vue/24/outline'
import { convertCases } from '../utils/case.js'

const input = ref('')
const inputCopied = ref(false)

const results = reactive([
  { key: 'upper', label: 'UPPER CASE', desc: 'all upper', value: '', copied: false },
  { key: 'lower', label: 'lower case', desc: 'all lower', value: '', copied: false },
  { key: 'camel', label: 'camelCase', desc: 'small camel', value: '', copied: false },
  { key: 'pascal', label: 'PascalCase', desc: 'big camel', value: '', copied: false },
  { key: 'snake', label: 'snake_case', desc: 'lower snake', value: '', copied: false },
  { key: 'screamingSnake', label: 'SCREAMING_SNAKE_CASE', desc: 'upper snake', value: '', copied: false },
  { key: 'kebab', label: 'kebab-case', desc: 'kebab / hyphen', value: '', copied: false },
  { key: 'title', label: 'Title Case', desc: 'capitalized words', value: '', copied: false },
])

function convert() {
  const converted = convertCases(input.value)
  for (const item of results) {
    item.value = converted[item.key]
  }
}

function clear() {
  input.value = ''
  results.forEach(r => r.value = '')
}

async function copyText(text, flag) {
  try {
    await navigator.clipboard.writeText(text)
    if (flag === 'inputCopied') {
      inputCopied.value = true
      setTimeout(() => inputCopied.value = false, 1500)
    } else {
      const item = results.find(r => r.key === flag)
      if (item) {
        item.copied = true
        setTimeout(() => item.copied = false, 1500)
      }
    }
  } catch { /* clipboard not available */ }
}
</script>
