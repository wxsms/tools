<template>
  <div class="flex flex-col items-center justify-center py-16 text-error">
    <p>页面加载失败</p>
    <button
      class="btn btn-sm btn-outline mt-3"
      @click="reload"
    >
      重新加载
    </button>
  </div>
</template>

<script setup>
function reload() {
  if (typeof window !== 'undefined') window.location.reload()
}
</script>
