<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">
      图片水印
    </h1>
    <div class="flex flex-col gap-6 max-w-2xl">
      <!-- Upload -->
      <div class="form-control">
        <label class="label"><span class="label-text font-semibold">选择图片</span></label>
        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          class="file-input file-input-bordered w-full"
          @change="onFileChange"
        >
      </div>

      <!-- Config -->
      <div
        v-if="imageSrc"
        class="flex flex-col gap-4"
      >
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">水印文字</span></label>
          <input
            v-model="text"
            type="text"
            class="input input-bordered w-full"
            placeholder="输入水印文字..."
          >
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="form-control">
            <label class="label"><span class="label-text font-semibold">字号</span></label>
            <div class="flex items-center gap-2">
              <input
                v-model.number="fontSize"
                type="range"
                min="10"
                max="200"
                step="2"
                class="range range-sm flex-1"
              >
              <span class="text-sm w-10 text-right">{{ fontSize }}px</span>
            </div>
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text font-semibold">颜色</span></label>
            <div class="flex items-center gap-2">
              <input
                v-model="color"
                type="color"
                class="input input-bordered w-12 h-10 p-1 cursor-pointer"
              >
              <input
                v-model="color"
                type="text"
                class="input input-bordered w-full"
              >
            </div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="form-control">
            <label class="label"><span class="label-text font-semibold">透明度</span></label>
            <div class="flex items-center gap-2">
              <input
                v-model.number="opacity"
                type="range"
                min="0"
                max="1"
                step="0.05"
                class="range range-sm flex-1"
              >
              <span class="text-sm w-10 text-right">{{ Math.round(opacity * 100) }}%</span>
            </div>
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text font-semibold">旋转</span></label>
            <div class="flex items-center gap-2">
              <input
                v-model.number="rotation"
                type="range"
                min="-90"
                max="90"
                step="5"
                class="range range-sm flex-1"
              >
              <span class="text-sm w-10 text-right">{{ rotation }}&deg;</span>
            </div>
          </div>
        </div>

        <div class="form-control">
          <label class="label cursor-pointer justify-start gap-3">
            <input
              v-model="tile"
              type="checkbox"
              class="checkbox checkbox-sm checkbox-primary"
            >
            <span class="label-text font-semibold">平铺水印</span>
          </label>
        </div>

        <!-- Preview -->
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">预览</span></label>
          <div class="border border-base-300 rounded-lg overflow-hidden bg-base-200">
            <canvas
              ref="canvas"
              class="max-w-full h-auto block mx-auto"
            />
          </div>
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-2">
          <button
            class="btn btn-ghost btn-sm gap-1"
            @click="reset"
          >
            <Icon
              icon="lucide:trash-2"
              class="w-4 h-4"
            />
            重置
          </button>
          <button
            class="btn btn-primary btn-sm gap-1"
            :disabled="!imageSrc || !text"
            @click="download"
          >
            <Icon
              icon="lucide:download"
              class="w-4 h-4"
            />
            下载
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Icon } from '@iconify/vue'
import { ref, watch, nextTick } from 'vue'
const fileInput = ref(null)
const canvas = ref(null)
const imageSrc = ref('')
const imageObj = ref(null)

const text = ref('Watermark')
const fontSize = ref(80)
const color = ref('#000000')
const opacity = ref(0.3)
const rotation = ref(-30)
const tile = ref(true)

function onFileChange(e) {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => {
    imageSrc.value = ev.target.result
    const img = new Image()
    img.onload = () => {
      imageObj.value = img
      nextTick(render)
    }
    img.src = ev.target.result
  }
  reader.readAsDataURL(file)
}

function render() {
  const img = imageObj.value
  const cvs = canvas.value
  if (!img || !cvs) return

  cvs.width = img.width
  cvs.height = img.height
  const ctx = cvs.getContext('2d')

  // Draw original image
  ctx.drawImage(img, 0, 0)

  // Apply watermark
  if (!text.value) return

  ctx.save()
  ctx.globalAlpha = opacity.value
  ctx.fillStyle = color.value
  ctx.font = `${fontSize.value}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const rad = (rotation.value * Math.PI) / 180

  if (tile.value) {
    // Tile watermarks across the entire image with extra padding for rotation
    const padding = fontSize.value * 3
    const stepX = fontSize.value * text.value.length * 0.8 + fontSize.value * 2
    const stepY = fontSize.value * 3

    for (let y = -padding; y < img.height + padding; y += stepY) {
      for (let x = -padding; x < img.width + padding; x += stepX) {
        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(rad)
        ctx.fillText(text.value, 0, 0)
        ctx.restore()
      }
    }
  } else {
    // Single centered watermark
    ctx.translate(img.width / 2, img.height / 2)
    ctx.rotate(rad)
    ctx.fillText(text.value, 0, 0)
  }

  ctx.restore()
}

function reset() {
  imageSrc.value = ''
  imageObj.value = null
  text.value = 'Watermark'
  fontSize.value = 80
  color.value = '#000000'
  opacity.value = 0.3
  rotation.value = -30
  tile.value = true
  if (fileInput.value) fileInput.value.value = ''
}

function download() {
  if (!canvas.value) return
  const link = document.createElement('a')
  link.download = 'watermarked.png'
  link.href = canvas.value.toDataURL('image/png')
  link.click()
}

// Re-render on any config change
watch([text, fontSize, color, opacity, rotation, tile], () => {
  nextTick(render)
})
</script>
