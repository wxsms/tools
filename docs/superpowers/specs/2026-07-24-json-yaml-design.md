# JSON / YAML 互转工具设计

## 背景

wxsm's toolbox 的"JSON 工具"分组已有 8 个工具(JSON 校验、JSON → Go/TS/Python/Rust/Java/C++/C#),但都是 JSON 作为输入的**单向**转换。配置文件场景下用户经常在 JSON 和 YAML 之间互转 —— 改 `docker-compose.yml` 时想看结构、改 `package.json` 时想看 YAML 形态、从 K8s manifest 反查等价 JSON 等。目前工具箱没有任何 YAML 相关工具,这是覆盖空白。

参考本项目已有的 `src/tools/md-html/`(Markdown ↔ HTML 双向实时同步)交互模式:左右两个 CodeMirror 编辑器,任一侧编辑实时转换另一侧,错误信息在面板下方红字显示。本工具完全沿用这套 UX,与 `md-html` 保持风格一致。

## 目标

用户粘贴一段 JSON 或 YAML,工具实时输出另一种格式的等价文本,两侧都可编辑,可一键复制。语法错误时显示错误信息并保留上次成功结果。

## 范围

**In scope**

- 接受 JSON 或 YAML 字符串作为任一侧输入,实时输出另一侧。
- 双向同步:任一侧编辑 → 自动转换 → 更新另一侧。
- 空输入(空串或全空白)→ 清空对面编辑器,不报错。
- 语法错误时:
  - 在出错输入侧的对面面板下方显示错误信息(例如 JSON 输入非法 → YAML 面板下方显示 "JSON → YAML 转换失败: ...")。
  - **不覆盖**对面编辑器上一次成功转换的内容。
- 复制按钮(两侧各一)。
- 清空按钮(清两侧 + error)。
- 预填一段示例 JSON,挂载时自动转出 YAML。
- 深色模式跟随全局主题。
- 顶层原始值兼容(输入 `"hello"` 或 `42` 也能转)。

**Out of scope**

- TOML / XML 支持(后续可能扩展,本期不做)。
- 缩进步长选项(2 空格写死,与项目其他工具一致)。
- YAML 版本切换(用 `js-yaml` 默认 1.2)。
- YAML 注释保留(JSON ↔ YAML 路径上必然丢失,YAML → JSON → YAML 也会丢,这是 YAML 库的限制)。
- 大整数精度保护(YAML 解析时大整数会被转成 JS number,超出 `Number.MAX_SAFE_INTEGER` 丢精度 —— 记录此行为,不引入 BigInt)。
- 文件拖放 / 导入导出(其他工具都没有,保持一致)。
- 组件测试(MdHtml 也没有,保持一致;只测纯函数)。

## 架构

### 文件布局

```
src/tools/json-yaml/
├── JsonYaml.vue            # 视图,左右两个 CodeMirror 编辑器,镜像 md-html 布局
├── json-yaml.js            # 纯函数:jsonToYaml(str) / yamlToJson(str)
└── json-yaml.test.js       # Vitest 单测
```

### 三处接线(项目 CLAUDE.md "How to Add a New Tool" 必须步骤)

1. `src/router.js`:`components` map 增加 `'/json-yaml': () => import('./tools/json-yaml/JsonYaml.vue')`。
2. `src/routes.js`:追加 `{ path: '/json-yaml', meta: { title: 'JSON / YAML 转换', description: 'JSON ↔ YAML 双向实时转换', wide: true } }`。
3. `src/tools.js`:在"JSON 工具"分组末尾追加 `{ name: 'JSON ↔ YAML', path: '/json-yaml', desc: 'JSON 与 YAML 双向实时转换', icon: 'lucide:file-json' }`。

### 依赖新增

- `js-yaml` — YAML 解析/序列化业界标准,体积小(~80KB min)。
- `@codemirror/lang-yaml` — CodeMirror YAML 语法高亮,与现有 `@codemirror/lang-json` / `@codemirror/lang-markdown` 同系列。

## 组件设计

### `json-yaml.js`(纯函数模块)

公开 API:

```js
import { dump, load } from 'js-yaml'

/**
 * JSON 字符串 → YAML 字符串
 * @param {string} jsonStr
 * @returns {string}
 * @throws SyntaxError(JSON 解析失败) / YAMLException(序列化失败,极少见)
 */
export function jsonToYaml(jsonStr) {
  if (!jsonStr.trim()) return ''
  const obj = JSON.parse(jsonStr)
  return dump(obj, {
    indent: 2,
    lineWidth: 120,
    noRefs: true,
    quotingType: '"',
    forceQuotes: false,
  })
}

/**
 * YAML 字符串 → JSON 字符串(美化,2 空格缩进)
 * @param {string} yamlStr
 * @returns {string}
 * @throws YAMLException(语法错误)
 */
export function yamlToJson(yamlStr) {
  if (!yamlStr.trim()) return ''
  const obj = load(yamlStr)
  if (obj === undefined) return ''
  return JSON.stringify(obj, null, 2)
}
```

行为约定:

- 空输入返回空字符串,不抛错。
- 错误向上抛,由组件 catch 后写 `error` 状态。
- 顶层原始值兼容:`load('hello')` 返回字符串 `'hello'`,`JSON.stringify('hello')` 输出 `"hello"`。
- `load('')` 返回 `undefined`,函数内特判返回空字符串。
- `dump` 选项:`noRefs` 防止循环引用输出锚点,`lineWidth: 120` 避免长字符串被折行,`quotingType: '"'` 与 JSON 一致。

### `JsonYaml.vue`(视图组件)

**模板结构**(镜像 `MdHtml.vue`):

```
<h1>JSON / YAML 转换</h1>
<div class="flex gap-4">
  <div class="flex-1">
    <label>JSON <复制按钮></label>
    <div ref="jsonEditorEl" class="cm-container"></div>
    <p v-if="error.json" class="text-error text-sm mt-1">{{ error.json }}</p>
  </div>
  <div class="flex-1">
    <label>YAML <复制按钮></label>
    <div ref="yamlEditorEl" class="cm-container"></div>
    <p v-if="error.yaml" class="text-error text-sm mt-1">{{ error.yaml }}</p>
  </div>
</div>
<div class="flex justify-end mt-4">
  <button @click="clear">清空</button>
</div>
```

**状态**:

```js
const jsonStr = ref(defaultJson)
const yamlStr = ref('')
const error = ref({ json: '', yaml: '' })  // 分两侧
const jsonCopied = ref(false)
const yamlCopied = ref(false)

let jsonEditor = null
let yamlEditor = null
let jsonUpdatingFromYaml = false  // 防止 onChange 回环
let yamlUpdatingFromJson = false
```

**同步逻辑**:

```js
function jsonOnChange(update) {
  if (jsonUpdatingFromYaml) return
  if (!update.docChanged) return
  jsonStr.value = update.state.doc.toString()
  jsonToYamlAndSync()
}

function jsonToYamlAndSync() {
  error.value.json = ''
  if (!jsonStr.value.trim()) {
    setYamlEditor('')
    return
  }
  try {
    const yaml = jsonToYaml(jsonStr.value)
    setYamlEditor(yaml)
  } catch (e) {
    error.value.yaml = 'JSON → YAML 转换失败:' + e.message
    // 不调用 setYamlEditor,保留 yamlEditor 上次成功内容
  }
}

function setYamlEditor(text) {
  yamlStr.value = text
  if (yamlEditor) {
    yamlUpdatingFromJson = true
    yamlEditor.dispatch({
      changes: { from: 0, to: yamlEditor.state.doc.length, insert: text },
    })
    yamlUpdatingFromJson = false
  }
}
```

`yamlOnChange` / `yamlToJsonAndSync` / `setJsonEditor` 对称实现。

**CodeMirror 扩展**:

直接复用 `MdHtml.vue` 的 `createExtensions` 函数模式,只换语言包:
- JSON 侧:`json()` from `@codemirror/lang-json`
- YAML 侧:`yaml()` from `@codemirror/lang-yaml`

**主题切换**:

```js
watch(theme, () => {
  destroyEditors()
  createEditors()
})
```

重建时用当前 `jsonStr.value` / `yamlStr.value` 作初始 doc。

**挂载**:

```js
onMounted(() => {
  jsonToYamlAndSync()  // 先把默认 JSON 转成 YAML,让两侧都有初始内容
  createEditors()
})
```

**清空**:

清两侧编辑器 + `error`。

**默认示例 JSON**:

```json
{
  "name": "工具箱示例",
  "version": "1.0.0",
  "tags": ["json", "yaml"],
  "author": {
    "name": "wxsm",
    "url": "https://example.com"
  },
  "active": true
}
```

## 错误处理

| 场景 | 行为 |
|---|---|
| JSON 输入非法 | `error.yaml` 设为 "JSON → YAML 转换失败: ...",YAML 编辑器保留上次成功内容 |
| YAML 输入非法 | `error.json` 设为 "YAML → JSON 转换失败: ...",JSON 编辑器保留上次成功内容 |
| 任一侧空输入 | 清对面编辑器,不报错 |
| 两侧都空 | 全部清空 |

错误信息位置:出错输入侧的对面面板下方(因为输出在那)。具体实现:`error.value = { json: '', yaml: '' }`,JSON 面板下方显示 `error.json`,YAML 面板下方显示 `error.yaml`。

## 测试策略

参考项目约定:只写纯函数单测(与 `md-html.test.js` / `json-to-go-map.test.js` 一致),不写组件测试。

### `json-yaml.test.js` 测试用例

**`jsonToYaml`**:
- 空字符串 / 全空白 → 空字符串
- 简单对象 `{"a":1,"b":"x"}` → 包含 `a: 1` 和 `b: x`
- 嵌套对象 + 数组
- Unicode / 中文 key value
- `null` / `true` / `false`
- 顶层原始值(字符串、数字)
- 非法 JSON 抛 `SyntaxError`

**`yamlToJson`**:
- 空字符串 → 空字符串
- 简单 YAML → JSON
- 注释被忽略(`a: 1 # comment` → `{"a":1}`)
- 嵌套 / 数组
- 顶层原始值
- `null` / `~` 表示 null
- 非法 YAML(错误缩进)抛错

**双向幂等**:
- `yamlToJson(jsonToYaml(s))` 对合法 JSON 字符串 s,解析后 `toEqual(JSON.parse(s))`

**已知边界(记录行为)**:
- 大整数 `999999999999999999`:YAML 解析成 number 丢精度,测试断言 `typeof === 'number'` 而非等值
- YAML 注释在 `yamlToJson` 路径上会丢失,JSON → YAML 路径上本就没有注释

## 验证

实施完成后需通过:

- `npm run test` 通过
- `npm run lint` 通过
- `npm run dev` 启动后人工验证:
  - 默认示例 JSON 自动转出 YAML
  - 修改 JSON → YAML 实时更新
  - 修改 YAML → JSON 实时更新
  - 故意输入非法 JSON(如 `{invalid`)→ YAML 面板下方显示错误,YAML 内容不变
  - 故意输入非法 YAML(如 `a: 1\n  b: 2`)→ JSON 面板下方显示错误,JSON 内容不变
  - 清空按钮清两侧
  - 深色 / 浅色主题切换正常
  - 复制按钮工作

## 不做的事(YAGNI)

- 缩进步长选项、YAML 版本切换、流式/块式切换、文件拖放、组件测试、TOML/XML 支持。
