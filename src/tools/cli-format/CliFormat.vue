<template>
  <div class="cli-format-page">
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

    <div class="flex gap-4">
      <!-- Single line input -->
      <div class="flex-1 form-control min-w-0">
        <label class="label mb-2">
          <span class="label-text font-semibold">单行</span>
          <button
            v-if="singleLine"
            class="btn btn-ghost btn-xs gap-1"
            @click="copy(singleLine, 'singleCopied')"
          >
            <Icon
              v-if="singleCopied"
              icon="lucide:check"
              class="w-3.5 h-3.5 text-success"
            />
            <Icon
              v-else
              icon="lucide:clipboard"
              class="w-3.5 h-3.5"
            />
            {{ singleCopied ? '已复制！' : '复制' }}
          </button>
        </label>
        <div class="cm-container border border-base-300">
          <CodeMirrorEditor
            v-model="singleLine"
            :language="shellLang"
            :bordered="false"
            :fill-height="true"
            placeholder="command --flag1 value1 --flag2 value2"
            @input="onSingleChange"
          />
        </div>
      </div>

      <!-- Multi line output -->
      <div class="flex-1 form-control min-w-0">
        <label class="label mb-2">
          <span class="label-text font-semibold">多行</span>
          <button
            v-if="multiLine"
            class="btn btn-ghost btn-xs gap-1"
            @click="copy(multiLine, 'multiCopied')"
          >
            <Icon
              v-if="multiCopied"
              icon="lucide:check"
              class="w-3.5 h-3.5 text-success"
            />
            <Icon
              v-else
              icon="lucide:clipboard"
              class="w-3.5 h-3.5"
            />
            {{ multiCopied ? '已复制！' : '复制' }}
          </button>
        </label>
        <div class="cm-container border border-base-300">
          <CodeMirrorEditor
            v-model="multiLine"
            :language="shellLang"
            :bordered="false"
            :fill-height="true"
            placeholder="command \&#10;  --flag1 value1 \&#10;  --flag2 value2"
            @input="onMultiChange"
          />
        </div>
      </div>
    </div>

    <div class="flex items-center justify-between mt-4 gap-4">
      <p
        v-if="error"
        class="text-error text-sm flex-1 min-w-0 truncate"
      >
        {{ error }}
      </p>
      <span
        v-else
        class="flex-1"
      />
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
</template>

<script setup>
import { Icon } from '@iconify/vue'
import { ref } from 'vue'
import { toSingleLine, toMultiLine } from './cli-format.js'
import CodeMirrorEditor from '../../components/CodeMirrorEditor.vue'
import { StreamLanguage } from '@codemirror/language'
import { shell } from '@codemirror/legacy-modes/mode/shell'

const shellLang = StreamLanguage.define(shell)

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

<style>
.cli-format-page .cm-container {
  height: calc(100vh - 260px);
  min-height: 400px;
  border-radius: var(--radius-field, 0.5rem);
  overflow: hidden;
}

.cli-format-page .cm-container .cm-editor {
  height: 100%;
  font-size: 0.875rem;
}

.cli-format-page .cm-container .cm-editor.cm-focused {
  outline: none;
}

:not([data-theme="dark"]) .cli-format-page .cm-container .cm-editor {
  background: var(--color-base-300);
}
:not([data-theme="dark"]) .cli-format-page .cm-container .cm-editor .cm-gutters {
  background: var(--color-base-300);
  border-right: 1px solid var(--color-base-100);
}
:not([data-theme="dark"]) .cli-format-page .cm-container .cm-editor .cm-activeLineGutter {
  background: var(--color-base-200);
}
:not([data-theme="dark"]) .cli-format-page .cm-container .cm-editor .cm-activeLine {
  background: var(--color-base-200);
}
</style>
