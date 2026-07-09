# URL 解析彩色高亮 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add color-highlighted URL preview below the input and color the parsed component values in the table.

**Architecture:** Extract a pure `tokenizeUrl(raw, urlObj)` function that returns an array of `{ text, color }` segments. Use it both for the preview bar and for coloring table values. The preview bar renders these segments as colored `<span>` elements. Table values get their color from a `LABELS` entry's `color` field.

**Tech Stack:** Vue 3, Tailwind CSS, Vitest + @vue/test-utils

---

### Task 1: Write the `tokenizeUrl` utility and tests

**Files:**
- Create: `src/utils/url-tokenize.js`
- Create: `src/utils/url-tokenize.test.js`

- [ ] **Step 1: Write the failing tests**

```js
// src/utils/url-tokenize.test.js
import { describe, it, expect } from 'vitest'
import { tokenizeUrl, COMPONENT_COLORS } from './url-tokenize'

describe('tokenizeUrl', () => {
  it('returns empty array for empty input', () => {
    expect(tokenizeUrl('')).toEqual([])
  })

  it('tokenizes a full URL with all components', () => {
    const raw = 'https://example.com:8080/path/to/page?name=张三&lang=zh&id=42#section'
    const url = new URL(raw)
    const tokens = tokenizeUrl(raw, url)

    // Should have 6 segments in order: protocol, hostname, port, pathname, search, hash
    expect(tokens.map(t => t.color)).toEqual([
      'text-blue-400',
      'text-green-400',
      'text-cyan-400',
      'text-amber-400',
      'text-rose-400',
      'text-violet-400',
    ])

    // Concatenated text should equal the original
    expect(tokens.map(t => t.text).join('')).toBe(raw)
  })

  it('handles URL without port', () => {
    const raw = 'https://example.com/path?q=1#top'
    const url = new URL(raw)
    const tokens = tokenizeUrl(raw, url)

    expect(tokens.map(t => t.text).join('')).toBe(raw)
    const colors = tokens.map(t => t.color)
    expect(colors).not.toContain('text-cyan-400')
  })

  it('handles URL without query or hash', () => {
    const raw = 'https://example.com/path'
    const url = new URL(raw)
    const tokens = tokenizeUrl(raw, url)

    expect(tokens.map(t => t.text).join('')).toBe(raw)
    const colors = tokens.map(t => t.color)
    expect(colors).not.toContain('text-rose-400')
    expect(colors).not.toContain('text-violet-400')
  })

  it('handles URL with query but no hash', () => {
    const raw = 'https://example.com/?q=test'
    const url = new URL(raw)
    const tokens = tokenizeUrl(raw, url)

    expect(tokens.map(t => t.text).join('')).toBe(raw)
    const colors = tokens.map(t => t.color)
    expect(colors).not.toContain('text-violet-400')
  })
})

describe('COMPONENT_COLORS', () => {
  it('has color for each standard component', () => {
    const keys = ['protocol', 'hostname', 'port', 'pathname', 'search', 'hash']
    keys.forEach(k => {
      expect(COMPONENT_COLORS[k]).toBeTruthy()
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/utils/url-tokenize.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Write the implementation**

```js
// src/utils/url-tokenize.js
export const COMPONENT_COLORS = {
  protocol: 'text-blue-400',
  hostname: 'text-green-400',
  port: 'text-cyan-400',
  pathname: 'text-amber-400',
  search: 'text-rose-400',
  hash: 'text-violet-400',
}

/**
 * Tokenize a raw URL string into colored segments based on URL components.
 * Returns an array of { text, color } objects whose concatenated text equals `raw`.
 */
export function tokenizeUrl(raw, url) {
  if (!raw) return []

  const segments = []

  // Define the ordered parts and how to find them in the raw string
  const parts = [
    { key: 'protocol', value: url.protocol + '//' },
    { key: 'hostname', value: url.hostname },
    { key: 'port', value: url.port ? ':' + url.port : '' },
    { key: 'pathname', value: url.pathname === '/' && !raw.includes('/') ? '' : url.pathname },
    { key: 'search', value: url.search },
    { key: 'hash', value: url.hash },
  ]

  let pos = 0
  for (const { key, value } of parts) {
    if (!value) continue

    const idx = raw.indexOf(value, pos)
    if (idx === pos) {
      // Segment starts right where we expect — no gap
      segments.push({ text: value, color: COMPONENT_COLORS[key] })
      pos += value.length
    } else if (idx > pos) {
      // There's a gap between expected position and actual position — emit gap as default
      segments.push({ text: raw.slice(pos, idx), color: '' })
      segments.push({ text: value, color: COMPONENT_COLORS[key] })
      pos = idx + value.length
    } else {
      // Not found after current position — skip this part
    }
  }

  // Trailing text
  if (pos < raw.length) {
    segments.push({ text: raw.slice(pos), color: '' })
  }

  return segments
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/utils/url-tokenize.test.js`
Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
git add src/utils/url-tokenize.js src/utils/url-tokenize.test.js
git commit -m "Add tokenizeUrl utility with color mapping for URL components"
```

---

### Task 2: Add colored preview bar to UrlParse.vue

**Files:**
- Modify: `src/views/UrlParse.vue`

- [ ] **Step 1: Add the preview bar template**

In the template, after the `<div class="form-control">` block (after line 20) and before the components card, add the preview bar:

```html
<div
  v-if="tokens.length"
  class="font-mono text-sm break-all bg-base-200 rounded-lg p-3 leading-relaxed"
>
  <span
    v-for="(t, i) in tokens"
    :key="i"
    :class="t.color"
  >{{ t.text }}</span>
</div>
```

- [ ] **Step 2: Import tokenizeUrl and add tokens ref**

In the `<script setup>` section:

Add import:
```js
import { tokenizeUrl } from '../utils/url-tokenize.js'
```

Add ref:
```js
const tokens = ref([])
```

- [ ] **Step 3: Update parse() to populate tokens**

In the `parse()` function, inside the `try` block after setting `components.value`, add:

```js
tokens.value = tokenizeUrl(input.value, url)
```

And in the `catch` block, add:
```js
tokens.value = []
```

Also clear tokens at the top of parse() where input is empty:
```js
if (!input.value.trim()) {
  tokens.value = []
  return
}
```

- [ ] **Step 4: Verify manually**

Run: `npm run dev`
Expected: Navigate to URL 解析, see a colored preview bar below the input showing each URL part in a different color. Invalid URL hides the preview bar.

- [ ] **Step 5: Commit**

```bash
git add src/views/UrlParse.vue
git commit -m "Add colored URL preview bar below input in UrlParse"
```

---

### Task 3: Add colors to the parsed component table values

**Files:**
- Modify: `src/views/UrlParse.vue`

- [ ] **Step 1: Add color field to LABELS and import COMPONENT_COLORS**

Update the LABELS constant to include a color field:

```js
import { tokenizeUrl, COMPONENT_COLORS } from '../utils/url-tokenize.js'

const LABELS = [
  { key: 'protocol', label: 'Protocol', color: COMPONENT_COLORS.protocol },
  { key: 'hostname', label: 'Hostname', color: COMPONENT_COLORS.hostname },
  { key: 'port', label: 'Port', color: COMPONENT_COLORS.port },
  { key: 'pathname', label: 'Pathname', color: COMPONENT_COLORS.pathname },
  { key: 'hash', label: 'Hash', color: COMPONENT_COLORS.hash },
]
```

- [ ] **Step 2: Apply color class to table value spans**

In the components card, change the value span from:

```html
<span class="font-mono text-sm break-all flex-1">{{ c.value }}</span>
```

to:

```html
<span :class="['font-mono text-sm break-all flex-1', c.color]">{{ c.value }}</span>
```

- [ ] **Step 3: Add color to query param keys**

In the params card, change the key span from:

```html
<span class="font-mono text-sm">{{ p.key }}</span>
```

to:

```html
<span class="font-mono text-sm text-rose-400">{{ p.key }}</span>
```

- [ ] **Step 4: Verify manually**

Run: `npm run dev`
Expected: Table values are colored — protocol in blue, hostname in green, etc. Query param keys in rose. Preview bar colors match table colors.

- [ ] **Step 5: Commit**

```bash
git add src/views/UrlParse.vue
git commit -m "Add component colors to parsed URL table values and query param keys"
```

---

### Task 4: Write component tests for UrlParse.vue

**Files:**
- Create: `src/views/UrlParse.test.js`

- [ ] **Step 1: Write tests**

```js
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import UrlParse from './UrlParse.vue'

function mountComponent() {
  return mount(UrlParse)
}

describe('UrlParse', () => {
  it('renders title', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('URL 解析')
  })

  it('shows colored preview bar for valid URL', () => {
    const wrapper = mountComponent()
    const preview = wrapper.find('.bg-base-200.font-mono')
    expect(preview.exists()).toBe(true)
    const spans = preview.findAll('span')
    expect(spans.length).toBeGreaterThan(0)
  })

  it('colors component values in the table', () => {
    const wrapper = mountComponent()
    const valueSpans = wrapper.findAll('.card-body .flex-1')
    expect(valueSpans.length).toBeGreaterThan(0)
    // Protocol value should have text-blue-400
    const protocolSpan = valueSpans[0]
    expect(protocolSpan.classes()).toContain('text-blue-400')
  })

  it('colors query param keys in rose', () => {
    const wrapper = mountComponent()
    // The default URL has query params
    const roseElements = wrapper.findAll('.text-rose-400')
    expect(roseElements.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npx vitest run src/views/UrlParse.test.js`
Expected: PASS (all tests)

- [ ] **Step 3: Commit**

```bash
git add src/views/UrlParse.test.js
git commit -m "Add tests for UrlParse color highlighting"
```

---

### Task 5: Lint and final verification

**Files:**
- All modified files

- [ ] **Step 1: Run lint**

Run: `npm run lint`
Expected: No errors

- [ ] **Step 2: Run full test suite**

Run: `npm run test`
Expected: All tests pass

- [ ] **Step 3: Final manual check**

Run: `npm run dev`
Verify:
1. Input a full URL — preview bar shows colored segments, table values match colors
2. Input an invalid URL — preview bar hides, error message shows
3. Clear input — preview bar and table both disappear
4. Query param keys are rose-colored, values are default
