# JSON → Go Map 工具设计

## 背景

wxsm's Kit 已有 `src/tools/json-to-go/`，通过 `quicktype-core` 把 JSON 样本转换为 Go **结构体**定义。但有时用户想要的不是 struct，而是一段可直接粘贴的 Go `map[string]interface{}` 字面量（典型场景：在 Go 代码里手写一段配置 / mock 数据 / 测试 fixture）。

参考实现 `rodrigo-brito/json-to-go-map`（https://rodrigo-brito.github.io/json-to-go-map/）正好做这件事：把 JSON 转成 `map[string]interface{}{ ... }` 字面量。该实现是 React + 简单文本框，无选项、无复制按钮、错误信息直接当作"输出"塞回文本框。

本工具在 wxsm's Kit 里重做一遍，沿用本项目既有 `json-to-go` 工具的 UX（CodeMirror 编辑器、深色模式、复制按钮、debounce、结构化错误显示），输出 `map[string]interface{}` 字面量。和参考实现相比，主要差异：

- 用 CodeMirror 替代纯 textarea（与 `json-to-go` 一致）。
- 错误用结构化 `{ ok: false, error }` 返回，在输入框下方红字显示，而不是塞回输出框。
- 增加一个 `any` vs `interface{}` 切换（参考实现没有，但 Go 1.18+ 更推荐 `any`）。

## 目标

用户粘贴一份 JSON，工具实时输出等价的 Go `map[string]interface{}`（或 `map[string]any`）字面量表达式，可一键复制。

## 范围

**In scope**

- 接受一份 JSON 样本作为输入。
- 输出 Go 字面量表达式：
  - 对象 → `map[string]<T>{ "key": <value>, ... }`
  - 数组 → `[]<T>{ <item>, ... }`
  - `null` → `nil`
  - 标量 → `JSON.stringify(value)`（字符串带引号，数字 / 布尔原样）
  - 顶层为标量时（如输入 `"hello"` 或 `42`）→ 直接输出 `JSON.stringify(value)`，不包裹
- 一个 `使用 any 替代 interface{}` checkbox，切换类型 token。默认关闭（`interface{}` 对 Go < 1.18 兼容）。
- 输入 parse 失败时在界面显示错误信息。
- 输出框只读、可复制；提供清空按钮。
- 输入框预填一段示例 JSON。
- Tab 缩进（与 Go `gofmt` 默认一致，与参考实现一致）。
- 每个条目后带尾逗号（Go 允许，`gofmt` 保留）。

**Out of scope**

- `gofmt` 二次格式化（参考实现也没做，输出已经是 tab 缩进，可直接粘贴进 Go 文件再 gofmt）。
- 推断更精确的元素类型（如 `map[string]string`、`[]int`）。始终用 `interface{}` / `any`，因为 JSON 是异构的。
- `omitempty` 之类的 tag 选项（map 字面量没有 tag 概念）。
- 顶层类型别名声明（如 `type Foo = map[string]interface{}`）。
- Go → JSON 反向转换。
- 非 JSON 的输入格式（JSON5、注释等）。

## 架构

### 文件布局

```
src/tools/json-to-go-map/
├── JsonToGoMap.vue          # 视图，镜像 json-to-go 的双 CodeMirror 布局
├── json-to-go-map.js        # 纯模块，递归生成 Go map 字面量
└── json-to-go-map.test.js   # Vitest 单元测试
```

### 三处接线（CLAUDE.md "How to Add a New Tool" 必须步骤）

1. `src/router.js`：增加 `'/json-to-go-map': () => import('./tools/json-to-go-map/JsonToGoMap.vue')`。
2. `src/routes.js`：追加 `{ path: '/json-to-go-map', meta: { title: 'JSON → Go Map', description: '将 JSON 转换为 Go map[string]interface{} 字面量' } }`。
3. `src/tools.js`：在"编码转换"分组追加条目，icon 复用已 import 的 `CodeBracketSquareIcon`（与 `json-to-go` 同 icon，侧栏靠 name + path 区分）。

### 依赖

无新增运行时依赖。纯函数实现，不依赖 `quicktype-core`。CodeMirror 相关包已在 `package.json` 中（`json-to-go` 用过）。

## 组件设计

### `json-to-go-map.js`（纯模块）

公开 API：

```js
export function jsonToGoMap(jsonString, { useAny = false } = {})
  // → { ok: true, code: string } | { ok: false, error: string }
```

行为：

1. 空字符串 / 全空白输入：直接返回 `{ ok: true, code: '' }`。
2. `JSON.parse(jsonString)`；失败则返回 `{ ok: false, error: 'JSON 解析失败：' + e.message }`。
3. 递归遍历解析后的值，类型 token 根据 `useAny` 在 `interface{}` / `any` 之间切换：

   | JS 值 | 输出 |
   |---|---|
   | `null` | `nil` |
   | `Array` | `[]<T>{\n\t<item>,\n\t<item>,\n}`（空数组 → `[]<T>{}`） |
   | plain object | `map[string]<T>{\n\t"key": <value>,\n}`（空对象 → `map[string]<T>{}`） |
   | string / number / boolean | `JSON.stringify(value)` |
   | 顶层标量 | 直接 `JSON.stringify(value)`，不包裹 |

4. 缩进用 `\t`，每层一个。闭括号回到上一层缩进。
5. 每个条目后带尾逗号。
6. 返回 `{ ok: true, code }`。

返回 discriminated union（`ok` 字段），让 Vue 侧无需 try/catch 包裹错误路径，与 `json-to-go` 的错误内联展示风格一致。

### `JsonToGoMap.vue`（视图）

布局镜像 `src/tools/json-to-go/JsonToGo.vue`，仅 toolbar 不同（去掉顶层结构体名输入和 omitempty toggle，换成 `any` toggle）：

```
┌──────────────────────────────────────┐
│ JSON → Go Map 转换                   │
│                                      │
│ [✓ 使用 any 替代 interface{}]         │
│                                      │
│ ┌──────────────────────┐             │
│ │ JSON 输入 (CodeMirror)│            │
│ └──────────────────────┘             │
│ [error line if any]                  │
│           ↓ ArrowDownIcon            │
│ ┌──────────────────────┐             │
│ │ Go 输出（只读 CM）    │            │
│ └──────────────────────┘             │
│                         [清空]       │
└──────────────────────────────────────┘
```

State：

- `input`：默认预填与 `json-to-go` 相同的示例 JSON（含嵌套对象、数组、多种标量类型，使输出能展示典型结构）。
- `output`：默认 `''`，挂载后由初次生成填充。
- `error`：默认 `''`。
- `useAny`：默认 `false`。
- `inputCopied` / `outputCopied`：复制按钮的瞬时反馈状态。

Behavior：

- 输入变更：debounce ~300ms，清空 `error`，调用 `jsonToGoMap(input.value, { useAny: useAny.value })`，按返回结果写入 `output` 或 `error`。`output` 变更后通过 `dispatch` 同步到只读 CodeMirror。
- toggle `useAny`：立刻重跑（不 debounce），因为只是根据现有 input 重新渲染。
- 输入为空：`output = ''`，不显示错误。
- 输出 CodeMirror 设为 `readOnly`（单向转换，避免用户编辑后被下次生成覆盖造成困惑）。
- 复制按钮：右下角 ghost btn-square，`ClipboardDocumentIcon` / `CheckIcon` 切换，与 `json-to-go` 完全一致。
- 清空按钮：重置 `input`、`output`、`error`，并同步到两个 CodeMirror。
- 主题切换：监听 `useTheme()`，destroy + recreate 两个 CodeMirror，再 sync 输出。
- 不设 `meta.wide`，沿用默认 `max-w-4xl`。

### 错误处理

两种失败模式都通过同一 `error` ref 显示一行：

1. JSON 语法错误：`JSON 解析失败：<原因>`。
2. 空输入：不显示错误，`output` 清空。

无重试、无兜底，用户根据错误信息调整 JSON。

## 测试策略

`json-to-go-map.test.js` 使用 Vitest，对**整文本**断言（纯函数输出确定，不依赖第三方库，无版本漂移风险）：

- 空字符串 → `{ ok: true, code: '' }`。
- 全空白 → `{ ok: true, code: '' }`。
- 非法 JSON → `{ ok: false, error: /JSON 解析失败/ }`。
- 顶层字符串 `"hello"` → `{ ok: true, code: '"hello"' }`。
- 顶层数字 `42` → `{ ok: true, code: '42' }`。
- 顶层布尔 `true` → `{ ok: true, code: 'true' }`。
- 顶层 `null` → `{ ok: true, code: 'nil' }`。
- 简单对象 `{"key": "value"}` → 整文本断言含 `map[string]interface{}{`、`"key": "value",`、tab 缩进、闭括号位置正确。
- 嵌套对象 → 整文本断言两层缩进。
- 数组 `["A", "B", 1]` → `[]interface{}{ ... }`，混合类型。
- 空对象 `{}` → `map[string]interface{}{}`。
- 空数组 `[]` → `[]interface{}{}`。
- 复合对象 `{"array":["A","B",1],"foo":{"bar":0.5}}` → 整文本快照。
- `useAny: true` → 所有 `interface{}` 替换为 `any`。
- `useAny: false`（默认）→ 所有类型 token 为 `interface{}`。

不为 `.vue` 写组件测试 —— 组件是纯模块的薄壳，且项目既有 `json-to-go` 也只为纯函数写单测，沿用同一约定。

## 实现 note

- 参考实现的 `JSON.stringify(value)` 对标量是宽松的：JSON.parse 已拒绝 `Infinity` / `NaN`，所以 `JSON.stringify` 不会产出 Go 无法编译的 `NaN` / `Infinity` 字面量。`-0` 经 `JSON.stringify` 得 `"0"`，输出 `0`，Go 可接受。极大整数（> 2^53）会在 `JSON.parse` 阶段丢失精度，是 JS 固有限制，本工具不处理。
- 缩进字符固定为 `\t`（不用 2 空格），与参考实现、与 `gofmt` 默认一致。
- 类型 token 在生成时由 `useAny` 决定，所有出现位置（map value 类型、slice 元素类型）统一替换。
