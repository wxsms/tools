import { ref, computed, watch } from 'vue'

const STORAGE_KEY = 'theme-preference'

const theme = ref(localStorage.getItem(STORAGE_KEY) || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'))

watch(theme, (val) => {
  localStorage.setItem(STORAGE_KEY, val)
  document.documentElement.setAttribute('data-theme', val)
}, { immediate: true })

function toggleTheme() {
  theme.value = theme.value === 'light' ? 'dark' : 'light'
}

export function useTheme() {
  return { theme, toggleTheme }
}
