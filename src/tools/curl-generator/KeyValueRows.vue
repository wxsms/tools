<template>
  <div class="border border-base-300 rounded-lg overflow-hidden">
    <table class="table table-sm w-full">
      <thead>
        <tr class="bg-base-200 text-xs">
          <th class="w-10" />
          <th>{{ keyLabel }}</th>
          <th>{{ valueLabel }}</th>
          <th class="w-10" />
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(row, index) in rows"
          :key="index"
          :class="{ 'opacity-50': row.enabled === false }"
        >
          <td class="text-center align-middle">
            <input
              type="checkbox"
              class="checkbox checkbox-sm checkbox-success"
              :checked="row.enabled !== false"
              :aria-label="`启用 ${row.key || index + 1}`"
              :disabled="isBlank(row)"
              @change="update(index, 'enabled', $event.target.checked)"
            >
          </td>
          <td>
            <input
              :value="row.key"
              type="text"
              class="input input-ghost input-sm w-full font-mono text-sm focus:outline-none"
              :placeholder="keyPlaceholder"
              @input="update(index, 'key', $event.target.value)"
            >
          </td>
          <td>
            <input
              :value="row.value"
              type="text"
              class="input input-ghost input-sm w-full font-mono text-sm focus:outline-none"
              :placeholder="valuePlaceholder"
              @input="update(index, 'value', $event.target.value)"
            >
          </td>
          <td class="text-center align-middle">
            <button
              v-if="!isBlank(row)"
              class="btn btn-ghost btn-xs btn-square text-error"
              title="删除"
              @click="removeRow(index)"
            >
              <Icon
                icon="lucide:x"
                class="w-3.5 h-3.5"
              />
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Icon } from '@iconify/vue'

const props = defineProps({
  modelValue: { type: Array, required: true },
  keyLabel: { type: String, default: 'Key' },
  valueLabel: { type: String, default: 'Value' },
  keyPlaceholder: { type: String, default: 'Key' },
  valuePlaceholder: { type: String, default: 'Value' },
})
const emit = defineEmits(['update:modelValue'])

const BLANK = { key: '', value: '' }

function isBlank(row) {
  return row.key.trim() === '' && row.value === '' && row.enabled !== false
}

/**
 * 展示行 = 有效行 + 末尾固定一个空白行(真实数据行,输入即写入)。
 * 空白行不外发给父组件,生成命令时自然不参与。
 */
const rows = computed(() => [...props.modelValue, BLANK])

function emitRows(rows) {
  emit('update:modelValue', rows.filter(row => !isBlank(row)))
}

function update(index, field, value) {
  // index 可能指向末尾空白行(不在 modelValue 中):先补齐长度再改
  const rows = [...props.modelValue]
  while (rows.length <= index) rows.push(BLANK)
  emitRows(rows.map((row, i) =>
    i === index ? { ...row, [field]: value } : row,
  ))
}

function removeRow(index) {
  emitRows(props.modelValue.filter((_, i) => i !== index))
}
</script>
