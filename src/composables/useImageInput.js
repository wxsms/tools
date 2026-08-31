import { ref, onMounted, onUnmounted } from 'vue'

/**
 * 统一的文件输入 composable：文件选择 + 拖拽 + 剪贴板粘贴。
 *
 * 调用方传入 `onFile(file)` 回调处理文件，composable 负责：
 * - 暴露 `fileInput` ref（绑定到隐藏的 `<input type="file">`）
 * - 暴露 `dragging` 状态（dropzone 高亮）
 * - 暴露 `openPicker()` 触发文件选择
 * - `onDrop` / `onPaste` 事件处理
 * - 组件挂载时自动监听 window paste，卸载时移除
 *
 * @param {(file: File) => void} onFile 收到文件时的回调
 * @param {object} [options]
 * @param {string|false} [options.accept='image/*'] `<input accept>` 值；传 `false` 表示接受任意文件（不限制类型）
 * @returns {{ fileInput: import('vue').Ref<HTMLInputElement|null>, dragging: import('vue').Ref<boolean>, openPicker: () => void, onFileChange: (e: Event) => void, onDrop: (e: DragEvent) => void, onPaste: (e: ClipboardEvent) => void }}
 */
export function useImageInput(onFile, options = {}) {
  const accept = options.accept === undefined ? 'image/*' : options.accept
  const imageOnly = accept === 'image/*'

  const fileInput = ref(null)
  const dragging = ref(false)

  function openPicker() {
    fileInput.value?.click()
  }

  function handleFile(file) {
    if (!file) return
    if (imageOnly && !file.type.startsWith('image/')) return
    onFile(file)
  }

  function onFileChange(e) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = '' // 允许重复选择同一文件
  }

  function onDrop(e) {
    dragging.value = false
    const file = e.dataTransfer?.files?.[0]
    if (file) handleFile(file)
  }

  function onPaste(e) {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of items) {
      if (!imageOnly || item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) {
          handleFile(file)
          break
        }
      }
    }
  }

  onMounted(() => window.addEventListener('paste', onPaste))
  onUnmounted(() => window.removeEventListener('paste', onPaste))

  return { fileInput, dragging, openPicker, onFileChange, onDrop, onPaste }
}
