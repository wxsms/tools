# chmod 权限计算器设计

> **Note (2026-07-29 revision):** 原始 spec 描述的是「3 模式同步 + binary 只读 + 小抄表」的最小方案。实际实现经过迭代后扩展为:5 个输入框全部可编辑、新增 ls -l 格式解析与文件类型选择器、新增解释区、移除小抄表、重排布局。本 spec 已重写以反映当前实现。原始 spec 的 commit 在 `59b6c01`。

## 背景

wxsm's toolbox 的「其他工具」分组目前有取色器、占位文本、键盘测试三类,缺少一类开发者高频小工具:Unix 文件权限计算。开发者每天都会敲 `chmod 755 file.sh`,但偶尔遇到 `chmod u=rw,g=r,o=` 这种符号形式、看到 `644` 反应不出权限、或从 `ls -l` 输出里读到 `drwxr-xr-x` 想转成数字时,需要心算 4-2-1 的换算。本工具提供可视化勾选 + 5 种表示同步(勾选 / 数字 / 符号 / 二进制 / ls -l)+ 权限含义解释 + 命令文本生成,覆盖这类日常需求。

交互参照已有 `src/tools/border-radius/`(勾选为主、其他表示同步显示),但本工具所有表示都可反向输入。

## 目标

用户可通过 6 种方式输入权限:勾选 9 个权限位、数字、符号、二进制、ls -l 字符串、文件类型选择器。任一变化实时同步其他 5 个表示,并显示权限含义解释和可复制的 `chmod` 命令。

## 范围

**In scope**

- 9 个 checkbox 矩阵(owner/group/other 行,r/w/x 列)
- 5 个可编辑输入框,全部 `w-full`:
  - **ls -l 格式**:接受 `rwxr-xr-x` 或 `drwxr-xr-x`,带文件类型选择器(7 种:`-`/`d`/`l`/`b`/`c`/`p`/`s`)
  - **符号格式**:接受 `u=rwx,g=rx,o=rx`
  - **数字格式**:接受 `0`–`777`,maxlength 3
  - **二进制格式**:接受 `111 101 101` 或 `111101101`,maxlength 11
- 权限含义解释区:用 `describePerm` 生成 3 行中文描述,每组含启用权限 + 实际操作示意 + 缺失权限
- chmod 命令文本生成:支持数字形式与符号形式切换,带文件名输入框与复制按钮
- 无效输入显示行内警告并回退到当前状态,不修改 `bits`
- 深色模式跟随全局主题

**Out of scope**

- setuid / setgid / sticky 特殊位(1000-7777 范围),只做基本 9 位
- 批量修改真实文件权限(浏览器无法做,不做假入口)
- 拖入文件预览实际权限(FileSystemAccess API 在浏览器里不稳定,暂不做)
- 命令历史 / 收藏夹

## 架构

按项目约定,在 `src/tools/chmod/` 目录:

- `Chmod.vue` — 视图,左栏(checkbox 矩阵 + 5 输入框)+ 右栏(解释区 + chmod 命令)
- `chmod.js` — 纯函数:bits ↔ octal / symbolic / binary / ls-l 互转、命令生成、权限含义生成
- `chmod.test.js` — 纯函数单元测试
- `Chmod.component.test.js` — 组件交互测试(5 输入联动、blur 解析、文件类型同步)

路由与侧边栏:

- `src/router.js` 的 components 表追加 `'/chmod': () => import('./tools/chmod/Chmod.vue')`
- `src/routes.js` 追加路由 meta
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

- **数字格式**:`r*4 + w*2 + x*1` 每组拼成 3 位字符串,如 `"644"`
- **符号格式**:每组列出启用的字母,如 `u=rw,g=r,o=r`;若某组全空写 `u=`
- **二进制格式**:每组 3 位二进制,空格分隔,如 `110 100 100`
- **ls -l 格式**:文件类型字符 + 三组 `rwx`/`-` 串,如 `-rwxr-xr-x`
- **权限含义**:三组中文描述,如「可读 · 可执行 — 可查看内容、作为程序运行, 不能修改」

## 输入路径(6 模式同步)

所有输入都收敛到 `bits` 状态(以及 `fileType`),任一变更后其他派生重算:

- **勾选框点击** → 直接改 `bits` → 所有输入框同步
- **数字输入框**(`0`–`777`,maxlength 3):失焦时解析,有效则更新 `bits`
- **符号输入框**:失焦时解析 `u=rwx,g=rx,o=rx`,有效则更新 `bits`
- **二进制输入框**:失焦时解析 `111 101 101` 或 `111101101`,有效则更新 `bits`
- **ls -l 输入框**:失焦时解析 `rwxr-xr-x` 或 `drwxr-xr-x`,有效则更新 `bits` 和 `fileType`
- **文件类型选择器**:改变 `fileType`,ls -l 输入框同步首字符

### 输入框内容保留

当某个输入框驱动 `bits` 变化时,该输入框本身的内容**不应被 `bits` watcher 重写**——否则用户刚输入的 `drwxr-xr-x` 会被立刻改写成 `bitsToLsFormat(bits, fileType)` 的等价但不同字符串,看起来像输入被强行覆盖。

实现机制:每个 blur handler 在更新 `bits` 前设置一个 `lastEditedField` 枚举(`'octal' | 'symbolic' | 'binary' | 'ls'`),`bits` watcher 检查该字段并跳过对应输入框的重写,然后在 `nextTick` 复位。checkbox 触发的变化不设置该字段,所有输入框都会同步。

## 界面布局

```
┌─ 左栏(输入) ──────────────────┐  ┌─ 右栏(输出) ──────────┐
│  权限位                         │  │  权限含义              │
│       r    w    x               │  │  u (user): 可读 · 可写 │
│  u (user)  [√] [ ] [ ]          │  │   · 可执行 — ...       │
│  g (group) [√] [ ] [ ]          │  │  g (group): ...        │
│  o (other) [√] [ ] [ ]          │  │  o (other): ...        │
│                                 │  │                        │
│  ls -l 格式                     │  │  chmod 命令            │
│  [- 普通文件 ▾] [drwxr-xr-x]    │  │  (○ 数字  ○ 符号)      │
│                                 │  │  [file.txt           ] │
│  符号格式                       │  │  $ chmod 755 file.txt  │
│  [u=rwx,g=rx,o=rx            ]  │  │  [复制]                │
│                                 │  │                        │
│  数字格式                       │  │                        │
│  [755]                          │  │                        │
│                                 │  │                        │
│  二进制格式                     │  │                        │
│  [111 101 101]                  │  │                        │
└─────────────────────────────────┘  └────────────────────────┘
```

- 每个输入框的 label 单独一行,输入框在下一行(`text-sm font-semibold mb-1` + `input w-full`)
- 勾选矩阵:3×3 表格,行 owner/group/other,列 r/w/x;label 用 `cursor-help` + `title` 属性提供原生 tooltip
- 左栏顺序:权限位 → ls -l 格式 → 符号格式 → 数字格式 → 二进制格式
- 右栏顺序:权限含义 → chmod 命令
- chmod 命令文本用 `<pre>`+等宽字体,沿用 BorderRadius 的复制按钮样式(带 `copied` 状态切换图标)
- 命令文本支持切换数字/符号两种形式,默认数字形式;文件名输入框可改默认 `file.txt`

## 纯函数 API

`chmod.js` 导出:

```js
bitsToOctal(bits)              // → "755"
octalToBits(octalStr)          // → bits 或 null(1-3 位 0-7,不足 3 位左侧补 0)

bitsToSymbolic(bits)           // → "u=rwx,g=rx,o=rx"
symbolicToBits(symbolStr)      // → bits 或 null(三段齐全,每段只含 r/w/x,允许任意顺序与重复)

bitsToBinary(bits)             // → "111 101 101"
binaryToBits(binaryStr)        // → bits 或 null(9 位 0/1,可含空格)

bitsToLsFormat(bits, typeChar) // → "-rwxr-xr-x"
lsFormatToBits(str)            // → { type, owner, group, other } 或 null(9 位 rwx 或 10 位含类型符)

describePerm(bits)             // → { owner, group, other },每组一句中文描述

buildChmodCommand(bits, { mode: 'octal'|'symbolic', filename })
                               // → "chmod 755 file.txt"
```

## 错误处理

- **数字输入**:空串、非 0-7 字符、超过 3 位 → 返回 `null`,UI 显示「无效的八进制（仅 0-7，1-3 位）」,输入框回退到当前 `bits` 的数字表示
- **符号输入**:不匹配 `u=...,g=...,o=...` 格式 → 返回 `null`,UI 显示「无效的符号表示」,回退
- **二进制输入**:不是 9 位 0/1 → 返回 `null`,UI 显示「无效的二进制」,回退
- **ls -l 输入**:不是 9 位 rwx 或 10 位含合法类型符 → 返回 `null`,UI 显示「无效的 ls -l 格式」,回退
- 不静默吞错;无效时不修改 `bits` 状态,用户可见反馈

## 测试

`chmod.test.js` 覆盖纯函数(67 个测试):

- 五种表示的双向转换(bits↔octal↔symbolic↔binary↔ls-l)黄金用例:`755`、`644`、`000`、`777`、`700`
- 边界:`000` ↔ 全 false、`777` ↔ 全 true
- 无效输入:每种 parser 都覆盖若干返回 null 的用例
- 命令生成:数字模式、符号模式、不同 filename、含空格的 filename 加引号
- `describePerm`:755/644/000/777/700 的中文文案

`Chmod.component.test.js` 覆盖组件交互:

- 默认渲染:checkbox 状态、5 输入框初值、解释区文案都符合 755
- checkbox 点击 → 5 输入框全部同步
- 各输入框 blur 输入合法值 → bits 更新、其他输入框同步、当前输入框内容保留
- 各输入框 blur 输入非法值 → 显示错误、bits 不变、输入框回退
- ls -l 输入 `drwxr-xr-x` → `fileType` 同步到 `d`
- 文件类型选择器改变 → ls -l 输入框首字符同步
- 命令模式切换、文件名修改、复制按钮(若有 clipboard mock)
