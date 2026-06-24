<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">
      命令行格式转换
    </h1>

    <!-- Options toolbar (only affects single -> multi output) -->
    <div class="flex flex-wrap items-center gap-4 mb-4">
      <div class="flex items-center gap-2">
        <span class="text-sm opacity-70">续行符</span>
        <div class="join">
          <button
            v-for="opt in [true, false]"
            :key="opt"
            :class="['btn btn-sm join-item', continuation === opt ? 'btn-primary' : '']"
            @click="setContinuation(opt)"
          >
            {{ opt ? '带 \\' : '无 \\' }}
          </button>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-sm opacity-70">缩进</span>
        <div class="join">
          <button
            v-for="ind in [0, 2, 4]"
            :key="ind"
            :class="['btn btn-sm join-item', indent === ind ? 'btn-primary' : '']"
            @click="setIndent(ind)"
          >
            {{ ind }} 空格
          </button>
        </div>
      </div>
    </div>

    <div class="flex flex-col gap-4 max-w-3xl">
      <div class="form-control">
        <label class="label"><span class="label-text font-semibold">单行</span></label>
        <div class="relative">
          <textarea
            v-model="singleLine"
            class="textarea textarea-bordered w-full font-mono text-sm"
            placeholder="command --flag1 value1 --flag2 value2"
            rows="5"
            @input="onSingleChange"
          />
          <button
            v-if="singleLine"
            class="btn btn-ghost btn-xs btn-square absolute bottom-2 right-2"
            :title="singleCopied ? '已复制！' : '复制'"
            @click="copy(singleLine, 'singleCopied')"
          >
            <CheckIcon
              v-if="singleCopied"
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
        <label class="label"><span class="label-text font-semibold">多行</span></label>
        <div class="relative">
          <textarea
            v-model="multiLine"
            class="textarea textarea-bordered w-full font-mono text-sm"
            placeholder="command \&#10;  --flag1 value1 \&#10;  --flag2 value2"
            rows="9"
            @input="onMultiChange"
          />
          <button
            v-if="multiLine"
            class="btn btn-ghost btn-xs btn-square absolute bottom-2 right-2"
            :title="multiCopied ? '已复制！' : '复制'"
            @click="copy(multiLine, 'multiCopied')"
          >
            <CheckIcon
              v-if="multiCopied"
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
          清空
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ArrowsUpDownIcon, ClipboardDocumentIcon, CheckIcon, TrashIcon } from '@heroicons/vue/24/outline'
import { toSingleLine, toMultiLine } from '../utils/cli-format.js'

const DEFAULT_SINGLE = 'docker run --name "my container" -v /host/path:/container/path -e KEY=value --restart always alpine'

const singleLine = ref(DEFAULT_SINGLE)
const multiLine = ref('')
const continuation = ref(true)
const indent = ref(2)
const error = ref('')
const singleCopied = ref(false)
const multiCopied = ref(false)

function onSingleChange() {
  error.value = ''
  if (!singleLine.value.trim()) {
    multiLine.value = ''
    return
  }
  try {
    multiLine.value = toMultiLine(singleLine.value, {
      indent: indent.value,
      continuation: continuation.value,
    })
  } catch (e) {
    error.value = '解析失败:' + e.message
    multiLine.value = ''
  }
}

function onMultiChange() {
  error.value = ''
  if (!multiLine.value.trim()) {
    singleLine.value = ''
    return
  }
  try {
    singleLine.value = toSingleLine(multiLine.value)
  } catch (e) {
    error.value = '解析失败:' + e.message
    singleLine.value = ''
  }
}

function setContinuation(opt) {
  continuation.value = opt
  // 选项变化时,以单行框为源重新转换多行框
  onSingleChange()
}

function setIndent(ind) {
  indent.value = ind
  onSingleChange()
}

function clear() {
  singleLine.value = ''
  multiLine.value = ''
  error.value = ''
}

async function copy(text, flag) {
  try {
    await navigator.clipboard.writeText(text)
    if (flag === 'singleCopied') {
      singleCopied.value = true
      setTimeout(() => (singleCopied.value = false), 1500)
    } else {
      multiCopied.value = true
      setTimeout(() => (multiCopied.value = false), 1500)
    }
  } catch { /* clipboard not available */ }
}

onSingleChange()
</script>
