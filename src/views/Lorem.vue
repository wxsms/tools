<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">
      占位文本生成
    </h1>
    <div class="flex flex-col gap-4 max-w-2xl">
      <!-- Config card -->
      <div class="card bg-base-200">
        <div class="card-body gap-4">
          <!-- Language toggle -->
          <div class="flex gap-2">
            <button
              :class="['btn btn-sm', lang === 'zh' ? 'btn-primary' : '']"
              @click="lang = 'zh'"
            >
              中文
            </button>
            <button
              :class="['btn btn-sm', lang === 'en' ? 'btn-primary' : '']"
              @click="lang = 'en'"
            >
              English
            </button>
          </div>

          <!-- Paragraph count -->
          <div class="form-control">
            <label class="label"><span class="label-text font-semibold">段落数</span></label>
            <div class="flex items-center gap-3">
              <input
                v-model.number="paragraphs"
                type="range"
                min="1"
                max="20"
                step="1"
                class="range range-sm range-primary flex-1"
              >
              <span class="font-mono text-sm w-8 text-right">{{ paragraphs }}</span>
            </div>
          </div>

          <!-- Sentences per paragraph -->
          <div class="form-control">
            <label class="label"><span class="label-text font-semibold">每段句数</span></label>
            <div class="flex items-center gap-4">
              <div class="flex items-center gap-2">
                <span class="text-sm opacity-70">最少</span>
                <input
                  v-model.number="minSentences"
                  type="number"
                  min="1"
                  max="20"
                  class="input input-bordered input-sm w-20"
                >
              </div>
              <span class="text-sm opacity-50">~</span>
              <div class="flex items-center gap-2">
                <span class="text-sm opacity-70">最多</span>
                <input
                  v-model.number="maxSentences"
                  type="number"
                  min="1"
                  max="20"
                  class="input input-bordered input-sm w-20"
                >
              </div>
            </div>
          </div>

          <!-- Generate button -->
          <button
            class="btn btn-primary btn-sm gap-1 self-start"
            @click="generate"
          >
            <ArrowPathIcon class="w-4 h-4" />
            重新生成
          </button>
        </div>
      </div>

      <!-- Results card -->
      <div
        v-if="result.length"
        class="card bg-base-200"
      >
        <div class="card-body relative">
          <button
            class="btn btn-ghost btn-xs btn-square absolute top-3 right-3"
            :title="copied ? '已复制！' : '复制全部'"
            @click="copyAll"
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
          <div
            v-for="(para, i) in result"
            :key="i"
          >
            <p class="text-sm leading-relaxed">
              {{ para }}
            </p>
            <div
              v-if="i < result.length - 1"
              class="divider my-2"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { ArrowPathIcon, ClipboardDocumentIcon, CheckIcon } from '@heroicons/vue/24/outline'
import { generateLorem } from '../utils/lorem.js'

const lang = ref('zh')
const paragraphs = ref(3)
const minSentences = ref(3)
const maxSentences = ref(5)
const result = ref([])
const copied = ref(false)

function generate() {
  const min = Math.min(minSentences.value, maxSentences.value)
  const max = Math.max(minSentences.value, maxSentences.value)
  result.value = generateLorem({
    lang: lang.value,
    paragraphs: paragraphs.value,
    sentencesPerParagraph: [min, max],
  })
}

async function copyAll() {
  try {
    await navigator.clipboard.writeText(result.value.join('\n\n'))
    copied.value = true
    setTimeout(() => copied.value = false, 1500)
  } catch { /* clipboard not available */ }
}

watch([lang, paragraphs, minSentences, maxSentences], () => {
  generate()
})

generate()
</script>
