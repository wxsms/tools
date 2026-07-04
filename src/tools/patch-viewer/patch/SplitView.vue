<template>
  <div class="overflow-x-auto">
    <template
      v-for="(hunk, hi) in hunks"
      :key="hi"
    >
      <!-- Hunk header -->
      <div class="bg-info/10 px-3 py-0.5 text-xs text-info font-mono select-none">
        @@ -{{ hunk.oldStart }},{{ hunk.oldCount }} +{{ hunk.newStart }},{{ hunk.newCount }} @@
      </div>
      <!-- Split columns -->
      <div class="grid grid-cols-2">
        <!-- Left (old) -->
        <div class="border-r border-base-content/10">
          <div
            v-for="(pair, li) in getPairs(hunk)"
            :key="'l' + li"
            class="flex font-mono text-sm leading-5"
            :class="{ 'bg-error/8': pair.left.type === 'delete' }"
          >
            <span class="w-10 shrink-0 text-right px-2 text-base-content/30 select-none">{{ pair.left.oldNum || '' }}</span>
            <span class="px-2 whitespace-pre-wrap break-all"><span
              v-if="pair.left.type === 'delete'"
              class="text-error select-none"
            >-</span>{{ pair.left.text }}</span>
          </div>
        </div>
        <!-- Right (new) -->
        <div>
          <div
            v-for="(pair, li) in getPairs(hunk)"
            :key="'r' + li"
            class="flex font-mono text-sm leading-5"
            :class="{ 'bg-success/8': pair.right.type === 'add' }"
          >
            <span class="w-10 shrink-0 text-right px-2 text-base-content/30 select-none">{{ pair.right.newNum || '' }}</span>
            <span class="px-2 whitespace-pre-wrap break-all"><span
              v-if="pair.right.type === 'add'"
              class="text-success select-none"
            >+</span>{{ pair.right.text }}</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
defineProps({
  hunks: { type: Array, required: true },
})

function getPairs(hunk) {
  const pairs = []
  const deletes = []
  const adds = []

  for (const line of hunk.lines) {
    if (line.type === 'delete') {
      deletes.push(line)
    } else if (line.type === 'add') {
      adds.push(line)
    } else {
      // Flush pending deletes and adds first
      flush(pairs, deletes, adds)
      // Context line: both sides
      pairs.push({ left: line, right: line })
    }
  }
  // Flush remaining
  flush(pairs, deletes, adds)

  return pairs
}

function flush(pairs, deletes, adds) {
  const max = Math.max(deletes.length, adds.length)
  for (let i = 0; i < max; i++) {
    pairs.push({
      left: deletes[i] || { type: 'empty', text: '', oldNum: '' },
      right: adds[i] || { type: 'empty', text: '', newNum: '' },
    })
  }
  deletes.length = 0
  adds.length = 0
}
</script>
