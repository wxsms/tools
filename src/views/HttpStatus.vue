<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">
      HTTP 状态码查询
    </h1>
    <div class="flex flex-col gap-4 max-w-2xl">
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

        <div v-if="!collapsed.has(group.classCode)">
          <div
            v-for="item in group.items"
            :key="item.code"
            class="flex items-center gap-3 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-base-200"
            :class="{ 'bg-base-300': activeCode === item.code }"
            @click="activeCode = activeCode === item.code ? null : item.code"
          >
            <span
              class="badge badge-sm font-mono"
              :class="badgeClass(item.code)"
            >{{ item.code }}</span>
            <span class="font-medium text-sm">{{ item.name }}</span>
            <span class="text-sm opacity-60">{{ item.desc }}</span>
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
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const STATUS_CODES = [
  // 1xx Informational
  { code: 100, name: 'Continue', desc: '继续发送请求' },
  { code: 101, name: 'Switching Protocols', desc: '切换协议' },
  { code: 102, name: 'Processing', desc: '处理中' },
  // 2xx Success
  { code: 200, name: 'OK', desc: '请求成功' },
  { code: 201, name: 'Created', desc: '资源已创建' },
  { code: 202, name: 'Accepted', desc: '请求已接受' },
  { code: 204, name: 'No Content', desc: '无内容' },
  { code: 206, name: 'Partial Content', desc: '部分内容' },
  // 3xx Redirection
  { code: 300, name: 'Multiple Choices', desc: '多种选择' },
  { code: 301, name: 'Moved Permanently', desc: '永久重定向' },
  { code: 302, name: 'Found', desc: '临时重定向' },
  { code: 303, name: 'See Other', desc: '查看其他' },
  { code: 304, name: 'Not Modified', desc: '未修改' },
  { code: 307, name: 'Temporary Redirect', desc: '临时重定向' },
  { code: 308, name: 'Permanent Redirect', desc: '永久重定向' },
  // 4xx Client Error
  { code: 400, name: 'Bad Request', desc: '错误请求' },
  { code: 401, name: 'Unauthorized', desc: '未授权' },
  { code: 402, name: 'Payment Required', desc: '需要付款' },
  { code: 403, name: 'Forbidden', desc: '禁止访问' },
  { code: 404, name: 'Not Found', desc: '未找到' },
  { code: 405, name: 'Method Not Allowed', desc: '方法不允许' },
  { code: 406, name: 'Not Acceptable', desc: '不可接受' },
  { code: 408, name: 'Request Timeout', desc: '请求超时' },
  { code: 409, name: 'Conflict', desc: '冲突' },
  { code: 410, name: 'Gone', desc: '资源已删除' },
  { code: 411, name: 'Length Required', desc: '需要内容长度' },
  { code: 412, name: 'Precondition Failed', desc: '前提条件失败' },
  { code: 413, name: 'Payload Too Large', desc: '请求体过大' },
  { code: 414, name: 'URI Too Long', desc: 'URI 过长' },
  { code: 415, name: 'Unsupported Media Type', desc: '不支持的媒体类型' },
  { code: 418, name: "I'm a Teapot", desc: '我是茶壶' },
  { code: 422, name: 'Unprocessable Entity', desc: '无法处理的实体' },
  { code: 425, name: 'Too Early', desc: '太早' },
  { code: 426, name: 'Upgrade Required', desc: '需要升级' },
  { code: 428, name: 'Precondition Required', desc: '需要前提条件' },
  { code: 429, name: 'Too Many Requests', desc: '请求过多' },
  { code: 431, name: 'Request Header Fields Too Large', desc: '请求头字段过大' },
  { code: 451, name: 'Unavailable For Legal Reasons', desc: '因法律原因不可用' },
  // 5xx Server Error
  { code: 500, name: 'Internal Server Error', desc: '服务器内部错误' },
  { code: 501, name: 'Not Implemented', desc: '未实现' },
  { code: 502, name: 'Bad Gateway', desc: '网关错误' },
  { code: 503, name: 'Service Unavailable', desc: '服务不可用' },
  { code: 504, name: 'Gateway Timeout', desc: '网关超时' },
  { code: 505, name: 'HTTP Version Not Supported', desc: 'HTTP 版本不支持' },
  { code: 506, name: 'Variant Also Negotiates', desc: '变体也协商' },
  { code: 507, name: 'Insufficient Storage', desc: '存储不足' },
  { code: 508, name: 'Loop Detected', desc: '检测到循环' },
  { code: 510, name: 'Not Extended', desc: '未扩展' },
  { code: 511, name: 'Network Authentication Required', desc: '需要网络认证' },
]

const CLASS_NAMES = {
  1: '信息性',
  2: '成功',
  3: '重定向',
  4: '客户端错误',
  5: '服务器错误',
}

const search = ref('')
const activeCode = ref(null)
const collapsed = ref(new Set())

function badgeClass(code) {
  const cls = Math.floor(code / 100)
  if (cls === 1) return 'badge-info'
  if (cls === 2) return 'badge-success'
  if (cls === 3) return 'badge-warning'
  if (cls === 4) return 'badge-orange'
  if (cls === 5) return 'badge-error'
  return ''
}

const filteredItems = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return STATUS_CODES
  return STATUS_CODES.filter(item =>
    String(item.code).includes(q) ||
    item.name.toLowerCase().includes(q) ||
    item.desc.includes(q),
  )
})

const filteredGroups = computed(() => {
  const groups = []
  for (const item of filteredItems.value) {
    const cls = Math.floor(item.code / 100)
    let group = groups.find(g => g.classCode === cls)
    if (!group) {
      group = { classCode: cls, className: CLASS_NAMES[cls] || '', items: [] }
      groups.push(group)
    }
    group.items.push(item)
  }
  return groups
})

function toggleGroup(classCode) {
  if (collapsed.value.has(classCode)) {
    collapsed.value.delete(classCode)
  } else {
    collapsed.value.add(classCode)
  }
}
</script>
