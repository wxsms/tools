<template>
  <div class="hello-tool">
    <p>👋 Hello from custom Vue component!</p>
    <button @click="count++">Clicked {{ count }} times</button>
  </div>
</template>

<script setup>
import { ref } from 'vue'
const count = ref(0)
</script>

<style scoped>
.hello-tool {
  text-align: center;
  padding: 24px;
  margin-top: 16px;
}
button {
  padding: 8px 16px;
  font-size: 16px;
  cursor: pointer;
  border-radius: 6px;
  border: 1px solid var(--vp-c-brand);
  background: var(--vp-c-brand);
  color: #fff;
}
button:hover {
  opacity: 0.85;
}
</style>
