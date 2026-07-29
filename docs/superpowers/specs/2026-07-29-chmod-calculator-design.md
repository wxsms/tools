# chmod 权限计算器设计

## 背景

wxsm's toolbox 的「其他工具」分组目前有取色器、占位文本、键盘测试三类,缺少一类开发者高频小工具:Unix 文件权限计算。开发者每天都会敲 `chmod 755 file.sh`,但偶尔遇到 `chmod u=rw,g=r,o=` 这种符号形式、或看到 `644` 一时反应不过来对应什么权限时,需要心算 4-2-1 的换算。本工具提供可视化勾选 + 三模式同步(勾选/数字/符号)+ 二进制表示 + 命令文本生成,覆盖这类日常需求。

交互参照已有 `src/tools/border-radius/`(勾选为主、其他表示同步显示)。本工具比 CSS 类工具更轻,不需要预览画布。

## 目标

用户勾选 9 个权限位(owner/group/other × r/w/x),实时同步显示数字模式(如 `755`)、符号模式(如 `u=rwx,g=rx,o=rx`)、二进制表示(如 `111 101 101`),并生成可直接复制的 `chmod` 命令文本。数字与符号输入框也接受反向输入,解析后同步到勾选状态。

## 范围

**In scope**

- 9 个 checkbox 矩阵(owner/group/other 行,r/w/x 列),勾选为主交互
- 数字模式:从勾选派生 `0`–`777` 三位字符串,也接受用户输入反向解析
- 符号模式:从勾选派生 `u=rwx,g=rx,o=rx` 形式,也接受用户输入反向解析
- 二进制表示:从勾选派生 `111 101 101` 形式(只读)
- chmod 命令文本生成:支持数字形式 `chmod 755 file.txt` 与符号形式 `chmod u=rwx,g=rx,o=rx file.txt`,带文件名输入框与复制按钮
- 权限小抄表:底部固定展示 `r=4 / w=2 / x=1` 与常见组合 `7=rwx / 6=rw- / 5=r-x / 0=---`
- 无效输入(数字非 0-7、符号格式错误)显示行内警告,不覆盖原状态
- 深色模式跟随全局主题

**Out of scope**

- setuid / setgid / sticky 特殊位(1000-7777 范围),只做基本 9 位
- 批量修改真实文件权限(浏览器无法做,不做假入口)
- 拖入文件预览实际权限(FileSystemAccess API 在浏览器里不稳定,暂不做)
- 命令历史 / 收藏夹

## 架构

按项目约定,新建 `src/tools/chmod/` 目录:

- `Chmod.vue` — 视图,沿用 BorderRadius 的「左控制 + 右输出」两栏布局
- `chmod.js` — 纯函数:bits ↔ octal ↔ symbolic 三种表示互转,以及生成 chmod 命令文本
- `chmod.test.js` — 纯函数单元测试

路由与侧边栏:

- `src/router.js` 的 components 表追加 `'/chmod': () => import('./tools/chmod/Chmod.vue')`
- `src/tools.js` 的「其他工具」组追加一项:`{ name: 'chmod 权限计算', path: '/chmod', desc: 'Unix 文件权限可视化计算,数字/符号/二进制三模式同步', icon: 'mdi:file-lock-outline' }`

## 数据模型

核心状态:9 个布尔位,用一个对象表示。

```js
const bits = {
  owner:  { read: true, write: true, execute: false },
  group:  { read: true, write: false, execute: false },
  other:  { read: true, write: false, execute: false },
}
```

派生(全用 `computed`,单向数据流):

- **数字模式**:`r*4 + w*2 + x*1` 每组拼成 3 位字符串,如 `"644"`
- **符号模式**:每组列出启用的字母,如 `u=rw,g=r,o=r`;若某组全空写 `u=`
- **二进制表示**:每组 3 位二进制,空格分隔,如 `110 100 100`

## 输入路径(三模式同步)

三种输入都收敛到 `bits` 状态,任一变更后另两个派生重算:

- **勾选框点击** → 直接改 `bits` → 数字/符号/二进制重算
- **数字输入框**(`0`–`777`,maxlength 3,只允许 0-7):失焦时解析,有效则更新 `bits`,无效显示行内警告
- **符号输入框**:失焦时解析 `u=rwx,g=rx,o=rx` 形式,有效则更新 `bits`,无效显示行内警告

无效解析不覆盖原 `bits` 状态,只显示行内错误提示。

## 界面布局

```
┌─ 左栏(控制) ──────────┐  ┌─ 右栏(输出) ──────────┐
│  勾选矩阵              │  │  数字模式  [755]       │
│       r    w    x      │  │  符号模式  [u=rwx,...] │
│  u  [√]  [ ]  [ ]      │  │  二进制    111 101 101 │
│  g  [√]  [ ]  [ ]      │  │                        │
│  o  [√]  [ ]  [ ]      │  │  chmod 命令            │
│                        │  │  $ chmod 755 file.txt  │
│                        │  │  $ chmod u=rwx,g=rx... │
│                        │  │  [复制]                │
└────────────────────────┘  └────────────────────────┘
                  ┌─ 底部:权限小抄表 ───────────────┐
                  │ r = 4  w = 2  x = 1              │
                  │ 7=rwx  6=rw-  5=r-x  0=---       │
                  └──────────────────────────────────┘
```

- 勾选矩阵用 DaisyUI `checkbox`,3×3 表格,行 owner/group/other,列 r/w/x
- 数字模式输入框带最大宽度(`w-24`),`maxlength="3"`,只允许 0-7
- 符号输入框较宽,占满右栏宽度
- chmod 命令文本用 `<pre>`+等宽字体,沿用 BorderRadius 的复制按钮样式(带 `copied` 状态切换图标)
- 命令文本支持切换数字/符号两种形式,默认数字形式;文件名输入框可改默认 `file.txt`

## 纯函数 API

`chmod.js` 导出:

```js
bitsToOctal(bits)              // → "755"
octalToBits(octalStr)          // → bits 或 null(无效输入)
bitsToSymbolic(bits)           // → "u=rwx,g=rx,o=rx"
symbolicToBits(symbolStr)      // → bits 或 null
bitsToBinary(bits)             // → "111 101 101"
buildChmodCommand(bits, { mode: 'octal'|'symbolic', filename })
                               // → "chmod 755 file.txt"
```

## 错误处理

- **数字输入**:空串、非 0-7 字符、超过 3 位 → 返回 `null`,UI 显示行内警告「无效的八进制」
- **符号输入**:不匹配 `u=...,g=...,o=...` 格式(三段必须齐全,每段 `=` 后字母只允许 `r`/`w`/`x`,允许任意顺序如 `u=xwr` 等价 `u=rwx`,允许重复字母去重处理,出现其他字符如 `-` 或 `a` → 返回 null) → 返回 `null`,UI 显示「无效的符号表示」
- 不静默吞错;无效时不修改 `bits` 状态,用户可见反馈

## 测试

`chmod.test.js` 覆盖:

- 三种表示的双向转换(bits↔octal↔symbolic)黄金用例:`755`、`644`、`000`、`777`、`700`
- 边界:`000` ↔ 全 false、`777` ↔ 全 true
- 无效输入:`octalToBits('8')`、`octalToBits('12')`、`symbolicToBits('u=rwx,g=rx')`(缺 o 段)都返回 null
- 命令生成:数字模式、符号模式、不同 filename

组件测试这一步先不做,纯函数测试足够覆盖核心逻辑。

## 实现步骤概要

1. 创建 `src/tools/chmod/chmod.js` 写纯函数
2. 写 `src/tools/chmod/chmod.test.js`,运行 `npm run test` 全部通过
3. 创建 `src/tools/chmod/Chmod.vue`,实现 UI 与三模式同步
4. 在 `src/router.js` 与 `src/tools.js` 注册
5. `npm run lint` 与 `npm run test` 全部通过
