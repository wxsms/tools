<template>
  <div>
    <div class="hero bg-base-200 rounded-xl py-12 mb-8">
      <div class="hero-content text-center">
        <div class="max-w-lg">
          <h1 class="text-4xl font-bold">
            Wxsm's Toolbox
          </h1>
          <p class="py-4 text-base-content/70">
            🔒 Private · ⚡ Fast · 💯 Free<br>
            Everything runs locally in your browser — no data leaves your device.
          </p>
        </div>
      </div>
    </div>

    <div
      v-for="group in toolGroups"
      :key="group.name"
      class="mb-8"
    >
      <h2 class="text-xl font-semibold mb-4">
        {{ group.name }}
      </h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <router-link
          v-for="tool in group.tools"
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
  </div>
</template>

<script setup>
import { toolGroups } from '../tools.js'
</script>
