<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">
      chmod 权限计算
    </h1>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Left: checkbox matrix + 5 input fields -->
      <div class="flex flex-col gap-4">
        <div class="form-control">
          <div class="text-sm font-semibold mb-1">
            权限位
          </div>
          <table class="table table-zebra w-full">
            <thead>
              <tr>
                <th class="w-40" />
                <th
                  v-for="col in cols"
                  :key="col.key"
                  class="text-center cursor-help"
                  :title="col.tip"
                >
                  {{ col.label }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in rows"
                :key="row.key"
              >
                <td
                  class="font-mono font-semibold cursor-help"
                  :title="row.tip"
                >
                  {{ row.label }}
                </td>
                <td class="text-center">
                  <input
                    v-model="bits[row.key].read"
                    type="checkbox"
                    class="checkbox checkbox-sm checkbox-primary"
                  >
                </td>
                <td class="text-center">
                  <input
                    v-model="bits[row.key].write"
                    type="checkbox"
                    class="checkbox checkbox-sm checkbox-primary"
                  >
                </td>
                <td class="text-center">
                  <input
                    v-model="bits[row.key].execute"
                    type="checkbox"
                    class="checkbox checkbox-sm checkbox-primary"
                  >
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- ls -l 格式 (editable + file type selector) -->
        <div class="form-control">
          <div class="text-sm font-semibold mb-1">
            ls -l 格式
          </div>
          <div class="flex gap-2 items-center">
            <select
              v-model="fileType"
              class="select select-bordered select-sm w-32 font-mono"
              :title="'文件类型符（ls -l 首位）'"
            >
              <option
                v-for="t in fileTypes"
                :key="t.value"
                :value="t.value"
              >
                {{ t.value }} {{ t.label }}
              </option>
            </select>
            <input
              v-model="lsInput"
              type="text"
              maxlength="10"
              class="input input-bordered input-sm font-mono flex-1"
              placeholder="drwxr-xr-x"
              @blur="onLsBlur"
            >
          </div>
          <p
            v-if="lsError"
            class="text-xs text-error mt-1"
          >
            {{ lsError }}
          </p>
        </div>

        <!-- 符号格式 -->
        <div class="form-control">
          <div class="text-sm font-semibold mb-1">
            符号格式
          </div>
          <input
            v-model="symbolicInput"
            type="text"
            class="input input-bordered input-sm w-full font-mono"
            placeholder="u=rwx,g=rx,o=rx"
            @blur="onSymbolicBlur"
          >
          <p
            v-if="symbolicError"
            class="text-xs text-error mt-1"
          >
            {{ symbolicError }}
          </p>
        </div>

        <!-- 数字格式 -->
        <div class="form-control">
          <div class="text-sm font-semibold mb-1">
            数字格式
          </div>
          <input
            v-model="octalInput"
            type="text"
            maxlength="3"
            class="input input-bordered input-sm w-full font-mono"
            @blur="onOctalBlur"
          >
          <p
            v-if="octalError"
            class="text-xs text-error mt-1"
          >
            {{ octalError }}
          </p>
        </div>

        <!-- 二进制格式 -->
        <div class="form-control">
          <div class="text-sm font-semibold mb-1">
            二进制格式
          </div>
          <input
            v-model="binaryInput"
            type="text"
            maxlength="11"
            class="input input-bordered input-sm w-full font-mono"
            placeholder="111 101 101"
            @blur="onBinaryBlur"
          >
          <p
            v-if="binaryError"
            class="text-xs text-error mt-1"
          >
            {{ binaryError }}
          </p>
        </div>
      </div>

      <!-- Right: explanation + command -->
      <div class="flex flex-col gap-4">
        <!-- Explanation -->
        <div class="form-control">
          <div class="text-sm font-semibold mb-1">
            权限含义
          </div>
          <div class="bg-base-200 rounded-lg p-4 flex flex-col gap-2 text-sm">
            <div
              v-for="row in rows"
              :key="row.key"
            >
              <span class="font-semibold">{{ row.label }}:</span>
              <span class="ml-1">{{ description[row.key] }}</span>
            </div>
          </div>
        </div>

        <!-- Command -->
        <div class="form-control">
          <div class="text-sm font-semibold mb-1">
            chmod 命令
          </div>
          <div class="flex gap-2 mb-2">
            <label class="flex items-center gap-1 cursor-pointer">
              <input
                v-model="cmdMode"
                type="radio"
                value="octal"
                name="chmod-cmd-mode"
                class="radio radio-sm radio-primary"
              >
              <span class="text-sm">数字</span>
            </label>
            <label class="flex items-center gap-1 cursor-pointer">
              <input
                v-model="cmdMode"
                type="radio"
                value="symbolic"
                name="chmod-cmd-mode"
                class="radio radio-sm radio-primary"
              >
              <span class="text-sm">符号</span>
            </label>
          </div>
          <input
            v-model="filename"
            type="text"
            class="input input-bordered input-sm w-full mb-2 font-mono"
            placeholder="文件名"
          >
          <div class="relative">
            <pre class="bg-base-200 rounded-lg p-3 font-mono text-sm break-all whitespace-pre-wrap">{{ command }}</pre>
            <button
              class="btn btn-ghost btn-xs btn-square absolute right-2 top-2"
              :title="copied ? '已复制！' : '复制'"
              @click="copyCommand"
            >
              <Icon
                v-if="copied"
                icon="lucide:check"
                class="w-4 h-4 text-success"
              />
              <Icon
                v-else
                icon="lucide:clipboard"
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
import { Icon } from '@iconify/vue'
import { ref, computed, watch, nextTick } from 'vue'
import {
  bitsToOctal, octalToBits,
  bitsToSymbolic, symbolicToBits,
  bitsToBinary, binaryToBits,
  buildChmodCommand,
  bitsToLsFormat, lsFormatToBits,
  describePerm,
} from './chmod.js'

const rows = [
  { key: 'owner', label: 'u (user)',  tip: '文件所有者' },
  { key: 'group', label: 'g (group)', tip: '文件所属组' },
  { key: 'other', label: 'o (other)', tip: '其他用户' },
]

const cols = [
  { key: 'read',   label: 'r (read)', tip: '读权限（数值 4）' },
  { key: 'write',  label: 'w (write)', tip: '写权限（数值 2）' },
  { key: 'execute', label: 'x (execute)', tip: '执行权限（数值 1）' },
]

const fileTypes = [
  { value: '-', label: '普通文件' },
  { value: 'd', label: '目录' },
  { value: 'l', label: '符号链接' },
  { value: 'b', label: '块设备' },
  { value: 'c', label: '字符设备' },
  { value: 'p', label: '管道' },
  { value: 's', label: '套接字' },
]

const bits = ref({
  owner: { read: true, write: true, execute: true },
  group: { read: true, write: false, execute: true },
  other: { read: true, write: false, execute: true },
})

const octalInput = ref(bitsToOctal(bits.value))
const symbolicInput = ref(bitsToSymbolic(bits.value))
const binaryInput = ref(bitsToBinary(bits.value))
const lsInput = ref(bitsToLsFormat(bits.value, '-'))
const octalError = ref('')
const symbolicError = ref('')
const binaryError = ref('')
const lsError = ref('')

const cmdMode = ref('octal')
const filename = ref('file.txt')
const fileType = ref('-')
const copied = ref(false)
// When an input blur handler updates bits, we set this to the field name(s) that
// should NOT be overwritten by the bits watcher (the one the user just edited).
// Reset on next tick after watchers flush.
let suppressOctalSync = false
let suppressSymbolicSync = false
let suppressBinarySync = false
let suppressLsSync = false

const description = computed(() => describePerm(bits.value))
const command = computed(() => buildChmodCommand(bits.value, { mode: cmdMode.value, filename: filename.value }))

// When bits change (via checkbox), refresh all input fields to mirror state.
// Each input's suppress flag protects it from being overwritten right after the user
// edited that specific field (so their just-typed text is preserved).
watch(bits, () => {
  if (!suppressOctalSync)    octalInput.value    = bitsToOctal(bits.value)
  if (!suppressSymbolicSync) symbolicInput.value = bitsToSymbolic(bits.value)
  if (!suppressBinarySync)   binaryInput.value   = bitsToBinary(bits.value)
  if (!suppressLsSync)       lsInput.value       = bitsToLsFormat(bits.value, fileType.value)
}, { deep: true })

// When the file type selector changes on its own (user click), refresh ls input.
watch(fileType, () => {
  if (!suppressLsSync) {
    lsInput.value = bitsToLsFormat(bits.value, fileType.value)
  }
})

function onOctalBlur() {
  const parsed = octalToBits(octalInput.value)
  if (parsed === null) {
    octalError.value = '无效的八进制（仅 0-7，1-3 位）'
    octalInput.value = bitsToOctal(bits.value)
    return
  }
  octalError.value = ''
  suppressOctalSync = true
  bits.value = parsed
  nextTick(() => { suppressOctalSync = false })
}

function onSymbolicBlur() {
  const parsed = symbolicToBits(symbolicInput.value)
  if (parsed === null) {
    symbolicError.value = '无效的符号表示（格式 u=...,g=...,o=...）'
    symbolicInput.value = bitsToSymbolic(bits.value)
    return
  }
  symbolicError.value = ''
  suppressSymbolicSync = true
  bits.value = parsed
  nextTick(() => { suppressSymbolicSync = false })
}

function onBinaryBlur() {
  const parsed = binaryToBits(binaryInput.value.trim())
  if (parsed === null) {
    binaryError.value = '无效的二进制（需要 9 位 0/1，可带空格）'
    binaryInput.value = bitsToBinary(bits.value)
    return
  }
  binaryError.value = ''
  suppressBinarySync = true
  bits.value = parsed
  nextTick(() => { suppressBinarySync = false })
}

function onLsBlur() {
  const parsed = lsFormatToBits(lsInput.value.trim())
  if (parsed === null) {
    lsError.value = '无效的 ls -l 格式（接受 rwxr-xr-x 或 drwxr-xr-x）'
    lsInput.value = bitsToLsFormat(bits.value, fileType.value)
    return
  }
  lsError.value = ''
  suppressLsSync = true
  bits.value = parsed
  fileType.value = parsed.type
  nextTick(() => { suppressLsSync = false })
}

async function copyCommand() {
  try {
    await navigator.clipboard.writeText(command.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 1500)
  } catch {
    // clipboard unavailable; silently ignore
  }
}
</script>
