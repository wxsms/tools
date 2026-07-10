# URL 解析 — 彩色高亮设计

## 背景

UrlParse 工具当前只有纯文本输入框和纯文本表格，无法直观区分 URL 各部位。需要在解析结果中用颜色区分 protocol、hostname、port、pathname、query、hash，提升可读性。

## 方案

输入框保持普通 `<input>` 不变，在输入框下方新增一个只读的彩色 URL 预览条。解析结果表格中，每个值的前景色与预览条对应部位的颜色一致。

## 彩色预览条

- 位于输入框下方、解析表格上方
- 使用 `<div>` 渲染带颜色的 `<span>` 片段，展示解析后的彩色 URL
- `font-mono text-sm`，与输入框字体一致
- 无效 URL 时隐藏预览条

### 颜色映射

| 部位 | 示例 | Tailwind 类 |
|------|------|-------------|
| Protocol | `https://` | `text-blue-400` |
| Hostname | `example.com` | `text-green-400` |
| Port | `:8080` | `text-cyan-400` |
| Pathname | `/path/to/page` | `text-amber-400` |
| Query | `?name=张三&id=42` | `text-rose-400` |
| Hash | `#section` | `text-violet-400` |

### 解析逻辑

用 `new URL()` 解析后，根据各部分内容在原始字符串中的位置定位，生成带颜色的 span 片段序列。无法匹配的字符用默认色。具体方法：

1. 用 `new URL(input)` 得到各属性值
2. 按原始字符串顺序拼接：`protocol + "//" + hostname + (port ? ":" + port : "") + pathname + search + hash`
3. 在原始字符串中查找每段的起止位置，生成 `{ start, end, color }` 片段列表
4. 渲染为 `<span>` 序列

## 表格颜色

解析结果表格中，每个值 `<span>` 加上对应部位的颜色 class。Label 保持默认色不变。

| 字段 | 值颜色 |
|------|--------|
| Protocol | blue-400 |
| Hostname | green-400 |
| Port | cyan-400 |
| Pathname | amber-400 |
| Hash | violet-400 |

Query 参数表格中，key 用 rose-400，value 保持默认色（因为 value 本身不是 URL 结构部位）。

## 不做的事

- 不修改输入框本身的行为或样式
- 不在输入框内做颜色高亮（overlay/contenteditable 方案都有对齐或兼容性问题）
- 不改变现有的复制功能
- 不加图例/legend（颜色足够直觉）
