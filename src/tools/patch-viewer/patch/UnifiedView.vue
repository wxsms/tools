<template>
  <div class="overflow-x-auto">
    <table class="w-full text-sm font-mono">
      <template
        v-for="(hunk, hi) in hunks"
        :key="hi"
      >
        <!-- Hunk header -->
        <tr class="bg-info/10">
          <td
            colspan="3"
            class="px-3 py-0.5 text-xs text-info select-none"
          >
            @@ -{{ hunk.oldStart }},{{ hunk.oldCount }} +{{ hunk.newStart }},{{ hunk.newCount }} @@
          </td>
        </tr>
        <!-- Lines -->
        <tr
          v-for="(line, li) in hunk.lines"
          :key="li"
          :class="{
            'bg-success/8': line.type === 'add',
            'bg-error/8': line.type === 'delete',
          }"
        >
          <td class="w-12 text-right px-2 py-0 text-base-content/30 select-none align-top whitespace-nowrap">
            {{ line.type === 'add' ? '' : line.oldNum }}
          </td>
          <td class="w-12 text-right px-2 py-0 text-base-content/30 select-none align-top whitespace-nowrap">
            {{ line.type === 'delete' ? '' : line.newNum }}
          </td>
          <td class="px-3 py-0 whitespace-pre-wrap break-all">
            <span
              class="select-none"
              :class="prefixClass(line.type)"
            >{{ prefixChar(line.type) }}</span>{{ line.text }}
          </td>
        </tr>
      </template>
    </table>
  </div>
</template>

<script setup>
defineProps({
  hunks: { type: Array, required: true },
})

function prefixClass(type) {
  if (type === 'add') return 'text-success'
  if (type === 'delete') return 'text-error'
  return 'opacity-0'
}

function prefixChar(type) {
  if (type === 'add') return '+'
  if (type === 'delete') return '-'
  return ' '
}
</script>
