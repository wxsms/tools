# Emoji 大全工具实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 `/emoji` 路由的 Emoji 大全工具，支持分类浏览、关键词搜索、点击复制字符、详情面板多格式复制（shortcode / 码点 / HTML 实体 / URL 编码）。

**Architecture:** 数据来自 `emojibase-data` 的 compact.json + shortcodes.json，构建期 import 并预处理为扁平数组。`emoji-data.js` 负责数据层，`emoji.js` 负责业务纯函数（分组、搜索、复制格式、剪贴板工具），`Emoji.vue` 负责视图层（搜索 + 分类 tab + 网格 + 详情面板）。TDD：先写纯函数测试，再写组件测试。

**Tech Stack:** Vue 3 + Vite + Tailwind CSS + DaisyUI + Vitest + @vue/test-utils + emojibase-data

**Spec:** `docs/superpowers/specs/2026-07-15-emoji-catalog-design.md`

---

## File Structure

```
src/tools/emoji/
├── emoji-data.js                # 数据层：构建期 import emojibase-data，预处理导出 EMOJIS / GROUPS
├── emoji.js                     # 业务纯函数：getEmojiGroups / searchEmojis / copyFormats / copyText
├── emoji.test.js                # 纯函数测试
├── Emoji.vue                    # 视图组件
└── Emoji.component.test.js      # 组件测试
```

修改的现有文件：
- `src/routes.js` — 追加 `/emoji` 路由 meta
- `src/router.js` — import 组件 + 组件映射
- `src/tools.js` — 在「文本处理」组追加入口

---

## Task 1: 创建数据层 `emoji-data.js`

**Files:**
- Create: `src/tools/emoji/emoji-data.js`

- [ ] **Step 1: 创建文件并写预处理逻辑**

```js
// src/tools/emoji/emoji-data.js
import compact from 'emojibase-data/en/compact.json'
import shortcodesMap from 'emojibase-data/en/shortcodes/emojibase.json'

export const GROUPS = [
  { id: 0, name: '笑脸与情感' },
  { id: 1, name: '人与身体' },
  { id: 3, name: '动物与自然' },
  { id: 4, name: '食物与饮料' },
  { id: 5, name: '旅行与地点' },
  { id: 6, name: '活动与事件' },
  { id: 7, name: '物品' },
  { id: 8, name: '符号' },
  { id: 9, name: '旗帜' },
]

const VALID_GROUP_IDS = new Set(GROUPS.map(g => g.id))

export const EMOJIS = compact
  .filter(e => VALID_GROUP_IDS.has(e.group))
  .map(e => ({
    hexcode: e.hexcode,
    char: e.unicode,
    label: e.label,
    shortcodes: shortcodesMap[e.hexcode] || [],
    tags: e.tags || [],
    group: e.group,
    order: e.order,
    skins: (e.skins || []).map(s => ({
      hexcode: s.hexcode,
      char: s.unicode,
      label: s.label,
    })),
  }))
  .sort((a, b) => a.order - b.order)
```

- [ ] **Step 2: 验证可被 import（手动跑一次）**

Run: `node -e "import('./src/tools/emoji/emoji-data.js').then(m => console.log('count:', m.EMOJIS.length, 'groups:', m.GROUPS.length, 'sample:', JSON.stringify(m.EMOJIS[0])))"`
Expected: 输出 `count: ~1800 groups: 9 sample: {...}`，无报错。

注：因为项目 `package.json` 是 `"type": "module"`，且 `emojibase-data` 是 CJS，Vite 构建期会处理 interop；但纯 node 直接 import 可能因 CJS/ESM 边界报错。如果报错，跳过此步，依赖后续测试覆盖。

- [ ] **Step 3: Commit**

```bash
git -C E:/githome-windows/tools add src/tools/emoji/emoji-data.js
git -C E:/githome-windows/tools commit -m "feat(emoji): add data layer with emojibase-data preprocessing"
```

---

## Task 2: 写纯函数测试 `emoji.test.js`（先失败）

**Files:**
- Create: `src/tools/emoji/emoji.test.js`

- [ ] **Step 1: 写测试文件**

```js
// src/tools/emoji/emoji.test.js
import { describe, it, expect } from 'vitest'
import { EMOJIS, GROUPS } from './emoji-data.js'
import { getEmojiGroups, searchEmojis, copyFormats } from './emoji.js'

describe('emoji-data integrity', () => {
  it('has more than 1500 emojis', () => {
    expect(EMOJIS.length).toBeGreaterThan(1500)
  })

  it('every entry has required fields', () => {
    EMOJIS.forEach(e => {
      expect(e.hexcode).toBeTruthy()
      expect(e.char).toBeTruthy()
      expect(e.label).toBeTruthy()
      expect(typeof e.group).toBe('number')
    })
  })

  it('has no group === 2 (skin tone component)', () => {
    expect(EMOJIS.filter(e => e.group === 2)).toHaveLength(0)
  })

  it('GROUPS has 9 entries', () => {
    expect(GROUPS).toHaveLength(9)
  })

  it('every group has at least one emoji', () => {
    GROUPS.forEach(g => {
      const count = EMOJIS.filter(e => e.group === g.id).length
      expect(count).toBeGreaterThan(0)
    })
  })
})

describe('getEmojiGroups', () => {
  it('returns groups in GROUPS order', () => {
    const groups = getEmojiGroups(EMOJIS)
    expect(groups).toHaveLength(GROUPS.length)
    groups.forEach((g, i) => {
      expect(g.id).toBe(GROUPS[i].id)
      expect(g.name).toBe(GROUPS[i].name)
    })
  })

  it('every group has non-empty items', () => {
    const groups = getEmojiGroups(EMOJIS)
    groups.forEach(g => {
      expect(g.items.length).toBeGreaterThan(0)
    })
  })
})

describe('searchEmojis', () => {
  it('returns original array for empty query', () => {
    const result = searchEmojis(EMOJIS, '')
    expect(result.length).toBe(EMOJIS.length)
  })

  it('returns original array for whitespace-only query', () => {
    const result = searchEmojis(EMOJIS, '   ')
    expect(result.length).toBe(EMOJIS.length)
  })

  it('is case-insensitive', () => {
    const upper = searchEmojis(EMOJIS, 'THUMB')
    const lower = searchEmojis(EMOJIS, 'thumb')
    expect(upper.map(e => e.hexcode)).toEqual(lower.map(e => e.hexcode))
  })

  it('matches label', () => {
    const result = searchEmojis(EMOJIS, 'grinning')
    expect(result.some(e => e.label === 'grinning face')).toBe(true)
  })

  it('matches shortcode', () => {
    const byPlus1 = searchEmojis(EMOJIS, '+1')
    const byThumbsup = searchEmojis(EMOJIS, 'thumbsup')
    expect(byPlus1.some(e => e.hexcode === '1F44D')).toBe(true)
    expect(byThumbsup.some(e => e.hexcode === '1F44D')).toBe(true)
  })

  it('matches tags', () => {
    const result = searchEmojis(EMOJIS, 'happy')
    expect(result.some(e => e.tags.includes('happy'))).toBe(true)
  })

  it('returns empty array for no match', () => {
    const result = searchEmojis(EMOJIS, 'xyzqwerty_nothing')
    expect(result).toHaveLength(0)
  })

  it('only searches within provided items', () => {
    const subset = EMOJIS.slice(0, 10)
    const result = searchEmojis(subset, 'grinning')
    // subset 中可能不含 grinning face（它通常是第 1 条，所以可能在）
    // 这里只验证结果不会超出 subset 范围
    result.forEach(r => {
      expect(subset).toContain(r)
    })
  })
})

describe('copyFormats', () => {
  it('formats single-codepoint emoji correctly', () => {
    const thumbsUp = EMOJIS.find(e => e.hexcode === '1F44D')
    expect(thumbsUp).toBeTruthy()
    const fmt = copyFormats(thumbsUp)
    expect(fmt.char).toBe('👍')
    expect(fmt.shortcode).toBe(':thumbsup:')
    expect(fmt.codepoint).toBe('U+1F44D')
    expect(fmt.htmlEntity).toBe('&#128077;')
    expect(fmt.urlEncoded).toBe(encodeURIComponent('👍'))
  })

  it('returns empty shortcode when no shortcodes', () => {
    const noShortcode = EMOJIS.find(e => e.shortcodes.length === 0)
    if (!noShortcode) return // 如果所有 emoji 都有 shortcode，跳过
    const fmt = copyFormats(noShortcode)
    expect(fmt.shortcode).toBe('')
  })

  it('formats multi-codepoint emoji (flags) correctly', () => {
    // 找一个旗子 emoji，hexcode 形如 1F1E6-1F1E8
    const flag = EMOJIS.find(e => e.hexcode.includes('-'))
    expect(flag).toBeTruthy()
    const fmt = copyFormats(flag)
    const parts = flag.hexcode.split('-')
    const expectedCodepoint = parts.map(p => 'U+' + p).join(' ')
    const expectedHtmlEntity = parts.map(p => '&#' + parseInt(p, 16) + ';').join('')
    expect(fmt.codepoint).toBe(expectedCodepoint)
    expect(fmt.htmlEntity).toBe(expectedHtmlEntity)
  })
})
```

- [ ] **Step 2: 运行测试，确认失败（模块不存在）**

Run: `npx vitest run src/tools/emoji/emoji.test.js`
Expected: FAIL，错误信息包含 `Cannot find module './emoji.js'`

- [ ] **Step 3: Commit 测试文件**

```bash
git -C E:/githome-windows/tools add src/tools/emoji/emoji.test.js
git -C E:/githome-windows/tools commit -m "test(emoji): add failing tests for pure functions"
```

---

## Task 3: 实现纯函数 `emoji.js` 让测试通过

**Files:**
- Create: `src/tools/emoji/emoji.js`

- [ ] **Step 1: 写实现**

```js
// src/tools/emoji/emoji.js
import { GROUPS } from './emoji-data.js'

export function getEmojiGroups(emojis) {
  return GROUPS.map(g => ({
    id: g.id,
    name: g.name,
    items: emojis.filter(e => e.group === g.id),
  }))
}

export function searchEmojis(items, query) {
  const q = (query || '').trim().toLowerCase()
  if (!q) return items
  return items.filter(e => {
    if (e.label.toLowerCase().includes(q)) return true
    if (e.shortcodes.some(sc => sc.toLowerCase().includes(q))) return true
    if (e.tags.some(t => t.toLowerCase().includes(q))) return true
    return false
  })
}

export function copyFormats(emoji) {
  const parts = emoji.hexcode.split('-')
  return {
    char: emoji.char,
    shortcode: emoji.shortcodes.length ? ':' + emoji.shortcodes[0] + ':' : '',
    codepoint: parts.map(p => 'U+' + p).join(' '),
    htmlEntity: parts.map(p => '&#' + parseInt(p, 16) + ';').join(''),
    urlEncoded: encodeURIComponent(emoji.char),
  }
}

export async function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return
    } catch (e) {
      // 降级到 execCommand
    }
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    if (!ok) throw new Error('execCommand returned false')
  } catch (e) {
    throw new Error('copy failed')
  }
}
```

- [ ] **Step 2: 运行测试，确认通过**

Run: `npx vitest run src/tools/emoji/emoji.test.js`
Expected: PASS，所有测试通过。

- [ ] **Step 3: Commit**

```bash
git -C E:/githome-windows/tools add src/tools/emoji/emoji.js
git -C E:/githome-windows/tools commit -m "feat(emoji): implement pure functions for groups/search/copyFormats"
```

---

## Task 4: 写组件测试 `Emoji.component.test.js`（先失败）

**Files:**
- Create: `src/tools/emoji/Emoji.component.test.js`

- [ ] **Step 1: 写组件测试**

```js
// src/tools/emoji/Emoji.component.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import Emoji from './Emoji.vue'

function mountComponent() {
  return mount(Emoji)
}

describe('Emoji component', () => {
  beforeEach(() => {
    vi.stubGlobal('navigator', {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })
  })

  it('renders title', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('Emoji 大全')
  })

  it('renders search input', () => {
    const wrapper = mountComponent()
    expect(wrapper.find('input[type="text"]').exists()).toBe(true)
  })

  it('renders category tabs (全部 + 9 groups = 10)', () => {
    const wrapper = mountComponent()
    const tabs = wrapper.findAll('[data-test="tab"]')
    expect(tabs.length).toBe(10)
    expect(tabs[0].text()).toContain('全部')
  })

  it('renders at least 100 emoji buttons under 全部', () => {
    const wrapper = mountComponent()
    const buttons = wrapper.findAll('[data-test="emoji-btn"]')
    expect(buttons.length).toBeGreaterThan(100)
  })

  it('filters emojis by search query', async () => {
    const wrapper = mountComponent()
    const before = wrapper.findAll('[data-test="emoji-btn"]').length
    const input = wrapper.find('input[type="text"]')
    await input.setValue('grinning')
    await flushPromises()
    const after = wrapper.findAll('[data-test="emoji-btn"]').length
    expect(after).toBeLessThan(before)
    expect(after).toBeGreaterThan(0)
  })

  it('restores full list when search cleared', async () => {
    const wrapper = mountComponent()
    const before = wrapper.findAll('[data-test="emoji-btn"]').length
    const input = wrapper.find('input[type="text"]')
    await input.setValue('grinning')
    await flushPromises()
    await input.setValue('')
    await flushPromises()
    const after = wrapper.findAll('[data-test="emoji-btn"]').length
    expect(after).toBe(before)
  })

  it('filters by category when tab clicked', async () => {
    const wrapper = mountComponent()
    const before = wrapper.findAll('[data-test="emoji-btn"]').length
    const tabs = wrapper.findAll('[data-test="tab"]')
    // 点「笑脸与情感」（第 2 个 tab，索引 1）
    await tabs[1].trigger('click')
    await flushPromises()
    const after = wrapper.findAll('[data-test="emoji-btn"]').length
    expect(after).toBeLessThan(before)
  })

  it('copies char when emoji clicked', async () => {
    const wrapper = mountComponent()
    const btn = wrapper.find('[data-test="emoji-btn"]')
    await btn.trigger('click')
    await flushPromises()
    expect(navigator.clipboard.writeText).toHaveBeenCalled()
    const arg = navigator.clipboard.writeText.mock.calls[0][0]
    expect(typeof arg).toBe('string')
    expect(arg.length).toBeGreaterThan(0)
  })

  it('shows detail panel when emoji clicked', async () => {
    const wrapper = mountComponent()
    expect(wrapper.find('[data-test="detail"]').exists()).toBe(false)
    const btn = wrapper.find('[data-test="emoji-btn"]')
    await btn.trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-test="detail"]').exists()).toBe(true)
  })

  it('renders 5 copy format buttons in detail panel', async () => {
    const wrapper = mountComponent()
    const btn = wrapper.find('[data-test="emoji-btn"]')
    await btn.trigger('click')
    await flushPromises()
    const copyBtns = wrapper.findAll('[data-test="copy-btn"]')
    expect(copyBtns.length).toBe(5)
  })

  it('copies codepoint format when codepoint button clicked', async () => {
    const wrapper = mountComponent()
    const btn = wrapper.find('[data-test="emoji-btn"]')
    await btn.trigger('click')
    await flushPromises()
    const copyBtns = wrapper.findAll('[data-test="copy-btn"]')
    // 找「码点」按钮
    const codepointBtn = copyBtns.find(b => b.text().includes('码点'))
    expect(codepointBtn).toBeTruthy()
    navigator.clipboard.writeText.mockClear()
    await codepointBtn.trigger('click')
    await flushPromises()
    expect(navigator.clipboard.writeText).toHaveBeenCalled()
    const arg = navigator.clipboard.writeText.mock.calls[0][0]
    expect(arg).toMatch(/^U\+[0-9A-F]+( U\+[0-9A-F]+)*$/)
  })
})
```

- [ ] **Step 2: 运行组件测试，确认失败（组件不存在）**

Run: `npx vitest run src/tools/emoji/Emoji.component.test.js`
Expected: FAIL，错误信息包含 `Cannot find module './Emoji.vue'`

- [ ] **Step 3: Commit 测试文件**

```bash
git -C E:/githome-windows/tools add src/tools/emoji/Emoji.component.test.js
git -C E:/githome-windows/tools commit -m "test(emoji): add failing component tests"
```

---

## Task 5: 实现 `Emoji.vue` 让组件测试通过

**Files:**
- Create: `src/tools/emoji/Emoji.vue`

- [ ] **Step 1: 写组件**

```vue
<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">
      Emoji 大全
    </h1>

    <!-- 搜索框 -->
    <div class="relative mb-4">
      <input
        v-model="query"
        type="text"
        class="input input-bordered w-full pr-10"
        placeholder="输入关键词搜索（英文）..."
      >
      <button
        v-if="query"
        class="absolute right-2 top-1/2 -translate-y-1/2 btn btn-ghost btn-xs btn-circle"
        aria-label="清空搜索"
        @click="query = ''"
      >
        ✕
      </button>
    </div>

    <!-- 分类 tab -->
    <div class="flex gap-1 overflow-x-auto mb-6 pb-1">
      <button
        v-for="tab in tabs"
        :key="String(tab.id)"
        data-test="tab"
        class="btn btn-sm shrink-0"
        :class="activeGroup === tab.id ? 'btn-primary' : 'btn-ghost'"
        @click="activeGroup = tab.id"
      >
        {{ tab.name }}
      </button>
    </div>

    <!-- 网格 -->
    <div
      v-if="visibleEmojis.length"
      class="grid grid-cols-8 sm:grid-cols-10 lg:grid-cols-12 gap-1"
    >
      <button
        v-for="emoji in visibleEmojis"
        :key="emoji.hexcode"
        data-test="emoji-btn"
        class="aspect-square text-3xl flex items-center justify-center rounded-lg hover:bg-base-200 active:scale-95 transition"
        :class="{ 'bg-base-300 ring-2 ring-primary': selectedHex === emoji.hexcode }"
        :title="emoji.label"
        :aria-label="`复制 emoji ${emoji.label}`"
        @click="onEmojiClick(emoji)"
      >
        {{ emoji.char }}
      </button>
    </div>
    <div
      v-else
      class="text-center py-12 opacity-50"
    >
      未找到匹配的 emoji
    </div>

    <!-- 详情面板 -->
    <div
      v-if="selectedEmoji"
      data-test="detail"
      class="card bg-base-200 mt-6"
    >
      <div class="card-body">
        <div class="flex items-center gap-4">
          <span class="text-5xl">{{ selectedEmoji.char }}</span>
          <div>
            <p class="text-xl font-semibold">
              {{ selectedEmoji.label }}
            </p>
            <p class="text-sm opacity-60">
              <span class="font-mono">{{ formats.codepoint }}</span>
              <span class="mx-1">·</span>
              <span>{{ groupName(selectedEmoji.group) }}</span>
            </p>
          </div>
        </div>

        <div class="divider my-2" />

        <!-- 复制格式按钮 -->
        <div class="flex flex-wrap gap-2">
          <button
            data-test="copy-btn"
            class="btn btn-sm btn-outline"
            aria-label="复制 字符"
            @click="copyAndToast(formats.char, `已复制 ${formats.char}`)"
          >
            字符 <span class="font-mono">{{ formats.char }}</span>
          </button>
          <button
            data-test="copy-btn"
            class="btn btn-sm btn-outline"
            :disabled="!formats.shortcode"
            :aria-label="formats.shortcode ? '复制 shortcode' : '无 shortcode'"
            @click="formats.shortcode && copyAndToast(formats.shortcode, `已复制 ${formats.shortcode}`)"
          >
            shortcode <span class="font-mono">{{ formats.shortcode || '无' }}</span>
          </button>
          <button
            data-test="copy-btn"
            class="btn btn-sm btn-outline"
            aria-label="复制 码点"
            @click="copyAndToast(formats.codepoint, `已复制 ${formats.codepoint}`)"
          >
            码点 <span class="font-mono">{{ formats.codepoint }}</span>
          </button>
          <button
            data-test="copy-btn"
            class="btn btn-sm btn-outline"
            aria-label="复制 HTML 实体"
            @click="copyAndToast(formats.htmlEntity, `已复制 ${formats.htmlEntity}`)"
          >
            HTML <span class="font-mono">{{ formats.htmlEntity }}</span>
          </button>
          <button
            data-test="copy-btn"
            class="btn btn-sm btn-outline"
            aria-label="复制 URL 编码"
            @click="copyAndToast(formats.urlEncoded, `已复制 ${formats.urlEncoded}`)"
          >
            URL <span class="font-mono">{{ formats.urlEncoded }}</span>
          </button>
        </div>

        <!-- 所有 shortcode -->
        <div class="text-sm mt-2">
          <span class="font-semibold">所有 shortcode：</span>
          <span v-if="selectedEmoji.shortcodes.length">
            {{ selectedEmoji.shortcodes.join(', ') }}
          </span>
          <span v-else>无</span>
        </div>

        <!-- 标签 -->
        <div class="text-sm">
          <span class="font-semibold">标签：</span>
          <span v-if="selectedEmoji.tags.length">
            {{ selectedEmoji.tags.join(', ') }}
          </span>
          <span v-else>无</span>
        </div>

        <!-- 变体 -->
        <div
          v-if="selectedEmoji.skins.length"
          class="mt-2"
        >
          <p class="text-sm font-semibold mb-1">
            肤色变体：
          </p>
          <div class="flex gap-1">
            <button
              v-for="skin in selectedEmoji.skins"
              :key="skin.hexcode"
              class="text-2xl w-10 h-10 flex items-center justify-center rounded-lg hover:bg-base-300 transition"
              :title="skin.label"
              :aria-label="`复制 emoji ${skin.label}`"
              @click="copyAndToast(skin.char, `已复制 ${skin.char}`)"
            >
              {{ skin.char }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- toast -->
    <div
      v-if="toast"
      class="toast toast-end"
    >
      <div class="alert alert-info">
        {{ toast }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { EMOJIS, GROUPS } from './emoji-data.js'
import { searchEmojis, copyFormats, copyText } from './emoji.js'

const query = ref('')
const activeGroup = ref(null)
const selectedHex = ref(null)
const toast = ref(null)
let toastTimer = null

const tabs = computed(() => [
  { id: null, name: '全部' },
  ...GROUPS,
])

const filteredByGroup = computed(() => {
  if (activeGroup.value === null) return EMOJIS
  return EMOJIS.filter(e => e.group === activeGroup.value)
})

const visibleEmojis = computed(() => searchEmojis(filteredByGroup.value, query.value))

const selectedEmoji = computed(() => {
  if (!selectedHex.value) return null
  return EMOJIS.find(e => e.hexcode === selectedHex.value) || null
})

const formats = computed(() => selectedEmoji.value ? copyFormats(selectedEmoji.value) : null)

function groupName(id) {
  const g = GROUPS.find(g => g.id === id)
  return g ? g.name : ''
}

function showToast(msg) {
  toast.value = msg
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value = null }, 2000)
}

async function copyAndToast(text, msg) {
  try {
    await copyText(text)
    showToast(msg)
  } catch (e) {
    showToast('复制失败，请手动选择')
  }
}

async function onEmojiClick(emoji) {
  selectedHex.value = emoji.hexcode
  await copyAndToast(emoji.char, `已复制 ${emoji.char}`)
}
</script>
```

- [ ] **Step 2: 运行组件测试，确认通过**

Run: `npx vitest run src/tools/emoji/Emoji.component.test.js`
Expected: PASS，所有 11 个测试通过。

- [ ] **Step 3: Commit**

```bash
git -C E:/githome-windows/tools add src/tools/emoji/Emoji.vue
git -C E:/githome-windows/tools commit -m "feat(emoji): implement Emoji.vue view component"
```

---

## Task 6: 注册路由

**Files:**
- Modify: `src/routes.js`
- Modify: `src/router.js`

- [ ] **Step 1: 在 `routes.js` 末尾追加 emoji 路由定义**

在 `src/routes.js` 的数组末尾（`/keyboard-tester` 那一项之后）追加：

```js
  {
    path: '/emoji',
    meta: {
      title: 'Emoji 大全',
      description: 'Emoji 查询与复制，支持字符、shortcode、码点、HTML 实体、URL 编码多种格式',
    },
  },
```

- [ ] **Step 2: 在 `router.js` 加 import 和组件映射**

在 `src/router.js` 的 import 区（第 46 行 `import KeyboardTester` 之后）追加：

```js
import Emoji from './tools/emoji/Emoji.vue'
```

在 `components` 对象（第 92 行 `'/keyboard-tester': KeyboardTester,` 之后）追加：

```js
  '/emoji': Emoji,
```

- [ ] **Step 3: 验证开发服务器能加载路由**

Run: `npx vite build`
Expected: 构建成功无报错（验证 import 路径正确、emojibase-data 能被打包）。

- [ ] **Step 4: Commit**

```bash
git -C E:/githome-windows/tools add src/routes.js src/router.js
git -C E:/githome-windows/tools commit -m "feat(emoji): register /emoji route"
```

---

## Task 7: 注册首页入口

**Files:**
- Modify: `src/tools.js`

- [ ] **Step 1: 在 `tools.js` 顶部 import 区加 `FaceSmileIcon`**

在 `src/tools.js` 第 1-44 行的 heroicons import 列表中追加 `FaceSmileIcon`（按字母序插入，比如在 `FilmIcon` 之后）：

```js
  FilmIcon,
  FaceSmileIcon,
  CameraIcon,
```

- [ ] **Step 2: 在「文本处理」组末尾追加 emoji 入口**

在 `src/tools.js` 的「文本处理」组（包含 diff、json、regex、case、patch-viewer、cli-format、csv 的那个组）的 `tools` 数组末尾追加：

```js
      {
        name: 'Emoji 大全',
        path: '/emoji',
        desc: 'Emoji 查询与多种格式复制',
        icon: FaceSmileIcon,
      },
```

- [ ] **Step 3: 验证首页能渲染**

Run: `npx vitest run`
Expected: 所有测试通过（含已有工具的测试，确认没有破坏）。

- [ ] **Step 4: Commit**

```bash
git -C E:/githome-windows/tools add src/tools.js
git -C E:/githome-windows/tools commit -m "feat(emoji): add home page entry in 文本处理 group"
```

---

## Task 8: Lint 与全量测试

**Files:** 无

- [ ] **Step 1: 跑 lint**

Run: `npm run lint`
Expected: 无错误。如有，修复后重新跑。

- [ ] **Step 2: 跑全量测试**

Run: `npm run test`
Expected: 所有测试通过，包括新增的 emoji 纯函数测试和组件测试。

- [ ] **Step 3: 跑构建验证**

Run: `npm run build`
Expected: 构建成功，无报错，无未使用 import 警告。

- [ ] **Step 4: 如有 lint/测试问题，修复后 amend 或新增 commit**

如果前几步有问题，修复后 commit：

```bash
git -C E:/githome-windows/tools add -A
git -C E:/githome-windows/tools commit -m "fix(emoji): address lint/test feedback"
```

---

## Task 9: 验收对照

**Files:** 无

- [ ] **Step 1: 对照 spec 验收标准逐项检查**

打开 `docs/superpowers/specs/2026-07-15-emoji-catalog-design.md` 的「验收标准」段，逐项确认：

- 路由 `/emoji` 可访问（构建无错即满足）
- 搜索能命中 label / shortcode / tag（Task 2 测试覆盖）
- 分类 tab 切换正确过滤（Task 4 测试覆盖）
- 点击 emoji 复制字符，toast 反馈（Task 4 测试覆盖）
- 详情面板 5 种格式按钮各自复制正确内容（Task 4 测试覆盖）
- 变体行对有 skins 的 emoji 渲染、对无 skins 的不渲染（Task 5 模板 `v-if` 已实现）
- `npm run lint` 与 `npm run test` 通过（Task 8 已验证）
- 首页「文本处理」分组下出现「Emoji 大全」入口（Task 7 已实现）

- [ ] **Step 2: 最终 commit（如有遗漏的改动）**

```bash
git -C E:/githome-windows/tools status
# 如果干净，无需 commit；如果有遗漏改动：
git -C E:/githome-windows/tools add -A
git -C E:/githome-windows/tools commit -m "chore(emoji): final cleanup"
```

---

## Self-Review 记录

- **Spec 覆盖**：所有 spec 章节均映射到任务——数据预处理（Task 1）、纯函数（Task 3）、视图（Task 5）、路由（Task 6）、菜单（Task 7）、验收（Task 8/9）。
- **占位符扫描**：无 TBD/TODO，所有代码块完整。
- **类型一致性**：`getEmojiGroups(emojis)` / `searchEmojis(items, query)` / `copyFormats(emoji)` / `copyText(text)` 在测试和实现中签名一致；`EMOJIS` 字段（`hexcode/char/label/shortcodes/tags/group/order/skins`）在 Task 1 定义、Task 3 使用、Task 5 模板使用，一致；`skins` 子字段 `hexcode/char/label` 一致。
- **测试字段引用**：组件测试用 `data-test` attribute 定位元素，与模板中的 `data-test` 标记一致（`tab` / `emoji-btn` / `detail` / `copy-btn`）。
