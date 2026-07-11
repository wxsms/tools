# CSV 预览工具设计

- 日期：2026-07-11
- 路由：`/csv`
- Sidebar 分组：文本处理

## 目标

提供一个轻量的 CSV 预览工具，支持文件上传或文本粘贴输入，渲染为可虚拟滚动的表格，并提供基础分析能力：类型推断、列统计、单列排序、每列模糊筛选、导出为 JSON / Markdown。

## 非目标

以下内容明确不做，避免范围蔓延：

- 拖拽上传
- 转置
- 自定义解析参数（分隔符、引号字符、换行符等）
- 流式解析 / Web Worker
- 错误行高亮 / 单元格编辑
- 额外导出格式（Excel / TSV / HTML）
- 实时输入分栏预览（大文件不现实，用"解析"按钮触发）

## 功能清单

1. **输入方式**：文件选择上传 + 文本粘贴
2. **表格渲染**：虚拟滚动，支持几万行不卡
3. **基础统计**：行列数显示
4. **列类型推断**：`integer` / `float` / `boolean` / `date` / `string`，在表头下方小字标注
5. **列统计信息**：数值列 min/max/avg；字符串列唯一值数；日期列 min/max
6. **单列排序**：点击列头三态循环（无 → 升序 → 降序 → 无）
7. **每列模糊筛选**：包含即命中，大小写不敏感，多列 AND 组合
8. **导出**：JSON 数组、Markdown 表格，导出**当前筛选+排序后的结果**

## 解析策略

- 使用 `papaparse` 作为解析库（新增依赖，~18KB gzip）
- 固定 RFC 4180 配置：分隔符 `,`、引号 `"`、首行作为表头、自动识别换行符、自动剥离 BOM
- 不暴露任何解析参数给用户

## 文件结构

```
src/tools/csv/
├── CsvPreview.vue              # 主视图组件
├── csv.js                      # 纯函数：类型推断、列统计、排序、筛选、JSON/Markdown 导出
├── csv.test.js                 # 纯函数单元测试
└── CsvPreview.component.test.js # 组件测试
```

### 职责划分

**`csv.js`**（纯函数，不含解析）：

- `inferColumnType(values)` — 扫描前 100 行非空值推断类型
- `columnStats(values, type)` — 按类型计算 min/max/avg/uniqueCount
- `sortRows(rows, columnIndex, direction)` — 排序，按列类型智能比较（数值按数值，日期按时间戳，字符串按 localeCompare）
- `filterRows(rows, filters)` — 模糊匹配筛选，多列 AND
- `toJson(rows, headers)` — 转换为对象数组
- `toMarkdown(rows, headers)` — 生成 Markdown 表格

**`CsvPreview.vue`**：

- 输入区：textarea + 文件上传按钮 + "解析"按钮 + "清空"按钮
- 视图状态切换：`idle` / `loaded` / `error`
- 调用 PapaParse 解析（`Papa.parse(text, { header: true, skipEmptyLines: true })`）
- 调用 `csv.js` 纯函数做推断/统计/转换
- 虚拟滚动表格渲染（组件内自实现，固定行高 36px）
- 工具栏：筛选状态、导出 dropdown、行数显示

### 虚拟滚动实现

组件内局部实现，不单独抽 composable（只此一处使用）：

- 固定行高 `36px`
- 容器 `overflow-y: auto`，监听 `scroll` 事件
- 计算可视窗口 `[start, end]`，预渲染上下各 5 行缓冲
- 仅渲染窗口内行，用绝对定位 + `transform: translateY` 定位
- 表头独立 sticky，不参与虚拟滚动

## 交互流程与状态

### `idle` 状态

- 大 textarea（rows=12，monospace），placeholder "粘贴 CSV 内容..."
- 文件上传按钮（`<label>` 包裹 hidden `<input type="file" accept=".csv,.txt">`，选文件后 `FileReader.readAsText` 读为文本填入 textarea）
- "解析"按钮（primary，textarea 为空时 disabled）
- "清空"按钮

### `loaded` 状态

**摘要条**（顶部一行，替换原输入区）：

```
已加载 xxx.csv · 1234 行 × 8 列 · int 2 / float 1 / string 4 / date 1  [更换]
```

点击"更换"回到 `idle`，保留当前 textarea 内容。

**工具栏**：

```
[筛选条件 X 个 · 清除]   [导出 ▼]              显示 1234 行 / 共 1234 行
```

- 筛选条件数：当任一列输入框非空时计数
- 导出 dropdown：JSON / Markdown 两个选项，点击后生成内容并复制到剪贴板 + 提示"已复制"
- 行数显示：左侧为当前筛选后行数，右侧为原始总行数

**表格结构**（DaisyUI `table table-sm`）：

```
┌─ sticky thead ─────────────────────────────────────┐
│ [姓名]↑  [age]     [score]    [date]    ...        │  ← 列头，可点击排序
│ string   int 12-88  float ...  date ...            │  ← 类型小字 + 统计信息
│ [输入框] [输入框]   [输入框]   [输入框]   ...        │  ← 筛选输入
├─ virtual scroll body ──────────────────────────────┤
│  row 0                                              │
│  row 1                                              │
│  ...                                                │
└────────────────────────────────────────────────────┘
```

- 排序：列头三态循环（未排序 → 升序 `↑` → 降序 `↓` → 未排序），同一时刻只一列排序
- 筛选：每列下方小 `<input>`（placeholder "筛选..."），实时模糊匹配，多列 AND
- 筛选 + 排序：先筛选，再对结果排序
- 单元格内容超长时 `truncate` + `title` 属性 hover 看全文，不影响行高

### `error` 状态

- 输入区保留（不折叠）
- 下方红色提示 "CSV 解析失败：{错误信息}"

## 错误处理与边界

### 解析失败

PapaParse 报错时进入 `error` 状态，输入区保留，下方红色提示。部分行字段数不一致由 PapaParse 放宽处理，不在 UI 高亮错误行。

### 边界情况

| 场景 | 处理 |
|------|------|
| 空文件 / 只有表头 | 显示"无数据行" |
| 单列 CSV | 正常展示 |
| 列名重复 | PapaParse 保留原样，JSON 导出时 JS 对象天然覆盖 |
| BOM | PapaParse 自动剥离 |
| 引号内换行 | PapaParse 正确处理，按"逻辑行"渲染 |
| 超长单元格 | `truncate` + `title` hover 全文，不影响行高 |
| 类型推断取样 | 前 100 行非空值全符合某类型才认定；全空定为 `string` |

### 性能边界

- 文件读取：`FileReader.readAsText`，几 MB 文件够快
- 解析：几万行 ~几十 ms，主线程可接受，不需要 Web Worker
- 虚拟滚动：仅渲染窗口 + 上下各 5 行缓冲，避免滚动露白
- 统计计算：千行级 < 10ms，万行级 < 100ms，同步计算可接受

## 类型推断规则

对每列扫描前 100 行的非空值：

- 全部匹配 `/^-?\d+$/` → `integer`
- 全部匹配 `/^-?\d+(\.\d+)?$/` → `float`
- 全部为 `true` / `false`（大小写不敏感）→ `boolean`
- 全部可被 `Date.parse` 解析且结果为有效日期 → `date`
- 以上都不满足 → `string`

推断后用于：表头小字标注、统计计算、排序比较策略。

## 列统计规则

| 类型 | 统计内容 |
|------|---------|
| integer / float | min, max, avg（保留 2 位小数） |
| date | min, max（统一格式化为 `YYYY-MM-DD`；无法格式化的回退为原始字符串） |
| boolean | true/false 计数 |
| string | 唯一值数量（超过 100 显示 `100+`） |

## 测试策略

### `csv.test.js`（纯函数）

- `inferColumnType`：各类型识别、混合类型回退到 string、全空列
- `columnStats`：各类型统计计算、空数据
- `sortRows`：升序/降序/还原、数值/字符串/日期混合
- `filterRows`：单列/多列 AND、大小写不敏感、空筛选
- `toJson`：表头作为 key、单列、特殊字符
- `toMarkdown`：列对齐、特殊字符转义（`|` → `\|`、换行 → 空格）

### `CsvPreview.component.test.js`

- idle 状态初始渲染
- 输入文本后点"解析"切换到 loaded
- 文件上传填入 textarea
- 排序点击循环三态
- 筛选输入实时生效
- 导出 JSON / Markdown 复制到剪贴板
- 空文件 / 解析失败错误状态
- 虚拟滚动：仅渲染窗口内行（验证 DOM 行数）

## 注册三步

1. `src/router.js`：导入 CsvPreview，添加 `'/csv': CsvPreview`
2. `src/routes.js`：添加 `{ path: '/csv', meta: { title: 'CSV 预览', description: 'CSV 表格预览，支持类型推断、列统计、排序筛选、导出 JSON / Markdown' } }`
3. `src/tools.js`：在"文本处理"分组末尾添加 `{ name: 'CSV 预览', path: '/csv', desc: 'CSV 表格预览，支持类型推断、列统计、排序筛选、导出', icon: TableCellsIcon }`，并从 `@heroicons/vue/24/outline` 导入 `TableCellsIcon`

## 依赖变更

- `package.json` `dependencies` 新增 `papaparse`
- 不引入 `@types/papaparse`：项目为纯 JS，不需要 TS 类型；import 处不写类型标注即可。
