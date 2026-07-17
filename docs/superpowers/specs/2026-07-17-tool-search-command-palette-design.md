# 工具搜索命令面板设计

## 背景

`wxsm's Kit` 目前已有约 44 个工具，分布在 9 个分组中。侧边栏按分组展示，首页用网格展示。工具数量增加后，用户找工具需要靠记忆分组或滚动浏览，效率下降。本次为整个站点增加一个命令面板（Command Palette）式的搜索入口，让用户通过键盘快速定位并跳转到任意工具。

## 目标

- 桌面端通过 `Cmd/Ctrl+K` 唤起搜索面板
- 移动端通过 navbar 上的放大镜图标唤起
- 输入即搜，方向键导航，回车跳转，Esc 关闭
- 支持工具名 / 描述 / 分组名 / 路径四个字段匹配
- 匹配结果按字段优先级排序，命中片段高亮
- 纯前端、纯本地，无网络请求

## 非目标

- 不引入 fuzzy matching / 多关键词 AND / 别名系统
- 不做按分组分区展示
- 不引入第三方搜索库
- 不做搜索历史 / 最近使用排序
- 不做首页网格过滤框（命令面板已覆盖该需求）

## 架构

### 新增文件

```
src/
├── components/                          # 新建目录
│   ├── CommandPalette.vue               # 命令面板组件
│   └── CommandPalette.component.test.js # 组件测试（可选）
├── tools/
│   └── search.js                        # 搜索纯函数模块
│       └── search.test.js               # 纯函数测试
└── App.vue                              # 修改：挂载组件 + 加 navbar 图标
```

### 数据流

```
src/tools.js
  └─ toolGroups（已有，单源）
       │
       ├─ src/router.js          （已有，路由）
       ├─ src/App.vue 侧边栏     （已有，菜单）
       ├─ src/tools/home/Home.vue（已有，首页网格）
       │
       └─ src/tools/search.js
            └─ buildSearchIndex(toolGroups) → 扁平索引（模块加载时构建一次）
                  └─ searchTools(query, index) → 排序后的命中结果
                        └─ CommandPalette.vue 渲染
```

`toolGroups` 是单一数据源，搜索索引从同一份数据派生，不引入第二份工具列表，避免数据漂移。

### 组件结构

`CommandPalette.vue` 自包含状态：`open` / `query` / `activeIndex`。组件挂载到 `App.vue` 根模板末尾。模板使用 `<dialog v-if="open">`，关闭时整个 dialog 不在 DOM 中（不是常驻 DOM，避免输入框失焦影响页面其他元素）。

`App.vue` 负责两件事：

1. navbar 右侧加一个 `MagnifyingGlassIcon` 按钮，点击 `$refs.palette.open()` 或通过事件总线/props 触发
2. 监听全局 `keydown`，匹配 `Cmd/Ctrl+K` 时打开面板

具体实现上，让 `CommandPalette` 自己监听全局快捷键（`window.addEventListener('keydown', ...)`），并在 navbar 图标点击时通过 `ref` 调用一个 `open()` 方法。这样 `App.vue` 不需要管理面板状态。

## 详细设计

### 1. 纯函数模块 `src/tools/search.js`

#### `buildSearchIndex(toolGroups)`

输入 `toolGroups`（来自 `src/tools.js`），输出扁平化数组：

```js
[
  { name, desc, path, groupName, icon },
  ...
]
```

- 保留原 `toolGroups` 顺序（分组顺序、组内工具顺序）
- `icon` 字段保留组件引用，渲染时直接用 `<component :is="..." />`
- 这个函数在模块加载时执行一次，结果缓存在模块顶层 `const`，不随组件挂载重建

#### `searchTools(query, index)`

输入 query 字符串和索引数组，返回排好序的命中结果数组：

```js
[
  { name, desc, path, groupName, icon, matchedField: 'name' | 'path' | 'groupName' | 'desc' },
  ...
]
```

匹配规则：

- query 和目标都 `toLowerCase()` 后做 `includes` 子串匹配
- 中文直接 `includes`，不做分词
- 同时匹配多个字段时，按优先级取最高的 `matchedField` 参与排序

字段优先级（数字越小排越前）：

| 优先级 | 字段       | 说明                              |
|--------|------------|-----------------------------------|
| 0      | `name`     | 工具名（如 "Base64 转换"）        |
| 1      | `path`     | 路径（如 `/jwt-decode` 匹配 "jwt"）|
| 2      | `groupName`| 分组名（如 "加密" 匹配 "加解密"）  |
| 3      | `desc`     | 描述                              |

排序规则：

1. 先按 `matchedField` 优先级升序
2. 同优先级内保持原索引顺序（稳定排序，不二次打乱）

边界情况：

- `query` 为空字符串或纯空格 → 返回空数组 `[]`（组件层显示"输入关键词以搜索工具…"提示，不展示结果列表）
- 无匹配 → 返回空数组 `[]`（组件层显示"未找到匹配工具"）

#### `highlightMatch(text, query)`

输入原文本和 query，返回段落数组，用于 Vue 渲染高亮：

```js
// highlightMatch('Base64 转换', 'base')
// → [{ text: 'Base', matched: true }, { text: '64 转换', matched: false }]
```

- query 为空 → 返回 `[{ text, matched: false }]`
- 大小写不敏感匹配，但保留原大小写
- 同一段文本中可能有多个匹配片段，都要标 `matched: true`
- 无匹配 → 返回 `[{ text, matched: false }]`

#### `truncateResults(results, limit = 20)`

简单切片函数，截取前 `limit` 条。独立出来是为了让 `searchTools` 保持纯函数特性（不耦合 UI 限制），同时让组件可以传入不同的 limit。

### 2. 组件 `src/components/CommandPalette.vue`

#### Props

| Prop     | 类型      | 默认值 | 说明                                  |
|----------|-----------|--------|---------------------------------------|
| `limit`  | `Number`  | `20`   | 最大显示结果数                        |

组件不接收 `open` prop——打开状态由组件内部管理，外部通过 `ref` 调用 `open()` 方法触发。

#### 暴露的方法（`defineExpose`）

```js
defineExpose({ open, close })
```

- `open()`：设置 `open=true`，下一个 tick 自动 focus 输入框
- `close()`：设置 `open=false`，清空 `query`，重置 `activeIndex` 为 0

#### 内部状态

- `open: Ref<boolean>` — 面板是否打开
- `query: Ref<string>` — 输入框内容
- `activeIndex: Ref<number>` — 当前高亮的结果索引

#### 计算属性

- `results = computed(() => truncateResults(searchTools(query.value, index), props.limit))`
- `activeIndex` 需要 `watch` results 变化：当 `activeIndex >= results.length` 时重置为 `0`（query 变化导致结果变短时，避免指向不存在的项）。处理方式：`watch(results, () => { if (activeIndex.value >= results.value.length) activeIndex.value = 0 })`

#### 键盘事件

监听 `window` 的 `keydown`：

| 按键                  | 行为                                           |
|-----------------------|------------------------------------------------|
| `Cmd/Ctrl+K`          | `preventDefault()` + 切换 `open`（关闭时打开、打开时关闭）|
| `Esc`（面板打开时）   | 关闭面板                                       |
| `ArrowDown`（面板打开时） | `activeIndex = (activeIndex + 1) % results.length`，`preventDefault()` |
| `ArrowUp`（面板打开时）   | `activeIndex = (activeIndex - 1 + results.length) % results.length`，`preventDefault()` |
| `Enter`（面板打开且有结果时） | `router.push(results[activeIndex].path)` 然后 `close()` |

边界：

- 结果为空时，`ArrowDown/Up/Enter` 不做任何事（提前 `if (!results.length) return`）
- `activeIndex` 始终保持在 `[0, results.length - 1]` 区间内，由 watch results 保证

注意：监听器在 `onMounted` 注册，`onUnmounted` 移除，避免 SSR 或多实例泄漏。但本项目无 SSR，单实例，处理简单。

#### 路由跳转

组件内 `useRouter()` 获取 `router`，跳转后调用 `close()`。

#### 模板结构

```html
<template>
  <dialog
    v-if="open"
    class="modal modal-open"
    @click.self="close"
  >
    <div class="modal-box max-w-lg p-0 overflow-hidden">
      <!-- 输入区 -->
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

      <!-- 结果列表 -->
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
              <div class="flex items-center gap-2">
                <span
                  v-for="(seg, j) in highlightMatch(tool.name, query)"
                  :key="j"
                  :class="seg.matched ? 'bg-warning/30' : ''"
                >{{ seg.text }}</span>
              </div>
              <p class="text-xs text-base-content/60 truncate">
                <span
                  v-for="(seg, j) in highlightMatch(tool.desc, query)"
                  :key="j"
                  :class="seg.matched ? 'bg-warning/30' : ''"
                >{{ seg.text }}</span>
              </p>
            </div>
            <span class="badge badge-sm badge-ghost">{{ tool.groupName }}</span>
          </div>
        </li>
      </ul>

      <!-- 空状态：有 query 但无匹配 -->
      <div
        v-else-if="query.trim()"
        class="p-8 text-center text-base-content/50"
      >
        未找到匹配工具
      </div>

      <!-- 空状态：无 query -->
      <div
        v-else
        class="p-8 text-center text-base-content/50"
      >
        输入关键词以搜索工具…
      </div>
    </div>
  </dialog>
</template>
```

实际实现时高亮渲染可以抽成一个小函数或子组件，但本项目目前没有子组件习惯，先内联在 `v-for` 里。

#### 样式说明

- 复用 daisyUI 的 `modal` / `modal-box` / `kbd` / `badge` 类
- 高亮用 `bg-warning/30`（半透明黄色背景），在深色和浅色主题下都可见
- 列表最大高度 `max-h-80`（20rem），超出滚动
- 输入框 `input-bordered`，与项目其他工具页面风格一致

### 3. `App.vue` 改动

#### navbar 加搜索图标

在 navbar 右侧 `flex-none` 区块，GitHub 图标前加一个按钮：

```html
<button
  class="btn btn-ghost btn-sm btn-square"
  aria-label="搜索工具"
  @click="paletteRef?.open()"
>
  <MagnifyingGlassIcon class="w-5 h-5" />
</button>
```

需要从 `@heroicons/vue/24/outline` import `MagnifyingGlassIcon`（项目里已经在 `tools.js` 中 import 过这个图标，但 `App.vue` 没 import，本次加上）。

#### 挂载命令面板

在根 `<template>` 末尾、最外层 `<div>` 内最后加：

```html
<CommandPalette ref="paletteRef" />
```

#### script 改动

```js
import CommandPalette from './components/CommandPalette.vue'

const paletteRef = ref(null)
```

不需要其他改动——全局快捷键由 `CommandPalette` 自己监听。

## 测试策略

### 必做：`src/tools/search.test.js`

测试纯函数：

- `buildSearchIndex`
  - 输出长度等于所有工具总数
  - 每项包含 `name` / `desc` / `path` / `groupName` / `icon`
  - 顺序与 `toolGroups` 一致（第一项是 "Base64 转换"，最后是 "键盘测试"）

- `searchTools`
  - 空字符串 → 返回 `[]`（不再返回全部；空 query 时组件层显示"输入关键词以搜索工具…"）
  - 纯空格 → 返回 `[]`
  - `'base64'` → 命中 name "Base64 转换"，`matchedField` 为 `'name'`
  - `'jwt'` → 命中 path `/jwt-decode`，`matchedField` 为 `'path'`
  - `'加密'` → 命中 groupName "加解密"，返回该分组所有工具，`matchedField` 为 `'groupName'`
  - `'格式化'` → 命中 desc，`matchedField` 为 `'desc'`
  - `'xyznotfound'` → 返回 `[]`
  - 优先级排序：构造一个 name 和 desc 都匹配的 case，验证 name 匹配排在前面
  - 大小写不敏感：`'BASE64'` 和 `'base64'` 结果一致

- `highlightMatch`
  - `'Base64 转换', 'base'` → `[{ text: 'Base', matched: true }, { text: '64 转换', matched: false }]`
  - `'Base64', ''` → `[{ text: 'Base64', matched: false }]`
  - `'aba', 'a'` → `[{ text: 'a', matched: true }, { text: 'b', matched: false }, { text: 'a', matched: true }]`（验证多处匹配）
  - `'abc', 'xyz'` → `[{ text: 'abc', matched: false }]`
  - 大小写不敏感但保留原大小写：`'Base64', 'BASE'` → `[{ text: 'Base', matched: true }, { text: '64', matched: false }]`

- `truncateResults`
  - 输入 30 条 + limit 20 → 返回 20 条
  - 输入 10 条 + limit 20 → 返回 10 条

### 可选：`src/components/CommandPalette.component.test.js`

如果时间允许，测试：

- 默认渲染时 `dialog` 不存在
- 调用 `open()` 后 `dialog` 存在，输入框聚焦
- 输入 query 后列表更新
- Esc 后关闭
- mock `router.push`，验证 Enter 跳转到当前 `activeIndex` 对应 path

组件测试涉及 Vue Router mock 和 teleport，复杂度较高。如果纯函数测试通过且组件手测无问题，可以省略组件测试。

## 实现顺序建议

1. 写 `search.js` + `search.test.js`，跑通纯函数测试
2. 写 `CommandPalette.vue`，手动测试键盘交互
3. 改 `App.vue` 挂载组件和 navbar 按钮
4. 全局手测：Cmd/Ctrl+K、图标点击、Esc、方向键、Enter、移动端
5. `npm run lint` + `npm run test`，通过后提交

## 风险与注意事项

- **全局快捷键冲突**：`Cmd/Ctrl+K` 在部分浏览器/系统中有其他用途（如焦点搜索栏），但 `preventDefault()` 后通常可控。如果在某些浏览器被劫持，可考虑加 `/` 作为备用快捷键，但本次先用 `Cmd/Ctrl+K`，不增加复杂度。
- **移动端聚焦**：iOS Safari 上 `autofocus` 和 `input.focus()` 可能有延迟。需要测试，如有问题可在 `open()` 中用 `nextTick` + 短延迟 focus。
- **daisyUI modal 类**：daisyUI 5.x 的 `modal-open` 类需要确认行为。如果用 `modal` + `modal-open` 组合不行，可降级为自绘 `fixed inset-0 bg-black/50` 遮罩 + 居中容器。
- **测试中的 `toolGroups` 依赖**：`search.test.js` 直接 import `src/tools.js` 的 `toolGroups`，如果以后工具列表变化，测试快照需要更新。这是合理耦合——测试本就应反映真实数据。
- **新增 `src/components/` 目录**：项目此前没有这个目录。本次创建会引入新的目录约定，但 CLAUDE.md 已提到 "Each tool lives in its own `src/tools/<kebab-name>/` folder"，对共享组件没有规定。新增 `components/` 是合理的，符合 Vue 项目惯例。

## 不做的事情

- 不引入 fuzzy matching 库
- 不做搜索历史
- 不做按分组分区展示
- 不修改现有 `toolGroups` 数据结构（仅读取）
- 不修改首页 `Home.vue`（命令面板已覆盖搜索需求）
- 不为搜索加 i18n（项目目前是纯中文）
- 不做暗色主题单独适配（daisyUI `bg-warning/30` 在两个主题下都可见）
- 空 query 时不显示全部工具列表（避免无意义地展示 44 条；提示用户输入关键词）
