<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">
      MIME 类型速查
    </h1>
    <div class="flex gap-6">
      <!-- Left list -->
      <div class="flex flex-col gap-4 min-w-0 flex-1">
        <input
          v-model="search"
          class="input input-bordered w-full"
          placeholder="输入 MIME 类型、扩展名或关键词..."
        >

        <div
          v-for="group in filteredGroups"
          :key="group.key"
        >
          <div
            class="flex items-center gap-2 cursor-pointer select-none py-1"
            @click="toggleGroup(group.key)"
          >
            <svg
              class="w-4 h-4 transition-transform"
              :class="{ 'rotate-90': !collapsed.has(group.key) }"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M9 5l7 7-7 7"
              />
            </svg>
            <span class="font-semibold">{{ group.key }}/{{ group.name }}</span>
            <span class="text-xs opacity-50">({{ group.items.length }})</span>
          </div>

          <div
            v-if="!collapsed.has(group.key)"
            class="flex flex-col"
          >
            <div
              v-for="item in group.items"
              :key="item.type"
            >
              <div
                class="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-base-200 cursor-pointer lg:cursor-default"
                :class="{ 'bg-base-300': activeType === item.type }"
                @mouseenter="activeType = item.type"
                @click="activeType = activeType === item.type ? null : item.type"
              >
                <div class="flex gap-1 shrink-0">
                  <span
                    v-for="ext in item.exts"
                    :key="ext"
                    class="badge badge-sm badge-accent font-mono"
                  >{{ ext }}</span>
                </div>
                <span class="font-mono text-sm break-all">{{ item.type }}</span>
              </div>
              <!-- Mobile inline detail -->
              <div
                v-if="activeType === item.type"
                class="lg:hidden px-2 pb-2 pl-10 text-sm leading-relaxed opacity-80"
              >
                {{ item.type }} — 扩展名:
                <span
                  v-for="ext in item.exts"
                  :key="ext"
                  class="badge badge-sm badge-accent font-mono"
                >{{ ext }}</span>
                <p class="mt-1">
                  {{ item.detail }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div
          v-if="search && filteredGroups.length === 0"
          class="text-center py-8 opacity-50"
        >
          未找到匹配的 MIME 类型
        </div>
      </div>

      <!-- Right detail panel (desktop only) -->
      <div class="hidden lg:block w-72 shrink-0 sticky top-20 self-start">
        <div
          v-if="activeItem"
          class="card bg-base-200"
        >
          <div class="card-body">
            <p class="font-mono text-sm break-all">
              {{ activeItem.type }}
            </p>
            <div class="divider my-1" />
            <div class="text-sm">
              <p>
                <span class="font-semibold">扩展名：</span>
                <span class="inline-flex gap-1">
                  <span
                    v-for="ext in activeItem.exts"
                    :key="ext"
                    class="badge badge-sm badge-accent font-mono"
                  >{{ ext }}</span>
                </span>
                <span v-if="!activeItem.exts.length">无</span>
              </p>
              <p class="mt-2">
                <span class="font-semibold">说明：</span>{{ activeItem.desc }}
              </p>
              <p class="mt-2 leading-relaxed opacity-80">
                {{ activeItem.detail }}
              </p>
            </div>
          </div>
        </div>
        <div
          v-else
          class="text-sm opacity-40 text-center pt-8"
        >
          悬停条目查看详细信息
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { searchMimeTypes } from '../utils/mime-types.js'

const search = ref('')
const activeType = ref(null)
const collapsed = ref(new Set())

const activeItem = computed(() => {
  if (!activeType.value) return null
  const items = searchMimeTypes(search.value.trim())
  return items.find(item => item.type === activeType.value) || null
})

const filteredGroups = computed(() => {
  const items = searchMimeTypes(search.value)
  const map = new Map()
  for (const item of items) {
    const category = item.type.split('/')[0]
    if (!map.has(category)) {
      map.set(category, { key: category, name: category.charAt(0).toUpperCase() + category.slice(1), items: [] })
    }
    map.get(category).items.push(item)
  }
  return Array.from(map.values())
})

function toggleGroup(key) {
  if (collapsed.value.has(key)) {
    collapsed.value.delete(key)
  } else {
    collapsed.value.add(key)
  }
}
</script>
