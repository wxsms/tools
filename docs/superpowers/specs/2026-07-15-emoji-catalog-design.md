# Emoji 大全工具设计

- 日期：2026-07-15
- 路由：`/emoji`
- Sidebar 分组：文本处理
- 图标：`FaceSmileIcon`（`@heroicons/vue/24/outline`）

## 目标

提供一个纯前端的 emoji 查询与复制工具，核心场景是「快速找到 emoji 并复制」。点击 emoji 默认复制字符本身，详情面板提供 shortcode、码点、HTML 实体、URL 编码等多种格式单独复制。数据来自已安装的 `emojibase-data`（英文），搜索走 label / shortcodes / tags。

## 非目标

以下内容明确不做，避免范围蔓延：

- 中文关键词搜索（数据是英文，中文别名表另开工具再议）
- 自定义 emoji 拼装（ZWJ 组合编辑器）
- emoji 历史版本差异展示
- 收藏 / 最近使用（无后端，localStorage 暂不引入）
- 拖拽 / 键盘导航
- 虚拟滚动（首版全量渲染，性能不够再加）
- 运行时 fetch 数据（构建期 inline，与项目其他工具一致）

## 数据来源

- `emojibase-data/en/compact.json` — 1949 条，字段 `{ hexcode, label, unicode, group, order, tags, skins }`，无 shortcodes
- `emojibase-data/en/shortcodes/emojibase.json` — 对象，键为 hexcode，值为 shortcode 数组（如 `"1F44D": ["+1", "thumbsup", "yes"]`）

两个文件在构建期 `import` 进 bundle，预处理后合并为单一扁平数组。

### 数据预处理（`emoji-data.js`）

构建期对原始数据做以下处理，导出最终 `EMOJIS` 数组：

- 过滤 `group === 2`（skin tone component 单字符，如 `🏻`，不是独立 emoji）
- 顶层条目已无变体（compact.json 把变体放在 `skins` 数组里，不在顶层），无需额外过滤
- 每条结构：`{ hexcode, char, label, shortcodes, tags, group, order, skins }`
  - `char` ← `unicode`
  - `shortcodes` ← 从 shortcodes.json 按 `hexcode` 取，缺失为 `[]`
  - `skins` ← 保留原结构，但只挑 `{ hexcode, char, label }` 三个字段（丢 `group / order`），无则 `[]`

导出 `GROUPS` 常量（9 个，跳过 group 2）：

| id | 中文名 |
|---|---|
| 0 | 笑脸与情感 |
| 1 | 人与身体 |
| 3 | 动物与自然 |
| 4 | 食物与饮料 |
| 5 | 旅行与地点 |
| 6 | 活动与事件 |
| 7 | 物品 |
| 8 | 符号 |
| 9 | 旗帜 |

## 文件结构

```
src/tools/emoji/
├── Emoji.vue                    # 主视图组件
├── emoji-data.js                # 数据加载与预处理（构建期 import emojibase-data）
├── emoji.js                     # 纯函数：分组、搜索、复制格式、剪贴板工具
├── emoji.test.js                # 纯函数单元测试
└── Emoji.component.test.js      # 组件测试
```

### 职责划分

**`emoji-data.js`**（数据层，构建期执行）：

- `import compact from 'emojibase-data/en/compact.json'`
- `import shortcodes from 'emojibase-data/en/shortcodes/emojibase.json'`
- 导出 `EMOJIS`：预处理后的扁平数组（约 1800 条）
- 导出 `GROUPS`：`[{ id, name }, ...]`（9 个）

**`emoji.js`**（业务纯函数 + 剪贴板工具）：

- `getEmojiGroups(emojis)` — 按 GROUPS 顺序聚合，返回 `[{ id, name, items: [...] }]`，每个 group 的 `items` 非空
- `searchEmojis(items, query)` — 在 `items` 范围内搜，匹配 `label / shortcodes / tags`，大小写不敏感 `includes`；空 query 返回原数组
- `copyFormats(emoji)` — 返回 `{ char, shortcode, codepoint, htmlEntity, urlEncoded }`
  - `char`：`emoji.char`
  - `shortcode`：`':' + emoji.shortcodes[0] + ':'`，无 shortcode 则 `''`
  - `codepoint`：hexcode 按 `-` 拆分，每段前加 `U+`，空格连接（如 `U+1F44D`、`U+1F1E6 U+1F1E8`）
  - `htmlEntity`：hexcode 按 `-` 拆分，每段转十进制 `&#decimal;`，直接连接（如 `&#128077;`、`&#127462;&#127464;`）
  - `urlEncoded`：`encodeURIComponent(emoji.char)`
- `copyText(text)` — 剪贴板工具，优先 `navigator.clipboard.writeText`，失败降级 `document.execCommand('copy')`，仍失败抛 `Error`；调用方 `try/catch` 后 toast「复制失败，请手动选择」

**`Emoji.vue`**（视图层）：

- 顶部：`<h1>` + 搜索框（带清空 × 按钮）+ 分类 tab 横排
- 中部：emoji 网格
- 底部：选中详情面板

## 数据流

```
emojibase compact.json + shortcodes.json
        ↓ (构建期 import，emoji-data.js 预处理)
EMOJIS + GROUPS
        ↓ (emoji.js 纯函数)
getEmojiGroups / searchEmojis
        ↓ (Emoji.vue 响应式状态)
渲染网格 + 详情面板
```

### 响应式状态

| state | 类型 | 说明 |
|---|---|---|
| `query` | `string` | 搜索框文本 |
| `activeGroup` | `number \| null` | 当前分类 tab，`null` = 「全部」 |
| `selectedHex` | `string \| null` | 选中 emoji 的 hexcode |
| `toast` | `{ msg: string } \| null` | 复制反馈提示 |

### 派生（computed）

- `visibleEmojis` — 先按 `activeGroup` 过滤（`null` 跳过），再按 `query` 过滤
- `selectedEmoji` — 由 `selectedHex` 在 `EMOJIS` 中查找，找不到为 `null`
- `tabs` — `[{ id: null, name: '全部' }, ...GROUPS]`

## 视图布局

```
┌──────────────────────────────────────────────────┐
│  Emoji 大全                                       │
│  [搜索框..............................] [×]      │
│  [全部][笑脸与情感][人与身体][动物与自然]...      │  ← 横向可滚动
├──────────────────────────────────────────────────┤
│  😄 😃 😆 😅 😂 🙂 🙃 😉 😊 😋 😌 😍 😘 😗 😙 😚  │  ← grid 8/10/12 列
│  😘 😗 😙 😚 😋 😛 😝 😜 🤪 🤨 🧐 🤓 😎 🥸 🤩     │
│  ...                                              │
├──────────────────────────────────────────────────┤
│  详情面板（选中后展开）                            │
│  😄  grinning face                                │
│      U+1F600 · 笑脸与情感                         │
│  [字符 😄] [shortcode :grinning:] [码点 U+1F600]  │
│  [HTML &#128512;] [URL %F0%9F%98%80]              │
│  所有 shortcode：grinning, grinning_face          │
│  标签：cheerful, happy, smile, ...                │
│  肤色变体：（无则不渲染此行）                      │
└──────────────────────────────────────────────────┘
```

### 样式约定

- 标题：`text-3xl font-bold mb-6`
- 搜索框：`input input-bordered w-full`
- 分类 tab：`btn btn-sm`，选中 `btn-primary`，未选 `btn-ghost`；外层 `flex overflow-x-auto`（移动端横滚）
- 网格：`grid grid-cols-8 sm:grid-cols-10 lg:grid-cols-12 gap-1`
- emoji 按钮：`aspect-square text-3xl flex items-center justify-center rounded-lg hover:bg-base-200 active:scale-95 transition`，选中态加 `bg-base-300 ring-2 ring-primary`
- 详情面板：`card bg-base-200`，网格下方展开
- 复制按钮：`btn btn-sm btn-outline`，显示「格式名 + 值预览」（如 `字符 😄`、`码点 U+1F600`）
- 变体按钮：`text-2xl`，与网格按钮风格一致但更小

### 无障碍

- 每个 emoji 按钮 `:title="emoji.label"`、`aria-label="复制 emoji ${emoji.label}"`
- 详情面板复制按钮 `aria-label="复制 ${格式名}"`
- toast 用 `role="status"` 或 DaisyUI alert

## 交互行为

1. **点 emoji**：`selectedHex = hex`；`copyText(char)`；toast「已复制 😄」
2. **点详情面板格式按钮**：`copyText(对应格式)`；toast「已复制 :grinning:」等（带值预览）
3. **点变体按钮**：`copyText(变体字符)`；toast「已复制 {变体字符}」；**不**切换 `selectedHex`（变体 hexcode 如 `1F44D-1F3FB` 不在顶层 EMOJIS 中，仅复制不选中）
4. **切分类 tab**：`activeGroup = id`；`query` **保留**（在分类内继续搜）
5. **搜索框输入**：实时过滤；若 `activeGroup` 非 null，只在当前分类内搜
6. **清空搜索**：点 × 按钮，`query = ''`
7. **空状态**：搜索无结果时网格区显示「未找到匹配的 emoji」居中提示

## 错误处理与边界

### 剪贴板降级

- `copyText(text)` 优先 `navigator.clipboard.writeText(text)`
- 失败（非 HTTPS / 权限拒绝 / 旧浏览器）降级 `document.execCommand('copy')`：临时 `<textarea>` → `select()` → `execCommand` → 移除
- 仍失败 `copyText` 抛 `Error`，调用方 `try/catch` 后 toast「复制失败，请手动选择」

### 数据边界

- `shortcodes` 缺失（`copyFormats` 返回 `shortcode: ''`）→ shortcode 格式按钮 `disabled` 并标「无 shortcode」；详情面板「所有 shortcode」行显示「无」
- `skins` 缺失 → 变体行整行不渲染
- `tags` 缺失 → 标签行显示「无」
- `hexcode` 多码点（如 `1F1E6-1F1E8` 旗子）→ `codepoint` 拆分输出 `U+1F1E6 U+1F1E8`，`htmlEntity` 输出 `&#127462;&#127464;`

### 搜索边界

- 空 query → 当前分类全部
- 前后空格 → `trim()` 后匹配
- 大小写 → 统一 `toLowerCase()`
- 无匹配 → 空状态提示

### 性能

- ~1800 条全量渲染：DOM 节点约 1800 个 `<button>`，浏览器舒适区
- 搜索：`Array.filter` + `String.includes`，每次输入重算远小于 16ms
- 不做虚拟滚动，性能不够再加（YAGNI）

### 构建体积

- compact.json 约 300KB + shortcodes.json 约 80KB ≈ 380KB 未压缩，gzip 后约 120KB
- 与项目其他重型工具（token-counter 带 tokenizer）同量级，可接受

## 路由与菜单注册

- `routes.js` 加：`{ path: '/emoji', meta: { title: 'Emoji 大全', description: 'Emoji 查询与复制，支持字符、shortcode、码点、HTML 实体、URL 编码多种格式' } }`
- `router.js` 加：`import Emoji from './tools/emoji/Emoji.vue'`，组件映射 `'/emoji': Emoji`
- `tools.js` 在「文本处理」组追加：`{ name: 'Emoji 大全', path: '/emoji', desc: 'Emoji 查询与多种格式复制', icon: FaceSmileIcon }`

## 测试策略

### 纯函数测试 `emoji.test.js`

1. **数据完整性**
   - `EMOJIS.length` 大于 1500
   - 每条都有 `hexcode / char / label / group`，且 `group` 在 GROUPS 的 id 集合内
   - `EMOJIS` 中无 `group === 2`
   - `GROUPS.length === 9`，每个 group 在 EMOJIS 中至少有一条数据

2. **`getEmojiGroups(emojis)`**
   - 返回数组长度等于 GROUPS 长度
   - 每个 group 的 `items` 非空
   - 顺序与 GROUPS 一致

3. **`searchEmojis(items, query)`**
   - 空 query 返回原数组
   - 大小写不敏感：`'THUMB'` 与 `'thumb'` 结果一致
   - 命中 label：`'grinning'` 命中 `😀`
   - 命中 shortcode：`'+1'` 与 `'thumbsup'` 都命中 `👍`
   - 命中 tags：`'happy'` 命中包含该 tag 的 emoji
   - 无匹配返回空数组
   - 只在传入 `items` 范围内搜

4. **`copyFormats(emoji)`**
   - `👍`（`1F44D`）：`char: '👍'`、`shortcode: ':thumbsup:'`、`codepoint: 'U+1F44D'`、`htmlEntity: '&#128077;'`、`urlEncoded: encodeURIComponent('👍')`
   - 无 shortcode 的 emoji：`shortcode: ''`
   - 多码点 emoji（`1F1E6-1F1E8`）：`codepoint: 'U+1F1E6 U+1F1E8'`，`htmlEntity` 含两个 `&#...;`

### 组件测试 `Emoji.component.test.js`

mock `navigator.clipboard.writeText`，用 `@vue/test-utils` mount。

1. **初始渲染**
   - 渲染标题「Emoji 大全」
   - 渲染搜索框
   - 渲染分类 tab（「全部」+ 9 个分组）
   - 「全部」下网格至少 100 个 emoji 按钮

2. **搜索过滤**
   - 输入 `'grinning'` → 网格 emoji 数量减少
   - 清空 → 恢复全量

3. **分类切换**
   - 点「笑脸与情感」→ 网格只显示该分类
   - 点「全部」→ 恢复

4. **点击复制**
   - 点 emoji → `clipboard.writeText` 被调用且参数为该字符；出现 toast
   - 点详情面板「码点」按钮 → `writeText` 参数为 `U+...` 格式

5. **详情面板**
   - 初始无选中 → 面板不渲染（或显示提示）
   - 点 emoji → 面板渲染，展示 label、shortcodes、5 个复制按钮
   - 无 skins 的 emoji → 变体行不渲染

### 测试不覆盖

- 剪贴板 `execCommand` 降级路径（难模拟，兜底逻辑）
- 极端性能（1800 条 DOM 渲染时间）
- 移动端横向滚动交互

## 验收标准

- 路由 `/emoji` 可访问，标题、搜索、分类 tab、网格渲染正常
- 搜索能命中 label / shortcode / tag
- 分类 tab 切换正确过滤
- 点击 emoji 复制字符，toast 反馈
- 详情面板 5 种格式按钮各自复制正确内容
- 变体行对有 skins 的 emoji 渲染、对无 skins 的不渲染
- `npm run lint` 与 `npm run test` 通过
- 首页「文本处理」分组下出现「Emoji 大全」入口
