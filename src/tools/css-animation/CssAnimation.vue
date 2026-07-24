<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">
      CSS 动画
    </h1>
    <div class="flex flex-col gap-4 max-w-2xl">
      <!-- Preset -->
      <div class="form-control">
        <label class="label"><span class="label-text font-semibold">预设</span></label>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="p in presets"
            :key="p.name"
            class="btn btn-sm"
            :class="activePreset === p.name ? 'btn-primary' : 'btn-outline'"
            @click="applyPreset(p)"
          >
            {{ p.label }}
          </button>
        </div>
      </div>

      <!-- Duration -->
      <div class="form-control">
        <label class="label"><span class="label-text font-semibold">时长</span></label>
        <div class="flex items-center gap-2">
          <input
            v-model.number="duration"
            type="range"
            min="0.1"
            max="5"
            step="0.1"
            class="range range-sm flex-1"
          >
          <span class="text-sm w-16 text-right">{{ duration.toFixed(1) }}s</span>
        </div>
      </div>
    </div>

    <!-- Preview + Code -->
    <div class="flex flex-col gap-4 mt-4">
      <div class="form-control">
        <label class="label"><span class="label-text font-semibold">预览</span></label>
        <div
          class="rounded-lg border border-base-300 min-h-[200px] flex items-center justify-center"
          :style="{ backgroundImage: checkerboard }"
        >
          <div
            :key="animKey"
            class="w-20 h-20"
            :style="previewStyle"
          />
        </div>
        <div class="flex justify-end mt-2">
          <button
            class="btn btn-sm gap-1"
            @click="restartAnimation"
          >
            <Icon
              icon="lucide:refresh-cw"
              class="w-4 h-4"
            />
            重播
          </button>
        </div>
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

    <!-- Advanced options (collapsible) -->
    <div class="collapse collapse-arrow bg-base-200 mt-4">
      <input
        v-model="showAdvanced"
        type="checkbox"
      >
      <div class="collapse-title text-sm font-semibold py-2 min-h-0">
        高级选项
      </div>
      <div class="collapse-content">
        <div class="flex flex-col gap-4 pt-2">
          <!-- Animation name -->
          <div class="form-control">
            <label class="label"><span class="label-text font-semibold">动画名称</span></label>
            <input
              v-model="animName"
              type="text"
              class="input input-bordered w-full font-mono text-sm"
            >
          </div>

          <!-- Timing function -->
          <div class="form-control">
            <label class="label"><span class="label-text font-semibold">缓动函数</span></label>
            <select
              v-model="timingFn"
              class="select select-bordered w-full"
            >
              <option
                v-for="fn in timingFunctions"
                :key="fn.value"
                :value="fn.value"
              >
                {{ fn.label }}
              </option>
            </select>
          </div>

          <!-- Cubic bezier (visible when custom) -->
          <template v-if="timingFn.startsWith('cubic-bezier')">
            <div class="form-control">
              <label class="label"><span class="label-text font-semibold">贝塞尔曲线</span></label>
              <div class="grid grid-cols-4 gap-2">
                <div
                  v-for="(val, i) in bezierParams"
                  :key="i"
                >
                  <input
                    v-model.number="bezierParams[i]"
                    type="number"
                    step="0.05"
                    min="0"
                    max="1"
                    class="input input-bordered input-sm w-full font-mono text-sm text-center"
                  >
                </div>
              </div>
              <div class="flex gap-2 text-xs opacity-50 mt-1 px-1">
                <span class="flex-1 text-center">x1</span>
                <span class="flex-1 text-center">y1</span>
                <span class="flex-1 text-center">x2</span>
                <span class="flex-1 text-center">y2</span>
              </div>
            </div>
          </template>

          <!-- Iteration count -->
          <div class="form-control">
            <label class="label"><span class="label-text font-semibold">循环次数</span></label>
            <div class="flex items-center gap-2">
              <input
                v-model.number="iterations"
                type="range"
                min="1"
                max="10"
                step="1"
                class="range range-sm flex-1"
                :disabled="infinite"
              >
              <span class="text-sm w-12 text-right">{{ infinite ? '∞' : iterations }}</span>
              <label class="label cursor-pointer gap-2 ml-2">
                <input
                  v-model="infinite"
                  type="checkbox"
                  class="checkbox checkbox-sm checkbox-primary"
                >
                <span class="label-text">无限</span>
              </label>
            </div>
          </div>

          <!-- Direction -->
          <div class="form-control">
            <label class="label"><span class="label-text font-semibold">方向</span></label>
            <select
              v-model="direction"
              class="select select-bordered w-full"
            >
              <option
                v-for="d in directions"
                :key="d.value"
                :value="d.value"
              >
                {{ d.label }}
              </option>
            </select>
          </div>

          <!-- Fill mode -->
          <div class="form-control">
            <label class="label"><span class="label-text font-semibold">填充模式</span></label>
            <select
              v-model="fillMode"
              class="select select-bordered w-full"
            >
              <option
                v-for="f in fillModes"
                :key="f.value"
                :value="f.value"
              >
                {{ f.label }}
              </option>
            </select>
          </div>

          <!-- Keyframes -->
          <div class="form-control">
            <label class="label"><span class="label-text font-semibold">关键帧</span></label>
            <ul class="flex flex-col gap-1">
              <li
                v-for="(kf, i) in keyframes"
                :key="i"
                class="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer"
                :class="i === selectedKf ? 'bg-primary/10 border border-primary' : 'bg-base-200 border border-transparent hover:bg-base-300'"
                @click="selectedKf = i"
              >
                <span class="font-mono text-xs flex-1">{{ kf.offset === 0 ? 'from' : kf.offset === 100 ? 'to' : kf.offset + '%' }}</span>
                <button
                  class="btn btn-ghost btn-xs"
                  :disabled="keyframes.length <= 2"
                  @click.stop="removeKeyframe(i)"
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
              @click="addKeyframe"
            >
              <Icon
                icon="lucide:plus"
                class="w-4 h-4"
              />
              添加关键帧
            </button>
          </div>

          <!-- Selected keyframe properties -->
          <template v-if="currentKf">
            <div class="divider mt-0 mb-2" />
            <p class="text-sm font-semibold mb-2">
              {{ currentKf.offset === 0 ? 'from' : currentKf.offset === 100 ? 'to' : currentKf.offset + '%' }} 属性
            </p>

            <div class="form-control">
              <label class="label"><span class="label-text font-semibold">位移 X</span></label>
              <div class="flex items-center gap-2">
                <input
                  v-model.number="currentKf.translateX"
                  type="range"
                  min="-200"
                  max="200"
                  class="range range-sm flex-1"
                >
                <span class="text-sm w-16 text-right">{{ currentKf.translateX }}px</span>
              </div>
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text font-semibold">位移 Y</span></label>
              <div class="flex items-center gap-2">
                <input
                  v-model.number="currentKf.translateY"
                  type="range"
                  min="-200"
                  max="200"
                  class="range range-sm flex-1"
                >
                <span class="text-sm w-16 text-right">{{ currentKf.translateY }}px</span>
              </div>
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text font-semibold">缩放</span></label>
              <div class="flex items-center gap-2">
                <input
                  v-model.number="currentKf.scale"
                  type="range"
                  min="0"
                  max="3"
                  step="0.05"
                  class="range range-sm flex-1"
                >
                <span class="text-sm w-16 text-right">{{ currentKf.scale.toFixed(2) }}</span>
              </div>
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text font-semibold">旋转</span></label>
              <div class="flex items-center gap-2">
                <input
                  v-model.number="currentKf.rotate"
                  type="range"
                  min="-360"
                  max="360"
                  class="range range-sm flex-1"
                >
                <span class="text-sm w-16 text-right">{{ currentKf.rotate }}°</span>
              </div>
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text font-semibold">透明度</span></label>
              <div class="flex items-center gap-2">
                <input
                  v-model.number="currentKf.opacity"
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  class="range range-sm flex-1"
                >
                <span class="text-sm w-12 text-right">{{ Math.round(currentKf.opacity * 100) }}%</span>
              </div>
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text font-semibold">背景色</span></label>
              <div class="flex items-center gap-2">
                <input
                  v-model="currentKf.backgroundColor"
                  type="color"
                  class="input input-bordered w-12 h-10 p-1 cursor-pointer"
                >
                <input
                  v-model="currentKf.backgroundColor"
                  type="text"
                  class="input input-bordered w-full font-mono text-sm"
                >
              </div>
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text font-semibold">圆角</span></label>
              <div class="flex items-center gap-2">
                <input
                  v-model.number="currentKf.borderRadius"
                  type="range"
                  min="0"
                  max="50"
                  class="range range-sm flex-1"
                >
                <span class="text-sm w-16 text-right">{{ currentKf.borderRadius }}%</span>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Icon } from '@iconify/vue'
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
const defaultKf = (offset) => ({
  offset,
  translateX: 0,
  translateY: 0,
  scale: 1,
  rotate: 0,
  opacity: 1,
  backgroundColor: '#6366f1',
  borderRadius: 10,
})

const animName = ref('bounce')
const duration = ref(1)
const timingFn = ref('ease')
const bezierParams = ref([0.25, 0.1, 0.25, 1])
const iterations = ref(1)
const infinite = ref(true)
const direction = ref('normal')
const fillMode = ref('none')
const selectedKf = ref(0)
const copied = ref(false)
const animKey = ref(0)
const showAdvanced = ref(false)
const activePreset = ref('bounce')

const keyframes = ref([
  { ...defaultKf(0), translateY: 0, scale: 1, opacity: 1, borderRadius: 10, backgroundColor: '#6366f1' },
  { ...defaultKf(50), translateY: -40, scale: 1.2, opacity: 0.8, borderRadius: 30, backgroundColor: '#8b5cf6' },
  { ...defaultKf(100), translateY: 0, scale: 1, opacity: 1, borderRadius: 10, backgroundColor: '#6366f1' },
])

const presets = [
  {
    name: 'bounce',
    label: '弹跳',
    animName: 'bounce',
    duration: 0.6,
    timingFn: 'ease',
    infinite: true,
    direction: 'normal',
    fillMode: 'none',
    keyframes: [
      { offset: 0, translateX: 0, translateY: 0, scale: 1, rotate: 0, opacity: 1, backgroundColor: '#6366f1', borderRadius: 10 },
      { offset: 50, translateX: 0, translateY: -60, scale: 1, rotate: 0, opacity: 1, backgroundColor: '#6366f1', borderRadius: 10 },
      { offset: 100, translateX: 0, translateY: 0, scale: 1, rotate: 0, opacity: 1, backgroundColor: '#6366f1', borderRadius: 10 },
    ],
  },
  {
    name: 'fade-in',
    label: '淡入',
    animName: 'fade-in',
    duration: 1,
    timingFn: 'ease-out',
    infinite: true,
    direction: 'normal',
    fillMode: 'none',
    keyframes: [
      { offset: 0, translateX: 0, translateY: 0, scale: 1, rotate: 0, opacity: 0, backgroundColor: '#6366f1', borderRadius: 10 },
      { offset: 100, translateX: 0, translateY: 0, scale: 1, rotate: 0, opacity: 1, backgroundColor: '#6366f1', borderRadius: 10 },
    ],
  },
  {
    name: 'spin',
    label: '旋转',
    animName: 'spin',
    duration: 1,
    timingFn: 'linear',
    infinite: true,
    direction: 'normal',
    fillMode: 'none',
    keyframes: [
      { offset: 0, translateX: 0, translateY: 0, scale: 1, rotate: 0, opacity: 1, backgroundColor: '#6366f1', borderRadius: 10 },
      { offset: 100, translateX: 0, translateY: 0, scale: 1, rotate: 360, opacity: 1, backgroundColor: '#6366f1', borderRadius: 10 },
    ],
  },
  {
    name: 'pulse',
    label: '脉冲',
    animName: 'pulse',
    duration: 1,
    timingFn: 'ease-in-out',
    infinite: true,
    direction: 'normal',
    fillMode: 'none',
    keyframes: [
      { offset: 0, translateX: 0, translateY: 0, scale: 1, rotate: 0, opacity: 1, backgroundColor: '#6366f1', borderRadius: 10 },
      { offset: 50, translateX: 0, translateY: 0, scale: 1.3, rotate: 0, opacity: 0.7, backgroundColor: '#8b5cf6', borderRadius: 10 },
      { offset: 100, translateX: 0, translateY: 0, scale: 1, rotate: 0, opacity: 1, backgroundColor: '#6366f1', borderRadius: 10 },
    ],
  },
  {
    name: 'slide-in',
    label: '滑入',
    animName: 'slide-in',
    duration: 0.8,
    timingFn: 'ease-out',
    infinite: true,
    direction: 'normal',
    fillMode: 'none',
    keyframes: [
      { offset: 0, translateX: -100, translateY: 0, scale: 1, rotate: 0, opacity: 0, backgroundColor: '#6366f1', borderRadius: 10 },
      { offset: 100, translateX: 0, translateY: 0, scale: 1, rotate: 0, opacity: 1, backgroundColor: '#6366f1', borderRadius: 10 },
    ],
  },
  {
    name: 'shake',
    label: '抖动',
    animName: 'shake',
    duration: 0.5,
    timingFn: 'ease-in-out',
    infinite: true,
    direction: 'normal',
    fillMode: 'none',
    keyframes: [
      { offset: 0, translateX: 0, translateY: 0, scale: 1, rotate: 0, opacity: 1, backgroundColor: '#6366f1', borderRadius: 10 },
      { offset: 25, translateX: -15, translateY: 0, scale: 1, rotate: 0, opacity: 1, backgroundColor: '#6366f1', borderRadius: 10 },
      { offset: 50, translateX: 15, translateY: 0, scale: 1, rotate: 0, opacity: 1, backgroundColor: '#6366f1', borderRadius: 10 },
      { offset: 75, translateX: -10, translateY: 0, scale: 1, rotate: 0, opacity: 1, backgroundColor: '#6366f1', borderRadius: 10 },
      { offset: 100, translateX: 0, translateY: 0, scale: 1, rotate: 0, opacity: 1, backgroundColor: '#6366f1', borderRadius: 10 },
    ],
  },
  {
    name: 'flip',
    label: '翻转',
    animName: 'flip',
    duration: 0.8,
    timingFn: 'ease-in-out',
    infinite: true,
    direction: 'normal',
    fillMode: 'none',
    keyframes: [
      { offset: 0, translateX: 0, translateY: 0, scale: 1, rotate: 0, opacity: 1, backgroundColor: '#6366f1', borderRadius: 10 },
      { offset: 50, translateX: 0, translateY: 0, scale: 0.5, rotate: 180, opacity: 0.5, backgroundColor: '#8b5cf6', borderRadius: 30 },
      { offset: 100, translateX: 0, translateY: 0, scale: 1, rotate: 360, opacity: 1, backgroundColor: '#6366f1', borderRadius: 10 },
    ],
  },
  {
    name: 'morph',
    label: '变形',
    animName: 'morph',
    duration: 1.5,
    timingFn: 'ease-in-out',
    infinite: true,
    direction: 'alternate',
    fillMode: 'none',
    keyframes: [
      { offset: 0, translateX: 0, translateY: 0, scale: 1, rotate: 0, opacity: 1, backgroundColor: '#6366f1', borderRadius: 10 },
      { offset: 50, translateX: 40, translateY: -20, scale: 1.2, rotate: 45, opacity: 0.8, backgroundColor: '#ec4899', borderRadius: 50 },
      { offset: 100, translateX: 0, translateY: 0, scale: 0.8, rotate: 90, opacity: 1, backgroundColor: '#f59e0b', borderRadius: 0 },
    ],
  },
  {
    name: 'fade-out',
    label: '淡出',
    animName: 'fade-out',
    duration: 1,
    timingFn: 'ease-in',
    infinite: true,
    direction: 'alternate',
    fillMode: 'none',
    keyframes: [
      { offset: 0, translateX: 0, translateY: 0, scale: 1, rotate: 0, opacity: 1, backgroundColor: '#6366f1', borderRadius: 10 },
      { offset: 100, translateX: 0, translateY: 0, scale: 1, rotate: 0, opacity: 0, backgroundColor: '#6366f1', borderRadius: 10 },
    ],
  },
  {
    name: 'slide-up',
    label: '上滑入',
    animName: 'slide-up',
    duration: 0.6,
    timingFn: 'ease-out',
    infinite: true,
    direction: 'normal',
    fillMode: 'none',
    keyframes: [
      { offset: 0, translateX: 0, translateY: 60, scale: 1, rotate: 0, opacity: 0, backgroundColor: '#6366f1', borderRadius: 10 },
      { offset: 100, translateX: 0, translateY: 0, scale: 1, rotate: 0, opacity: 1, backgroundColor: '#6366f1', borderRadius: 10 },
    ],
  },
  {
    name: 'zoom-in',
    label: '缩放进入',
    animName: 'zoom-in',
    duration: 0.5,
    timingFn: 'ease-out',
    infinite: true,
    direction: 'normal',
    fillMode: 'none',
    keyframes: [
      { offset: 0, translateX: 0, translateY: 0, scale: 0, rotate: 0, opacity: 0, backgroundColor: '#6366f1', borderRadius: 10 },
      { offset: 100, translateX: 0, translateY: 0, scale: 1, rotate: 0, opacity: 1, backgroundColor: '#6366f1', borderRadius: 10 },
    ],
  },
  {
    name: 'swing',
    label: '摆动',
    animName: 'swing',
    duration: 0.8,
    timingFn: 'ease-in-out',
    infinite: true,
    direction: 'normal',
    fillMode: 'none',
    keyframes: [
      { offset: 0, translateX: 0, translateY: 0, scale: 1, rotate: 0, opacity: 1, backgroundColor: '#6366f1', borderRadius: 10 },
      { offset: 25, translateX: 0, translateY: 0, scale: 1, rotate: 15, opacity: 1, backgroundColor: '#6366f1', borderRadius: 10 },
      { offset: 50, translateX: 0, translateY: 0, scale: 1, rotate: -10, opacity: 1, backgroundColor: '#6366f1', borderRadius: 10 },
      { offset: 75, translateX: 0, translateY: 0, scale: 1, rotate: 5, opacity: 1, backgroundColor: '#6366f1', borderRadius: 10 },
      { offset: 100, translateX: 0, translateY: 0, scale: 1, rotate: 0, opacity: 1, backgroundColor: '#6366f1', borderRadius: 10 },
    ],
  },
  {
    name: 'jelly',
    label: '果冻',
    animName: 'jelly',
    duration: 0.6,
    timingFn: 'ease-in-out',
    infinite: true,
    direction: 'normal',
    fillMode: 'none',
    keyframes: [
      { offset: 0, translateX: 0, translateY: 0, scale: 1, rotate: 0, opacity: 1, backgroundColor: '#6366f1', borderRadius: 10 },
      { offset: 25, translateX: 0, translateY: 0, scale: 1.2, rotate: 0, opacity: 1, backgroundColor: '#6366f1', borderRadius: 20 },
      { offset: 50, translateX: 0, translateY: 0, scale: 0.85, rotate: 0, opacity: 1, backgroundColor: '#6366f1', borderRadius: 5 },
      { offset: 75, translateX: 0, translateY: 0, scale: 1.05, rotate: 0, opacity: 1, backgroundColor: '#6366f1', borderRadius: 12 },
      { offset: 100, translateX: 0, translateY: 0, scale: 1, rotate: 0, opacity: 1, backgroundColor: '#6366f1', borderRadius: 10 },
    ],
  },
  {
    name: 'blink',
    label: '闪烁',
    animName: 'blink',
    duration: 1,
    timingFn: 'step-start',
    infinite: true,
    direction: 'normal',
    fillMode: 'none',
    keyframes: [
      { offset: 0, translateX: 0, translateY: 0, scale: 1, rotate: 0, opacity: 1, backgroundColor: '#6366f1', borderRadius: 10 },
      { offset: 50, translateX: 0, translateY: 0, scale: 1, rotate: 0, opacity: 0, backgroundColor: '#6366f1', borderRadius: 10 },
      { offset: 100, translateX: 0, translateY: 0, scale: 1, rotate: 0, opacity: 1, backgroundColor: '#6366f1', borderRadius: 10 },
    ],
  },
  {
    name: 'heartbeat',
    label: '心跳',
    animName: 'heartbeat',
    duration: 1.2,
    timingFn: 'ease-in-out',
    infinite: true,
    direction: 'normal',
    fillMode: 'none',
    keyframes: [
      { offset: 0, translateX: 0, translateY: 0, scale: 1, rotate: 0, opacity: 1, backgroundColor: '#ef4444', borderRadius: 10 },
      { offset: 14, translateX: 0, translateY: 0, scale: 1.3, rotate: 0, opacity: 1, backgroundColor: '#ef4444', borderRadius: 10 },
      { offset: 28, translateX: 0, translateY: 0, scale: 1, rotate: 0, opacity: 1, backgroundColor: '#ef4444', borderRadius: 10 },
      { offset: 42, translateX: 0, translateY: 0, scale: 1.3, rotate: 0, opacity: 1, backgroundColor: '#ef4444', borderRadius: 10 },
      { offset: 70, translateX: 0, translateY: 0, scale: 1, rotate: 0, opacity: 1, backgroundColor: '#ef4444', borderRadius: 10 },
      { offset: 100, translateX: 0, translateY: 0, scale: 1, rotate: 0, opacity: 1, backgroundColor: '#ef4444', borderRadius: 10 },
    ],
  },
  {
    name: 'float',
    label: '漂浮',
    animName: 'float',
    duration: 2,
    timingFn: 'ease-in-out',
    infinite: true,
    direction: 'alternate',
    fillMode: 'none',
    keyframes: [
      { offset: 0, translateX: 0, translateY: 0, scale: 1, rotate: 0, opacity: 1, backgroundColor: '#6366f1', borderRadius: 10 },
      { offset: 100, translateX: 0, translateY: -20, scale: 1.05, rotate: 0, opacity: 0.9, backgroundColor: '#8b5cf6', borderRadius: 10 },
    ],
  },
]

function applyPreset(preset) {
  activePreset.value = preset.name
  animName.value = preset.animName
  duration.value = preset.duration
  timingFn.value = preset.timingFn
  infinite.value = preset.infinite
  direction.value = preset.direction
  fillMode.value = preset.fillMode
  keyframes.value = preset.keyframes.map(kf => ({ ...kf }))
  selectedKf.value = 0
  restartAnimation()
}

const timingFunctions = [
  { value: 'ease', label: 'ease' },
  { value: 'ease-in', label: 'ease-in' },
  { value: 'ease-out', label: 'ease-out' },
  { value: 'ease-in-out', label: 'ease-in-out' },
  { value: 'linear', label: 'linear' },
  { value: 'step-start', label: 'step-start' },
  { value: 'step-end', label: 'step-end' },
  { value: 'cubic-bezier', label: 'cubic-bezier(...)' },
]

const directions = [
  { value: 'normal', label: 'normal' },
  { value: 'reverse', label: 'reverse' },
  { value: 'alternate', label: 'alternate' },
  { value: 'alternate-reverse', label: 'alternate-reverse' },
]

const fillModes = [
  { value: 'none', label: 'none' },
  { value: 'forwards', label: 'forwards' },
  { value: 'backwards', label: 'backwards' },
  { value: 'both', label: 'both' },
]

const checkerboard = "url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"20\" height=\"20\"><rect width=\"10\" height=\"10\" fill=\"%23f0f0f0\"/><rect x=\"10\" y=\"10\" width=\"10\" height=\"10\" fill=\"%23f0f0f0\"/><rect x=\"10\" width=\"10\" height=\"10\" fill=\"%23e0e0e0\"/><rect y=\"10\" width=\"10\" height=\"10\" fill=\"%23e0e0e0\"/></svg>')"

const currentKf = computed(() => keyframes.value[selectedKf.value])

const safeName = computed(() => (animName.value || 'animation').replace(/[^a-zA-Z0-9_-]/g, '-').replace(/^-+/, '') || 'animation')

const resolvedTimingFn = computed(() => {
  if (timingFn.value === 'cubic-bezier') {
    return `cubic-bezier(${bezierParams.value.map(v => v.toFixed(2)).join(', ')})`
  }
  return timingFn.value
})

function kfToTransform(kf) {
  const parts = []
  if (kf.translateX !== 0 || kf.translateY !== 0) {
    parts.push(`translate(${kf.translateX}px, ${kf.translateY}px)`)
  }
  if (kf.scale !== 1) parts.push(`scale(${kf.scale})`)
  if (kf.rotate !== 0) parts.push(`rotate(${kf.rotate}deg)`)
  return parts.length ? parts.join(' ') : 'none'
}

const keyframesCss = computed(() => {
  const sorted = [...keyframes.value].sort((a, b) => a.offset - b.offset)
  const hasTransform = sorted.some(kf => kf.translateX !== 0 || kf.translateY !== 0 || kf.scale !== 1 || kf.rotate !== 0)
  const hasOpacity = sorted.some(kf => kf.opacity !== 1)
  const hasBorderRadius = sorted.some(kf => kf.borderRadius !== sorted[0].borderRadius)
  const hasBgColor = sorted.some(kf => kf.backgroundColor !== sorted[0].backgroundColor)

  const blocks = sorted.map(kf => {
    const offset = kf.offset === 0 ? 'from' : kf.offset === 100 ? 'to' : `${kf.offset}%`
    const props = []
    if (hasTransform) props.push(`    transform: ${kfToTransform(kf)};`)
    if (hasOpacity) props.push(`    opacity: ${kf.opacity};`)
    if (hasBorderRadius) props.push(`    border-radius: ${kf.borderRadius}%;`)
    if (hasBgColor) props.push(`    background-color: ${kf.backgroundColor};`)
    return `  ${offset} {\n${props.join('\n')}\n  }`
  })
  return `@keyframes ${safeName.value} {\n${blocks.join('\n')}\n}`
})

const animShorthand = computed(() => {
  const dur = `${duration.value}s`
  const fn = resolvedTimingFn.value
  const iter = infinite.value ? 'infinite' : iterations.value
  return `animation: ${safeName.value} ${dur} ${fn} ${iter} ${direction.value} ${fillMode.value};`
})

const cssCode = computed(() => `${keyframesCss.value}\n\n.${safeName.value} {\n  ${animShorthand.value}\n}`)

const previewStyle = computed(() => ({
  animation: `${safeName.value} ${duration.value}s ${resolvedTimingFn.value} ${infinite.value ? 'infinite' : iterations.value} ${direction.value} ${fillMode.value}`,
  backgroundColor: keyframes.value[0]?.backgroundColor ?? '#6366f1',
  borderRadius: (keyframes.value[0]?.borderRadius ?? 10) + '%',
}))

function addKeyframe() {
  const offsets = keyframes.value.map(kf => kf.offset).sort((a, b) => a - b)
  let bestFrom = 0, bestTo = 100, bestGap = 0
  for (let i = 0; i < offsets.length - 1; i++) {
    const gap = offsets[i + 1] - offsets[i]
    if (gap > bestGap) {
      bestGap = gap
      bestFrom = offsets[i]
      bestTo = offsets[i + 1]
    }
  }
  const newOffset = Math.round((bestFrom + bestTo) / 2)
  const newKf = defaultKf(newOffset)
  keyframes.value.push(newKf)
  selectedKf.value = keyframes.value.length - 1
  activePreset.value = ''
}

function removeKeyframe(i) {
  if (keyframes.value.length <= 2) return
  keyframes.value.splice(i, 1)
  if (selectedKf.value >= keyframes.value.length) {
    selectedKf.value = keyframes.value.length - 1
  }
  activePreset.value = ''
}

function restartAnimation() {
  animKey.value++
}

async function copyCode() {
  try {
    await navigator.clipboard.writeText(cssCode.value)
    copied.value = true
    setTimeout(() => copied.value = false, 1500)
  } catch { /* clipboard not available */ }
}

let styleEl = null

function injectKeyframes() {
  if (!styleEl) {
    styleEl = document.createElement('style')
    document.head.appendChild(styleEl)
  }
  styleEl.textContent = keyframesCss.value
}

watch(keyframesCss, injectKeyframes, { immediate: true })

onMounted(() => {
  injectKeyframes()
})

onBeforeUnmount(() => {
  if (styleEl) {
    styleEl.remove()
    styleEl = null
  }
})
</script>
