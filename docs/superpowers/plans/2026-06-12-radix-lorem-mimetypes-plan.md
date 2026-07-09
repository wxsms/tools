# Radix, Lorem, MimeTypes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three new tools: number base converter (Radix), placeholder text generator (Lorem), and MIME type reference (MimeTypes).

**Architecture:** Each tool is a self-contained Vue SFC following existing patterns. Radix follows the Case tool pattern (input → multiple result rows). Lorem follows the Password/UUID pattern (config card + generate button + result list). MimeTypes follows the HttpStatus pattern (searchable categorized list + detail panel).

**Tech Stack:** Vue 3 Composition API, Tailwind CSS + DaisyUI, @heroicons/vue, Vitest for utils tests.

---

### Task 1: Radix — utility function + tests

**Files:**
- Create: `src/utils/radix.js`
- Create: `src/utils/radix.test.js`

- [ ] **Step 1: Write the failing tests**

```js
// src/utils/radix.test.js
import { describe, it, expect } from 'vitest'
import { convertRadix, isValidForBase } from './radix.js'

describe('isValidForBase', () => {
  it('accepts valid binary digits', () => {
    expect(isValidForBase('1010', 2)).toBe(true)
  })

  it('rejects invalid binary digits', () => {
    expect(isValidForBase('2', 2)).toBe(false)
  })

  it('accepts valid hex digits (lowercase)', () => {
    expect(isValidForBase('ff', 16)).toBe(true)
  })

  it('accepts valid hex digits (uppercase)', () => {
    expect(isValidForBase('FF', 16)).toBe(true)
  })

  it('rejects invalid hex digits', () => {
    expect(isValidForBase('gg', 16)).toBe(false)
  })

  it('accepts valid decimal', () => {
    expect(isValidForBase('12345', 10)).toBe(true)
  })

  it('rejects negative numbers', () => {
    expect(isValidForBase('-1', 10)).toBe(false)
  })

  it('accepts empty string as valid', () => {
    expect(isValidForBase('', 10)).toBe(true)
  })
})

describe('convertRadix', () => {
  it('converts decimal 255 to hex', () => {
    expect(convertRadix('255', 10, 16)).toBe('FF')
  })

  it('converts decimal 255 to binary', () => {
    expect(convertRadix('255', 10, 2)).toBe('11111111')
  })

  it('converts decimal 8 to octal', () => {
    expect(convertRadix('8', 10, 8)).toBe('10')
  })

  it('converts hex FF to decimal', () => {
    expect(convertRadix('FF', 16, 10)).toBe('255')
  })

  it('converts binary 1010 to decimal', () => {
    expect(convertRadix('1010', 2, 10)).toBe('10')
  })

  it('converts octal 77 to hex', () => {
    expect(convertRadix('77', 8, 16)).toBe('3F')
  })

  it('converts to base 36', () => {
    expect(convertRadix('35', 10, 36)).toBe('Z')
  })

  it('returns empty string for empty input', () => {
    expect(convertRadix('', 10, 16)).toBe('')
  })

  it('returns null for invalid input for the given base', () => {
    expect(convertRadix('gg', 16, 10)).toBeNull()
  })

  it('converts 0 correctly', () => {
    expect(convertRadix('0', 10, 2)).toBe('0')
  })

  it('handles large safe integer', () => {
    expect(convertRadix('9007199254740991', 10, 16)).toBe('1FFFFFFFFFFFFF')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/utils/radix.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```js
// src/utils/radix.js
export function isValidForBase(str, base) {
  if (!str) return true
  const validChars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'.slice(0, base)
  return str.toUpperCase().split('').every(c => validChars.includes(c))
}

export function convertRadix(str, fromBase, toBase) {
  if (!str) return ''
  const upper = str.toUpperCase()
  if (!isValidForBase(upper, fromBase)) return null
  const decimal = parseInt(upper, fromBase)
  if (isNaN(decimal)) return null
  return decimal.toString(toBase).toUpperCase()
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/utils/radix.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/radix.js src/utils/radix.test.js
git commit -m "feat: add radix conversion utility with tests"
```

---

### Task 2: Radix — Vue component

**Files:**
- Create: `src/views/Radix.vue`

- [ ] **Step 1: Create Radix.vue**

```vue
<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">
      进制转换
    </h1>
    <div class="flex flex-col gap-4 max-w-2xl">
      <!-- Input area -->
      <div class="form-control">
        <label class="label"><span class="label-text font-semibold">输入</span></label>
        <div class="flex gap-2">
          <div class="join flex-1">
            <input
              v-model="input"
              class="input input-bordered join-item flex-1 font-mono text-sm"
              placeholder="输入数值..."
              @input="convert"
            >
          </div>
        </div>
        <p
          v-if="inputError"
          class="text-error text-sm mt-1"
        >
          {{ inputError }}
        </p>
      </div>

      <!-- Input base selector -->
      <div class="flex flex-wrap gap-2">
        <span class="text-sm font-semibold self-center mr-1">输入进制</span>
        <button
          v-for="b in standardBases"
          :key="b.value"
          :class="['btn btn-sm', inputBase === b.value ? 'btn-primary' : '']"
          @click="setInputBase(b.value)"
        >
          {{ b.label }}
        </button>
      </div>

      <div class="divider my-0" />

      <!-- Standard results -->
      <div
        v-for="item in results"
        :key="item.key"
        class="form-control"
      >
        <label class="label">
          <span class="label-text font-semibold">{{ item.label }}</span>
          <span class="label-text-alt opacity-50">{{ item.desc }}</span>
        </label>
        <div class="relative">
          <input
            :value="item.value"
            class="input input-bordered w-full font-mono text-sm"
            readonly
          >
          <button
            v-if="item.value"
            class="btn btn-ghost btn-xs btn-square absolute right-1 top-1"
            :title="item.copied ? '已复制！' : '复制'"
            @click="copyText(item.value, item.key)"
          >
            <CheckIcon
              v-if="item.copied"
              class="w-4 h-4 text-success"
            />
            <ClipboardDocumentIcon
              v-else
              class="w-4 h-4"
            />
          </button>
        </div>
      </div>

      <!-- Advanced section -->
      <div class="collapse collapse-arrow bg-base-200 mt-2">
        <input type="checkbox">
        <div class="collapse-title text-sm font-semibold">
          高级 — 任意进制转换 (2-36)
        </div>
        <div class="collapse-content">
          <div class="flex items-center gap-3 pt-2">
            <span class="text-sm">目标进制</span>
            <input
              v-model.number="customBase"
              type="number"
              min="2"
              max="36"
              class="input input-bordered input-sm w-20"
            >
          </div>
          <div
            v-if="customResult !== null"
            class="form-control mt-3"
          >
            <label class="label">
              <span class="label-text font-semibold">{{ customBase }} 进制</span>
            </label>
            <div class="relative">
              <input
                :value="customResult"
                class="input input-bordered w-full font-mono text-sm"
                readonly
              >
              <button
                v-if="customResult"
                class="btn btn-ghost btn-xs btn-square absolute right-1 top-1"
                :title="customCopied ? '已复制！' : '复制'"
                @click="copyText(customResult, 'customCopied')"
              >
                <CheckIcon
                  v-if="customCopied"
                  class="w-4 h-4 text-success"
                />
                <ClipboardDocumentIcon
                  v-else
                  class="w-4 h-4"
                />
              </button>
            </div>
          </div>
          <p
            v-if="customBaseError"
            class="text-error text-sm mt-1"
          >
            {{ customBaseError }}
          </p>
        </div>
      </div>

      <div class="flex justify-end">
        <button
          class="btn btn-ghost btn-sm gap-1"
          @click="clear"
        >
          <TrashIcon class="w-4 h-4" />
          清空
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { ClipboardDocumentIcon, CheckIcon, TrashIcon } from '@heroicons/vue/24/outline'
import { convertRadix, isValidForBase } from '../utils/radix.js'

const input = ref('')
const inputBase = ref(10)
const customBase = ref(36)
const customCopied = ref(false)

const standardBases = [
  { value: 2, label: 'BIN (2)' },
  { value: 8, label: 'OCT (8)' },
  { value: 10, label: 'DEC (10)' },
  { value: 16, label: 'HEX (16)' },
]

const results = reactive([
  { key: 'bin', label: 'BIN', desc: '二进制', base: 2, value: '', copied: false },
  { key: 'oct', label: 'OCT', desc: '八进制', base: 8, value: '', copied: false },
  { key: 'dec', label: 'DEC', desc: '十进制', base: 10, value: '', copied: false },
  { key: 'hex', label: 'HEX', desc: '十六进制', base: 16, value: '', copied: false },
])

const inputError = computed(() => {
  if (!input.value) return ''
  if (!isValidForBase(input.value, inputBase.value)) {
    return `输入包含不合法的 ${inputBase.value} 进制字符`
  }
  return ''
})

const customBaseError = computed(() => {
  if (customBase.value < 2 || customBase.value > 36) return '进制范围 2-36'
  return ''
})

const customResult = computed(() => {
  if (!input.value || inputError.value || customBaseError.value) return null
  return convertRadix(input.value, inputBase.value, customBase.value)
})

function convert() {
  if (!input.value) {
    results.forEach(r => r.value = '')
    return
  }
  if (inputError.value) {
    results.forEach(r => r.value = '')
    return
  }
  for (const item of results) {
    item.value = convertRadix(input.value, inputBase.value, item.base) || ''
  }
}

function setInputBase(base) {
  inputBase.value = base
  convert()
}

function clear() {
  input.value = ''
  results.forEach(r => r.value = '')
}

async function copyText(text, flag) {
  try {
    await navigator.clipboard.writeText(text)
    if (flag === 'customCopied') {
      customCopied.value = true
      setTimeout(() => customCopied.value = false, 1500)
    } else {
      const item = results.find(r => r.key === flag)
      if (item) {
        item.copied = true
        setTimeout(() => item.copied = false, 1500)
      }
    }
  } catch { /* clipboard not available */ }
}
</script>
```

- [ ] **Step 2: Register route and sidebar entry**

In `src/router.js`, add import and route:

```js
import Radix from './views/Radix.vue'
// ... in routes array:
{ path: '/radix', component: Radix },
```

In `src/tools.js`, add import and entry in 编码转换 group:

```js
import { CalculatorIcon } from '@heroicons/vue/24/outline'
// ... in 编码转换 tools array, after Unicode:
{
  name: '进制转换',
  path: '/radix',
  desc: '二进制 / 八进制 / 十进制 / 十六进制互转，支持 2-36 任意进制',
  icon: CalculatorIcon,
},
```

- [ ] **Step 3: Verify visually**

Run: `npm run dev`
Navigate to `/radix`, test: input "255" with DEC base → verify BIN=11111111, OCT=377, HEX=FF. Switch input base to HEX, input "FF" → verify DEC=255. Test advanced section with base 36.

- [ ] **Step 4: Commit**

```bash
git add src/views/Radix.vue src/router.js src/tools.js
git commit -m "feat: add radix (base conversion) tool"
```

---

### Task 3: Lorem — utility function + tests

**Files:**
- Create: `src/utils/lorem.js`
- Create: `src/utils/lorem.test.js`

- [ ] **Step 1: Write the failing tests**

```js
// src/utils/lorem.test.js
import { describe, it, expect } from 'vitest'
import { generateLorem } from './lorem.js'

describe('generateLorem', () => {
  it('generates English text with default params', () => {
    const result = generateLorem({ lang: 'en', paragraphs: 3, sentencesPerParagraph: [3, 5] })
    expect(result.length).toBe(3)
    result.forEach(p => {
      expect(p.split(/[.!?]/).filter(Boolean).length).toBeGreaterThanOrEqual(3)
      expect(p.split(/[.!?]/).filter(Boolean).length).toBeLessThanOrEqual(5)
    })
  })

  it('generates Chinese text', () => {
    const result = generateLorem({ lang: 'zh', paragraphs: 2, sentencesPerParagraph: [2, 4] })
    expect(result.length).toBe(2)
    result.forEach(p => {
      expect(p).toBeTruthy()
    })
  })

  it('returns empty array for 0 paragraphs', () => {
    const result = generateLorem({ lang: 'en', paragraphs: 0, sentencesPerParagraph: [3, 5] })
    expect(result).toEqual([])
  })

  it('respects paragraph count', () => {
    const result = generateLorem({ lang: 'en', paragraphs: 5, sentencesPerParagraph: [1, 1] })
    expect(result.length).toBe(5)
  })

  it('respects sentence count range', () => {
    const result = generateLorem({ lang: 'en', paragraphs: 10, sentencesPerParagraph: [2, 2] })
    result.forEach(p => {
      // 2 sentences = 2 sentence-ending marks
      const sentenceCount = p.split(/[.!?]/).filter(s => s.trim()).length
      expect(sentenceCount).toBe(2)
    })
  })

  it('generates different text on successive calls', () => {
    const result1 = generateLorem({ lang: 'en', paragraphs: 3, sentencesPerParagraph: [3, 5] })
    const result2 = generateLorem({ lang: 'en', paragraphs: 3, sentencesPerParagraph: [3, 5] })
    // Statistically extremely unlikely to be identical
    expect(result1.join('')).not.toBe(result2.join(''))
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/utils/lorem.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```js
// src/utils/lorem.js
const LATIN_WORDS = [
  'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit',
  'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore',
  'magna', 'aliqua', 'enim', 'ad', 'minim', 'veniam', 'quis', 'nostrud',
  'exercitation', 'ullamco', 'laboris', 'nisi', 'aliquip', 'ex', 'ea', 'commodo',
  'consequat', 'duis', 'aute', 'irure', 'in', 'reprehenderit', 'voluptate',
  'velit', 'esse', 'cillum', 'fugiat', 'nulla', 'pariatur', 'excepteur', 'sint',
  'occaecat', 'cupidatat', 'non', 'proident', 'sunt', 'culpa', 'qui', 'officia',
  'deserunt', 'mollit', 'anim', 'id', 'est', 'laborum', 'perspiciatis', 'unde',
  'omnis', 'iste', 'natus', 'error', 'voluptatem', 'accusantium', 'doloremque',
  'laudantium', 'totam', 'rem', 'aperiam', 'eaque', 'ipsa', 'quae', 'ab', 'illo',
  'inventore', 'veritatis', 'quasi', 'architecto', 'beatae', 'vitae', 'dicta',
  'explicabo', 'nemo', 'ipsam', 'voluptas', 'aspernatur', 'aut', 'odit',
  'fugit', 'consequuntur', 'magni', 'dolores', 'eos', 'ratione', 'sequi',
  'nesciunt', 'neque', 'porro', 'quisquam', 'nihil', 'impedit', 'quo', 'minus',
]

const ZH_SENTENCES = [
  '在这个快速发展的时代，技术的进步改变了我们的生活方式。',
  '每一个伟大的项目都始于一个简单的想法。',
  '代码不仅仅是工具，更是表达思想的媒介。',
  '持续学习是保持竞争力的关键所在。',
  '优秀的设计往往来自于对细节的极致追求。',
  '团队协作能够将个体的力量成倍放大。',
  '解决问题的第一步是准确定义问题本身。',
  '简洁是可靠的先决条件，复杂是可靠的敌人。',
  '用户体验的核心在于理解用户的真实需求。',
  '数据驱动的决策比直觉更加可靠。',
  '每一次失败都是通往成功的垫脚石。',
  '好的架构让扩展变得简单，坏的架构让修改变得困难。',
  '测试不是负担，而是质量的保障。',
  '文档是代码和用户之间的桥梁。',
  '提前规划可以避免后期大量的返工。',
  '创造性思维需要跳出已有的思维框架。',
  '沟通是解决大多数技术争议的最佳方式。',
  '在正确的时间做正确的事情，比单纯的努力更重要。',
  '技术的选择应当服务于业务目标，而非反过来。',
  '保持好奇心，是持续成长的动力源泉。',
  '迭代式开发让我们能够快速验证假设。',
  '代码审查是知识共享和质量保证的重要环节。',
  '自动化测试为重构提供了安全网。',
  '好的命名让代码自己说话，减少了对注释的依赖。',
  '模块化设计让系统更容易理解和维护。',
  '拥抱变化，而不是抗拒变化，是敏捷的核心。',
  '性能优化应该基于数据，而不是猜测。',
  '日志是生产环境中的眼睛和耳朵。',
  '安全不是功能，而是基础要求。',
  '微服务不是银弹，合适才是最好的。',
  '把复杂的问题拆解成简单的小问题，逐个击破。',
  '可观测性是现代系统运维的基石。',
  '持续的代码重构让系统保持健康。',
  '开放源码社区是创新的重要驱动力。',
  '合理的抽象层次让代码更易于理解。',
  '错误处理是健壮系统的必要组成部分。',
  '依赖管理是项目健康度的重要指标。',
  '配置和代码的分离提高了系统的灵活性。',
  '渐进式交付降低了发布的风险。',
  '基础设施即代码让环境管理更加可靠。',
  '好的 API 设计让集成变得愉悦。',
  '监控和告警是保障系统稳定运行的眼睛。',
  '技术债务需要主动管理，而不是忽视。',
  '文档化的决策记录减少了团队的重复讨论。',
  '持续集成让每次提交都充满信心。',
  '设计模式是前人智慧的结晶，但不要过度使用。',
  '回滚策略是发布计划中不可或缺的一部分。',
  '容量规划是避免线上事故的重要手段。',
  '混沌工程帮助我们发现系统中的隐患。',
]

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function generateEnglishSentence(wordCount) {
  const words = []
  for (let i = 0; i < wordCount; i++) {
    words.push(LATIN_WORDS[randInt(0, LATIN_WORDS.length - 1)])
  }
  words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1)
  return words.join(' ') + '.'
}

function generateChineseSentence() {
  return ZH_SENTENCES[randInt(0, ZH_SENTENCES.length - 1)]
}

export function generateLorem({ lang, paragraphs, sentencesPerParagraph }) {
  if (paragraphs <= 0) return []
  const [minS, maxS] = sentencesPerParagraph
  const result = []

  for (let p = 0; p < paragraphs; p++) {
    const sentenceCount = randInt(minS, maxS)
    const sentences = []

    if (lang === 'en') {
      for (let s = 0; s < sentenceCount; s++) {
        const wordCount = randInt(5, 15)
        sentences.push(generateEnglishSentence(wordCount))
      }
    } else {
      for (let s = 0; s < sentenceCount; s++) {
        sentences.push(generateChineseSentence())
      }
    }

    result.push(sentences.join(' '))
  }

  return result
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/utils/lorem.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/lorem.js src/utils/lorem.test.js
git commit -m "feat: add lorem text generation utility with tests"
```

---

### Task 4: Lorem — Vue component

**Files:**
- Create: `src/views/Lorem.vue`

- [ ] **Step 1: Create Lorem.vue**

```vue
<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">
      占位文本生成
    </h1>
    <div class="flex flex-col gap-4 max-w-2xl">
      <!-- Config card -->
      <div class="card bg-base-200">
        <div class="card-body gap-4">
          <!-- Language toggle -->
          <div class="flex gap-2">
            <button
              :class="['btn btn-sm', lang === 'zh' ? 'btn-primary' : '']"
              @click="lang = 'zh'"
            >
              中文
            </button>
            <button
              :class="['btn btn-sm', lang === 'en' ? 'btn-primary' : '']"
              @click="lang = 'en'"
            >
              English
            </button>
          </div>

          <!-- Paragraph count -->
          <div class="form-control">
            <label class="label"><span class="label-text font-semibold">段落数</span></label>
            <div class="flex items-center gap-3">
              <input
                v-model.number="paragraphs"
                type="range"
                min="1"
                max="20"
                step="1"
                class="range range-sm range-primary flex-1"
              >
              <span class="font-mono text-sm w-8 text-right">{{ paragraphs }}</span>
            </div>
          </div>

          <!-- Sentences per paragraph -->
          <div class="form-control">
            <label class="label"><span class="label-text font-semibold">每段句数</span></label>
            <div class="flex items-center gap-4">
              <div class="flex items-center gap-2">
                <span class="text-sm opacity-70">最少</span>
                <input
                  v-model.number="minSentences"
                  type="number"
                  min="1"
                  max="20"
                  class="input input-bordered input-sm w-20"
                >
              </div>
              <span class="text-sm opacity-50">~</span>
              <div class="flex items-center gap-2">
                <span class="text-sm opacity-70">最多</span>
                <input
                  v-model.number="maxSentences"
                  type="number"
                  min="1"
                  max="20"
                  class="input input-bordered input-sm w-20"
                >
              </div>
            </div>
          </div>

          <!-- Generate button -->
          <button
            class="btn btn-primary btn-sm gap-1 self-start"
            @click="generate"
          >
            <ArrowPathIcon class="w-4 h-4" />
            重新生成
          </button>
        </div>
      </div>

      <!-- Results card -->
      <div
        v-if="result.length"
        class="card bg-base-200"
      >
        <div class="card-body relative">
          <button
            class="btn btn-ghost btn-xs btn-square absolute top-3 right-3"
            :title="copied ? '已复制！' : '复制全部'"
            @click="copyAll"
          >
            <CheckIcon
              v-if="copied"
              class="w-4 h-4 text-success"
            />
            <ClipboardDocumentIcon
              v-else
              class="w-4 h-4"
            />
          </button>
          <div
            v-for="(para, i) in result"
            :key="i"
          >
            <p class="text-sm leading-relaxed">{{ para }}</p>
            <div
              v-if="i < result.length - 1"
              class="divider my-2"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { ArrowPathIcon, ClipboardDocumentIcon, CheckIcon } from '@heroicons/vue/24/outline'
import { generateLorem } from '../utils/lorem.js'

const lang = ref('zh')
const paragraphs = ref(3)
const minSentences = ref(3)
const maxSentences = ref(5)
const result = ref([])
const copied = ref(false)

function generate() {
  const min = Math.min(minSentences.value, maxSentences.value)
  const max = Math.max(minSentences.value, maxSentences.value)
  result.value = generateLorem({
    lang: lang.value,
    paragraphs: paragraphs.value,
    sentencesPerParagraph: [min, max],
  })
}

async function copyAll() {
  try {
    await navigator.clipboard.writeText(result.value.join('\n\n'))
    copied.value = true
    setTimeout(() => copied.value = false, 1500)
  } catch { /* clipboard not available */ }
}

watch([lang, paragraphs, minSentences, maxSentences], () => {
  generate()
})

generate()
</script>
```

- [ ] **Step 2: Register route and sidebar entry**

In `src/router.js`, add import and route:

```js
import Lorem from './views/Lorem.vue'
// ... in routes array:
{ path: '/lorem', component: Lorem },
```

In `src/tools.js`, add import and entry in 生成转换 group, after Cron:

```js
import { QueueListIcon } from '@heroicons/vue/24/outline'
// ... in 生成转换 tools array:
{
  name: '占位文本',
  path: '/lorem',
  desc: '中英文占位文本生成，可配置段落数与句数',
  icon: QueueListIcon,
},
```

- [ ] **Step 3: Verify visually**

Run: `npm run dev`
Navigate to `/lorem`, test: verify Chinese text appears by default, switch to English, adjust paragraph count, verify re-generation.

- [ ] **Step 4: Commit**

```bash
git add src/views/Lorem.vue src/router.js src/tools.js
git commit -m "feat: add lorem (placeholder text) generator tool"
```

---

### Task 5: MimeTypes — data + utility + tests

**Files:**
- Create: `src/utils/mime-types.js`
- Create: `src/utils/mime-types.test.js`

- [ ] **Step 1: Write the failing tests**

```js
// src/utils/mime-types.test.js
import { describe, it, expect } from 'vitest'
import { MIME_TYPES, getMimeGroups, searchMimeTypes } from './mime-types.js'

describe('MIME_TYPES data', () => {
  it('has at least 100 entries', () => {
    expect(MIME_TYPES.length).toBeGreaterThanOrEqual(100)
  })

  it('every entry has type, exts, and desc', () => {
    MIME_TYPES.forEach(item => {
      expect(item.type).toBeTruthy()
      expect(item.exts).toBeInstanceOf(Array)
      expect(item.exts.length).toBeGreaterThan(0)
      expect(item.desc).toBeTruthy()
    })
  })

  it('every type has a valid category prefix', () => {
    const validPrefixes = ['application', 'audio', 'font', 'image', 'message', 'model', 'multipart', 'text', 'video']
    MIME_TYPES.forEach(item => {
      const prefix = item.type.split('/')[0]
      expect(validPrefixes).toContain(prefix)
    })
  })
})

describe('getMimeGroups', () => {
  it('groups items by category', () => {
    const groups = getMimeGroups()
    expect(groups.length).toBeGreaterThan(0)
    groups.forEach(g => {
      expect(g.name).toBeTruthy()
      expect(g.items.length).toBeGreaterThan(0)
    })
  })
})

describe('searchMimeTypes', () => {
  it('finds by MIME type', () => {
    const results = searchMimeTypes('application/pdf')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].type).toBe('application/pdf')
  })

  it('finds by extension', () => {
    const results = searchMimeTypes('pdf')
    expect(results.some(r => r.type === 'application/pdf')).toBe(true)
  })

  it('finds by description', () => {
    const results = searchMimeTypes('PDF')
    expect(results.some(r => r.type === 'application/pdf')).toBe(true)
  })

  it('is case insensitive', () => {
    const results = searchMimeTypes('PDF')
    expect(results.length).toBeGreaterThan(0)
  })

  it('returns empty for no match', () => {
    const results = searchMimeTypes('zzzzzznotreal')
    expect(results).toEqual([])
  })

  it('returns all when query is empty', () => {
    const results = searchMimeTypes('')
    expect(results.length).toBe(MIME_TYPES.length)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/utils/mime-types.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Write implementation**

Create `src/utils/mime-types.js` with the full MIME types data array (~200 entries) and helper functions. The data covers all 9 categories: application, audio, font, image, message, model, multipart, text, video.

```js
// src/utils/mime-types.js
export const MIME_TYPES = [
  // application
  { type: 'application/atom+xml', exts: ['atom'], desc: 'Atom 订阅源' },
  { type: 'application/epub+zip', exts: ['epub'], desc: 'EPUB 电子书' },
  { type: 'application/gzip', exts: ['gz'], desc: 'Gzip 压缩文件' },
  { type: 'application/java-archive', exts: ['jar'], desc: 'Java 归档' },
  { type: 'application/javascript', exts: ['js', 'mjs'], desc: 'JavaScript 脚本' },
  { type: 'application/json', exts: ['json'], desc: 'JSON 数据' },
  { type: 'application/ld+json', exts: ['jsonld'], desc: 'JSON-LD 链接数据' },
  { type: 'application/msword', exts: ['doc'], desc: 'Word 文档 (旧版)' },
  { type: 'application/octet-stream', exts: ['bin', 'exe', 'dll', 'so', 'dylib'], desc: '二进制流' },
  { type: 'application/ogg', exts: ['ogx'], desc: 'OGG 容器' },
  { type: 'application/pdf', exts: ['pdf'], desc: 'PDF 文档' },
  { type: 'application/php', exts: ['php'], desc: 'PHP 脚本' },
  { type: 'application/pkcs12', exts: ['p12', 'pfx'], desc: 'PKCS#12 证书' },
  { type: 'application/pkcs7-mime', exts: ['p7c'], desc: 'PKCS#7 MIME' },
  { type: 'application/pkcs7-signature', exts: ['p7s'], desc: 'PKCS#7 签名' },
  { type: 'application/pkix-cert', exts: ['cer'], desc: 'X.509 证书' },
  { type: 'application/pkix-crl', exts: ['crl'], desc: '证书吊销列表' },
  { type: 'application/postscript', exts: ['ps', 'eps', 'ai'], desc: 'PostScript 文档' },
  { type: 'application/rdf+xml', exts: ['rdf'], desc: 'RDF 数据' },
  { type: 'application/rss+xml', exts: ['rss'], desc: 'RSS 订阅源' },
  { type: 'application/rtf', exts: ['rtf'], desc: '富文本格式' },
  { type: 'application/sql', exts: ['sql'], desc: 'SQL 脚本' },
  { type: 'application/tar', exts: ['tar'], desc: 'Tar 归档' },
  { type: 'application/vnd.api+json', exts: ['json'], desc: 'JSON:API 响应' },
  { type: 'application/vnd.apple.mpegurl', exts: ['m3u8'], desc: 'HLS 播放列表' },
  { type: 'application/vnd.ms-excel', exts: ['xls'], desc: 'Excel 文档 (旧版)' },
  { type: 'application/vnd.ms-fontobject', exts: ['eot'], desc: 'EOT 字体' },
  { type: 'application/vnd.ms-powerpoint', exts: ['ppt'], desc: 'PowerPoint 演示 (旧版)' },
  { type: 'application/vnd.oasis.opendocument.presentation', exts: ['odp'], desc: 'ODP 演示文稿' },
  { type: 'application/vnd.oasis.opendocument.spreadsheet', exts: ['ods'], desc: 'ODS 电子表格' },
  { type: 'application/vnd.oasis.opendocument.text', exts: ['odt'], desc: 'ODT 文本文档' },
  { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', exts: ['pptx'], desc: 'PowerPoint 演示' },
  { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', exts: ['xlsx'], desc: 'Excel 文档' },
  { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', exts: ['docx'], desc: 'Word 文档' },
  { type: 'application/vnd.rar', exts: ['rar'], desc: 'RAR 压缩文件' },
  { type: 'application/vnd.visio', exts: ['vsd'], desc: 'Visio 文档' },
  { type: 'application/x-7z-compressed', exts: ['7z'], desc: '7-Zip 压缩文件' },
  { type: 'application/x-bzip', exts: ['bz'], desc: 'Bzip 压缩文件' },
  { type: 'application/x-bzip2', exts: ['bz2'], desc: 'Bzip2 压缩文件' },
  { type: 'application/x-csh', exts: ['csh'], desc: 'C Shell 脚本' },
  { type: 'application/x-sh', exts: ['sh'], desc: 'Shell 脚本' },
  { type: 'application/x-shockwave-flash', exts: ['swf'], desc: 'Flash 动画' },
  { type: 'application/x-tar', exts: ['tar'], desc: 'Tar 归档' },
  { type: 'application/x-xz', exts: ['xz'], desc: 'XZ 压缩文件' },
  { type: 'application/xhtml+xml', exts: ['xhtml'], desc: 'XHTML 文档' },
  { type: 'application/xml', exts: ['xml', 'xsl'], desc: 'XML 文档' },
  { type: 'application/xml-dtd', exts: ['dtd'], desc: 'DTD 定义' },
  { type: 'application/zip', exts: ['zip'], desc: 'ZIP 压缩文件' },

  // audio
  { type: 'audio/aac', exts: ['aac'], desc: 'AAC 音频' },
  { type: 'audio/flac', exts: ['flac'], desc: 'FLAC 无损音频' },
  { type: 'audio/midi', exts: ['mid', 'midi'], desc: 'MIDI 音乐' },
  { type: 'audio/mp4', exts: ['m4a', 'mp4a'], desc: 'MP4 音频' },
  { type: 'audio/mpeg', exts: ['mp3', 'mpga'], desc: 'MP3 音频' },
  { type: 'audio/ogg', exts: ['oga', 'ogg', 'opus'], desc: 'OGG 音频' },
  { type: 'audio/wav', exts: ['wav'], desc: 'WAV 音频' },
  { type: 'audio/webm', exts: ['weba'], desc: 'WebM 音频' },
  { type: 'audio/x-matroska', exts: ['mka'], desc: 'Matroska 音频' },

  // font
  { type: 'font/otf', exts: ['otf'], desc: 'OpenType 字体' },
  { type: 'font/ttf', exts: ['ttf'], desc: 'TrueType 字体' },
  { type: 'font/woff', exts: ['woff'], desc: 'WOFF 字体' },
  { type: 'font/woff2', exts: ['woff2'], desc: 'WOFF2 字体' },

  // image
  { type: 'image/avif', exts: ['avif'], desc: 'AVIF 图片' },
  { type: 'image/bmp', exts: ['bmp'], desc: 'BMP 位图' },
  { type: 'image/gif', exts: ['gif'], desc: 'GIF 图片' },
  { type: 'image/jpeg', exts: ['jpg', 'jpeg'], desc: 'JPEG 图片' },
  { type: 'image/png', exts: ['png'], desc: 'PNG 图片' },
  { type: 'image/svg+xml', exts: ['svg', 'svgz'], desc: 'SVG 矢量图' },
  { type: 'image/tiff', exts: ['tif', 'tiff'], desc: 'TIFF 图片' },
  { type: 'image/webp', exts: ['webp'], desc: 'WebP 图片' },
  { type: 'image/x-icon', exts: ['ico'], desc: 'ICO 图标' },

  // message
  { type: 'message/http', exts: [], desc: 'HTTP 消息' },
  { type: 'message/rfc822', exts: ['eml', 'mime'], desc: '电子邮件' },

  // model
  { type: 'model/3mf', exts: ['3mf'], desc: '3D 制造格式' },
  { type: 'model/gltf+json', exts: ['gltf'], desc: 'glTF 3D 模型 (JSON)' },
  { type: 'model/gltf-binary', exts: ['glb'], desc: 'glTF 3D 模型 (二进制)' },
  { type: 'model/obj', exts: ['obj'], desc: 'OBJ 3D 模型' },
  { type: 'model/stl', exts: ['stl'], desc: 'STL 3D 模型' },
  { type: 'model/vrml', exts: ['wrl'], desc: 'VRML 3D 场景' },

  // multipart
  { type: 'multipart/form-data', exts: [], desc: '表单文件上传' },
  { type: 'multipart/byteranges', exts: [], desc: '字节范围响应' },

  // text
  { type: 'text/calendar', exts: ['ics'], desc: '日历文件' },
  { type: 'text/css', exts: ['css'], desc: 'CSS 样式表' },
  { type: 'text/csv', exts: ['csv'], desc: 'CSV 数据' },
  { type: 'text/html', exts: ['html', 'htm'], desc: 'HTML 文档' },
  { type: 'text/javascript', exts: ['js'], desc: 'JavaScript (传统)' },
  { type: 'text/markdown', exts: ['md', 'markdown'], desc: 'Markdown 文档' },
  { type: 'text/plain', exts: ['txt', 'text', 'log'], desc: '纯文本' },
  { type: 'text/richtext', exts: ['rtx'], desc: '富文本' },
  { type: 'text/rtf', exts: ['rtf'], desc: 'RTF 文档' },
  { type: 'text/sgml', exts: ['sgml', 'sgm'], desc: 'SGML 文档' },
  { type: 'text/tab-separated-values', exts: ['tsv'], desc: 'TSV 数据' },
  { type: 'text/vtt', exts: ['vtt'], desc: 'WebVTT 字幕' },
  { type: 'text/xml', exts: ['xml'], desc: 'XML 文本' },
  { type: 'text/yaml', exts: ['yaml', 'yml'], desc: 'YAML 文档' },

  // video
  { type: 'video/3gpp', exts: ['3gp'], desc: '3GPP 视频' },
  { type: 'video/3gpp2', exts: ['3g2'], desc: '3GPP2 视频' },
  { type: 'video/avi', exts: ['avi'], desc: 'AVI 视频' },
  { type: 'video/mp4', exts: ['mp4', 'm4v'], desc: 'MP4 视频' },
  { type: 'video/mpeg', exts: ['mpeg', 'mpg'], desc: 'MPEG 视频' },
  { type: 'video/ogg', exts: ['ogv'], desc: 'OGG 视频' },
  { type: 'video/quicktime', exts: ['mov'], desc: 'QuickTime 视频' },
  { type: 'video/webm', exts: ['webm'], desc: 'WebM 视频' },
  { type: 'video/x-flv', exts: ['flv'], desc: 'Flash 视频' },
  { type: 'video/x-matroska', exts: ['mkv'], desc: 'Matroska 视频' },
  { type: 'video/x-ms-wmv', exts: ['wmv'], desc: 'Windows Media 视频' },
]

const CATEGORY_NAMES = {
  application: 'Application',
  audio: 'Audio',
  font: 'Font',
  image: 'Image',
  message: 'Message',
  model: 'Model',
  multipart: 'Multipart',
  text: 'Text',
  video: 'Video',
}

export function getMimeGroups() {
  const map = new Map()
  for (const item of MIME_TYPES) {
    const category = item.type.split('/')[0]
    if (!map.has(category)) {
      map.set(category, { name: CATEGORY_NAMES[category] || category, items: [] })
    }
    map.get(category).items.push(item)
  }
  return Array.from(map.entries()).map(([key, val]) => ({ key, ...val }))
}

export function searchMimeTypes(query) {
  const q = query.trim().toLowerCase()
  if (!q) return MIME_TYPES
  return MIME_TYPES.filter(item =>
    item.type.toLowerCase().includes(q) ||
    item.exts.some(ext => ext.toLowerCase().includes(q)) ||
    item.desc.toLowerCase().includes(q),
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/utils/mime-types.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/mime-types.js src/utils/mime-types.test.js
git commit -m "feat: add MIME types data and search utility with tests"
```

---

### Task 6: MimeTypes — Vue component

**Files:**
- Create: `src/views/MimeTypes.vue`

- [ ] **Step 1: Create MimeTypes.vue**

```vue
<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">
      MIME 类型速查
    </h1>
    <div class="flex gap-6">
      <!-- Left list -->
      <div class="flex flex-col gap-4 min-w-0 flex-1">
        <input
          v-model="search"
          class="input input-bordered w-full"
          placeholder="输入 MIME 类型、扩展名或关键词..."
        >

        <div
          v-for="group in filteredGroups"
          :key="group.key"
        >
          <div
            class="flex items-center gap-2 cursor-pointer select-none py-1"
            @click="toggleGroup(group.key)"
          >
            <svg
              class="w-4 h-4 transition-transform"
              :class="{ 'rotate-90': !collapsed.has(group.key) }"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M9 5l7 7-7 7"
              />
            </svg>
            <span class="font-semibold">{{ group.key }}/{{ group.name }}</span>
            <span class="text-xs opacity-50">({{ group.items.length }})</span>
          </div>

          <div
            v-if="!collapsed.has(group.key)"
            class="flex flex-col"
          >
            <div
              v-for="item in group.items"
              :key="item.type"
            >
              <div
                class="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-base-200 cursor-pointer lg:cursor-default"
                :class="{ 'bg-base-300': activeType === item.type }"
                @mouseenter="activeType = item.type"
                @click="activeType = activeType === item.type ? null : item.type"
              >
                <span class="badge badge-sm font-mono shrink-0">{{ item.type }}</span>
                <span class="font-mono text-sm shrink-0 text-primary">{{ item.exts.join(', ') }}</span>
                <span class="text-sm opacity-60 truncate">{{ item.desc }}</span>
              </div>
              <!-- Mobile inline detail -->
              <div
                v-if="activeType === item.type"
                class="lg:hidden px-2 pb-2 pl-10 text-sm leading-relaxed opacity-80"
              >
                {{ item.type }} — 扩展名: {{ item.exts.join(', ') || '无' }}
              </div>
            </div>
          </div>
        </div>

        <div
          v-if="search && filteredGroups.length === 0"
          class="text-center py-8 opacity-50"
        >
          未找到匹配的 MIME 类型
        </div>
      </div>

      <!-- Right detail panel (desktop only) -->
      <div class="hidden lg:block w-72 shrink-0 sticky top-20 self-start">
        <div
          v-if="activeItem"
          class="card bg-base-200"
        >
          <div class="card-body">
            <span class="badge font-mono text-sm">{{ activeItem.type }}</span>
            <div class="divider my-1" />
            <div class="text-sm">
              <p><span class="font-semibold">扩展名：</span>{{ activeItem.exts.join(', ') || '无' }}</p>
              <p class="mt-2"><span class="font-semibold">说明：</span>{{ activeItem.desc }}</p>
            </div>
          </div>
        </div>
        <div
          v-else
          class="text-sm opacity-40 text-center pt-8"
        >
          悬停条目查看详细信息
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { getMimeGroups, searchMimeTypes } from '../utils/mime-types.js'

const search = ref('')
const activeType = ref(null)
const collapsed = ref(new Set())

const activeItem = computed(() => {
  if (!activeType.value) return null
  const items = searchMimeTypes(search.value.trim())
  return items.find(item => item.type === activeType.value) || null
})

const filteredGroups = computed(() => {
  const items = searchMimeTypes(search.value)
  const map = new Map()
  for (const item of items) {
    const category = item.type.split('/')[0]
    if (!map.has(category)) {
      map.set(category, { key: category, name: category.charAt(0).toUpperCase() + category.slice(1), items: [] })
    }
    map.get(category).items.push(item)
  }
  return Array.from(map.values())
})

function toggleGroup(key) {
  if (collapsed.value.has(key)) {
    collapsed.value.delete(key)
  } else {
    collapsed.value.add(key)
  }
}
</script>
```

- [ ] **Step 2: Register route and sidebar entry**

In `src/router.js`, add import and route:

```js
import MimeTypes from './views/MimeTypes.vue'
// ... in routes array:
{ path: '/mime-types', component: MimeTypes },
```

In `src/tools.js`, add import and entry in 网络 group, after HTTP 状态码:

```js
import { TagIcon } from '@heroicons/vue/24/outline'
// ... in 网络 tools array:
{
  name: 'MIME 类型',
  path: '/mime-types',
  desc: 'MIME 类型与文件扩展名速查',
  icon: TagIcon,
},
```

- [ ] **Step 3: Verify visually**

Run: `npm run dev`
Navigate to `/mime-types`, test: verify all 9 categories appear, search for "pdf" filters correctly, hover shows detail panel, mobile tap expands.

- [ ] **Step 4: Commit**

```bash
git add src/views/MimeTypes.vue src/router.js src/tools.js
git commit -m "feat: add MIME types reference tool"
```

---

### Task 7: Final verification

- [ ] **Step 1: Run all tests**

Run: `npm run test`
Expected: All tests pass (existing + new radix, lorem, mime-types tests)

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: No errors

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 4: Verify all three tools in browser**

Run: `npm run dev`
Check `/radix`, `/lorem`, `/mime-types` all render correctly and function as expected.
