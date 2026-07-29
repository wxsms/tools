<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">
      chmod 权限计算
    </h1>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Left: checkbox matrix -->
      <div class="flex flex-col gap-4">
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">权限位</span></label>
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
      </div>

      <!-- Right: representations + command -->
      <div class="flex flex-col gap-4">
        <!-- Octal -->
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">数字模式</span></label>
          <input
            v-model="octalInput"
            type="text"
            maxlength="3"
            class="input input-bordered input-sm w-24 font-mono"
            @blur="onOctalBlur"
          >
          <p
            v-if="octalError"
            class="text-xs text-error mt-1"
          >
            {{ octalError }}
          </p>
        </div>

        <!-- Symbolic -->
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">符号模式</span></label>
          <input
            v-model="symbolicInput"
            type="text"
            class="input input-bordered input-sm font-mono"
            placeholder="u=rwx,g=rx,o=rx 或 rwxr-xr-x / drwxr-xr-x"
            @blur="onSymbolicBlur"
          >
          <p
            v-if="symbolicError"
            class="text-xs text-error mt-1"
          >
            {{ symbolicError }}
          </p>
        </div>

        <!-- Binary (read-only) -->
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">二进制</span></label>
          <pre class="bg-base-200 rounded-lg p-3 font-mono text-sm">{{ binaryStr }}</pre>
        </div>

        <!-- ls -l format (read-only) -->
        <div class="form-control">
          <label class="label">
            <span class="label-text font-semibold">ls -l 格式</span>
          </label>
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
            <pre class="bg-base-200 rounded-lg p-3 font-mono text-sm flex-1">{{ lsFormat }}</pre>
          </div>
        </div>

        <!-- Command -->
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">chmod 命令</span></label>
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
import { ref, computed, watch } from 'vue'
import {
  bitsToOctal, octalToBits,
  bitsToSymbolic, symbolicToBits,
  bitsToBinary, buildChmodCommand,
  bitsToLsFormat, lsFormatToBits,
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
const octalError = ref('')
const symbolicError = ref('')

const cmdMode = ref('octal')
const filename = ref('file.txt')
const fileType = ref('-')
const copied = ref(false)
// Set by onSymbolicBlur after it parsed user input, so the bits-watch does not
// overwrite the user's just-typed string with the canonical form.
let suppressSymbolicSync = false

const binaryStr = computed(() => bitsToBinary(bits.value))
const lsFormat = computed(() => bitsToLsFormat(bits.value, fileType.value))
const command = computed(() => buildChmodCommand(bits.value, { mode: cmdMode.value, filename: filename.value }))

// When bits change (via checkbox), refresh the input fields to mirror state.
// Skip symbolicInput if the change originated from onSymbolicBlur (user just typed it).
watch(bits, () => {
  octalInput.value = bitsToOctal(bits.value)
  if (suppressSymbolicSync) {
    suppressSymbolicSync = false
  } else {
    symbolicInput.value = bitsToSymbolic(bits.value)
  }
}, { deep: true })

function onOctalBlur() {
  const parsed = octalToBits(octalInput.value)
  if (parsed === null) {
    octalError.value = '无效的八进制（仅 0-7，1-3 位）'
    octalInput.value = bitsToOctal(bits.value)
  } else {
    octalError.value = ''
    bits.value = parsed
  }
}

function onSymbolicBlur() {
  // Try chmod symbolic form first (u=rwx,g=rx,o=rx), then ls -l form (rwxr-xr-x / drwxr-xr-x).
  const sym = symbolicToBits(symbolicInput.value)
  if (sym !== null) {
    symbolicError.value = ''
    suppressSymbolicSync = true
    bits.value = sym
    return
  }
  const ls = lsFormatToBits(symbolicInput.value.trim())
  if (ls !== null) {
    symbolicError.value = ''
    suppressSymbolicSync = true
    bits.value = ls
    fileType.value = ls.type
    return
  }
  symbolicError.value = '无效的符号表示（接受 u=...,g=...,o=... 或 rwxr-xr-x / drwxr-xr-x）'
  symbolicInput.value = bitsToSymbolic(bits.value)
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
