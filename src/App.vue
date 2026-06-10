<template>
  <div>
    <div class="drawer lg:drawer-open">
      <input id="sidebar-drawer" type="checkbox" class="drawer-toggle" />

      <!-- Main content -->
      <div class="drawer-content flex flex-col min-h-screen">
        <!-- Navbar -->
        <div class="navbar bg-base-200 w-full sticky top-0 z-30 shadow-sm">
          <div class="flex-none lg:hidden">
            <label for="sidebar-drawer" aria-label="open sidebar" class="btn btn-square btn-ghost">
              <Bars3Icon class="w-5 h-5" />
            </label>
          </div>
          <div class="flex-1 lg:hidden">
            <router-link to="/" class="btn btn-ghost text-xl">Wxsms Tools</router-link>
          </div>
          <div class="flex-1 hidden lg:block"></div>
          <div class="flex-none flex items-center gap-2">
            <a href="https://github.com/wxsms/tools" target="_blank" class="btn btn-ghost btn-sm gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
            </a>
            <label class="toggle text-base-content" :aria-label="isDark ? '切换到浅色模式' : '切换到深色模式'">
              <input type="checkbox" :checked="isDark" @change="toggleTheme" />
                            <SunIcon aria-label="浅色" class="w-4 h-4" />
              <MoonIcon aria-label="深色" class="w-4 h-4" />
            </label>
          </div>
        </div>

        <!-- Page content -->
        <main class="flex-1 p-6 lg:p-10 max-w-4xl">
          <router-view />
        </main>

        <!-- Footer -->
        <footer class="footer footer-center p-4 bg-base-200 text-base-content">
          <aside>
            <p>&copy; {{ year }} wxsms — 个人工具集</p>
          </aside>
        </footer>
      </div>

      <!-- Sidebar -->
      <div class="drawer-side z-40">
        <label for="sidebar-drawer" aria-label="close sidebar" class="drawer-overlay"></label>
        <aside class="bg-base-200 min-h-full w-64 p-4 flex flex-col">
          <!-- Logo -->
          <router-link to="/" class="btn btn-ghost text-xl no-underline mb-4 self-start">
            <WrenchScrewdriverIcon class="w-6 h-6" />
            Wxsms Tools
          </router-link>

          <div class="divider mt-0 mb-2"></div>

          <!-- Menu -->
          <p class="text-xs font-semibold opacity-50 uppercase tracking-wider mb-2 px-2">工具</p>
          <ul class="menu menu-md w-full gap-1">
            <li v-for="tool in tools" :key="tool.path">
              <router-link :to="tool.path" class="flex items-center gap-3">
                <component :is="tool.icon" class="w-5 h-5" />
                {{ tool.name }}
              </router-link>
            </li>
          </ul>

          <div class="flex-1"></div>
        </aside>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useTheme } from './composables/useTheme.js'
import { Bars3Icon, SunIcon, MoonIcon, WrenchScrewdriverIcon, ArrowsRightLeftIcon, CircleStackIcon } from '@heroicons/vue/24/outline'

const year = new Date().getFullYear()
const { theme, toggleTheme } = useTheme()
const isDark = computed(() => theme.value === 'dark')

const tools = [
  {
    name: 'Base64 转换',
    path: '/base64',
    icon: ArrowsRightLeftIcon
  },
  {
    name: 'Gzip 编码解码',
    path: '/gzip',
    icon: CircleStackIcon
  },
]
</script>
