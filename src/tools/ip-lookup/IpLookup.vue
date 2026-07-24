<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">
      IP 查询
    </h1>
    <div class="flex flex-col gap-4 max-w-2xl">
      <div class="flex gap-2">
        <input
          v-model="queryIp"
          class="input input-bordered w-full font-mono text-sm"
          placeholder="输入 IP 地址（留空查询当前 IP）"
          @keyup.enter="lookup"
        >
        <button
          class="btn btn-primary gap-1"
          :disabled="loading"
          @click="lookup"
        >
          <Icon
            icon="lucide:search"
            class="w-4 h-4"
          />
          查询
        </button>
      </div>

      <div
        v-if="loading"
        class="flex justify-center py-8"
      >
        <span class="loading loading-spinner loading-lg" />
      </div>

      <div
        v-if="error"
        class="alert alert-error"
      >
        <span>{{ error }}</span>
      </div>

      <div
        v-if="displayRows.length"
        class="overflow-x-auto"
      >
        <table class="table table-zebra">
          <tbody>
            <tr
              v-for="row in displayRows"
              :key="row.label"
            >
              <td class="font-semibold w-32">
                {{ row.label }}
              </td>
              <td class="font-mono text-sm">
                {{ row.value }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Icon } from '@iconify/vue'
import { ref } from 'vue'
const queryIp = ref('')
const displayRows = ref([])
const loading = ref(false)
const error = ref('')

const LABEL_MAP = {
  ip: 'IP 地址',
  city: '城市',
  region: '省份/地区',
  country_name: '国家',
  country_code: '国家代码',
  postal: '邮编',
  latitude: '纬度',
  longitude: '经度',
  timezone: '时区',
  org: '运营商',
  asn: 'ASN',
}

function mapResult(data) {
  const rows = []
  for (const [key, label] of Object.entries(LABEL_MAP)) {
    if (data[key] !== undefined && data[key] !== null) {
      rows.push({ label, value: String(data[key]) })
    }
  }
  return rows
}

async function lookup() {
  error.value = ''
  displayRows.value = []
  loading.value = true
  try {
    const ip = queryIp.value.trim()
    const url = ip ? `https://ipapi.co/${ip}/json/` : 'https://ipapi.co/json/'
    const res = await fetch(url)
    if (!res.ok) throw new Error(`请求失败 (${res.status})`)
    const data = await res.json()
    if (data.error) throw new Error(data.reason || data.error || '查询失败')
    displayRows.value = mapResult(data)
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

lookup()
</script>
