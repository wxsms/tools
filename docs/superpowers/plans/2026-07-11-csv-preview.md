# CSV 预览工具 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `src/tools/csv/` 下实现一个 CSV 预览工具，支持文件上传 / 文本粘贴输入，虚拟滚动渲染表格，提供类型推断、列统计、单列排序、每列模糊筛选、导出 JSON / Markdown 等基础分析能力。

**Architecture:** 解析委托给 `papaparse`（固定 RFC 4180 配置，不暴露参数）；类型推断、列统计、排序、筛选、导出等纯函数放在 `csv.js`，配单元测试；`CsvPreview.vue` 负责状态机（`idle` / `loaded` / `error`）、输入区、虚拟滚动表格、工具栏；最后注册路由和 sidebar。

**Tech Stack:** Vue 3 `<script setup>`、Vite、Tailwind CSS + DaisyUI、Vitest + @vue/test-utils、`papaparse`、`@heroicons/vue/24/outline`。

---

## 文件结构与责任划分

新增文件：

- `src/tools/csv/csv.js` — 纯函数模块：`inferColumnType`、`columnStats`、`sortRows`、`filterRows`、`toJson`、`toMarkdown`
- `src/tools/csv/csv.test.js` — 上述纯函数的单元测试
- `src/tools/csv/CsvPreview.vue` — 主视图组件，内含虚拟滚动实现
- `src/tools/csv/CsvPreview.component.test.js` — 组件测试

修改文件：

- `package.json` — 新增 `papaparse` 依赖
- `src/router.js` — 导入并注册 `/csv`
- `src/routes.js` — 加路由 meta
- `src/tools.js` — 加 sidebar 条目 + 导入 `TableCellsIcon`

任务分解（11 个任务）：

1. 安装依赖 + 空骨架
2. `inferColumnType`
3. `columnStats`
4. `sortRows`
5. `filterRows`
6. `toJson`
7. `toMarkdown`
8. `CsvPreview.vue` 输入区 + 状态机
9. 表格渲染 + 类型/统计标注
10. 虚拟滚动
11. 排序 + 筛选交互
12. 导出 dropdown
13. 注册路由 + sidebar + 端到端验证

---

### Task 1: 安装 papaparse 依赖并创建空骨架

**Files:**
- Modify: `package.json`
- Create: `src/tools/csv/csv.js` (空骨架 + 导出占位)
- Create: `src/tools/csv/CsvPreview.vue` (仅标题占位，确保后续路由注册可引用)

- [ ] **Step 1: 安装 papaparse**

Run:
```bash
npm install papaparse
```

Expected: `package.json` 的 `dependencies` 中出现 `"papaparse": "^5.x.x"`，`package-lock.json` 更新。

- [ ] **Step 2: 创建 csv.js 空骨架**

写入 `src/tools/csv/csv.js`：

```js
// 纯函数模块：类型推断、列统计、排序、筛选、导出。
// 解析不在此处，由组件调用 papaparse。

export const COLUMN_TYPES = ['integer', 'float', 'boolean', 'date', 'string']

export function inferColumnType(_values) {
  return 'string'
}

export function columnStats(_values, _type) {
  return {}
}

export function sortRows(rows, _columnIndex, _direction) {
  return rows
}

export function filterRows(rows, _filters) {
  return rows
}

export function toJson(_rows, _headers) {
  return []
}

export function toMarkdown(_rows, _headers) {
  return ''
}
```

- [ ] **Step 3: 创建 CsvPreview.vue 标题占位**

写入 `src/tools/csv/CsvPreview.vue`：

```vue
<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">
      CSV 预览
    </h1>
    <p class="opacity-50">
      占位 —— 后续任务实现。
    </p>
  </div>
</template>

<script setup>
// 占位
</script>
```

- [ ] **Step 4: 确认 vitest 能扫描到空骨架不报错**

Run:
```bash
npm run test -- src/tools/csv/csv.test.js 2>&1 | head -20 || true
```

Expected: 因为还没有测试文件，vitest 报 "no test files found" 或类似非错误信息。整个过程不应报模块解析错误。

- [ ] **Step 5: lint 验证**

Run:
```bash
npm run lint
```

Expected: 无错误（可能有 pre-existing warnings，忽略）。

- [ ] **Step 6: Commit**

```bash
git -C D:/githome/tools add package.json package-lock.json src/tools/csv/csv.js src/tools/csv/CsvPreview.vue
git -C D:/githome/tools commit -m "chore(csv-preview): scaffold files and add papaparse dependency"
```

---

### Task 2: `inferColumnType` —— 列类型推断

**Files:**
- Modify: `src/tools/csv/csv.js`
- Create: `src/tools/csv/csv.test.js`

按 spec 第 158-168 行的规则：扫前 100 行非空值，全部匹配某模式才认定；全空或无法判定 → `string`。优先级：integer → float → boolean → date → string。

- [ ] **Step 1: 写失败测试**

写入 `src/tools/csv/csv.test.js`：

```js
import { describe, it, expect } from 'vitest'
import { inferColumnType } from './csv.js'

describe('inferColumnType', () => {
  it('returns "string" for empty array', () => {
    expect(inferColumnType([])).toBe('string')
  })

  it('returns "string" when all values are empty strings', () => {
    expect(inferColumnType(['', '', ''])).toBe('string')
  })

  it('detects integer column', () => {
    expect(inferColumnType(['1', '2', '10', '-5'])).toBe('integer')
  })

  it('detects float column', () => {
    expect(inferColumnType(['1.5', '2', '-3.14', '0.1'])).toBe('float')
  })

  it('detects boolean column (case-insensitive)', () => {
    expect(inferColumnType(['true', 'false', 'TRUE', 'False'])).toBe('boolean')
  })

  it('detects date column (ISO-like)', () => {
    expect(inferColumnType(['2024-01-01', '2024-02-15', '2023-12-31'])).toBe('date')
  })

  it('falls back to string for mixed types', () => {
    expect(inferColumnType(['1', 'abc', '3'])).toBe('string')
  })

  it('falls back to string when integer mixed with float', () => {
    expect(inferColumnType(['1', '2.5', '3'])).toBe('float')
  })

  it('falls back to string for date-like mixed with non-date', () => {
    expect(inferColumnType(['2024-01-01', 'hello'])).toBe('string')
  })

  it('ignores empty values when inferring', () => {
    expect(inferColumnType(['1', '', '2', '', '3'])).toBe('integer')
  })

  it('only samples first 100 non-empty values', () => {
    const values = []
    for (let i = 0; i < 200; i++) values.push(String(i))
    values.push('not-a-number')
    expect(inferColumnType(values)).toBe('integer')
  })

  it('rejects plain words for date column', () => {
    expect(inferColumnType(['yesterday', 'today'])).toBe('string')
  })
})
```

- [ ] **Step 2: 运行测试，确认失败**

Run:
```bash
npm run test -- src/tools/csv/csv.test.js -t "inferColumnType" 2>&1 | tail -20
```

Expected: 多条 FAIL（当前 `inferColumnType` 直接返回 `'string'`），所有非 string 用例失败。

- [ ] **Step 3: 实现 `inferColumnType`**

替换 `src/tools/csv/csv.js` 中 `inferColumnType` 函数：

```js
const INT_RE = /^-?\d+$/
const FLOAT_RE = /^-?\d+(\.\d+)?$/
const BOOL_RE = /^(true|false)$/i

function isDateLike(s) {
  // 拒绝纯数字（Date.parse 会把纯数字当作时间戳）
  if (INT_RE.test(s) || FLOAT_RE.test(s)) return false
  const t = Date.parse(s)
  return !Number.isNaN(t)
}

export function inferColumnType(values) {
  // 仅取前 100 个非空值
  const sample = []
  for (const v of values) {
    if (v === '' || v == null) continue
    sample.push(String(v))
    if (sample.length >= 100) break
  }
  if (sample.length === 0) return 'string'

  if (sample.every(v => INT_RE.test(v))) return 'integer'
  if (sample.every(v => FLOAT_RE.test(v))) return 'float'
  if (sample.every(v => BOOL_RE.test(v))) return 'boolean'
  if (sample.every(v => isDateLike(v))) return 'date'
  return 'string'
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run:
```bash
npm run test -- src/tools/csv/csv.test.js -t "inferColumnType" 2>&1 | tail -10
```

Expected: 全部 PASS。

- [ ] **Step 5: Commit**

```bash
git -C D:/githome/tools add src/tools/csv/csv.js src/tools/csv/csv.test.js
git -C D:/githome/tools commit -m "feat(csv-preview): implement inferColumnType"
```

---

### Task 3: `columnStats` —— 列统计

**Files:**
- Modify: `src/tools/csv/csv.js`
- Modify: `src/tools/csv/csv.test.js`

按 spec 第 170-177 行：integer/float → {min, max, avg}；date → {min, max}（格式化为 `YYYY-MM-DD`）；boolean → {true, false}；string → {unique: N 或 `100+`}。全空列返回 `{}`。

- [ ] **Step 1: 写失败测试**

在 `src/tools/csv/csv.test.js` 末尾追加：

```js
import { columnStats } from './csv.js'

describe('columnStats', () => {
  it('returns empty object for empty values', () => {
    expect(columnStats([], 'string')).toEqual({})
  })

  it('returns empty object for all-empty values', () => {
    expect(columnStats(['', '', ''], 'integer')).toEqual({})
  })

  it('computes min/max/avg for integer column', () => {
    expect(columnStats(['1', '2', '3'], 'integer')).toEqual({
      min: 1, max: 3, avg: 2,
    })
  })

  it('computes avg rounded to 2 decimals for float column', () => {
    const stats = columnStats(['1.0', '2.5', '3.0'], 'float')
    expect(stats.min).toBe(1)
    expect(stats.max).toBe(3)
    expect(stats.avg).toBe(2.17)
  })

  it('computes min/max for date column formatted as YYYY-MM-DD', () => {
    const stats = columnStats(['2024-03-01', '2024-01-15', '2024-12-31'], 'date')
    expect(stats.min).toBe('2024-01-15')
    expect(stats.max).toBe('2024-12-31')
  })

  it('falls back to raw string for un-formattable date', () => {
    const stats = columnStats(['not-a-date', '2024-01-01'], 'date')
    expect(stats.min).toBe('not-a-date')
  })

  it('counts true/false for boolean column', () => {
    expect(columnStats(['true', 'false', 'TRUE', 'true'], 'boolean')).toEqual({
      true: 3, false: 1,
    })
  })

  it('counts unique values for string column', () => {
    expect(columnStats(['a', 'b', 'a', 'c'], 'string')).toEqual({ unique: 3 })
  })

  it('caps unique count at "100+"', () => {
    const values = []
    for (let i = 0; i < 150; i++) values.push(`v${i}`)
    expect(columnStats(values, 'string')).toEqual({ unique: '100+' })
  })
})
```

- [ ] **Step 2: 运行测试，确认失败**

Run:
```bash
npm run test -- src/tools/csv/csv.test.js -t "columnStats" 2>&1 | tail -20
```

Expected: 多条 FAIL（当前 `columnStats` 返回空对象）。

- [ ] **Step 3: 实现 `columnStats`**

替换 `src/tools/csv/csv.js` 中 `columnStats` 函数：

```js
function toYmd(t) {
  const d = new Date(t)
  if (Number.isNaN(d.getTime())) return null
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function columnStats(values, type) {
  const nonEmpty = values.filter(v => v !== '' && v != null)
  if (nonEmpty.length === 0) return {}

  if (type === 'integer' || type === 'float') {
    const nums = nonEmpty.map(Number)
    const min = Math.min(...nums)
    const max = Math.max(...nums)
    const avg = Number((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2))
    return { min, max, avg }
  }
  if (type === 'date') {
    const stamped = nonEmpty.map(v => ({ raw: v, t: Date.parse(v) }))
    const valid = stamped.filter(x => !Number.isNaN(x.t))
    if (valid.length === 0) {
      // 全部无法解析，回退为原始字符串 min/max
      return { min: nonEmpty[0], max: nonEmpty[0] }
    }
    const pickMin = valid.reduce((a, b) => a.t <= b.t ? a : b)
    const pickMax = valid.reduce((a, b) => a.t >= b.t ? a : b)
    return {
      min: toYmd(pickMin.t) ?? pickMin.raw,
      max: toYmd(pickMax.t) ?? pickMax.raw,
    }
  }
  if (type === 'boolean') {
    let t = 0, f = 0
    for (const v of nonEmpty) {
      if (/^true$/i.test(v)) t++
      else if (/^false$/i.test(v)) f++
    }
    return { true: t, false: f }
  }
  // string
  const unique = new Set(nonEmpty.map(String))
  if (unique.size > 100) return { unique: '100+' }
  return { unique: unique.size }
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run:
```bash
npm run test -- src/tools/csv/csv.test.js -t "columnStats" 2>&1 | tail -10
```

Expected: 全部 PASS。

- [ ] **Step 5: Commit**

```bash
git -C D:/githome/tools add src/tools/csv/csv.js src/tools/csv/csv.test.js
git -C D:/githome/tools commit -m "feat(csv-preview): implement columnStats"
```

---

### Task 4: `sortRows` —— 排序

**Files:**
- Modify: `src/tools/csv/csv.js`
- Modify: `src/tools/csv/csv.test.js`

按 spec 第 56 行：按列类型智能比较（数值/日期按数值、字符串按 `localeCompare`）。空值排到末尾。`direction` 取值 `'asc' | 'desc' | null`，`null` 返回原数组（不复制，节省内存）。

**签名约定**：`sortRows(rows, columnIndex, direction, types)` —— 第 4 个参数 `types` 为列类型数组（来自 `inferColumnType` 的结果），用于决定比较策略。组件调用时按 column 查找对应类型。

- [ ] **Step 1: 写失败测试**

在 `src/tools/csv/csv.test.js` 末尾追加：

```js
import { sortRows } from './csv.js'

describe('sortRows', () => {
  const rows = [
    ['3', '2024-03-01', 'apple'],
    ['1', '2024-01-15', 'banana'],
    ['2', '2024-12-31', 'apple'],
  ]
  const types = ['integer', 'date', 'string']

  it('returns original array when direction is null', () => {
    const sorted = sortRows(rows, 0, null, types)
    expect(sorted).toBe(rows) // 引用相同，未复制
  })

  it('sorts integer column ascending', () => {
    const sorted = sortRows(rows, 0, 'asc', types)
    expect(sorted.map(r => r[0])).toEqual(['1', '2', '3'])
  })

  it('sorts integer column descending', () => {
    const sorted = sortRows(rows, 0, 'desc', types)
    expect(sorted.map(r => r[0])).toEqual(['3', '2', '1'])
  })

  it('sorts date column by timestamp, not string', () => {
    const sorted = sortRows(rows, 1, 'asc', types)
    expect(sorted.map(r => r[1])).toEqual(['2024-01-15', '2024-03-01', '2024-12-31'])
  })

  it('sorts string column with localeCompare ascending', () => {
    const sorted = sortRows(rows, 2, 'asc', types)
    expect(sorted.map(r => r[2])).toEqual(['apple', 'apple', 'banana'])
  })

  it('pushes empty values to end on ascending sort', () => {
    const rowsWithEmpty = [
      ['3', 'a'],
      ['', 'b'],
      ['1', 'c'],
    ]
    const sorted = sortRows(rowsWithEmpty, 0, 'asc', ['integer', 'string'])
    expect(sorted.map(r => r[0])).toEqual(['1', '3', ''])
  })

  it('sorts float column numerically (not as string)', () => {
    const fRows = [['10.5'], ['2.1'], ['100.0']]
    const sorted = sortRows(fRows, 0, 'asc', ['float'])
    expect(sorted.map(r => r[0])).toEqual(['2.1', '10.5', '100.0'])
  })

  it('does not mutate original array', () => {
    const before = rows.map(r => [...r])
    sortRows(rows, 0, 'asc', types)
    expect(rows).toEqual(before)
  })
})
```

- [ ] **Step 2: 运行测试，确认失败**

Run:
```bash
npm run test -- src/tools/csv/csv.test.js -t "sortRows" 2>&1 | tail -15
```

Expected: 多数用例 FAIL（当前 `sortRows` 直接返回 rows）。

- [ ] **Step 3: 实现 `sortRows`**

替换 `src/tools/csv/csv.js` 中 `sortRows` 函数：

```js
function compareValues(a, b, type) {
  const aEmpty = a === '' || a == null
  const bEmpty = b === '' || b == null
  if (aEmpty && bEmpty) return 0
  if (aEmpty) return 1   // 空值始终排到末尾
  if (bEmpty) return -1

  if (type === 'integer' || type === 'float') {
    return Number(a) - Number(b)
  }
  if (type === 'date') {
    return Date.parse(a) - Date.parse(b)
  }
  if (type === 'boolean') {
    // false < true
    const av = /^true$/i.test(a) ? 1 : 0
    const bv = /^true$/i.test(b) ? 1 : 0
    return av - bv
  }
  return String(a).localeCompare(String(b))
}

export function sortRows(rows, columnIndex, direction, types) {
  if (direction !== 'asc' && direction !== 'desc') return rows
  const type = types ? types[columnIndex] : 'string'
  const sign = direction === 'asc' ? 1 : -1
  const copy = [...rows]
  copy.sort((a, b) => sign * compareValues(a[columnIndex], b[columnIndex], type))
  return copy
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run:
```bash
npm run test -- src/tools/csv/csv.test.js -t "sortRows" 2>&1 | tail -10
```

Expected: 全部 PASS。

- [ ] **Step 5: Commit**

```bash
git -C D:/githome/tools add src/tools/csv/csv.js src/tools/csv/csv.test.js
git -C D:/githome/tools commit -m "feat(csv-preview): implement sortRows"
```

---

### Task 5: `filterRows` —— 筛选

**Files:**
- Modify: `src/tools/csv/csv.js`
- Modify: `src/tools/csv/csv.test.js`

按 spec 第 57 行：每列模糊匹配（包含即命中），大小写不敏感，多列 AND 组合。`filters` 形如 `{ 0: 'foo', 2: 'bar' }`（key 是列索引字符串，值为小写匹配串）。空 filters 返回原数组。

- [ ] **Step 1: 写失败测试**

在 `src/tools/csv/csv.test.js` 末尾追加：

```js
import { filterRows } from './csv.js'

describe('filterRows', () => {
  const rows = [
    ['apple', 'red', '1'],
    ['banana', 'yellow', '2'],
    ['APPLE', 'green', '3'],
    ['grape', 'red', '4'],
  ]

  it('returns original rows when filters is empty', () => {
    expect(filterRows(rows, {})).toBe(rows)
  })

  it('returns original rows when all filter values are empty', () => {
    expect(filterRows(rows, { 0: '', 1: '' })).toBe(rows)
  })

  it('filters by single column (case-insensitive contains)', () => {
    const result = filterRows(rows, { 0: 'ap' })
    expect(result.map(r => r[0])).toEqual(['apple', 'APPLE', 'grape'])
  })

  it('filters by multiple columns with AND', () => {
    const result = filterRows(rows, { 0: 'a', 1: 'red' })
    expect(result.map(r => r[0])).toEqual(['apple', 'grape'])
  })

  it('returns empty when no row matches', () => {
    const result = filterRows(rows, { 0: 'zzz' })
    expect(result).toEqual([])
  })

  it('skips empty filter values (treats as no filter)', () => {
    const result = filterRows(rows, { 0: 'apple', 1: '' })
    expect(result.map(r => r[0])).toEqual(['apple', 'APPLE'])
  })
})
```

- [ ] **Step 2: 运行测试，确认失败**

Run:
```bash
npm run test -- src/tools/csv/csv.test.js -t "filterRows" 2>&1 | tail -10
```

Expected: 多数用例 FAIL（当前 `filterRows` 直接返回 rows）。

- [ ] **Step 3: 实现 `filterRows`**

替换 `src/tools/csv/csv.js` 中 `filterRows` 函数：

```js
export function filterRows(rows, filters) {
  // 收集非空条件
  const conds = []
  for (const key of Object.keys(filters)) {
    const v = (filters[key] || '').trim().toLowerCase()
    if (v) conds.push({ idx: Number(key), v })
  }
  if (conds.length === 0) return rows

  return rows.filter(row =>
    conds.every(c => String(row[c.idx] ?? '').toLowerCase().includes(c.v))
  )
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run:
```bash
npm run test -- src/tools/csv/csv.test.js -t "filterRows" 2>&1 | tail -10
```

Expected: 全部 PASS。

- [ ] **Step 5: Commit**

```bash
git -C D:/githome/tools add src/tools/csv/csv.js src/tools/csv/csv.test.js
git -C D:/githome/tools commit -m "feat(csv-preview): implement filterRows"
```

---

### Task 6: `toJson` —— 导出 JSON 数组

**Files:**
- Modify: `src/tools/csv/csv.js`
- Modify: `src/tools/csv/csv.test.js`

按 spec 第 187 行：表头作为 key，每行生成一个对象。返回 JSON 字符串（2 空格缩进）。列名重复时 JS 对象天然覆盖（不特殊处理）。

- [ ] **Step 1: 写失败测试**

在 `src/tools/csv/csv.test.js` 末尾追加：

```js
import { toJson } from './csv.js'

describe('toJson', () => {
  it('converts rows with headers as keys', () => {
    const headers = ['name', 'age', 'city']
    const rows = [
      ['Alice', '30', 'Beijing'],
      ['Bob', '25', 'Shanghai'],
    ]
    expect(JSON.parse(toJson(rows, headers))).toEqual([
      { name: 'Alice', age: '30', city: 'Beijing' },
      { name: 'Bob', age: '25', city: 'Shanghai' },
    ])
  })

  it('returns pretty-printed JSON with 2-space indent', () => {
    const result = toJson([['a', 'b']], ['x', 'y'])
    expect(result).toContain('\n  ')
    expect(result).toContain('"x": "a"')
  })

  it('handles single column', () => {
    const result = toJson([['1'], ['2']], ['value'])
    expect(JSON.parse(result)).toEqual([{ value: '1' }, { value: '2' }])
  })

  it('returns "[]" for empty rows', () => {
    expect(toJson([], ['a', 'b'])).toBe('[]')
  })

  it('handles duplicate headers (last wins per JS object semantics)', () => {
    const result = toJson([['1', '2']], ['k', 'k'])
    expect(JSON.parse(result)).toEqual([{ k: '2' }])
  })
})
```

- [ ] **Step 2: 运行测试，确认失败**

Run:
```bash
npm run test -- src/tools/csv/csv.test.js -t "toJson" 2>&1 | tail -10
```

Expected: 多数用例 FAIL（当前 `toJson` 返回 `'[]'`）。

- [ ] **Step 3: 实现 `toJson`**

替换 `src/tools/csv/csv.js` 中 `toJson` 函数：

```js
export function toJson(rows, headers) {
  const objs = rows.map(row => {
    const obj = {}
    for (let i = 0; i < headers.length; i++) {
      obj[headers[i]] = row[i] ?? ''
    }
    return obj
  })
  return JSON.stringify(objs, null, 2)
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run:
```bash
npm run test -- src/tools/csv/csv.test.js -t "toJson" 2>&1 | tail -10
```

Expected: 全部 PASS。

- [ ] **Step 5: Commit**

```bash
git -C D:/githome/tools add src/tools/csv/csv.js src/tools/csv/csv.test.js
git -C D:/githome/tools commit -m "feat(csv-preview): implement toJson"
```

---

### Task 7: `toMarkdown` —— 导出 Markdown 表格

**Files:**
- Modify: `src/tools/csv/csv.js`
- Modify: `src/tools/csv/csv.test.js`

按 spec 第 188 行：标准 Markdown 表格语法（`|` 分隔，`---` 分隔行）。特殊字符转义：`|` → `\|`，换行符 → 空格。

- [ ] **Step 1: 写失败测试**

在 `src/tools/csv/csv.test.js` 末尾追加：

```js
import { toMarkdown } from './csv.js'

describe('toMarkdown', () => {
  it('renders standard markdown table', () => {
    const headers = ['name', 'age']
    const rows = [['Alice', '30'], ['Bob', '25']]
    const result = toMarkdown(rows, headers)
    expect(result).toBe([
      '| name | age |',
      '| --- | --- |',
      '| Alice | 30 |',
      '| Bob | 25 |',
      '',
    ].join('\n'))
  })

  it('escapes pipe characters in cell content', () => {
    const result = toMarkdown([['a|b']], ['col'])
    expect(result).toContain('| a\\|b |')
  })

  it('replaces newlines in cell content with spaces', () => {
    const result = toMarkdown([['line1\nline2']], ['col'])
    expect(result).toContain('line1 line2')
    expect(result).not.toContain('line1\nline2')
  })

  it('handles single column', () => {
    const result = toMarkdown([['1'], ['2']], ['v'])
    expect(result).toContain('| v |')
    expect(result).toContain('| 1 |')
    expect(result).toContain('| 2 |')
  })

  it('returns header + separator only for empty rows', () => {
    const result = toMarkdown([], ['a', 'b'])
    expect(result).toBe('| a | b |\n| --- | --- |\n')
  })

  it('handles empty cell values', () => {
    const result = toMarkdown([['', 'x']], ['a', 'b'])
    expect(result).toContain('|  | x |')
  })
})
```

- [ ] **Step 2: 运行测试，确认失败**

Run:
```bash
npm run test -- src/tools/csv/csv.test.js -t "toMarkdown" 2>&1 | tail -10
```

Expected: 多数用例 FAIL（当前 `toMarkdown` 返回 `''`）。

- [ ] **Step 3: 实现 `toMarkdown`**

替换 `src/tools/csv/csv.js` 中 `toMarkdown` 函数：

```js
function escapeCell(v) {
  return String(v ?? '')
    .replace(/\r\n|\n|\r/g, ' ')
    .replace(/\|/g, '\\|')
}

export function toMarkdown(rows, headers) {
  const headerLine = '| ' + headers.map(escapeCell).join(' | ') + ' |'
  const sepLine = '| ' + headers.map(() => '---').join(' | ') + ' |'
  const bodyLines = rows.map(row =>
    '| ' + headers.map((_, i) => escapeCell(row[i] ?? '')).join(' | ') + ' |'
  )
  const lines = [headerLine, sepLine, ...bodyLines]
  // 每行末尾换行；body 为空时仍保留 header+sep 两个换行结尾
  return lines.join('\n') + '\n'
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run:
```bash
npm run test -- src/tools/csv/csv.test.js -t "toMarkdown" 2>&1 | tail -10
```

Expected: 全部 PASS。

- [ ] **Step 5: 运行全部 csv 测试确保 regression 无**

Run:
```bash
npm run test -- src/tools/csv/csv.test.js 2>&1 | tail -10
```

Expected: 全部 PASS（约 30+ 条用例）。

- [ ] **Step 6: Commit**

```bash
git -C D:/githome/tools add src/tools/csv/csv.js src/tools/csv/csv.test.js
git -C D:/githome/tools commit -m "feat(csv-preview): implement toMarkdown"
```

---

### Task 8: `CsvPreview.vue` 输入区 + 状态机 + PapaParse 解析

**Files:**
- Modify: `src/tools/csv/CsvPreview.vue`（替换 Task 1 的占位）
- Create: `src/tools/csv/CsvPreview.component.test.js`

实现 spec 第 80-89 行（`idle` 状态输入区）+ 第 128-131 行（`error` 状态）+ 解析逻辑。`loaded` 内容由后续任务补全，本任务只让 `idle → loaded / error` 状态机跑通，`loaded` 仅展示摘要条 + 占位文字。

**测试中的 papaparse mock 说明**：组件内 `import Papa from 'papaparse'`。组件测试里用 `vi.mock('papaparse', ...)` 控制结果，避免依赖真实解析行为。

- [ ] **Step 1: 写失败测试**

写入 `src/tools/csv/CsvPreview.component.test.js`：

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

// 默认 mock；具体用例可覆盖
vi.mock('papaparse', () => ({
  default: {
    parse: vi.fn(),
  },
}))

import Papa from 'papaparse'
import CsvPreview from './CsvPreview.vue'

const SAMPLE_CSV = 'name,age\nAlice,30\nBob,25'

function mountIdle() {
  return mount(CsvPreview)
}

function setPapaResult(data, errors = []) {
  Papa.parse.mockReturnValue({ data, errors })
}

describe('CsvPreview - idle state', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders title', () => {
    const wrapper = mountIdle()
    expect(wrapper.text()).toContain('CSV 预览')
  })

  it('shows textarea with placeholder', () => {
    const wrapper = mountIdle()
    const ta = wrapper.find('textarea')
    expect(ta.exists()).toBe(true)
    expect(ta.attributes('placeholder')).toContain('粘贴 CSV')
  })

  it('disables 解析 button when textarea is empty', () => {
    const wrapper = mountIdle()
    const btn = wrapper.findAll('button').find(b => b.text().includes('解析'))
    expect(btn.element.disabled).toBe(true)
  })

  it('enables 解析 button when textarea has content', async () => {
    const wrapper = mountIdle()
    await wrapper.find('textarea').setValue(SAMPLE_CSV)
    const btn = wrapper.findAll('button').find(b => b.text().includes('解析'))
    expect(btn.element.disabled).toBe(false)
  })

  it('clears textarea on 清空 click', async () => {
    const wrapper = mountIdle()
    await wrapper.find('textarea').setValue(SAMPLE_CSV)
    const clearBtn = wrapper.findAll('button').find(b => b.text().includes('清空'))
    await clearBtn.trigger('click')
    expect(wrapper.find('textarea').element.value).toBe('')
  })

  it('fills textarea from file upload', async () => {
    const wrapper = mountIdle()
    const file = new File([SAMPLE_CSV], 'test.csv', { type: 'text/csv' })
    const input = wrapper.find('input[type="file"]')
    Object.defineProperty(input.element, 'files', { value: [file], writable: false })
    await input.trigger('change')
    await nextTick()
    expect(wrapper.find('textarea').element.value).toBe(SAMPLE_CSV)
  })
})

describe('CsvPreview - parse → loaded', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('switches to loaded view showing row/col count', async () => {
    setPapaResult([
      ['name', 'age'],
      ['Alice', '30'],
      ['Bob', '25'],
    ])
    const wrapper = mountIdle()
    await wrapper.find('textarea').setValue(SAMPLE_CSV)
    const parseBtn = wrapper.findAll('button').find(b => b.text().includes('解析'))
    await parseBtn.trigger('click')
    expect(wrapper.text()).toContain('2 行')
    expect(wrapper.text()).toContain('2 列')
  })

  it('shows 更换 button in loaded state', async () => {
    setPapaResult([['a'], ['1']])
    const wrapper = mountIdle()
    await wrapper.find('textarea').setValue('a\n1')
    const parseBtn = wrapper.findAll('button').find(b => b.text().includes('解析'))
    await parseBtn.trigger('click')
    const swapBtn = wrapper.findAll('button').find(b => b.text().includes('更换'))
    expect(swapBtn.exists()).toBe(true)
  })

  it('returns to idle (with textarea preserved) on 更换 click', async () => {
    setPapaResult([['a'], ['1']])
    const wrapper = mountIdle()
    await wrapper.find('textarea').setValue('a\n1')
    const parseBtn = wrapper.findAll('button').find(b => b.text().includes('解析'))
    await parseBtn.trigger('click')
    const swapBtn = wrapper.findAll('button').find(b => b.text().includes('更换'))
    await swapBtn.trigger('click')
    expect(wrapper.find('textarea').exists()).toBe(true)
    expect(wrapper.find('textarea').element.value).toBe('a\n1')
  })

  it('shows "无数据行" when only header present', async () => {
    setPapaResult([['a', 'b']])
    const wrapper = mountIdle()
    await wrapper.find('textarea').setValue('a,b')
    const parseBtn = wrapper.findAll('button').find(b => b.text().includes('解析'))
    await parseBtn.trigger('click')
    expect(wrapper.text()).toContain('无数据行')
  })
})

describe('CsvPreview - error state', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows error message when PapaParse returns errors', async () => {
    setPapaResult([['a'], ['1']], [{ message: 'bad row' }])
    const wrapper = mountIdle()
    await wrapper.find('textarea').setValue('a\n1')
    const parseBtn = wrapper.findAll('button').find(b => b.text().includes('解析'))
    await parseBtn.trigger('click')
    expect(wrapper.text()).toContain('CSV 解析失败')
    expect(wrapper.text()).toContain('bad row')
    // textarea preserved
    expect(wrapper.find('textarea').exists()).toBe(true)
  })
})
```

- [ ] **Step 2: 运行测试，确认失败**

Run:
```bash
npm run test -- src/tools/csv/CsvPreview.component.test.js 2>&1 | tail -20
```

Expected: 所有用例 FAIL（当前组件是占位，无 textarea、无解析逻辑）。

- [ ] **Step 3: 实现 `CsvPreview.vue`（idle + loaded 摘要 + error 状态）**

写入 `src/tools/csv/CsvPreview.vue`（完整替换占位）：

```vue
<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">
      CSV 预览
    </h1>

    <!-- idle / error: 输入区 -->
    <div
      v-if="state !== 'loaded'"
      class="flex flex-col gap-4"
    >
      <div class="form-control">
        <textarea
          v-model="input"
          class="textarea textarea-bordered w-full font-mono text-sm"
          :class="{ 'textarea-error': state === 'error' }"
          placeholder="粘贴 CSV 内容..."
          rows="12"
        />
      </div>
      <div class="flex items-center gap-2">
        <button
          class="btn btn-primary btn-sm gap-1"
          :disabled="!input.trim()"
          @click="parse"
        >
          <DocumentTextIcon class="w-4 h-4" />
          解析
        </button>
        <label class="btn btn-sm gap-1">
          <ArrowUpTrayIcon class="w-4 h-4" />
          上传文件
          <input
            type="file"
            accept=".csv,.txt"
            class="hidden"
            @change="onFileUpload"
          >
        </label>
        <button
          class="btn btn-ghost btn-sm gap-1"
          @click="clear"
        >
          <TrashIcon class="w-4 h-4" />
          清空
        </button>
      </div>
      <p
        v-if="state === 'error'"
        class="text-error text-sm"
      >
        CSV 解析失败：{{ error }}
      </p>
      <p class="text-xs opacity-50">
        RFC 4180 标准 CSV（逗号分隔，首行作为表头，自动识别换行符与 BOM）
      </p>
    </div>

    <!-- loaded: 摘要条 + 占位（表格由后续任务补全） -->
    <div
      v-else
      class="flex flex-col gap-4"
    >
      <div class="flex items-center justify-between flex-wrap gap-2 text-sm">
        <div class="flex items-center gap-3">
          <span class="font-semibold">{{ fileName || '已加载' }}</span>
          <span class="opacity-70">{{ dataRows.length }} 行 × {{ headers.length }} 列</span>
          <span
            v-if="typeSummary"
            class="opacity-50"
          >{{ typeSummary }}</span>
        </div>
        <button
          class="btn btn-ghost btn-sm gap-1"
          @click="backToInput"
        >
          <ArrowLeftIcon class="w-4 h-4" />
          更换
        </button>
      </div>
      <div
        v-if="dataRows.length === 0"
        class="text-base-content/40 text-sm"
      >
        无数据行
      </div>
      <div
        v-else
        class="border border-base-content/10 rounded-lg p-6 text-center text-base-content/40 text-sm"
      >
        表格预览将在后续任务实现
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import Papa from 'papaparse'
import {
  DocumentTextIcon,
  ArrowUpTrayIcon,
  TrashIcon,
  ArrowLeftIcon,
} from '@heroicons/vue/24/outline'
import { inferColumnType } from './csv.js'

const input = ref('')
const fileName = ref('')
const state = ref('idle') // 'idle' | 'loaded' | 'error'
const error = ref('')
const headers = ref([])
const dataRows = ref([])
const types = ref([])

const typeSummary = computed(() => {
  if (types.value.length === 0) return ''
  const counts = {}
  for (const t of types.value) {
    counts[t] = (counts[t] || 0) + 1
  }
  return Object.entries(counts)
    .map(([k, v]) => `${k} ${v}`)
    .join(' / ')
})

function parse() {
  const result = Papa.parse(input.value, {
    header: false,
    skipEmptyLines: true,
  })
  if (result.errors && result.errors.length > 0) {
    state.value = 'error'
    error.value = result.errors[0].message
    return
  }
  const data = result.data
  if (!data || data.length === 0) {
    state.value = 'error'
    error.value = '空内容'
    return
  }
  headers.value = data[0]
  dataRows.value = data.slice(1)
  types.value = headers.value.map((_, i) =>
    inferColumnType(dataRows.value.map(r => r[i]))
  )
  // 兜底：补齐短行长度
  for (const row of dataRows.value) {
    while (row.length < headers.value.length) row.push('')
  }
  state.value = 'loaded'
  error.value = ''
}

function backToInput() {
  state.value = 'idle'
}

function clear() {
  input.value = ''
  fileName.value = ''
  state.value = 'idle'
  error.value = ''
  headers.value = []
  dataRows.value = []
  types.value = []
}

function onFileUpload(e) {
  const file = e.target.files[0]
  if (!file) return
  fileName.value = file.name
  const reader = new FileReader()
  reader.onload = () => {
    input.value = String(reader.result || '')
  }
  reader.readAsText(file)
  // 重置 input 以便选同名文件再次触发 change
  e.target.value = ''
}
</script>
```

- [ ] **Step 4: 运行测试，确认通过**

Run:
```bash
npm run test -- src/tools/csv/CsvPreview.component.test.js 2>&1 | tail -15
```

Expected: 全部 PASS。

- [ ] **Step 5: lint**

Run:
```bash
npm run lint
```

Expected: 无错误。

- [ ] **Step 6: Commit**

```bash
git -C D:/githome/tools add src/tools/csv/CsvPreview.vue src/tools/csv/CsvPreview.component.test.js
git -C D:/githome/tools commit -m "feat(csv-preview): implement idle/loaded/error state machine"
```

---

### Task 9: 表格渲染 + 列类型/统计标注（无虚拟滚动先）

**Files:**
- Modify: `src/tools/csv/CsvPreview.vue`
- Modify: `src/tools/csv/CsvPreview.component.test.js`

替换 Task 8 的占位"表格预览将在后续任务实现"为真实表格：列头（带类型小字）+ 统计行 + body 行（暂全渲染，虚拟滚动在 Task 10 加）。先验证结构正确，再加滚动优化。

**布局约定**：
- 列头一行 `<th>`，每个 `<th>` 内：列名 + 换行 + 类型小字（`text-xs opacity-60`）
- 统计行紧跟列头，单独一行 `<tr>` 内 `<td>` 列表，显示 `columnStats` 摘要
- body 行用 `<tr v-for>` 渲染（Task 10 会改为虚拟滚动）
- 单元格内容超长时 `max-w-[200px] truncate` + `title` 全文

- [ ] **Step 1: 写失败测试**

在 `src/tools/csv/CsvPreview.component.test.js` 末尾追加：

```js
describe('CsvPreview - table rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  async function mountLoaded() {
    Papa.parse.mockReturnValue({
      data: [
        ['name', 'age', 'score'],
        ['Alice', '30', '85.5'],
        ['Bob', '25', '90.2'],
      ],
      errors: [],
    })
    const wrapper = mount(CsvPreview)
    await wrapper.find('textarea').setValue('name,age,score\nAlice,30,85.5\nBob,25,90.2')
    const parseBtn = wrapper.findAll('button').find(b => b.text().includes('解析'))
    await parseBtn.trigger('click')
    return wrapper
  }

  it('renders all column headers with type annotations', async () => {
    const wrapper = await mountLoaded()
    const text = wrapper.text()
    expect(text).toContain('name')
    expect(text).toContain('integer')  // age
    expect(text).toContain('float')    // score
    expect(text).toContain('string')   // name
  })

  it('renders column stats in header row', async () => {
    const wrapper = await mountLoaded()
    const text = wrapper.text()
    // age 30, 25 → min:25 max:30
    expect(text).toContain('25')
    expect(text).toContain('30')
    // score avg = (85.5+90.2)/2 = 87.85
    expect(text).toContain('87.85')
  })

  it('renders data rows in tbody', async () => {
    const wrapper = await mountLoaded()
    const tbody = wrapper.find('tbody')
    expect(tbody.exists()).toBe(true)
    const rows = tbody.findAll('tr')
    expect(rows.length).toBe(2)
    expect(tbody.text()).toContain('Alice')
    expect(tbody.text()).toContain('Bob')
  })

  it('truncates long cell content with title attribute', async () => {
    Papa.parse.mockReturnValue({
      data: [['col'], ['a'.repeat(500)]],
      errors: [],
    })
    const wrapper = mount(CsvPreview)
    await wrapper.find('textarea').setValue('col\n' + 'a'.repeat(500))
    const parseBtn = wrapper.findAll('button').find(b => b.text().includes('解析'))
    await parseBtn.trigger('click')
    const cell = wrapper.find('tbody td')
    expect(cell.attributes('title')).toBe('a'.repeat(500))
    expect(cell.classes()).toContain('truncate')
  })
})
```

- [ ] **Step 2: 运行测试，确认失败**

Run:
```bash
npm run test -- src/tools/csv/CsvPreview.component.test.js -t "table rendering" 2>&1 | tail -15
```

Expected: 多数 FAIL（占位文字无表格结构）。

- [ ] **Step 3: 替换 `loaded` 区块为表格**

修改 `src/tools/csv/CsvPreview.vue`：

1. 在 imports 中加入 `columnStats`：

```js
import { inferColumnType, columnStats } from './csv.js'
```

2. 添加 `columnStatsList` computed（script setup 内）：

```js
const columnStatsList = computed(() =>
  headers.value.map((_, i) =>
    columnStats(dataRows.value.map(r => r[i]), types.value[i])
  )
)

function formatStats(stats, type) {
  if (!stats || Object.keys(stats).length === 0) return ''
  if (type === 'integer' || type === 'float') {
    return `min:${stats.min} max:${stats.max} avg:${stats.avg}`
  }
  if (type === 'date') return `min:${stats.min} max:${stats.max}`
  if (type === 'boolean') return `T:${stats.true} F:${stats.false}`
  return `unique:${stats.unique}`
}
```

3. 将 template 里 `v-else`（loaded）区块中"表格预览将在后续任务实现"占位（但 `无数据行` 提示保留）替换为真实表格：

```vue
<div
  v-else
  class="border border-base-content/10 rounded-lg overflow-auto"
>
  <table class="table table-sm">
    <thead class="sticky top-0 bg-base-100 z-10">
      <tr>
        <th
          v-for="(h, i) in headers"
          :key="i"
          class="align-top"
        >
          <div class="font-semibold">
            {{ h }}
          </div>
          <div class="text-xs opacity-60 font-normal">
            {{ types[i] }}
          </div>
          <div class="text-xs opacity-50 font-normal">
            {{ formatStats(columnStatsList[i], types[i]) }}
          </div>
        </th>
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="(row, ri) in dataRows"
        :key="ri"
      >
        <td
          v-for="(cell, ci) in row"
          :key="ci"
          class="truncate max-w-[200px]"
          :title="String(cell ?? '')"
        >
          {{ cell }}
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

- [ ] **Step 4: 运行测试，确认通过**

Run:
```bash
npm run test -- src/tools/csv/CsvPreview.component.test.js -t "table rendering" 2>&1 | tail -10
```

Expected: 全部 PASS。

- [ ] **Step 5: Commit**

```bash
git -C D:/githome/tools add src/tools/csv/CsvPreview.vue src/tools/csv/CsvPreview.component.test.js
git -C D:/githome/tools commit -m "feat(csv-preview): render table with type annotations and stats"
```

---

### Task 10: 虚拟滚动

**Files:**
- Modify: `src/tools/csv/CsvPreview.vue`
- Modify: `src/tools/csv/CsvPreview.component.test.js`

按 spec 第 70-78 行：固定行高 36px，监听 `scroll` 事件，仅渲染可视窗口 + 上下各 5 行缓冲。用绝对定位 + `translateY` 定位。

**实现要点**：
- 容器 `ref="scrollEl"`，监听 `@scroll`，记录 `scrollTop`
- `ROW_HEIGHT = 36`，`BUFFER = 5`
- `visibleStart = max(0, floor(scrollTop / ROW_HEIGHT) - BUFFER)`
- `visibleEnd = min(rows.length, ceil((scrollTop + containerHeight) / ROW_HEIGHT) + BUFFER)`
- `containerHeight` 用 `ref` + `ResizeObserver` 或固定值（先用固定 600px，简单可控）
- body 区高度 = `rows.length * ROW_HEIGHT`（占位撑开滚动条）
- 每行 `position: absolute; top: index * ROW_HEIGHT; height: ROW_HEIGHT`

- [ ] **Step 1: 写失败测试**

在 `src/tools/csv/CsvPreview.component.test.js` 末尾追加：

```js
describe('CsvPreview - virtual scroll', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders only a window of rows for large data', async () => {
    // 造 5000 行
    const data = [['v']]
    for (let i = 0; i < 5000; i++) data.push([String(i)])
    Papa.parse.mockReturnValue({ data, errors: [] })

    const wrapper = mount(CsvPreview)
    await wrapper.find('textarea').setValue('v\n' + Array.from({ length: 5000 }, (_, i) => i).join('\n'))
    const parseBtn = wrapper.findAll('button').find(b => b.text().includes('解析'))
    await parseBtn.trigger('click')

    const tbody = wrapper.find('tbody')
    const rows = tbody.findAll('tr')
    // 5000 行不应全部渲染；窗口 + 缓冲应在合理范围（< 100）
    expect(rows.length).toBeLessThan(100)
    expect(rows.length).toBeGreaterThan(5)
  })

  it('updates rendered window on scroll', async () => {
    const data = [['v']]
    for (let i = 0; i < 5000; i++) data.push([String(i)])
    Papa.parse.mockReturnValue({ data, errors: [] })

    const wrapper = mount(CsvPreview)
    await wrapper.find('textarea').setValue('v\n' + Array.from({ length: 5000 }, (_, i) => i).join('\n'))
    const parseBtn = wrapper.findAll('button').find(b => b.text().includes('解析'))
    await parseBtn.trigger('click')

    // 抓 firstRow 当前显示的内容
    const tbody = wrapper.find('tbody')
    const beforeFirst = tbody.find('tr').text()

    // 滚动到很底部
    const scrollEl = wrapper.find('.csv-scroll-container')
    // jsdom 不真实渲染高度，直接设 scrollTop 后触发 scroll
    scrollEl.element.scrollTop = 5000 * 36 - 600
    await scrollEl.trigger('scroll')

    const afterFirst = tbody.find('tr').text()
    expect(afterFirst).not.toBe(beforeFirst)
  })
})
```

- [ ] **Step 2: 运行测试，确认失败**

Run:
```bash
npm run test -- src/tools/csv/CsvPreview.component.test.js -t "virtual scroll" 2>&1 | tail -15
```

Expected: 多数 FAIL（当前全量渲染 5000 行）。

- [ ] **Step 3: 替换 tbody 为虚拟滚动实现**

修改 `src/tools/csv/CsvPreview.vue`：

1. script setup 顶部 import 新增 `ref` 已有；添加虚拟滚动状态：

```js
const ROW_HEIGHT = 36
const BUFFER = 5
const VIEWPORT_HEIGHT = 600

const scrollTop = ref(0)

const visibleRange = computed(() => {
  const total = dataRows.value.length
  if (total === 0) return { start: 0, end: 0 }
  const start = Math.max(0, Math.floor(scrollTop.value / ROW_HEIGHT) - BUFFER)
  const end = Math.min(total, Math.ceil((scrollTop.value + VIEWPORT_HEIGHT) / ROW_HEIGHT) + BUFFER)
  return { start, end }
})

const visibleRows = computed(() => {
  const { start, end } = visibleRange.value
  return dataRows.value.slice(start, end).map((row, i) => ({
    row,
    absoluteIndex: start + i,
  }))
})

const bodyHeight = computed(() => dataRows.value.length * ROW_HEIGHT)

function onScroll(e) {
  scrollTop.value = e.target.scrollTop
}
```

2. template 中表格容器加 class 和监听；tbody 改为虚拟滚动：

把外层 `<div class="border ... rounded-lg overflow-auto">` 改为：

```vue
<div
  class="border border-base-content/10 rounded-lg overflow-auto csv-scroll-container"
  style="max-height: 600px;"
  @scroll="onScroll"
>
  <table class="table table-sm">
    <thead class="sticky top-0 bg-base-100 z-10">
      <!-- 同 Task 9 -->
    </thead>
    <tbody>
      <tr
        v-for="item in visibleRows"
        :key="item.absoluteIndex"
        :style="{ height: ROW_HEIGHT + 'px', position: 'absolute', top: (item.absoluteIndex * ROW_HEIGHT) + 'px', left: 0, right: 0 }"
      >
        <td
          v-for="(cell, ci) in item.row"
          :key="ci"
          class="truncate max-w-[200px]"
          :title="String(cell ?? '')"
        >
          {{ cell }}
        </td>
      </tr>
      <!-- 占位撑开高度 -->
      <tr :style="{ height: bodyHeight + 'px' }">
        <td :colspan="headers.length" />
      </tr>
    </tbody>
  </table>
</div>
```

注意：`position: absolute` 在 `<tr>` 上需要 `display: table-row` 仍生效；为简化，改为把每行包成绝对定位的 div 也可。**采用更稳的写法**：tbody 用一个相对定位的容器 div（高度 = bodyHeight），内部 v-for 渲染绝对定位的行 div（每行内部用 grid/flex 模拟列）。

**修正后的稳妥实现**（替换上面的 tbody 写法）：把整个 `<table>` 改为 `<div>` 网格布局以避免 `<tr>` 绝对定位兼容性问题：

```vue
<div
  class="border border-base-content/10 rounded-lg overflow-auto csv-scroll-container"
  style="max-height: 600px;"
  @scroll="onScroll"
>
  <!-- sticky header -->
  <div class="sticky top-0 bg-base-100 z-10 flex">
    <div
      v-for="(h, i) in headers"
      :key="i"
      class="flex-1 px-2 py-1 border-b border-base-content/10 align-top"
    >
      <div class="font-semibold text-sm">
        {{ h }}
      </div>
      <div class="text-xs opacity-60">
        {{ types[i] }}
      </div>
      <div class="text-xs opacity-50">
        {{ formatStats(columnStatsList[i], types[i]) }}
      </div>
    </div>
  </div>
  <!-- virtual body -->
  <div
    class="relative"
    :style="{ height: bodyHeight + 'px' }"
  >
    <div
      v-for="item in visibleRows"
      :key="item.absoluteIndex"
      class="flex absolute left-0 right-0"
      :style="{ top: (item.absoluteIndex * ROW_HEIGHT) + 'px', height: ROW_HEIGHT + 'px' }"
    >
      <div
        v-for="(cell, ci) in item.row"
        :key="ci"
        class="flex-1 px-2 truncate max-w-[200px] text-sm flex items-center"
        :title="String(cell ?? '')"
      >
        {{ cell }}
      </div>
    </div>
  </div>
</div>
```

并把 template 最外层从 `<table>` 改为上述 div 结构；Task 9 测试里的 `tbody`/`td` 选择器会失效。

**为不破坏 Task 9 测试**，更新 Task 9 测试中相关 selector：
- `wrapper.find('tbody')` → `wrapper.find('.csv-body')`（给 virtual body div 加 class `csv-body`）
- `wrapper.find('tbody td')` → `wrapper.find('.csv-body > div:first-child > div:first-child')`（第一行第一个单元格）

在 Task 10 实现时同步修 Task 9 测试 selector。具体改动：在 Task 9 测试里把 `tbody` 改成 `.csv-body`，把 `wrapper.find('tbody td')` 改成 `.csv-body > div:first-child > div:first-child`。给 virtual body div 加 `class="relative csv-body"`。

修订后的 body div：

```vue
<div
  class="relative csv-body"
  :style="{ height: bodyHeight + 'px' }"
>
```

- [ ] **Step 4: 同步修改 Task 9 的测试 selector**

打开 `src/tools/csv/CsvPreview.component.test.js`，在 "table rendering" describe 块中：

将 `wrapper.find('tbody')` 全部改为 `wrapper.find('.csv-body')`
将 `wrapper.find('tbody td')` 改为 `wrapper.find('.csv-body > div:first-child > div:first-child')`
将 `tbody.findAll('tr')` 改为 `.csv-body` 下直接子 div 数量（即 `wrapper.find('.csv-body').findAll(':scope > div')`，但 vue-test-utils 不支持 `:scope`）—— 改成 `wrapper.find('.csv-body').findAll('div[data-row]')`

为此给每行加 `data-row` 属性：

```vue
<div
  v-for="item in visibleRows"
  :key="item.absoluteIndex"
  class="flex absolute left-0 right-0"
  data-row
  :style="..."
>
```

这样测试用 `wrapper.find('.csv-body').findAll('[data-row]')` 取行，`wrapper.find('.csv-body [data-row]:first-child > div:first-child')` 取首单元格。

更新 Task 9 测试为：

```js
it('renders data rows in tbody', async () => {
  const wrapper = await mountLoaded()
  const body = wrapper.find('.csv-body')
  expect(body.exists()).toBe(true)
  const rows = body.findAll('[data-row]')
  expect(rows.length).toBe(2)
  expect(body.text()).toContain('Alice')
  expect(body.text()).toContain('Bob')
})

it('truncates long cell content with title attribute', async () => {
  Papa.parse.mockReturnValue({
    data: [['col'], ['a'.repeat(500)]],
    errors: [],
  })
  const wrapper = mount(CsvPreview)
  await wrapper.find('textarea').setValue('col\n' + 'a'.repeat(500))
  const parseBtn = wrapper.findAll('button').find(b => b.text().includes('解析'))
  await parseBtn.trigger('click')
  const cell = wrapper.find('.csv-body [data-row]:first-child > div:first-child')
  expect(cell.attributes('title')).toBe('a'.repeat(500))
  expect(cell.classes()).toContain('truncate')
})
```

- [ ] **Step 5: 运行全部组件测试**

Run:
```bash
npm run test -- src/tools/csv/CsvPreview.component.test.js 2>&1 | tail -15
```

Expected: 全部 PASS（包括 Task 8、9、10 的用例）。

- [ ] **Step 6: lint**

Run:
```bash
npm run lint
```

Expected: 无错误。

- [ ] **Step 7: Commit**

```bash
git -C D:/githome/tools add src/tools/csv/CsvPreview.vue src/tools/csv/CsvPreview.component.test.js
git -C D:/githome/tools commit -m "feat(csv-preview): implement virtual scrolling for large CSV"
```

---

### Task 11: 排序 + 筛选交互

**Files:**
- Modify: `src/tools/csv/CsvPreview.vue`
- Modify: `src/tools/csv/CsvPreview.component.test.js`

按 spec 第 122-125 行：列头三态循环（无 → asc → desc → 无），同一时刻只一列排序；每列下方筛选输入框，实时模糊匹配，多列 AND。筛选 + 排序：先筛选，再排序。

**状态约定**：
- `sortState = ref({ column: null, direction: null })`（direction: `'asc' | 'desc' | null`）
- `filters = ref({})`（key 为列索引字符串）
- `displayedRows = computed`：`filterRows(dataRows, filters)` → `sortRows(..., sortState.column, sortState.direction, types)`

注意：统计行（`columnStatsList`）基于 `dataRows`，不随筛选变化（spec 没要求随筛选更新）。但虚拟滚动基于 `displayedRows.length`。

**布局调整**：
- 列头可点击；点击切换：`column === i` 时 direction 循环 `null → asc → desc → null`；`column !== i` 时设为 `asc`
- 列头下新增 `筛选` 小输入框（每列一个）

- [ ] **Step 1: 写失败测试**

在 `src/tools/csv/CsvPreview.component.test.js` 末尾追加：

```js
describe('CsvPreview - sort and filter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  async function mountLoaded() {
    Papa.parse.mockReturnValue({
      data: [
        ['name', 'age'],
        ['Alice', '30'],
        ['Bob', '25'],
        ['Carol', '35'],
      ],
      errors: [],
    })
    const wrapper = mount(CsvPreview)
    await wrapper.find('textarea').setValue('name,age\nAlice,30\nBob,25\nCarol,35')
    const parseBtn = wrapper.findAll('button').find(b => b.text().includes('解析'))
    await parseBtn.trigger('click')
    return wrapper
  }

  it('cycles sort state on column header click', async () => {
    const wrapper = await mountLoaded()
    const headers = wrapper.findAll('.csv-header-cell')
    // 点 age 列头（索引 1）→ asc
    await headers[1].trigger('click')
    let rows = wrapper.find('.csv-body').findAll('[data-row]')
    expect(rows[0].text()).toContain('Bob') // 25 最小

    // 再点 → desc
    await headers[1].trigger('click')
    rows = wrapper.find('.csv-body').findAll('[data-row]')
    expect(rows[0].text()).toContain('Carol') // 35 最大

    // 再点 → 回到无序（原序）
    await headers[1].trigger('click')
    rows = wrapper.find('.csv-body').findAll('[data-row]')
    expect(rows[0].text()).toContain('Alice')
  })

  it('renders a filter input per column', async () => {
    const wrapper = await mountLoaded()
    const inputs = wrapper.findAll('.csv-filter-input')
    expect(inputs.length).toBe(2)
  })

  it('filters rows by single column (case-insensitive contains)', async () => {
    const wrapper = await mountLoaded()
    const inputs = wrapper.findAll('.csv-filter-input')
    await inputs[0].setValue('ali')
    const rows = wrapper.find('.csv-body').findAll('[data-row]')
    expect(rows.length).toBe(1)
    expect(rows[0].text()).toContain('Alice')
  })

  it('filters rows by multiple columns with AND', async () => {
    const wrapper = await mountLoaded()
    const inputs = wrapper.findAll('.csv-filter-input')
    await inputs[0].setValue('a')   // Alice, Carol
    await inputs[1].setValue('3')   // age 含 3: Alice(30), Carol(35)
    const rows = wrapper.find('.csv-body').findAll('[data-row]')
    expect(rows.length).toBe(2)
    const text = rows.map(r => r.text()).join(' ')
    expect(text).toContain('Alice')
    expect(text).toContain('Carol')
    expect(text).not.toContain('Bob')
  })

  it('shows filter count in toolbar', async () => {
    const wrapper = await mountLoaded()
    const inputs = wrapper.findAll('.csv-filter-input')
    await inputs[0].setValue('ali')
    expect(wrapper.text()).toContain('筛选条件 1')
  })

  it('clears all filters on 清除 click', async () => {
    const wrapper = await mountLoaded()
    const inputs = wrapper.findAll('.csv-filter-input')
    await inputs[0].setValue('ali')
    const clearBtn = wrapper.findAll('button').find(b => b.text().includes('清除'))
    await clearBtn.trigger('click')
    const rows = wrapper.find('.csv-body').findAll('[data-row]')
    expect(rows.length).toBe(3)
  })

  it('shows displayed/total count "显示 N 行 / 共 M 行"', async () => {
    const wrapper = await mountLoaded()
    expect(wrapper.text()).toContain('显示 3 行')
    expect(wrapper.text()).toContain('共 3 行')
    const inputs = wrapper.findAll('.csv-filter-input')
    await inputs[0].setValue('ali')
    expect(wrapper.text()).toContain('显示 1 行')
    expect(wrapper.text()).toContain('共 3 行')
  })

  it('combines filter + sort (filter first, then sort)', async () => {
    const wrapper = await mountLoaded()
    // 筛 age 含 3 → Alice(30), Carol(35)
    const inputs = wrapper.findAll('.csv-filter-input')
    await inputs[1].setValue('3')
    // 排序 age desc
    const headers = wrapper.findAll('.csv-header-cell')
    await headers[1].trigger('click')
    await headers[1].trigger('click')
    const rows = wrapper.find('.csv-body').findAll('[data-row]')
    expect(rows[0].text()).toContain('Carol')
    expect(rows[1].text()).toContain('Alice')
    expect(rows.length).toBe(2)
  })
})
```

- [ ] **Step 2: 运行测试，确认失败**

Run:
```bash
npm run test -- src/tools/csv/CsvPreview.component.test.js -t "sort and filter" 2>&1 | tail -15
```

Expected: 全部 FAIL（当前无 header-cell class、无 filter input、无工具栏）。

- [ ] **Step 3: 实现排序 + 筛选 + 工具栏**

修改 `src/tools/csv/CsvPreview.vue`：

1. import 新增 `sortRows, filterRows`：

```js
import { inferColumnType, columnStats, sortRows, filterRows } from './csv.js'
```

2. script setup 内新增状态和 computed：

```js
const sortState = ref({ column: null, direction: null })
const filters = ref({})

const activeFilterCount = computed(() => {
  let n = 0
  for (const k of Object.keys(filters.value)) {
    if ((filters.value[k] || '').trim()) n++
  }
  return n
})

const filteredRows = computed(() => filterRows(dataRows.value, filters.value))

const displayedRows = computed(() => {
  if (sortState.value.column === null || sortState.value.direction === null) {
    return filteredRows.value
  }
  return sortRows(
    filteredRows.value,
    sortState.value.column,
    sortState.value.direction,
    types.value,
  )
})

function toggleSort(colIndex) {
  const cur = sortState.value
  if (cur.column !== colIndex) {
    sortState.value = { column: colIndex, direction: 'asc' }
    return
  }
  // 同列 → 循环 asc → desc → null
  if (cur.direction === 'asc') {
    sortState.value = { column: colIndex, direction: 'desc' }
  } else if (cur.direction === 'desc') {
    sortState.value = { column: null, direction: null }
  } else {
    sortState.value = { column: colIndex, direction: 'asc' }
  }
}

const sortIcon = (colIndex) => {
  if (sortState.value.column !== colIndex) return ''
  if (sortState.value.direction === 'asc') return '↑'
  if (sortState.value.direction === 'desc') return '↓'
  return ''
}

function clearFilters() {
  filters.value = {}
}
```

3. 把虚拟滚动的 `visibleRows` 改为基于 `displayedRows`：

```js
const visibleRows = computed(() => {
  const { start, end } = visibleRange.value
  return displayedRows.value.slice(start, end).map((row, i) => ({
    row,
    absoluteIndex: start + i,
  }))
})

const bodyHeight = computed(() => displayedRows.value.length * ROW_HEIGHT)
```

4. template 表格区上方加工具栏，列头中加 `@click` 和排序图标，列头下加筛选输入框：

在 loaded 区块、表格容器之前加工具栏：

```vue
<div class="flex items-center justify-between flex-wrap gap-2 text-sm mb-2">
  <div class="flex items-center gap-2">
    <span
      v-if="activeFilterCount > 0"
      class="badge badge-sm badge-primary"
    >筛选条件 {{ activeFilterCount }}</span>
    <button
      v-if="activeFilterCount > 0"
      class="btn btn-ghost btn-xs"
      @click="clearFilters"
    >
      清除
    </button>
  </div>
  <div class="opacity-70">
    显示 {{ displayedRows.length }} 行 / 共 {{ dataRows.length }} 行
  </div>
</div>
```

列头 div 改为（加 `@click`、`csv-header-cell` class、排序图标、筛选输入框）：

```vue
<div class="sticky top-0 bg-base-100 z-10 flex">
  <div
    v-for="(h, i) in headers"
    :key="i"
    class="csv-header-cell flex-1 px-2 py-1 border-b border-base-content/10 cursor-pointer select-none"
    @click="toggleSort(i)"
  >
    <div class="font-semibold text-sm">
      {{ h }}
      <span class="opacity-70">{{ sortIcon(i) }}</span>
    </div>
    <div class="text-xs opacity-60">
      {{ types[i] }}
    </div>
    <div class="text-xs opacity-50">
      {{ formatStats(columnStatsList[i], types[i]) }}
    </div>
    <input
      v-model="filters[i]"
      class="csv-filter-input input input-xs input-bordered mt-1 w-full"
      placeholder="筛选..."
      @click.stop
    >
  </div>
</div>
```

（input 的 `@click.stop` 防止点输入框触发列排序）

- [ ] **Step 4: 运行测试，确认通过**

Run:
```bash
npm run test -- src/tools/csv/CsvPreview.component.test.js -t "sort and filter" 2>&1 | tail -10
```

Expected: 全部 PASS。

- [ ] **Step 5: 跑全部 csv 测试确认无回归**

Run:
```bash
npm run test -- src/tools/csv/ 2>&1 | tail -10
```

Expected: 全部 PASS。

- [ ] **Step 6: lint**

Run:
```bash
npm run lint
```

Expected: 无错误。

- [ ] **Step 7: Commit**

```bash
git -C D:/githome/tools add src/tools/csv/CsvPreview.vue src/tools/csv/CsvPreview.component.test.js
git -C D:/githome/tools commit -m "feat(csv-preview): add sort, filter and toolbar"
```

---

### Task 12: 导出 JSON / Markdown dropdown

**Files:**
- Modify: `src/tools/csv/CsvPreview.vue`
- Modify: `src/tools/csv/CsvPreview.component.test.js`

按 spec 第 133-137 行：工具栏一个 dropdown，选项 JSON / Markdown，点击生成内容复制到剪贴板 + 提示"已复制"。导出**当前筛选+排序后结果**（即 `displayedRows`）。

**剪贴板 mock 说明**：测试中用 `vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockResolvedValue() } })` 或 `Object.assign(navigator, {...})`。考虑到 jsdom 已有 `navigator`，用 `vi.spyOn(navigator.clipboard, 'writeText')` 或 stub 整个对象。

- [ ] **Step 1: 写失败测试**

在 `src/tools/csv/CsvPreview.component.test.js` 末尾追加：

```js
describe('CsvPreview - export', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // stub clipboard
    vi.stubGlobal('navigator', {
      ...navigator,
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })
  })

  async function mountLoaded() {
    Papa.parse.mockReturnValue({
      data: [
        ['name', 'age'],
        ['Alice', '30'],
        ['Bob', '25'],
      ],
      errors: [],
    })
    const wrapper = mount(CsvPreview)
    await wrapper.find('textarea').setValue('name,age\nAlice,30\nBob,25')
    const parseBtn = wrapper.findAll('button').find(b => b.text().includes('解析'))
    await parseBtn.trigger('click')
    return wrapper
  }

  it('has 导出 dropdown button', async () => {
    const wrapper = await mountLoaded()
    const btn = wrapper.findAll('button').find(b => b.text().includes('导出'))
    expect(btn.exists()).toBe(true)
  })

  it('exports JSON to clipboard', async () => {
    const wrapper = await mountLoaded()
    // 展开 dropdown
    const dropdownBtn = wrapper.findAll('button').find(b => b.text().includes('导出'))
    await dropdownBtn.trigger('click')
    await nextTick()
    // 点击 JSON 选项
    const jsonBtn = wrapper.findAll('button').find(b => b.text().trim() === 'JSON')
    await jsonBtn.trigger('click')
    await nextTick()
    expect(navigator.clipboard.writeText).toHaveBeenCalled()
    const calledWith = navigator.clipboard.writeText.mock.calls[0][0]
    const parsed = JSON.parse(calledWith)
    expect(parsed).toEqual([
      { name: 'Alice', age: '30' },
      { name: 'Bob', age: '25' },
    ])
  })

  it('exports Markdown to clipboard', async () => {
    const wrapper = await mountLoaded()
    const dropdownBtn = wrapper.findAll('button').find(b => b.text().includes('导出'))
    await dropdownBtn.trigger('click')
    await nextTick()
    const mdBtn = wrapper.findAll('button').find(b => b.text().trim() === 'Markdown')
    await mdBtn.trigger('click')
    await nextTick()
    expect(navigator.clipboard.writeText).toHaveBeenCalled()
    const calledWith = navigator.clipboard.writeText.mock.calls[0][0]
    expect(calledWith).toContain('| name | age |')
    expect(calledWith).toContain('| --- | --- |')
    expect(calledWith).toContain('| Alice | 30 |')
  })

  it('exports filtered+sorted result (not original)', async () => {
    const wrapper = await mountLoaded()
    // 筛 name 含 'B'
    const inputs = wrapper.findAll('.csv-filter-input')
    await inputs[0].setValue('b')
    const dropdownBtn = wrapper.findAll('button').find(b => b.text().includes('导出'))
    await dropdownBtn.trigger('click')
    await nextTick()
    const jsonBtn = wrapper.findAll('button').find(b => b.text().trim() === 'JSON')
    await jsonBtn.trigger('click')
    await nextTick()
    const calledWith = navigator.clipboard.writeText.mock.calls[0][0]
    const parsed = JSON.parse(calledWith)
    expect(parsed).toEqual([{ name: 'Bob', age: '25' }])
  })

  it('shows 已复制 toast after export', async () => {
    const wrapper = await mountLoaded()
    const dropdownBtn = wrapper.findAll('button').find(b => b.text().includes('导出'))
    await dropdownBtn.trigger('click')
    await nextTick()
    const jsonBtn = wrapper.findAll('button').find(b => b.text().trim() === 'JSON')
    await jsonBtn.trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('已复制')
  })
})
```

- [ ] **Step 2: 运行测试，确认失败**

Run:
```bash
npm run test -- src/tools/csv/CsvPreview.component.test.js -t "export" 2>&1 | tail -15
```

Expected: 全部 FAIL（无导出按钮）。

- [ ] **Step 3: 实现导出 dropdown**

修改 `src/tools/csv/CsvPreview.vue`：

1. import 新增 `toJson, toMarkdown`：

```js
import {
  inferColumnType,
  columnStats,
  sortRows,
  filterRows,
  toJson,
  toMarkdown,
} from './csv.js'
```

2. script setup 内新增：

```js
const showExportMenu = ref(false)
const copyToast = ref(false)

async function doExport(format) {
  const text = format === 'json'
    ? toJson(displayedRows.value, headers.value)
    : toMarkdown(displayedRows.value, headers.value)
  try {
    await navigator.clipboard.writeText(text)
    copyToast.value = true
    setTimeout(() => { copyToast.value = false }, 1500)
  } catch {
    // clipboard 不可用，忽略
  }
  showExportMenu.value = false
}

function toggleExportMenu() {
  showExportMenu.value = !showExportMenu.value
}
```

3. template 工具栏中加入导出 dropdown（放在 `flex items-center justify-between` 的工具栏中，紧贴 `显示 N 行 / 共 M 行` 左侧）：

修订工具栏 template 为：

```vue
<div class="flex items-center justify-between flex-wrap gap-2 text-sm mb-2">
  <div class="flex items-center gap-2">
    <span
      v-if="activeFilterCount > 0"
      class="badge badge-sm badge-primary"
    >筛选条件 {{ activeFilterCount }}</span>
    <button
      v-if="activeFilterCount > 0"
      class="btn btn-ghost btn-xs"
      @click="clearFilters"
    >
      清除
    </button>
  </div>
  <div class="flex items-center gap-3">
    <div class="dropdown dropdown-end">
      <button
        class="btn btn-sm gap-1"
        @click="toggleExportMenu"
      >
        导出
        <ChevronDownIcon class="w-4 h-4" />
      </button>
      <ul
        v-if="showExportMenu"
        class="dropdown-content menu menu-sm bg-base-100 rounded-box shadow z-20 w-40"
      >
        <li><button @click="doExport('json')">JSON</button></li>
        <li><button @click="doExport('markdown')">Markdown</button></li>
      </ul>
    </div>
    <div class="opacity-70">
      显示 {{ displayedRows.length }} 行 / 共 {{ dataRows.length }} 行
    </div>
  </div>
</div>
```

并在组件根 div 末尾加 toast（绝对定位/Fixed 顶部居中，参考其他工具的样式）：

```vue
<div
  v-if="copyToast"
  class="toast toast-top toast-center z-50"
>
  <div class="alert alert-success">
    已复制
  </div>
</div>
```

4. imports 中新增 `ChevronDownIcon`：

```js
import {
  DocumentTextIcon,
  ArrowUpTrayIcon,
  TrashIcon,
  ArrowLeftIcon,
  ChevronDownIcon,
} from '@heroicons/vue/24/outline'
```

- [ ] **Step 4: 运行测试，确认通过**

Run:
```bash
npm run test -- src/tools/csv/CsvPreview.component.test.js -t "export" 2>&1 | tail -10
```

Expected: 全部 PASS。

- [ ] **Step 5: 跑全部 csv 测试确认无回归**

Run:
```bash
npm run test -- src/tools/csv/ 2>&1 | tail -10
```

Expected: 全部 PASS（约 50+ 条用例）。

- [ ] **Step 6: lint**

Run:
```bash
npm run lint
```

Expected: 无错误。

- [ ] **Step 7: Commit**

```bash
git -C D:/githome/tools add src/tools/csv/CsvPreview.vue src/tools/csv/CsvPreview.component.test.js
git -C D:/githome/tools commit -m "feat(csv-preview): add export dropdown for JSON and Markdown"
```

---

### Task 13: 注册路由 + sidebar + 端到端验证

**Files:**
- Modify: `src/router.js`
- Modify: `src/routes.js`
- Modify: `src/tools.js`

按 spec 第 201-205 行三步注册。完成后跑全部测试 + lint + build 端到端验证。

- [ ] **Step 1: 修改 `src/routes.js`**

在末尾 `]` 之前（即 `/token-counter` 之后）追加 CSV 路由定义：

打开 `src/routes.js`，在最后一个 `]` 之前添加：

```js
  {
    path: '/csv',
    meta: {
      title: 'CSV 预览',
      description: 'CSV 表格预览，支持类型推断、列统计、排序筛选、导出 JSON / Markdown',
    },
  },
```

- [ ] **Step 2: 修改 `src/router.js`**

1. 在 import 区（`import TokenCounter from './tools/token-counter/TokenCounter.vue'` 之后）追加：

```js
import CsvPreview from './tools/csv/CsvPreview.vue'
```

2. 在 `components` 对象中（`'/token-counter': TokenCounter,` 之后）添加：

```js
  '/csv': CsvPreview,
```

- [ ] **Step 3: 修改 `src/tools.js`**

1. 在 import 区从 `@heroicons/vue/24/outline` 新增 `TableCellsIcon`：

打开 `src/tools.js`，在 import 列表末尾（`CpuChipIcon,` 之后）追加：

```js
  TableCellsIcon,
```

2. 在"文本处理"分组的 `tools` 数组末尾（`cli-format` 之后）追加：

```js
      {
        name: 'CSV 预览',
        path: '/csv',
        desc: 'CSV 表格预览，支持类型推断、列统计、排序筛选、导出',
        icon: TableCellsIcon,
      },
```

- [ ] **Step 4: 跑全部测试，确认无回归**

Run:
```bash
npm run test 2>&1 | tail -15
```

Expected: 全部 PASS（包括 csv 模块、Home 测试、其他工具测试）。

- [ ] **Step 5: lint**

Run:
```bash
npm run lint
```

Expected: 无错误。

- [ ] **Step 6: build 验证（含 prerender）**

Run:
```bash
npm run build 2>&1 | tail -25
```

Expected: 构建成功，无 vite 报错；`/csv` 在 prerender 输出中可见。

- [ ] **Step 7: 手动浏览器验证（curl 抓首页确认渲染）**

Run:
```bash
node -e "const fs=require('fs');const p=require('path');const f=p.join(__dirname,'dist','index.html');if(fs.existsSync(f)){const c=fs.readFileSync(f,'utf8');console.log(c.includes('wxsm')?'OK home render':'FAIL')}else{console.log('No dist/index.html')}"
```

Expected: `OK home render`

- [ ] **Step 8: Commit**

```bash
git -C D:/githome/tools add src/router.js src/routes.js src/tools.js
git -C D:/githome/tools commit -m "feat(csv-preview): register route and sidebar entry"
```

- [ ] **Step 9: 可选 —— 推送分支**

如果需要 PR review，推送分支（不强制）：

```bash
git -C D:/githome/tools push -u origin feat/csv-preview
```

---

## 实现完成检查清单

实现全部完成后，验证以下项：

- [ ] `npm run test` 全绿
- [ ] `npm run lint` 无错误
- [ ] `npm run build` 成功
- [ ] 浏览器手动验证：访问 `/csv`，粘贴 CSV，看到表格、类型、统计、排序、筛选、导出全部工作
- [ ] 大文件验证：粘贴 5000+ 行 CSV，滚动流畅不卡顿
- [ ] sidebar "文本处理" 分组下显示"CSV 预览"条目且 icon 正确

## Self-Review 检查结果

**Spec coverage**：

- ✅ 输入方式（文件 + 文本，无拖拽）— Task 8
- ✅ 虚拟滚动 — Task 10
- ✅ 行列数 — Task 8（摘要条）+ Task 11（工具栏）
- ✅ 列类型推断 — Task 2 + Task 8（标注）
- ✅ 列统计 — Task 3 + Task 9（展示）
- ✅ 排序 — Task 4 + Task 11
- ✅ 筛选 — Task 5 + Task 11
- ✅ 导出 JSON/Markdown — Task 6-7 + Task 12
- ✅ 错误处理 — Task 8（error 状态）
- ✅ 边界情况（空文件、长单元格、列名重复）— Task 8/9 测试覆盖
- ✅ 注册三步 — Task 13

**Placeholder scan**：无 TBD/TODO，所有代码块完整。

**Type consistency**：`inferColumnType`、`columnStats`、`sortRows`、`filterRows`、`toJson`、`toMarkdown` 在测试和实现中签名一致；`sortRows` 的第 4 参数 `types` 在 Task 4 定义、Task 11 调用一致。`displayedRows`、`filteredRows`、`columnStatsList` 在 Task 8/9/11 命名一致。

