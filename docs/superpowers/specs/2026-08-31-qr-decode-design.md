# 二维码解析工具设计

## 背景

wxsm's toolbox 的「图片多媒体」分组已有二维码生成器（`/qr-code`），但缺少反向的解析工具。用户拿到一张二维码截图或照片时，无法在站内直接还原出原始内容，需要另找工具。本工具补齐这一对称能力：上传/拖拽/粘贴二维码图片，自动解码并按类型结构化展示结果。

典型场景：「我有一张二维码截图，想知道里面是什么」——纯静态图片输入即可覆盖，无需摄像头实时扫码。

## 目标

用户通过文件选择、拖拽或剪贴板粘贴上传二维码图片，工具自动解码，识别内容类型（URL / WiFi / vCard / 邮箱 / 电话 / 短信 / 地理位置 / 纯文本），展示原始文本与结构化字段，并提供复制与跳转等便捷操作。

## 范围

**In scope**

- 三种图片输入方式：文件选择、拖拽到 dropzone、剪贴板粘贴
- 使用 `jsqr` 库解码二维码
- 解码成功后展示：
  - 类型徽章
  - 原始文本 + 复制按钮
  - 结构化字段表（按类型不同展示不同字段）
- 解码失败时显示「未检测到二维码」提示
- 深色模式跟随全局主题

**Out of scope**

- 摄像头实时扫码（`getUserMedia`）——以后可作为独立增强再加
- 一张图识别多个二维码——jsQR 单结果 API，需求不强
- 二值化阈值手动调节滑块——jsQR 对正常图片鲁棒性已足够
- QR 元信息展示（版本/纠错级别/定位点框选）——偏调试向，普通用户价值不大
- 不改动现有 `/qr-code` 生成器的分组结构

## 架构

按项目约定，在 `src/tools/qr-decode/` 目录：

- `QrDecode.vue` — 视图，输入区 + 预览区 + 结果区
- `qr-decode.js` — 纯函数：`detectType(text)` 返回 `{ type, title, fields }`，无 DOM 依赖，便于单元测试
- `qr-decode.test.js` — 纯函数单元测试

路由与侧边栏：

- `src/router.js` 的 components 表追加 `'/qr-decode': () => import('./tools/qr-decode/QrDecode.vue')`
- `src/routes.js` 追加路由 meta
- `src/tools.js` 的「图片多媒体」组末尾追加一项：`{ name: '二维码解析', path: '/qr-decode', desc: '从图片解析二维码内容，支持 URL/WiFi/vCard 等类型识别', icon: 'mdi:qrcode-scan' }`

## 依赖

新增 npm 依赖 `jsqr`（~35KB，纯 JS，无依赖，API 为 `jsQR(imageData, width, height)` 返回 `{ data, location, chunks } | null`）。

## 数据模型

### `detectType(text)` 返回结构

```js
{
  type: 'url' | 'wifi' | 'vcard' | 'mailto' | 'tel' | 'sms' | 'geo' | 'text',
  title: 'URL',           // 中文类型名，用于徽章
  fields: [
    { label: '链接', value: 'https://example.com', action: 'link' },
    // action 可选：'link'（可点击跳转）| 'copy'（单独复制按钮）| undefined（仅展示）
  ]
}
```

### 类型识别规则

按前缀/scheme 匹配，顺序判断：

1. `wifi:`（不区分大小写）→ WiFi，解析 `T:`（加密类型）、`S:`（SSID）、`P:`（密码），转义 `\\; \\: \\, \\\\` 还原
2. `begin:vcard`（不区分大小写）→ vCard，解析 `FN`/`N`、`TEL`、`EMAIL`、`ORG`、`URL`、`ADR` 等常见字段
3. `mailto:` → 邮箱，拆分地址与 subject/body
4. `tel:` → 电话
5. `sms:` / `smsto:` → 短信，拆分号码与内容
6. `geo:` → 地理位置，拆分经纬度
7. `http://` / `https://` / `ftp://` 等 scheme → URL
8. 其余 → 纯文本

### 组件状态

```js
const status = ref('idle')  // 'idle' | 'decoding' | 'success' | 'error'
const result = ref(null)    // detectType 返回值
const rawText = ref('')     // 解码原始文本
const imageSrc = ref('')    // 原图缩略图 dataURL
```

## 数据流

```
图片输入（file/drop/paste）
  → FileReader.readAsDataURL → Image → canvas.getImageData
  → jsQR(imageData, w, h)
    → 成功：rawText = result.data → detectType(rawText) → 渲染结果
    → 失败（null）：status = 'error'
```

## 交互细节

- **文件选择**：`<input type="file" accept="image/*">`，参考 `ImageCompress.vue` 风格
- **拖拽**：dropzone 区域监听 `dragover`/`drop`，拖入时高亮
- **粘贴**：组件挂载时监听 `window` 的 `paste` 事件，提取 `clipboardData.items` 中的图片
- **复制**：复用项目现有 `copyText` 模式（参考 `QrCode.vue`），复制后图标短暂变为对勾
- **URL 跳转**：`action: 'link'` 的字段渲染为 `<a target="_blank" rel="noopener">`
- **失败提示**：`status === 'error'` 时显示 alert 提示，可重新上传

## 测试

`qr-decode.test.js` 覆盖 `detectType` 各类型：

- URL（http/https）
- WiFi（WPA/WEP/nopass，含转义字符）
- vCard（含 FN/TEL/EMAIL/ORG 等字段）
- mailto（含/不含 subject）
- tel
- sms（含/不含内容）
- geo
- 纯文本
- 边界：空串、未知 scheme、大小写混合

组件测试暂不写（与现有 `qr-code` 工具一致，该工具也无组件测试）。

## 不做的事（YAGNI）

- 摄像头扫码、多码识别、阈值调节、QR 元信息——均见 Out of scope
- 不重构现有工具分组
- 不为 vCard 做完整字段解析（只取常见字段，其余忽略）
