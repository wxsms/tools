<template>
  <div>
    <div class="hero bg-base-200 rounded-xl py-12 mb-8">
      <div class="hero-content text-center">
        <div class="max-w-md">
          <h1 class="text-4xl font-bold">
            Wxsms Tools
          </h1>
          <p class="py-4 text-base-content/70">
            Personal toolkit — fast, free, and runs entirely in your browser.
          </p>
        </div>
      </div>
    </div>

    <h2 class="text-xl font-semibold mb-4">
      All Tools
    </h2>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <router-link
        v-for="tool in tools"
        :key="tool.path"
        :to="tool.path"
        class="card bg-base-200 hover:bg-base-300 transition-colors"
      >
        <div class="card-body flex-row items-center gap-4">
          <div class="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <component
              :is="tool.icon"
              class="w-5 h-5"
            />
          </div>
          <div>
            <h3 class="card-title text-base">
              {{ tool.name }}
            </h3>
            <p class="text-sm text-base-content/60">
              {{ tool.desc }}
            </p>
          </div>
        </div>
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { ArrowsRightLeftIcon, CircleStackIcon, FingerPrintIcon, DocumentPlusIcon } from '@heroicons/vue/24/outline'

const tools = [
  {
    name: 'Base64',
    path: '/base64',
    desc: 'Base64 encoding and decoding',
    icon: ArrowsRightLeftIcon
  },
  {
    name: 'Gzip',
    path: '/gzip',
    desc: 'Gzip compression & decompression (Base64 representation)',
    icon: CircleStackIcon
  },
  {
    name: 'MD5',
    path: '/md5',
    desc: 'MD5 hash computation',
    icon: FingerPrintIcon
  },
  {
    name: 'Diff',
    path: '/diff',
    desc: 'Text comparison with character-level diff and inline highlighting',
    icon: DocumentPlusIcon
  },
]
</script>
