# 7 New Tools Design — Group Completion

## Overview

Add 7 tools across 4 existing groups to fill common developer needs. All tools follow existing project patterns (Vue 3 SFC, Tailwind + DaisyUI, card layout, one-file-per-tool).

---

## 1. Unicode 转换

**Group:** 编码转换
**Route:** `/unicode`
**Icon:** `LanguageIcon` (already imported in tools.js)

### Functionality

- Bidirectional: text → Unicode escape, Unicode escape → text
- Layout follows UrlEncode.vue pattern (two textareas with swap button)
- Support two escape formats via radio toggle:
  - `\uXXXX` (JavaScript/JSON style)
  - `&#xXXXX;` (HTML entity style)
- Auto-detect direction: if input contains `\u` or `&#x`, treat as decode; otherwise encode
- Real-time conversion on input
- Copy button on output

### Edge Cases

- Surrogate pairs (emoji): `\uD83D\uDE00` → 😀
- Mixed content (text with some escape sequences): decode only the escaped portions

---

## 2. JWT 解码

**Group:** 编码转换
**Route:** `/jwt-decode`
**Icon:** `TicketIcon` (from @heroicons/vue/24/outline — available, verified)

### Functionality

- Single textarea input for JWT token
- Auto-split by `.` into 3 parts (header, payload, signature)
- Base64url-decode header and payload, display as formatted JSON in two cards
- Signature shown as raw hex string (cannot decode further)
- Time fields (exp, iat, nbf) auto-display human-readable datetime next to numeric value
- Copy button per section
- Note displayed: "此工具仅解码 JWT，不验证签名"

### Edge Cases

- Invalid token (not 3 parts): show error message inline
- Non-JSON payload: display raw decoded text

---

## 3. NanoID 生成

**Group:** 生成转换
**Route:** `/nano-id`
**Icon:** `SparklesIcon` (already imported in tools.js)

### Functionality

- Follow UUID.vue card layout pattern
- Configurable options:
  - Length: number input (default 21, range 1–256)
  - Alphabet: radio buttons — 字母数字 (alphanumeric) / 小写字母数字 / 自定义
  - Custom alphabet: text input, shown only when "自定义" selected
  - Count: number input (default 1, range 1–50)
- Generate button + one-click copy per ID
- Use crypto.getRandomValues() — no external npm dependency

### Algorithm

- Implement nanoid-compatible generation using `crypto.getRandomValues()`
- For custom alphabet: map random bytes to alphabet characters using unbiased sampling

---

## 4. Cron 表达式解析

**Group:** 生成转换
**Route:** `/cron`
**Icon:** `ClockIcon` (already imported in tools.js)

### Functionality

- Input field for cron expression (5 fields: min hour day month weekday)
- Display human-readable Chinese description of the expression
- Show next 5 execution times (computed locally)
- Preset buttons: 每分钟、每小时、每天零点、每周一零点、每月1号零点
- Visual builder: 5 dropdown selects for each field with common options
  - Each field offers: *, specific value, range, step (e.g., */5)
  - Selecting a preset populates both input and dropdowns

### Cron Parser

- Implement a lightweight cron parser in JS (no external dependency)
- Support standard 5-field cron syntax: `min hour day month weekday`
- Support *, ranges (1-5), steps (*/5), lists (1,3,5)
- Compute next execution times by iterating forward from current time

---

## 5. 文本去重排序

**Group:** 文本处理
**Route:** `/text-sort`
**Icon:** `BarsArrowDownIcon` (from @heroicons/vue/24/outline — available, verified)

### Functionality

- Input textarea + output textarea
- Operation buttons in a row between input and output:
  - 去重 (deduplicate lines)
  - 升序 (sort ascending)
  - 降序 (sort descending)
  - 反转 (reverse line order)
  - 打乱 (shuffle)
  - 去空行 (remove empty lines)
  - 去首尾空格 (trim whitespace per line)
- Operations apply sequentially — each button applies to current output, allowing chaining
- Reset button to start over from original input
- Copy button on output

### Design Notes

- Operations are applied to the current output, not the original input, so users can chain: deduplicate → sort ascending
- Show line count below each textarea

---

## 6. URL 解析

**Group:** 网络
**Route:** `/url-parse`
**Icon:** `LinkIcon` (already imported in tools.js)

### Functionality

- Single URL input field
- Auto-parse using `URL` API on input
- Display parsed components in a table/card:
  - Protocol, Hostname, Port, Pathname, Hash
  - Query parameters as key-value table (each row: key, value, copy button)
- Copy button for full URL and individual components

### Edge Cases

- Invalid URL: show inline error
- Relative URL (no protocol): prepend `https://` with note
- Empty query string: hide query table

---

## 7. HTTP 状态码查询

**Group:** 网络
**Route:** `/http-status`
**Icon:** `GlobeAltIcon` (already imported in tools.js)

### Functionality

- Search input: type a number (e.g., 404) or keyword (e.g., "not found")
- Display matching status codes with:
  - Code number, name, description (in Chinese)
  - Color-coded by class: 1xx blue, 2xx green, 3xx yellow, 4xx orange, 5xx red
- Full status code table below, grouped by class (1xx–5xx), collapsible sections
- Click any row to highlight and show detail

### Data

- Hardcoded list of ~60 common HTTP status codes with Chinese descriptions
- Stored as a JS constant array in the component

---

## Sidebar & Router Changes

All 7 tools need:

1. Vue file created in `src/views/`
2. Route added in `src/router.js`
3. Entry added to the appropriate group in `src/tools.js` with name, path, desc, icon

### tools.js additions by group

**编码转换** (append after Gzip):
- Unicode 转换, /unicode, 'Unicode 编码与解码', LanguageIcon
- JWT 解码, /jwt-decode, '解析 JWT Token 的 Header 与 Payload', TicketIcon

**生成转换** (append after Markdown):
- NanoID 生成, /nano-id, '轻量级唯一 ID 生成器', SparklesIcon
- Cron 解析, /cron, 'Cron 表达式解析与生成', ClockIcon

**文本处理** (append after 大小写转换):
- 文本去重排序, /text-sort, '按行去重、排序、打乱等文本操作', BarsArrowDownIcon

**网络** (append after IP 查询):
- URL 解析, /url-parse, '拆分 URL 各部分与 Query 参数', LinkIcon
- HTTP 状态码, /http-status, 'HTTP 状态码含义速查', GlobeAltIcon

### Icon imports needed

New imports to add in tools.js:
- `TicketIcon` — JWT decode
- `BarsArrowDownIcon` — Text sort

Existing icons to reuse (already imported):
- `LanguageIcon` — Unicode
- `SparklesIcon` — NanoID
- `ClockIcon` — Cron
- `LinkIcon` — URL parse
- `GlobeAltIcon` — HTTP status
