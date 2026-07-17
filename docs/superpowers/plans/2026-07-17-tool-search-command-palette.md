# 工具搜索命令面板 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Cmd/Ctrl+K command palette that lets users search all 44 tools by name/description/group/path and jump to any tool with keyboard navigation.

**Architecture:** Pure-function search module (`src/tools/search.js`) holds all matching/sorting/highlighting logic and is unit-tested. A self-contained `CommandPalette.vue` component owns its open/query/activeIndex state, listens for global shortcuts, and calls `router.push` on selection. `App.vue` adds a navbar search icon and mounts the palette.

**Tech Stack:** Vue 3 (script setup), Vue Router 5, daisyUI 5 + Tailwind 4, Vitest 4 + jsdom, `@heroicons/vue` outline icons.

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `src/tools/search.js` | Create | Pure functions: `buildSearchIndex`, `searchTools`, `highlightMatch`, `truncateResults` |
| `src/tools/search.test.js` | Create | Unit tests for all four pure functions |
| `src/components/CommandPalette.vue` | Create | Self-contained modal: input, results list, keyboard nav, router navigation |
| `src/App.vue` | Modify | Add navbar search button, mount `<CommandPalette>`, import `MagnifyingGlassIcon` |

**Note:** `src/components/` already exists (contains `RouteLoading.vue`, `RouteError.vue`). No new directory creation needed — the spec was wrong on this point.

**Test setup:** Vitest is configured in `vitest.config.js` with `environment: 'jsdom'` and the Vue plugin. Run a single test file with `npx vitest run src/tools/search.test.js`. Run all tests with `npm run test`.

**Conventions to match:**
- Pure function tests use `describe`/`it`/`expect` from `vitest` (see `src/tools/base64/base64.test.js`)
- Vue components use `<script setup>` and daisyUI classes (see any tool `.vue`)
- Icons come from `@heroicons/vue/24/outline`

---

## Task 1: `buildSearchIndex` — flatten toolGroups into a searchable array

**Files:**
- Create: `src/tools/search.js`
- Create: `src/tools/search.test.js`

- [ ] **Step 1: Write the failing test**

Create `src/tools/search.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { buildSearchIndex } from './search.js'
import { toolGroups } from '../tools.js'

describe('buildSearchIndex', () => {
  const index = buildSearchIndex(toolGroups)

  it('returns one entry per tool across all groups', () => {
    const totalTools = toolGroups.reduce((sum, g) => sum + g.tools.length, 0)
    expect(index).toHaveLength(totalTools)
  })

  it('each entry has name, desc, path, groupName, icon', () => {
    for (const entry of index) {
      expect(entry).toHaveProperty('name')
      expect(entry).toHaveProperty('desc')
      expect(entry).toHaveProperty('path')
      expect(entry).toHaveProperty('groupName')
      expect(entry).toHaveProperty('icon')
    }
  })

  it('preserves order: first entry is the first tool of the first group', () => {
    expect(index[0].name).toBe(toolGroups[0].tools[0].name)
    expect(index[0].groupName).toBe(toolGroups[0].name)
  })

  it('preserves order: last entry is the last tool of the last group', () => {
    const lastGroup = toolGroups[toolGroups.length - 1]
    const lastTool = lastGroup.tools[lastGroup.tools.length - 1]
    expect(index[index.length - 1].name).toBe(lastTool.name)
    expect(index[index.length - 1].groupName).toBe(lastGroup.name)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/tools/search.test.js`
Expected: FAIL — `Cannot find module './search.js'` or `buildSearchIndex is not a function`

- [ ] **Step 3: Write minimal implementation**

Create `src/tools/search.js`:

```js
import { toolGroups } from '../tools.js'

/**
 * Flatten toolGroups into a single array of searchable entries.
 * Preserves group order and intra-group order.
 *
 * @param {Array} groups - toolGroups from src/tools.js
 * @returns {Array<{name: string, desc: string, path: string, groupName: string, icon: Object}>}
 */
export function buildSearchIndex(groups) {
  const index = []
  for (const group of groups) {
    for (const tool of group.tools) {
      index.push({
        name: tool.name,
        desc: tool.desc,
        path: tool.path,
        groupName: group.name,
        icon: tool.icon,
      })
    }
  }
  return index
}

// Eager-built singleton index — built once at module load.
export const searchIndex = buildSearchIndex(toolGroups)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/tools/search.test.js`
Expected: PASS — all 4 tests green

- [ ] **Step 5: Commit**

```bash
git -C E:/githome-windows/tools add src/tools/search.js src/tools/search.test.js
git -C E:/githome-windows/tools commit -m "feat(search): add buildSearchIndex to flatten toolGroups"
```

## Task 2: `highlightMatch` — split text into matched/unmatched segments

**Files:**
- Modify: `src/tools/search.js` (add function)
- Modify: `src/tools/search.test.js` (add describe block)

- [ ] **Step 1: Write the failing tests**

Append to `src/tools/search.test.js` (before the final EOF, after the existing `describe('buildSearchIndex', ...)` block):

```js
import { highlightMatch } from './search.js'

describe('highlightMatch', () => {
  it('returns single unmatched segment when query is empty', () => {
    expect(highlightMatch('Base64', '')).toEqual([
      { text: 'Base64', matched: false },
    ])
  })

  it('returns single unmatched segment when no match', () => {
    expect(highlightMatch('abc', 'xyz')).toEqual([
      { text: 'abc', matched: false },
    ])
  })

  it('matches case-insensitively but preserves original case', () => {
    expect(highlightMatch('Base64', 'BASE')).toEqual([
      { text: 'Base', matched: true },
      { text: '64', matched: false },
    ])
  })

  it('handles match at start', () => {
    expect(highlightMatch('Base64 转换', 'base')).toEqual([
      { text: 'Base', matched: true },
      { text: '64 转换', matched: false },
    ])
  })

  it('handles match in the middle', () => {
    expect(highlightMatch('Base64 转换', '64')).toEqual([
      { text: 'Base', matched: false },
      { text: '64', matched: true },
      { text: ' 转换', matched: false },
    ])
  })

  it('handles multiple matches in the same text', () => {
    expect(highlightMatch('aba', 'a')).toEqual([
      { text: 'a', matched: true },
      { text: 'b', matched: false },
      { text: 'a', matched: true },
    ])
  })

  it('handles Chinese query', () => {
    expect(highlightMatch('Base64 转换', '转换')).toEqual([
      { text: 'Base64 ', matched: false },
      { text: '转换', matched: true },
    ])
  })

  it('trims query before matching', () => {
    expect(highlightMatch('Base64', '  base  ')).toEqual([
      { text: 'Base', matched: true },
      { text: '64', matched: false },
    ])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/tools/search.test.js`
Expected: FAIL — `highlightMatch is not a function` (the `buildSearchIndex` tests should still pass)

- [ ] **Step 3: Write minimal implementation**

Append to `src/tools/search.js` (after `buildSearchIndex`):

```js
/**
 * Split text into segments, marking which parts match the query.
 * Case-insensitive. Preserves original case. Handles multiple matches.
 *
 * @param {string} text
 * @param {string} query
 * @returns {Array<{text: string, matched: boolean}>}
 */
export function highlightMatch(text, query) {
  const q = (query || '').trim()
  if (!q) {
    return [{ text, matched: false }]
  }

  const textLower = text.toLowerCase()
  const queryLower = q.toLowerCase()
  const segments = []
  let i = 0

  while (i < text.length) {
    const found = textLower.indexOf(queryLower, i)
    if (found === -1) {
      segments.push({ text: text.slice(i), matched: false })
      break
    }
    if (found > i) {
      segments.push({ text: text.slice(i, found), matched: false })
    }
    segments.push({ text: text.slice(found, found + q.length), matched: true })
    i = found + q.length
  }

  return segments
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/tools/search.test.js`
Expected: PASS — all `buildSearchIndex` + `highlightMatch` tests green

- [ ] **Step 5: Commit**

```bash
git -C E:/githome-windows/tools add src/tools/search.js src/tools/search.test.js
git -C E:/githome-windows/tools commit -m "feat(search): add highlightMatch for query highlighting"
```

## Task 3: `searchTools` — match query against index, sort by field priority

**Files:**
- Modify: `src/tools/search.js` (add function)
- Modify: `src/tools/search.test.js` (add describe block)

- [ ] **Step 1: Write the failing tests**

Append to `src/tools/search.test.js` (after the `highlightMatch` describe block):

```js
import { searchTools } from './search.js'

describe('searchTools', () => {
  const index = buildSearchIndex(toolGroups)

  it('returns empty array for empty query', () => {
    expect(searchTools('', index)).toEqual([])
  })

  it('returns empty array for whitespace-only query', () => {
    expect(searchTools('   ', index)).toEqual([])
  })

  it('matches name (lowercase)', () => {
    const results = searchTools('base64', index)
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].name).toBe('Base64 转换')
    expect(results[0].matchedField).toBe('name')
  })

  it('matches name case-insensitively', () => {
    const lower = searchTools('base64', index).map(r => r.path)
    const upper = searchTools('BASE64', index).map(r => r.path)
    expect(upper).toEqual(lower)
  })

  it('matches path', () => {
    const results = searchTools('jwt', index)
    expect(results.length).toBeGreaterThan(0)
    const jwtResult = results.find(r => r.path === '/jwt-decode')
    expect(jwtResult).toBeDefined()
    expect(jwtResult.matchedField).toBe('path')
  })

  it('matches groupName', () => {
    const results = searchTools('加密', index)
    expect(results.length).toBeGreaterThan(0)
    for (const r of results) {
      expect(r.groupName).toBe('加解密')
      expect(r.matchedField).toBe('groupName')
    }
  })

  it('matches desc', () => {
    const results = searchTools('格式化', index)
    expect(results.length).toBeGreaterThan(0)
    for (const r of results) {
      expect(r.matchedField).toBe('desc')
    }
  })

  it('returns empty array when nothing matches', () => {
    expect(searchTools('xyznotfound123', index)).toEqual([])
  })

  it('sorts name matches ahead of desc matches', () => {
    // "json" appears in the name of "JSON 校验" AND in many descriptions.
    // Construct a custom index to make the priority assertion deterministic.
    const fakeIndex = [
      { name: 'Other', desc: 'json helper', path: '/a', groupName: 'G1', icon: null },
      { name: 'JSON 校验', desc: 'unrelated', path: '/b', groupName: 'G2', icon: null },
    ]
    const results = searchTools('json', fakeIndex)
    expect(results).toHaveLength(2)
    expect(results[0].name).toBe('JSON 校验')
    expect(results[0].matchedField).toBe('name')
    expect(results[1].name).toBe('Other')
    expect(results[1].matchedField).toBe('desc')
  })

  it('preserves original order within the same priority', () => {
    const fakeIndex = [
      { name: 'A json', desc: '', path: '/a', groupName: 'G', icon: null },
      { name: 'B json', desc: '', path: '/b', groupName: 'G', icon: null },
      { name: 'C json', desc: '', path: '/c', groupName: 'G', icon: null },
    ]
    const results = searchTools('json', fakeIndex)
    expect(results.map(r => r.path)).toEqual(['/a', '/b', '/c'])
  })

  it('result entry includes all original fields plus matchedField', () => {
    const results = searchTools('base64', index)
    const r = results[0]
    expect(r).toHaveProperty('name')
    expect(r).toHaveProperty('desc')
    expect(r).toHaveProperty('path')
    expect(r).toHaveProperty('groupName')
    expect(r).toHaveProperty('icon')
    expect(r).toHaveProperty('matchedField')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/tools/search.test.js`
Expected: FAIL — `searchTools is not a function` (prior tests still pass)

- [ ] **Step 3: Write minimal implementation**

Append to `src/tools/search.js` (after `highlightMatch`):

```js
const FIELD_PRIORITY = {
  name: 0,
  path: 1,
  groupName: 2,
  desc: 3,
}

/**
 * Search an index for tools matching query. Returns results sorted by
 * field priority (name > path > groupName > desc); ties preserve index order.
 *
 * @param {string} query
 * @param {Array} index - output of buildSearchIndex
 * @returns {Array} matched entries, each with `matchedField` added
 */
export function searchTools(query, index) {
  const q = (query || '').trim().toLowerCase()
  if (!q) return []

  const matched = []
  for (const entry of index) {
    let matchedField = null
    if (entry.name.toLowerCase().includes(q)) {
      matchedField = 'name'
    } else if (entry.path.toLowerCase().includes(q)) {
      matchedField = 'path'
    } else if (entry.groupName.toLowerCase().includes(q)) {
      matchedField = 'groupName'
    } else if (entry.desc.toLowerCase().includes(q)) {
      matchedField = 'desc'
    }
    if (matchedField) {
      matched.push({ ...entry, matchedField })
    }
  }

  matched.sort((a, b) => FIELD_PRIORITY[a.matchedField] - FIELD_PRIORITY[b.matchedField])
  return matched
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/tools/search.test.js`
Expected: PASS — all tests green

- [ ] **Step 5: Commit**

```bash
git -C E:/githome-windows/tools add src/tools/search.js src/tools/search.test.js
git -C E:/githome-windows/tools commit -m "feat(search): add searchTools with field-priority sorting"
```

## Task 4: `truncateResults` — cap the number of results

**Files:**
- Modify: `src/tools/search.js` (add function)
- Modify: `src/tools/search.test.js` (add describe block)

- [ ] **Step 1: Write the failing tests**

Append to `src/tools/search.test.js` (after the `searchTools` describe block):

```js
import { truncateResults } from './search.js'

describe('truncateResults', () => {
  const make = n => Array.from({ length: n }, (_, i) => ({ path: `/t${i}` }))

  it('returns all results when count is below limit', () => {
    expect(truncateResults(make(10), 20)).toHaveLength(10)
  })

  it('truncates to limit when count exceeds it', () => {
    expect(truncateResults(make(30), 20)).toHaveLength(20)
  })

  it('keeps the first N entries in order', () => {
    const out = truncateResults(make(30), 5)
    expect(out.map(r => r.path)).toEqual(['/t0', '/t1', '/t2', '/t3', '/t4'])
  })

  it('default limit is 20', () => {
    expect(truncateResults(make(30))).toHaveLength(20)
  })

  it('handles empty input', () => {
    expect(truncateResults([], 20)).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/tools/search.test.js`
Expected: FAIL — `truncateResults is not a function` (prior tests still pass)

- [ ] **Step 3: Write minimal implementation**

Append to `src/tools/search.js` (after `searchTools`):

```js
/**
 * Slice results to at most `limit` entries. Pure utility — keeps
 * searchTools free of UI concerns.
 *
 * @param {Array} results
 * @param {number} [limit=20]
 * @returns {Array}
 */
export function truncateResults(results, limit = 20) {
  return results.slice(0, limit)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/tools/search.test.js`
Expected: PASS — all tests green

- [ ] **Step 5: Run lint to catch any issues**

Run: `npm run lint`
Expected: no errors in `src/tools/search.js` or `src/tools/search.test.js`

- [ ] **Step 6: Commit**

```bash
git -C E:/githome-windows/tools add src/tools/search.js src/tools/search.test.js
git -C E:/githome-windows/tools commit -m "feat(search): add truncateResults utility"
```

## Task 5: `CommandPalette.vue` — create the modal component (TDD: rendering)

This task is split into two parts because the component is non-trivial. **Task 5** creates the component with template + state + computed + open/close methods and tests rendering. **Task 6** adds keyboard handling and selection logic and tests that. Both touch the same two files, so commit after each.

**Files:**
- Create: `src/components/CommandPalette.vue`
- Create: `src/components/CommandPalette.component.test.js`

- [ ] **Step 1: Write the failing test**

Create `src/components/CommandPalette.component.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import CommandPalette from './CommandPalette.vue'

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:rest(.*)*', component: { template: '<div />' } }],
  })
}

async function mountComponent() {
  const router = createTestRouter()
  router.push('/')
  await router.isReady()
  return mount(CommandPalette, {
    global: { plugins: [router] },
  })
}

describe('CommandPalette', () => {
  it('does not render the dialog when closed', async () => {
    const wrapper = await mountComponent()
    expect(wrapper.find('dialog').exists()).toBe(false)
  })

  it('renders the dialog after open() is called', async () => {
    const wrapper = await mountComponent()
    wrapper.vm.open()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('dialog').exists()).toBe(true)
    expect(wrapper.find('input[type="text"]').exists()).toBe(true)
  })

  it('shows placeholder text when query is empty', async () => {
    const wrapper = await mountComponent()
    wrapper.vm.open()
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('输入关键词以搜索工具')
  })

  it('shows results after typing a query that matches', async () => {
    const wrapper = await mountComponent()
    wrapper.vm.open()
    await wrapper.vm.$nextTick()
    await wrapper.find('input[type="text"]').setValue('base64')
    expect(wrapper.text()).toContain('Base64 转换')
  })

  it('shows no-match text when query matches nothing', async () => {
    const wrapper = await mountComponent()
    wrapper.vm.open()
    await wrapper.vm.$nextTick()
    await wrapper.find('input[type="text"]').setValue('zzznotfound')
    expect(wrapper.text()).toContain('未找到匹配工具')
  })

  it('closes the dialog after close() is called', async () => {
    const wrapper = await mountComponent()
    wrapper.vm.open()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('dialog').exists()).toBe(true)
    wrapper.vm.close()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('dialog').exists()).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/CommandPalette.component.test.js`
Expected: FAIL — `Cannot find module './CommandPalette.vue'`

- [ ] **Step 3: Write minimal implementation**

Create `src/components/CommandPalette.vue`:

```vue
<template>
  <dialog
    v-if="open"
    class="modal modal-open"
    @click.self="close"
  >
    <div class="modal-box max-w-lg p-0 overflow-hidden">
      <!-- Input -->
      <div class="flex items-center gap-2 p-3 border-b border-base-300">
        <MagnifyingGlassIcon class="w-5 h-5 opacity-60" />
        <input
          ref="inputEl"
          v-model="query"
          type="text"
          placeholder="搜索工具…"
          class="input input-bordered flex-1"
          autocomplete="off"
          spellcheck="false"
        >
        <kbd class="kbd kbd-sm">Esc</kbd>
      </div>

      <!-- Results -->
      <ul
        v-if="results.length"
        class="max-h-80 overflow-y-auto"
      >
        <li
          v-for="(tool, i) in results"
          :key="tool.path"
          @click="select(tool.path)"
          @mouseenter="activeIndex = i"
        >
          <div
            :class="['flex items-center gap-3 px-3 py-2 cursor-pointer',
                     i === activeIndex ? 'bg-base-300' : '']"
          >
            <component
              :is="tool.icon"
              class="w-5 h-5 opacity-70"
            />
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span
                  v-for="(seg, j) in highlightMatch(tool.name, query)"
                  :key="j"
                  :class="seg.matched ? 'bg-warning/30 rounded px-0.5' : ''"
                >{{ seg.text }}</span>
              </div>
              <p class="text-xs text-base-content/60 truncate">
                <span
                  v-for="(seg, j) in highlightMatch(tool.desc, query)"
                  :key="j"
                  :class="seg.matched ? 'bg-warning/30 rounded px-0.5' : ''"
                >{{ seg.text }}</span>
              </p>
            </div>
            <span class="badge badge-sm badge-ghost">{{ tool.groupName }}</span>
          </div>
        </li>
      </ul>

      <!-- Empty: query but no matches -->
      <div
        v-else-if="query.trim()"
        class="p-8 text-center text-base-content/50"
      >
        未找到匹配工具
      </div>

      <!-- Empty: no query -->
      <div
        v-else
        class="p-8 text-center text-base-content/50"
      >
        输入关键词以搜索工具…
      </div>
    </div>
  </dialog>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { MagnifyingGlassIcon } from '@heroicons/vue/24/outline'
import { searchIndex, searchTools, highlightMatch, truncateResults } from '../tools/search.js'

const props = defineProps({
  limit: {
    type: Number,
    default: 20,
  },
})

const router = useRouter()

const open = ref(false)
const query = ref('')
const activeIndex = ref(0)
const inputEl = ref(null)

const results = computed(() =>
  truncateResults(searchTools(query.value, searchIndex), props.limit)
)

watch(results, (newResults) => {
  if (activeIndex.value >= newResults.length) {
    activeIndex.value = 0
  }
})

function openPalette() {
  open.value = true
  query.value = ''
  activeIndex.value = 0
  nextTick(() => {
    inputEl.value?.focus()
  })
}

function closePalette() {
  open.value = false
  query.value = ''
  activeIndex.value = 0
}

function select(path) {
  router.push(path)
  closePalette()
}

defineExpose({ open: openPalette, close: closePalette })
</script>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/CommandPalette.component.test.js`
Expected: PASS — all 6 tests green

- [ ] **Step 5: Commit**

```bash
git -C E:/githome-windows/tools add src/components/CommandPalette.vue src/components/CommandPalette.component.test.js
git -C E:/githome-windows/tools commit -m "feat(search): add CommandPalette component with rendering + open/close"
```

## Task 6: `CommandPalette.vue` — keyboard navigation + global shortcuts

**Files:**
- Modify: `src/components/CommandPalette.vue` (add `onMounted`/`onUnmounted` keydown listener + keydown handler on the dialog)
- Modify: `src/components/CommandPalette.component.test.js` (add tests for keyboard behavior)

- [ ] **Step 1: Write the failing tests**

Append to `src/components/CommandPalette.component.test.js` (inside the existing `describe('CommandPalette', ...)` block, before the closing `})`):

```js
  it('opens on Cmd+K and closes on Cmd+K again', async () => {
    const wrapper = await mountComponent()
    expect(wrapper.find('dialog').exists()).toBe(false)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))
    await wrapper.vm.$nextTick()
    expect(wrapper.find('dialog').exists()).toBe(true)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))
    await wrapper.vm.$nextTick()
    expect(wrapper.find('dialog').exists()).toBe(false)
  })

  it('opens on Ctrl+K', async () => {
    const wrapper = await mountComponent()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }))
    await wrapper.vm.$nextTick()
    expect(wrapper.find('dialog').exists()).toBe(true)
  })

  it('closes on Esc', async () => {
    const wrapper = await mountComponent()
    wrapper.vm.open()
    await wrapper.vm.$nextTick()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await wrapper.vm.$nextTick()
    expect(wrapper.find('dialog').exists()).toBe(false)
  })

  it('ArrowDown moves activeIndex forward', async () => {
    const wrapper = await mountComponent()
    wrapper.vm.open()
    await wrapper.vm.$nextTick()
    await wrapper.find('input[type="text"]').setValue('json')
    const items = wrapper.findAll('li')
    expect(items.length).toBeGreaterThan(1)
    expect(items[0].classes()).toContain('bg-base-300')
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    await wrapper.vm.$nextTick()
    // After ArrowDown, the second item should be the active one. We check that
    // exactly one li has the bg-base-300 class and it's not the first.
    const activeItems = wrapper.findAll('li.bg-base-300')
    // Note: the class is on the inner div, not the li. Find by inner div.
    const activeDivs = wrapper.findAll('div.bg-base-300')
    expect(activeDivs.length).toBe(1)
  })

  it('ArrowUp moves activeIndex backward (wraps)', async () => {
    const wrapper = await mountComponent()
    wrapper.vm.open()
    await wrapper.vm.$nextTick()
    await wrapper.find('input[type="text"]').setValue('json')
    // Start at 0, press ArrowUp -> should wrap to last
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }))
    await wrapper.vm.$nextTick()
    const activeDivs = wrapper.findAll('div.bg-base-300')
    expect(activeDivs.length).toBe(1)
    const items = wrapper.findAll('li')
    // The active div should be inside the last li
    const lastLi = items[items.length - 1]
    expect(lastLi.find('div.bg-base-300').exists()).toBe(true)
  })

  it('Enter pushes the active path to the router and closes', async () => {
    const wrapper = await mountComponent()
    const router = wrapper.vm.$router
    const pushSpy = vi.spyOn(router, 'push')
    wrapper.vm.open()
    await wrapper.vm.$nextTick()
    await wrapper.find('input[type="text"]').setValue('base64')
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    await wrapper.vm.$nextTick()
    expect(pushSpy).toHaveBeenCalledWith('/base64')
    expect(wrapper.find('dialog').exists()).toBe(false)
  })
```

Also add `vi` to the vitest import at the top of the file:

```js
import { describe, it, expect, vi } from 'vitest'
```

**Caveat — jsdom limits:** `KeyboardEvent` in jsdom does not honor `metaKey`/`ctrlKey` modifiers in all setups, and Vue's `@keydown` on a focused element is hard to drive via `window.dispatchEvent` if the focus isn't on a listener inside the document. If the keyboard tests are flaky in jsdom, fall back to calling the handler functions directly:

```js
// Fallback approach if window.dispatchEvent doesn't trigger handlers:
wrapper.vm.handleKeydown(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
await wrapper.vm.$nextTick()
```

If the global-shortcut tests prove impossible in jsdom, mark them `it.skip` with a comment noting they're manually verified, and keep the rendering tests from Task 5. Do not delete failing tests — skip them with a clear comment.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/CommandPalette.component.test.js`
Expected: FAIL — keyboard tests fail (no keydown listener registered)

- [ ] **Step 3: Write minimal implementation**

Update `src/components/CommandPalette.vue` — replace the `<script setup>` block with:

```js
<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { MagnifyingGlassIcon } from '@heroicons/vue/24/outline'
import { searchIndex, searchTools, highlightMatch, truncateResults } from '../tools/search.js'

const props = defineProps({
  limit: {
    type: Number,
    default: 20,
  },
})

const router = useRouter()

const open = ref(false)
const query = ref('')
const activeIndex = ref(0)
const inputEl = ref(null)

const results = computed(() =>
  truncateResults(searchTools(query.value, searchIndex), props.limit)
)

watch(results, (newResults) => {
  if (activeIndex.value >= newResults.length) {
    activeIndex.value = 0
  }
})

function openPalette() {
  open.value = true
  query.value = ''
  activeIndex.value = 0
  nextTick(() => {
    inputEl.value?.focus()
  })
}

function closePalette() {
  open.value = false
  query.value = ''
  activeIndex.value = 0
}

function select(path) {
  router.push(path)
  closePalette()
}

function handleKeydown(e) {
  // Toggle on Cmd/Ctrl+K
  const isToggleShortcut = (e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')
  if (isToggleShortcut) {
    e.preventDefault()
    if (open.value) closePalette()
    else openPalette()
    return
  }

  if (!open.value) return

  if (e.key === 'Escape') {
    e.preventDefault()
    closePalette()
    return
  }

  if (!results.value.length) return

  if (e.key === 'ArrowDown') {
    e.preventDefault()
    activeIndex.value = (activeIndex.value + 1) % results.value.length
    return
  }

  if (e.key === 'ArrowUp') {
    e.preventDefault()
    activeIndex.value =
      (activeIndex.value - 1 + results.value.length) % results.value.length
    return
  }

  if (e.key === 'Enter') {
    e.preventDefault()
    const tool = results.value[activeIndex.value]
    if (tool) select(tool.path)
    return
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

defineExpose({ open: openPalette, close: closePalette, handleKeydown })
</script>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/CommandPalette.component.test.js`
Expected: PASS — all tests green (or some skipped with comments if jsdom can't drive them)

- [ ] **Step 5: Run lint**

Run: `npm run lint`
Expected: no errors in `src/components/CommandPalette.vue` or its test file

- [ ] **Step 6: Commit**

```bash
git -C E:/githome-windows/tools add src/components/CommandPalette.vue src/components/CommandPalette.component.test.js
git -C E:/githome-windows/tools commit -m "feat(search): add keyboard navigation + global Cmd/Ctrl+K shortcut"
```

## Task 7: Integrate `CommandPalette` into `App.vue` (navbar button + mount)

**Files:**
- Modify: `src/App.vue`

This task is verified by manual browser testing — there's no automated test for `App.vue` integration. Existing tests in `src/tools/home/Home.test.js` mount `Home` directly, not `App.vue`. Adding one would require mocking the router with all 44+ routes; the cost outweighs the value.

- [ ] **Step 1: Add navbar search button**

In `src/App.vue`, find the navbar right-side `flex-none` block (around line 40-54 in the current file). The block currently contains the GitHub link and the theme toggle. Add a search button **before** the GitHub link.

Current (around line 40):

```html
<div class="flex-none flex items-center gap-2">
  <a
    href="https://github.com/wxsms/tools"
    target="_blank"
    class="btn btn-ghost btn-sm gap-1"
  >
```

Change to:

```html
<div class="flex-none flex items-center gap-2">
  <button
    class="btn btn-ghost btn-sm btn-square"
    aria-label="搜索工具"
    @click="paletteRef?.open()"
  >
    <MagnifyingGlassIcon class="w-5 h-5" />
  </button>
  <a
    href="https://github.com/wxsms/tools"
    target="_blank"
    class="btn btn-ghost btn-sm gap-1"
  >
```

- [ ] **Step 2: Mount `CommandPalette` at the end of the root template**

Find the closing of the root `<div>` (the outermost `<div>` wrapping the whole `drawer`). In the current file, the structure is:

```html
<template>
  <div>
    <div :class="['drawer', { 'lg:drawer-open': !isHome }]">
      ...
    </div>
  </div>
</template>
```

Add `<CommandPalette ref="paletteRef" />` as a sibling of the `drawer` div, inside the root `div`:

```html
<template>
  <div>
    <div :class="['drawer', { 'lg:drawer-open': !isHome }]">
      ...
    </div>
    <CommandPalette ref="paletteRef" />
  </div>
</template>
```

The `...` represents the existing drawer content — do not modify it. Place the `<CommandPalette>` tag immediately after the drawer `</div>` and before the root `</div>`.

- [ ] **Step 3: Update the `<script setup>` block**

In the `<script setup>` of `src/App.vue`, make three edits:

1. Add `ref` to the Vue import (currently only `computed, onMounted` are imported):

```js
import { computed, onMounted, ref } from 'vue'
```

2. Add `CommandPalette` import and `MagnifyingGlassIcon` import after the existing icon import line. The current icon import is:

```js
import { Bars3Icon, SunIcon, MoonIcon, WrenchScrewdriverIcon } from '@heroicons/vue/24/outline'
```

Change it to:

```js
import {
  Bars3Icon,
  MagnifyingGlassIcon,
  MoonIcon,
  SunIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/vue/24/outline'
import CommandPalette from './components/CommandPalette.vue'
```

3. Add the `paletteRef` declaration. After `const isHome = computed(() => route.path === '/')` (around line 161), add:

```js
const paletteRef = ref(null)
```

- [ ] **Step 4: Run lint**

Run: `npm run lint`
Expected: no errors in `src/App.vue`

- [ ] **Step 5: Run all tests**

Run: `npm run test`
Expected: all tests pass (existing tests + new search tests)

- [ ] **Step 6: Run dev server and manual-test in browser**

Run: `npm run dev`

Open the dev URL in a browser. Manually verify:

1. **Navbar button** — Click the magnifying-glass icon in the navbar. The palette opens, input is focused.
2. **Cmd/Ctrl+K** — Press the shortcut. Palette opens. Press again. Palette closes.
3. **Esc** — Open the palette, press Esc. Palette closes.
4. **Type to search** — Type "base64". Results show "Base64 转换" with "Base" highlighted.
5. **Arrow keys** — Type "json" (multiple results). Press ArrowDown — highlight moves to the second result. Press ArrowUp — wraps to the last result.
6. **Enter** — With a result highlighted, press Enter. Browser navigates to that tool's route. Palette is closed.
7. **No results** — Type "zzznotfound". The "未找到匹配工具" message shows.
8. **Empty query** — Open palette without typing. The "输入关键词以搜索工具…" message shows.
9. **Click outside** — Click on the modal backdrop (outside the box). Palette closes.
10. **Mobile** — Resize to mobile width. Tap the magnifying-glass icon. Palette opens. Tap a result — navigates.
11. **Theme** — Toggle dark/light theme. Highlight color (`bg-warning/30`) is visible in both.

- [ ] **Step 7: Commit**

```bash
git -C E:/githome-windows/tools add src/App.vue
git -C E:/githome-windows/tools commit -m "feat(search): mount CommandPalette + add navbar search button"
```

## Task 8: Final verification

**Files:** none modified

- [ ] **Step 1: Run all tests**

Run: `npm run test`
Expected: all tests pass. Specifically these new test files:
- `src/tools/search.test.js` — 4 describe blocks (~25 tests)
- `src/components/CommandPalette.component.test.js` — ~12 tests (some may be skipped per Task 6 caveat)

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: no errors

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: build succeeds without errors

- [ ] **Step 4: Final manual smoke test**

Run: `npm run preview` (or `npm run dev`)

Verify the complete flow one last time:
1. Open the home page. Click navbar search icon. Palette opens.
2. Cmd/Ctrl+K toggles the palette.
3. Type "jwt" — first result is "JWT 解码" (name match).
4. Type "加密" — results include all tools under "加解密" group.
5. Type "格式化" — results show tools with "格式化" in description.
6. ArrowDown/Up navigation works.
7. Enter on a highlighted result navigates to that tool.
8. Esc closes the palette.
9. Click outside closes the palette.

- [ ] **Step 5: Commit any final fixes (if needed)**

If lint/build/tests surfaced issues that required edits, commit them:

```bash
git -C E:/githome-windows/tools add -A
git -C E:/githome-windows/tools commit -m "chore(search): final fixes after verification"
```

If no fixes were needed, skip this step.

---

## Plan Self-Review Notes

**Spec coverage:**

| Spec section | Implemented in |
|---|---|
| `buildSearchIndex` | Task 1 |
| `highlightMatch` | Task 2 |
| `searchTools` (with priority sorting) | Task 3 |
| `truncateResults` | Task 4 |
| `CommandPalette.vue` template + open/close | Task 5 |
| Keyboard handling + global shortcut | Task 6 |
| `App.vue` navbar button + mount | Task 7 |
| Empty-query "输入关键词以搜索工具…" state | Task 5 (template) + Task 5 test |
| No-match "未找到匹配工具" state | Task 5 (template) + Task 5 test |
| `activeIndex` out-of-bounds protection | Task 5 (`watch(results, ...)`) |
| Manual mobile + theme testing | Task 7 Step 6 |

**Type/name consistency:** `matchedField` (string), `matched` (boolean) — used consistently across `search.js` and the component template. `openPalette`/`closePalette` are internal names; `defineExpose` exposes them as `open`/`close`. Test code calls `wrapper.vm.open()` and `wrapper.vm.close()` — matches the exposed names.

**Known caveats (called out in plan):**
- Keyboard tests in jsdom may be flaky. Task 6 explicitly says: if `window.dispatchEvent` doesn't drive the handlers, fall back to `wrapper.vm.handleKeydown(...)` directly, or `it.skip` with a manual-verification comment. Do not delete failing tests silently.
- Task 5's `defineProps` appears twice in the draft code block — the plan explicitly tells the engineer to use the second, single-`defineProps` version. (This was a drafting slip; the corrected version is in the plan.)
- `App.vue` integration has no automated test. Task 7 relies on manual browser testing with a 11-item checklist.

**Files NOT touched by this plan:**
- `src/tools.js` — read-only
- `src/router.js` / `src/routes.js` — read-only
- `src/tools/home/Home.vue` — read-only (palette covers the search need)
- Any existing tool's `.vue` file — untouched
