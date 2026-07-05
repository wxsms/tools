<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">
      HTTP 状态码查询
    </h1>
    <div class="flex gap-6">
      <!-- 左侧列表 -->
      <div class="flex flex-col gap-4 min-w-0 flex-1">
        <input
          v-model="search"
          class="input input-bordered w-full"
          placeholder="输入状态码或关键词..."
        >

        <div
          v-for="group in filteredGroups"
          :key="group.classCode"
        >
          <div
            class="flex items-center gap-2 cursor-pointer select-none py-1"
            @click="toggleGroup(group.classCode)"
          >
            <svg
              class="w-4 h-4 transition-transform"
              :class="{ 'rotate-90': !collapsed.has(group.classCode) }"
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
            <span class="font-semibold">{{ group.classCode }}xx {{ group.className }}</span>
            <span class="text-xs opacity-50">({{ group.items.length }})</span>
          </div>

          <div
            v-if="!collapsed.has(group.classCode)"
            class="flex flex-col"
          >
            <div
              v-for="item in group.items"
              :key="item.code"
            >
              <div
                class="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-base-200 cursor-pointer lg:cursor-default"
                :class="{ 'bg-base-300': activeCode === item.code }"
                @mouseenter="activeCode = item.code"
                @click="activeCode = activeCode === item.code ? null : item.code"
              >
                <span
                  class="badge badge-sm font-mono shrink-0"
                  :class="badgeClass(item.code)"
                >{{ item.code }}</span>
                <span class="font-medium text-sm shrink-0">{{ item.name }}</span>
                <span class="text-sm opacity-60">{{ item.desc }}</span>
              </div>
              <!-- 移动端行内展开详情 -->
              <div
                v-if="activeCode === item.code"
                class="lg:hidden px-2 pb-2 pl-10 text-sm leading-relaxed opacity-80"
              >
                {{ item.detail }}
              </div>
            </div>
          </div>
        </div>

        <div
          v-if="search && filteredGroups.length === 0"
          class="text-center py-8 opacity-50"
        >
          未找到匹配的状态码
        </div>
      </div>

      <!-- 右侧详情面板（仅大屏） -->
      <div class="hidden lg:block w-72 shrink-0 sticky top-20 self-start">
        <div
          v-if="activeItem"
          class="card bg-base-200"
        >
          <div class="card-body">
            <div class="flex items-center gap-3">
              <span
                class="badge font-mono text-base"
                :class="badgeClass(activeItem.code)"
              >{{ activeItem.code }}</span>
              <span class="font-semibold">{{ activeItem.name }}</span>
            </div>
            <p class="text-sm opacity-70">
              {{ activeItem.desc }}
            </p>
            <div class="divider my-1" />
            <p class="text-sm leading-relaxed">
              {{ activeItem.detail }}
            </p>
          </div>
        </div>
        <div
          v-else
          class="text-sm opacity-40 text-center pt-8"
        >
          悬停状态码查看详细说明
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { STATUS_CODES, badgeClass, filterStatusCodes, groupByClass } from './http-status.js'

const search = ref('')
const activeCode = ref(null)
const collapsed = ref(new Set())

const activeItem = computed(() => {
  if (activeCode.value == null) return null
  return STATUS_CODES.find(item => item.code === activeCode.value)
})

const filteredItems = computed(() => {
  return filterStatusCodes(STATUS_CODES, search.value.trim().toLowerCase())
})

const filteredGroups = computed(() => groupByClass(filteredItems.value))

function toggleGroup(classCode) {
  if (collapsed.value.has(classCode)) {
    collapsed.value.delete(classCode)
  } else {
    collapsed.value.add(classCode)
  }
}
</script>
