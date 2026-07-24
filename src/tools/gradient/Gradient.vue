<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">
      渐变
    </h1>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Left: Controls -->
      <div class="flex flex-col gap-4">
        <!-- Gradient type -->
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">渐变类型</span></label>
          <div class="flex gap-2">
            <label
              v-for="t in types"
              :key="t.value"
              class="flex items-center gap-2 cursor-pointer"
            >
              <input
                v-model="type"
                type="radio"
                name="gradient-type"
                :value="t.value"
                class="radio radio-sm radio-primary"
              >
              <span class="text-sm">{{ t.label }}</span>
            </label>
          </div>
        </div>

        <!-- Direction controls -->
        <div
          v-if="type === 'linear'"
          class="form-control"
        >
          <label class="label"><span class="label-text font-semibold">角度</span></label>
          <div class="flex items-center gap-2">
            <input
              v-model.number="angle"
              type="range"
              min="0"
              max="360"
              class="range range-sm flex-1"
            >
            <span class="text-sm w-12 text-right">{{ angle }}&deg;</span>
          </div>
        </div>

        <template v-if="type === 'radial'">
          <div class="form-control">
            <label class="label"><span class="label-text font-semibold">形状</span></label>
            <div class="flex gap-2">
              <label
                v-for="s in shapes"
                :key="s.value"
                class="flex items-center gap-2 cursor-pointer"
              >
                <input
                  v-model="shape"
                  type="radio"
                  name="radial-shape"
                  :value="s.value"
                  class="radio radio-sm radio-primary"
                >
                <span class="text-sm">{{ s.label }}</span>
              </label>
            </div>
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text font-semibold">位置</span></label>
            <select
              v-model="position"
              class="select select-bordered select-sm w-full"
            >
              <option
                v-for="p in positions"
                :key="p.value"
                :value="p.value"
              >
                {{ p.label }}
              </option>
            </select>
          </div>
        </template>

        <template v-if="type === 'conic'">
          <div class="form-control">
            <label class="label"><span class="label-text font-semibold">起始角度</span></label>
            <div class="flex items-center gap-2">
              <input
                v-model.number="startAngle"
                type="range"
                min="0"
                max="360"
                class="range range-sm flex-1"
              >
              <span class="text-sm w-12 text-right">{{ startAngle }}&deg;</span>
            </div>
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text font-semibold">位置</span></label>
            <select
              v-model="position"
              class="select select-bordered select-sm w-full"
            >
              <option
                v-for="p in positions"
                :key="p.value"
                :value="p.value"
              >
                {{ p.label }}
              </option>
            </select>
          </div>
        </template>

        <!-- Color stops -->
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">色标</span></label>
          <ul class="flex flex-col gap-1">
            <li
              v-for="(stop, i) in stops"
              :key="i"
              class="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer"
              :class="i === selectedStopIndex ? 'bg-primary/10 border border-primary' : 'bg-base-200 border border-transparent hover:bg-base-300'"
              @click="selectedStopIndex = i"
            >
              <span
                class="w-4 h-4 rounded-sm border border-base-300 shrink-0"
                :style="{ backgroundColor: stop.color }"
              />
              <span class="font-mono text-xs flex-1">{{ stop.color }} {{ stop.position }}%</span>
              <button
                class="btn btn-ghost btn-xs"
                :disabled="stops.length <= 2"
                @click.stop="removeStop(i)"
              >
                <Icon
                  icon="lucide:x"
                  class="w-3 h-3"
                />
              </button>
            </li>
          </ul>
          <button
            class="btn btn-outline btn-sm mt-2 gap-1"
            @click="addStop"
          >
            <Icon
              icon="lucide:plus"
              class="w-4 h-4"
            />
            添加色标
          </button>
        </div>

        <!-- Selected stop detail -->
        <template v-if="selectedStop">
          <div class="form-control">
            <label class="label"><span class="label-text font-semibold">色标颜色</span></label>
            <div class="flex items-center gap-2">
              <input
                v-model="selectedStop.color"
                type="color"
                class="input input-bordered w-12 h-10 p-1 cursor-pointer"
              >
              <input
                v-model="selectedStop.color"
                type="text"
                class="input input-bordered w-full font-mono text-sm"
              >
            </div>
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text font-semibold">色标位置</span></label>
            <div class="flex items-center gap-2">
              <input
                v-model.number="selectedStop.position"
                type="range"
                min="0"
                max="100"
                class="range range-sm flex-1"
              >
              <span class="text-sm w-12 text-right">{{ selectedStop.position }}%</span>
            </div>
          </div>
        </template>
      </div>

      <!-- Right: Preview + Code -->
      <div class="flex flex-col gap-4">
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">预览</span></label>
          <div
            class="rounded-lg border border-base-300 min-h-[120px]"
            :style="{ background: cssValue }"
          />
        </div>
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">CSS 代码</span></label>
          <div class="relative">
            <pre class="bg-base-200 rounded-lg p-4 font-mono text-sm break-all whitespace-pre-wrap">{{ cssCode }}</pre>
            <button
              class="btn btn-ghost btn-xs btn-square absolute right-2 top-2"
              :title="copied ? '已复制！' : '复制'"
              @click="copyCode"
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
import { ref, computed } from 'vue'
const types = [
  { value: 'linear', label: '线性' },
  { value: 'radial', label: '径向' },
  { value: 'conic', label: '锥形' },
]

const shapes = [
  { value: 'circle', label: 'circle' },
  { value: 'ellipse', label: 'ellipse' },
]

const positions = [
  { value: 'center', label: 'center' },
  { value: 'top', label: 'top' },
  { value: 'bottom', label: 'bottom' },
  { value: 'left', label: 'left' },
  { value: 'right', label: 'right' },
  { value: 'top left', label: 'top left' },
  { value: 'top right', label: 'top right' },
  { value: 'bottom left', label: 'bottom left' },
  { value: 'bottom right', label: 'bottom right' },
]

const type = ref('linear')
const angle = ref(90)
const shape = ref('circle')
const position = ref('center')
const startAngle = ref(0)
const stops = ref([
  { color: '#6366f1', position: 0 },
  { color: '#ec4899', position: 100 },
])
const selectedStopIndex = ref(0)
const copied = ref(false)

const selectedStop = computed(() => stops.value[selectedStopIndex.value])

const stopsStr = computed(() => stops.value.map(s => `${s.color} ${s.position}%`).join(', '))

const cssValue = computed(() => {
  if (type.value === 'linear') {
    return `linear-gradient(${angle.value}deg, ${stopsStr.value})`
  } else if (type.value === 'radial') {
    return `radial-gradient(${shape.value} at ${position.value}, ${stopsStr.value})`
  } else {
    return `conic-gradient(from ${startAngle.value}deg at ${position.value}, ${stopsStr.value})`
  }
})

const cssCode = computed(() => `background: ${cssValue.value};`)

function addStop() {
  const lastPos = stops.value[stops.value.length - 1]?.position ?? 100
  stops.value.push({ color: '#ffffff', position: Math.min(lastPos, 100) })
  selectedStopIndex.value = stops.value.length - 1
}

function removeStop(i) {
  if (stops.value.length <= 2) return
  stops.value.splice(i, 1)
  if (selectedStopIndex.value >= stops.value.length) {
    selectedStopIndex.value = stops.value.length - 1
  }
}

async function copyCode() {
  try {
    await navigator.clipboard.writeText(cssCode.value)
    copied.value = true
    setTimeout(() => copied.value = false, 1500)
  } catch { /* clipboard not available */ }
}
</script>
