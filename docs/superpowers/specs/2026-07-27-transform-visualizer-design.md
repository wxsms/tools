# transform 可视化工具设计

## 背景

wxsm's toolbox 的 CSS 分组已有 6 个工具(盒阴影、渐变、圆角、三角形、动画、贝塞尔曲线),交互模式统一为"左侧参数表单 + 右侧预览 + 代码 + 复制按钮"。但 `transform` 这个高频属性还没覆盖 —— 调试动画、做 3D 卡片翻转、还原设计稿里的旋转效果时,手写 `transform: rotateX(45deg) translateZ(20px)` 容易把轴向搞反,也没有快速预览。

本工具补上这个空白,沿用 `BoxShadow.vue` 的双栏布局与 DaisyUI 表单风格,核心差异在于:

1. **transform 是有序函数列表**(顺序敏感,同一函数可多次出现),状态模型与 BoxShadow 的"阴影数组"类似但更结构化。
2. **覆盖 2D + 3D 全部函数族**(translate/rotate/scale/skew 的所有变体 + matrix/matrix3d + perspective),外加 `transform-origin` 与预览容器用的 `perspective`。
3. **支持反向解析**:贴入已有 transform 串回填到表单,含 `matrix()` 的 QR 分解与 `matrix3d()` 的部分提取。

## 目标

用户通过左侧表单(下拉添加函数、range slider + 数字输入调参)实时生成 transform CSS,右侧立体预览(固定视角的 CSS 3D 立方体)即时反映效果,CSS 代码区可一键复制。同时支持把外部 transform 串贴入反解析输入框,回填到表单继续编辑。

## 范围

**In scope**

- 2D + 3D 全部 transform 函数(共 21 个 type:5 translate + 5 rotate + 5 scale + 3 skew + 2 matrix + 1 perspective),按有序列表管理,可增删/上下移。
- 每个函数族有专属参数表单(translate 族支持 px/%/em/rem 单位切换,rotate/skew 固定 deg,scale 无单位)。
- `transform-origin` 三个 slider(X/Y/Z,前两个 % 或 px,Z 固定 px)。
- 预览容器 `perspective` 可调(100~2000px,默认 800),计入输出代码。
- 立体预览:6 面 CSS 3D 立方体,固定视角 `rotateX(-20deg) rotateY(-25deg)`,容器 `transform-style: preserve-3d`,应用用户的 transform 串。
- CSS 代码区:输出 `transform-origin` / `perspective` / `transform` 三行,带复制按钮(与 BoxShadow 行为一致)。
- 反解析输入框:支持多行(transform / transform-origin / perspective 各一行),逐行解析,带行号错误提示。
- `matrix(a,b,c,d,e,f)` 的 QR 分解为 `translate + rotate + scale + skew` 等价链。
- `matrix3d(...16)` 的部分提取:只取平移 + 旋转(ZYX Euler),丢弃 scale/skew 并提示。
- 纯函数测试覆盖所有解析路径与每个函数族。

**Out of scope**

- 预览区拖拽(用纯表单控制,与 BoxShadow 风格一致)。
- 轨道控制器(用户不能鼠标拖拽旋转视角,固定视角即可)。
- `matrix3d` 完整 3D 极分解(代码量与多解问题不划算,只做平移+旋转)。
- CSS 注释支持(用户从 devtools 复制的内联样式不含注释)。
- 组件测试(UI 几乎全是表单与 `<pre>`,纯函数测试已覆盖逻辑)。
- 关键帧动画生成(已有 `css-animation` 工具,职责分离)。
- 单位 turn/grad 支持(rotate 固定 deg,99% 用法覆盖)。

## 架构

### 文件组织

```
src/tools/transform/
├── Transform.vue            # 主视图:左侧函数列表 + 参数表单 + origin/perspective,右侧预览 + 代码 + 反解析
├── transform.js             # 纯函数:stateToCss / parseTransform / decomposeMatrix2D / extractMatrix3D
└── transform.test.js        # 纯函数单测
```

- `.vue` 用 PascalCase,纯函数模块用 kebab-case,符合 CLAUDE.md 命名约定。
- 单测放 `.test.js`(纯函数),不涉及组件测试。

### 路由与侧边栏注册

- `src/router.js` 新增:`{ path: '/transform', component: Transform }`
- `src/tools.js` 的 `CSS` 分组追加:
  ```
  { name: '变换 transform', path: '/transform',
    desc: 'CSS transform 可视化生成,支持 2D/3D 函数、matrix 反解析',
    icon: 'lucide:move-3d' }
  ```

### 层次划分

```
Transform.vue (视图层,双向绑定与事件)
  ├─ 函数列表(自渲染,与 BoxShadow 阴影列表同套路,但加上移/下移)
  ├─ 参数表单(按选中函数 type 动态切换字段)
  ├─ 立体预览(6 面 CSS 3D 立方体,固定视角)
  ├─ CSS 代码区 + 复制按钮
  └─ 反解析输入框 + 应用按钮

transform.js (纯函数层,可单测)
  ├─ functionToCss(fn)           单个函数 → CSS 片段
  ├─ stateToCss(state)           整体状态 → 三行 CSS 串
  ├─ parseTransform(str)         CSS 串 → state(含 matrix 分解)
  ├─ decomposeMatrix2D(m)        2×3 matrix → QR 分解为 4 个等价函数
  └─ extractMatrix3D(m)          4×4 matrix3d → 平移 + ZYX Euler 旋转
```

所有数学计算都在 `transform.js` 里,Vue 文件只负责调函数和绑定,与 `base64/base64.js`、`diff/diff.js` 的项目惯例一致。

## 状态模型

### 单个函数的统一表达

```js
{
  type: 'translateX' | 'translateY' | 'translateZ' | 'translate3d' | 'translate'
      | 'rotateX' | 'rotateY' | 'rotateZ' | 'rotate' | 'rotate3d'
      | 'scaleX' | 'scaleY' | 'scaleZ' | 'scale3d' | 'scale'
      | 'skewX' | 'skewY' | 'skew'
      | 'matrix' | 'matrix3d'
      | 'perspective',
  value: ...  // 形态随 type 而变,见下表
}
```

### value 形态约定

| 函数族 | value 形态 | 示例 |
|---|---|---|
| translate / translate3d | `{ x: {n, unit}, y: {n, unit}, z: {n, unit} }` | `translate3d(10px, 20px, 0)` |
| translateX/Y/Z | `{ n, unit }` 单值 | `translateX(50%)` |
| rotate / rotateX/Y/Z | `{ deg }` 单值(固定 deg) | `rotate(45deg)` |
| rotate3d | `{ x, y, z, deg }` 轴+角 | `rotate3d(1, 1, 0, 45deg)` |
| scale / scale3d | `{ x, y, z }` 三值(无单位) | `scale(1.5, 1.5)` |
| scaleX/Y/Z | `{ n }` 单值 | `scaleX(2)` |
| skew / skewX / skewY | `{ x: deg, y: deg }` 或单 `deg` | `skew(15deg, 0)` |
| matrix | `[a, b, c, d, e, f]` 六数字数组 | `matrix(1, 0, 0, 1, 10, 20)` |
| matrix3d | `[16 个数字]` 数组(列主序) | 完整 4×4 |
| perspective | `{ n, unit }`(固定 px) | `perspective(800px)` |

### 整体 state 结构

```js
{
  functions: [/* 上面那种对象,有序 */],
  origin: { x: { n: 50, unit: '%' }, y: { n: 50, unit: '%' }, z: { n: 0, unit: 'px' } },
  perspective: { n: 800, unit: 'px' },  // 预览容器用,单独存在
  selectedIndex: 0,
}
```

### 关键约定

1. **函数顺序即 CSS 顺序**:`translateX(10px) rotate(45deg)` 与 `rotate(45deg) translateX(10px)` 是不同状态,数组顺序严格保留。
2. **同一函数可多次出现**:允许 `translateX(10px) rotate(45deg) translateX(10px)` 这种动画常见写法。
3. **matrix/matrix3d 也是列表项**:用户可手填矩阵,反解析也可原样保留为一项(不强制分解)。
4. **单位只允许在 translate 族 + perspective 上切换**:rotate 固定 deg,scale 无单位,skew 固定 deg。
5. **transform-origin 与 perspective 不在 functions 数组里**:它们是 transform 之外的属性,放 state 里单独管理,代码区单独成行。
6. **空状态合法**:`functions: []` 时 transform 行省略,代码区只输出 origin/perspective。
7. **rotate3d 轴向量存储原始值,不归一化**:用户输入 `(1, 1, 0, 45deg)` 就存 `(1, 1, 0)`。CSS 引擎会自行归一化,我们不在 state 层做转换,避免用户输入 0.5/0.5/0 看到变成 0.7071/0.7071/0 困惑。反解析时同样原样读入,轴可为任意小数,允许全零(此时 CSS 无效,UI 不阻止但代码区会输出原串)。
8. **scale 缺省参数不化简**:`scale(2)` 解析后存 `{ x: 2, y: 2 }`,输出时仍输出 `scale(2, 2)`(对称不化简为单参数)。理由:状态简单(双值统一),输出化简会引入"何时化简"的规则歧义(skewX/Y 是否也要化简?),统一不化简。
9. **translate 缺省 Y 用 X 值**:解析 `translate(10px)` 时 Y 取 X 的值,输出 `translate(10px, 10px)`,理由同上。

## UI 布局

整体沿用 `BoxShadow.vue` 的双栏 grid + DaisyUI form-control 风格。

### 左栏:函数列表

- 每项一行,显示函数预览串(`translateX(10px)` / `rotate3d(1,1,0,45deg)` / `matrix(1,0,0,1,10,20)`)。
- 选中项高亮(`bg-primary/10 border border-primary`,同 BoxShadow)。
- 右侧三个操作:**上移**、**下移**(`<` `>` icon,因 transform 顺序敏感,这是必须的),**删除**(`x`)。允许删除到 0 项(与 BoxShadow 不同)。
- 底部「添加函数」按钮,点开分组下拉:
  - 平移:`translateX / translateY / translateZ / translate / translate3d`
  - 旋转:`rotate / rotateX / rotateY / rotateZ / rotate3d`
  - 缩放:`scaleX / scaleY / scaleZ / scale / scale3d`
  - 斜切:`skew / skewX / skewY`
  - 矩阵:`matrix / matrix3d`
  - 透视:`perspective`
- 新增项追加到列表末尾并自动选中。

### 左栏:选中函数的参数表单(按 type 动态渲染)

- **translateX/Y/Z**:`range slider(-200~200) + 数字输入 + 单位下拉(px / % / em / rem)`,默认 px。
- **translate / translate3d**:同上,但 X/Y(和 Z)三组并排。
- **rotate / rotateX/Y/Z**:`range slider(-180~180) + 数字输入`,固定 deg。
- **rotate3d**:4 个数字输入 X/Y/Z(轴,可小数,默认 0,1)+ deg(-180~180)。
- **scale / scale3d / scaleX/Y/Z**:`range slider(0~3, step 0.05) + 数字输入`,无单位。
- **skew / skewX / skewY**:`range slider(-90~90) + 数字输入`,固定 deg。
- **matrix**:6 个数字输入框(a,b,c,d,e,f),平铺,无 slider。
- **matrix3d**:16 个数字输入框,4×4 网格排布,可折叠默认收起。
- **perspective**:`range slider(100~2000) + 数字输入`,固定 px。

所有 slider 样式与 BoxShadow 一致:`range range-sm flex-1` + 右侧数值。

### 左栏:transform-origin 与 perspective(预览容器用)

- transform-origin:三个控件 X / Y / Z,前两个单位下拉(% / px),Z 固定 px。默认 50% 50% 0。
- perspective(预览用,会写进代码区但独立一行):`range slider(100~2000)`,默认 800px。

### 右栏:立体预览

- 预览容器:`min-h-[280px]`、棋盘格背景(复用 BoxShadow 的 `checkerboard`)、`perspective` 来自 state、`perspective-origin: center`。
- 立方体:6 个面 `<div>`,每面 `position: absolute`,`transform: rotateY/rotateX(90deg) translateZ(60px)` 拼成边长 120px 立方体,不同颜色 + 半透明,加边线。立方体容器 `transform-style: preserve-3d`,应用用户的 transform 串 + `transform-origin`。
- 固定视角:容器预设 `rotateX(-20deg) rotateY(-25deg)`,默认看到三个面(顶+前+右),用户不需要拖拽。
- 用户调任何参数,立方体实时变形。

### 右栏:CSS 代码区

- `<pre>` 显示,格式:
  ```css
  transform-origin: 50% 50% 0px;
  perspective: 800px;
  transform: translateX(10px) rotate(45deg);
  ```
- perspective 永远输出(预览容器需要它),即使 functions 数组里没有 perspective 函数。
- 复制按钮(右上角,与 BoxShadow 完全一致):点 `lucide:clipboard` 复制,成功后变 `lucide:check` 1.5s。复制失败提示文案 `复制失败,请手动选择文本`。

### 右栏:反解析输入框

- `<textarea>` + 「应用」按钮。
- 用户粘贴 `transform: ...` 或纯 `...`(不带 `transform:` 前缀),点应用后调用 `parseTransform()`:
  - 成功:回填 `functions` 数组,selectedIndex 设为 0,输入框清空。
  - 部分成功(matrix3d 只提取平移+旋转):回填已解析部分,在输入框下方红色提示"matrix3d 仅提取平移与旋转,其余已丢弃"。
  - 失败:输入框保留,下方红色提示带行号的错误信息。
- 支持多行:transform / transform-origin / perspective 各一行,逐行解析。

## matrix 分解算法

### 函数串解析(非 matrix 函数)

1. 用正则 `([a-zA-Z0-9]+)\s*\(([^)]*)\)` 逐个抽取函数名 + 参数串。
2. 按函数名分派到对应解析器:
   - `translateX/Y/Z` → `{ n: parseLen(s), unit }`,长度用 `parseLen` 解析(数字 + 单位)。
   - `translate` → 1 或 2 个长度,Y 缺省取 X 值。
   - `translate3d` → 3 个长度。
   - `rotate / rotateX/Y/Z` → 1 个角度(`parseAngle`,支持 deg/turn/grad,统一转 deg)。
   - `rotate3d` → 前 3 个数字(轴)+ 1 个角度。
   - `scale / scale3d / scaleX/Y/Z` → 1~3 个纯数字(scale 缺省 Y 取 X)。
   - `skew / skewX/Y` → 1~2 个角度。
   - `perspective` → 1 个长度。
   - `matrix` → 6 个纯数字。
   - `matrix3d` → 16 个纯数字。
3. 按出现顺序 push 到 `functions` 数组。

### matrix() 的 QR 分解(2D)

输入 `matrix(a, b, c, d, e, f)` 对应 2×3 仿射矩阵:
```
| a c e |
| b d f |
| 0 0 1 |
```

目标:分解为 `translate(tx, ty) rotate(θ) scale(sx, sy) skew(φ)` 的等价表达。

算法:
```
1. 平移直接读:tx = e, ty = f
2. 取 2×2 线性部分 M = [[a, c], [b, d]]
3. sx = sqrt(a² + b²)
4. 旋转角度 θ = atan2(b, a)  (弧度转 deg)
5. cy = c·cos(θ) + d·sin(θ)
6. sy = -c·sin(θ) + d·cos(θ)
7. 倾斜角 φ = atan2(cy, sy)  (若 sx ≠ 0)
8. 若 sx ≈ 0,无法分解,保留原 matrix 项并提示
```

约定:
- 旋转角度归一到 `(-180, 180]`。
- sx 必正,sy 允许负值(直接输出 `scale(sx, sy)`,不引入额外 rotate(180))。
- skew 取 `(-90, 90)`。
- 输出形式:`translate(tx, ty) rotate(θ) scale(sx, sy) skew(φ, 0)`,这是等价但有损分解,UI 提示"matrix 已分解为等价函数链,非唯一表达"。

### matrix3d() 的部分提取(3D)

输入 `matrix3d(...16 个数)`,列主序的 4×4 矩阵。

目标:只提取**平移**与**旋转**,其余丢弃并提示。

算法:
```
1. 平移:tx = m[12], ty = m[13], tz = m[14]  (列主序最后一列前三项)
2. 取 3×3 旋转部分 R:
     R = [[m[0], m[4], m[8]],
          [m[1], m[5], m[9]],
          [m[2], m[6], m[10]]]
3. 用 R 提取旋转(Shepperd 方法转 quaternion 再转 ZYX Euler):
   ```
   trace = R[0][0] + R[1][1] + R[2][2]
   if (trace > 0):
     S = sqrt(trace + 1) * 2          # S = 4 * qw
     qw = 0.25 * S
     qx = (R[2][1] - R[1][2]) / S
     qy = (R[0][2] - R[2][0]) / S
     qz = (R[1][0] - R[0][1]) / S
   else if (R[0][0] > R[1][1] && R[0][0] > R[2][2]):
     S = sqrt(1 + R[0][0] - R[1][1] - R[2][2]) * 2  # S = 4 * qx
     qw = (R[2][1] - R[1][2]) / S
     qx = 0.25 * S
     qy = (R[0][1] + R[1][0]) / S
     qz = (R[0][2] + R[2][0]) / S
   else if (R[1][1] > R[2][2]):
     S = sqrt(1 + R[1][1] - R[0][0] - R[2][2]) * 2  # S = 4 * qy
     qw = (R[0][2] - R[2][0]) / S
     qx = (R[0][1] + R[1][0]) / S
     qy = 0.25 * S
     qz = (R[1][2] + R[2][1]) / S
   else:
     S = sqrt(1 + R[2][2] - R[0][0] - R[1][1]) * 2  # S = 4 * qz
     qw = (R[1][0] - R[0][1]) / S
     qx = (R[0][2] + R[2][0]) / S
     qy = (R[1][2] + R[2][1]) / S
     qz = 0.25 * S
   # quaternion → ZYX Euler (yaw-pitch-roll)
   # yaw (Z), pitch (Y), roll (X)
   sinp = 2 * (qw * qy - qz * qx)
   pitch = abs(sinp) >= 1 ? copysign(π/2, sinp) : asin(sinp)
   roll = atan2(2 * (qw * qx + qy * qz), 1 - 2 * (qx² + qy²))
   yaw  = atan2(2 * (qw * qz + qx * qy), 1 - 2 * (qy² + qz²))
   ```
   输出:rotateZ(yaw) rotateY(pitch) rotateX(roll),三个角度弧度转 deg,归一到 `(-180, 180]`。
4. scale 与 skew 不提取,UI 提示"3D 矩阵的缩放与斜切分量已丢弃"
```

输出形式:`translate3d(tx, ty, tz) rotateZ(γ) rotateY(β) rotateX(α)`。

### 整体反解析流程

```
parseTransform(rawStr) → { ok, state, errors }
  1. 按行拆分,逐行匹配:
     - "transform: ..."        → 走函数解析
     - "transform-origin: ..." → 解析 origin
     - "perspective: ..."      → 解析 perspective(state.perspective,即预览容器)
     - 其他(纯函数串)          → 走函数解析
  2. 收集所有行结果:
     - 函数行可多行,顺序拼接
     - origin / perspective 后者覆盖前者
  3. 调用函数解析器
  4. 遇 matrix/matrix3d,按 QR / 部分提取处理
  5. transform 串里的 perspective(n) 函数 → 作为 functions 数组里的一项
     (与 state.perspective 区分:前者是 transform 链上的函数,后者是预览容器属性。
      两者独立存在,UI 分别显示。代码区同时输出两行:state.perspective 永远在,transform 里的 perspective() 看 functions 是否含)
  6. 任一行出错 → 整体失败,errors 含行号 + 原因
  7. 全成功 → ok: true,state 含 functions / origin / perspective
```

## 错误处理

### 反解析错误分类

所有错误以保守策略处理:不部分回填,不破坏现有 state。出错时保留输入框内容,在下方红色提示带行号。

| 错误类别 | 触发条件 | 提示文案 | 是否回填 |
|---|---|---|---|
| 语法错误 | 括号未闭合 / 函数名后无 `(` | `第 N 行:括号未闭合` | 否 |
| 未知函数 | 函数名不在白名单 | `第 N 行:未知函数 foo` | 否 |
| 参数数量 | translate3d 给了 2 个值 | `第 N 行:translate3d 期望 3 个参数,实际 2 个` | 否 |
| 单位错误 | scale 出现 px | `第 N 行:scale 不接受单位` | 否 |
| 数值无效 | `rotate(abc)` | `第 N 行:无法解析数值 abc` | 否 |
| matrix 奇异 | sx ≈ 0 | `matrix 含 0 缩放,无法分解,保留原 matrix 项` | 部分(保留 matrix 原样入列) |
| matrix3d 部分提取 | 任何 matrix3d | `matrix3d 仅提取平移与旋转,缩放与斜切分量已丢弃` | 部分(回填平移+旋转) |

### 状态边界

| 边界 | 处理 |
|---|---|
| `functions: []` 空列表 | 合法,代码区 `transform` 行省略,只输出 origin/perspective |
| 列表只剩 1 项又按删除 | 允许删除到 0 项 |
| 上移/下移到边界 | 按钮置灰禁用,不循环 |
| matrix 分解后用户手改 slider | 视为用户编辑,代码区按新 state 重新生成,matrix 标识清除 |
| 反解析输入框为空点应用 | 静默无操作 |
| 反解析含多余空白 | 容忍,空白跳过;不处理 CSS 注释 |

### 数值边界

| 控件 | 范围 | 步长 | 溢出处理 |
|---|---|---|---|
| translate slider | -200 ~ 200 | 1 | 数字输入框可超出(直接键入 500px 没问题) |
| rotate slider | -180 ~ 180 | 1 | 同上,允许 360 / 720 |
| scale slider | 0 ~ 3 | 0.05 | 同上,允许 5 / -1 |
| skew slider | -90 ~ 90 | 1 | 同上 |
| matrix 数字输入 | 无范围 | 任意小数 | — |
| matrix3d 同上 | — | — | — |

slider 提供可视化操作,数字输入框允许精确/超出。两者双向绑定,数字输入框校验为 NaN 时静默回退到上一个有效值。

### 浮点精度

matrix 分解涉及 sqrt/atan2,会产生 `0.70710678...` 这种值。处理约定:

- 内部存储:存原始 float。
- CSS 串输出:小数保留 4 位(`.toFixed(4)`),尾零可省。
- slider 显示:数字输入框显示 4 位小数。
- 反解析后再生成 CSS 串对比,容忍 `0.0001` 误差视为等价。

## 测试策略

### 纯函数测试(`transform.test.js`,vitest)

覆盖率目标:每条解析路径与每个函数族都要测到。

```js
describe('functionToCss')
  ✓ translateX(10px)
  ✓ translate3d(10px, 20px, 30px)
  ✓ rotate3d(1, 0.5, 0, 45deg)
  ✓ matrix(1,0,0,1,5,10)
  ✓ matrix3d(单位矩阵)
  ✓ skew(15deg, 0) → skew(15deg, 0)  (不化简)
  ✓ scale(2) → scale(2, 2)  (双值统一,不化简)
  ✓ translate(10px) → translate(10px, 10px)  (Y 缺省取 X)

describe('stateToCss')
  ✓ 空列表 → 空串
  ✓ 多函数顺序保留
  ✓ 包含 origin / perspective 行的正确换行

describe('parseTransform — 函数族')
  ✓ 每个 type 至少 2 个用例(标准、缺省参数、单位切换)
  ✓ translate 缺省 Y 用 X 值
  ✓ rotate3d 缺省角度单位

describe('parseTransform — matrix 分解(2D)')
  ✓ 纯平移 matrix → translate
  ✓ 纯旋转 matrix(45deg) → rotate(45deg) 误差 < 0.01
  ✓ 纯缩放 matrix(2,2) → scale(2, 2)
  ✓ 复合 matrix(平移+旋转+缩放) → 三函数链
  ✓ 奇异 matrix(全 0 线性部分) → 保留原样,提示

describe('parseTransform — matrix3d 部分提取')
  ✓ 单位矩阵 → translate3d(0,0,0) + 三个 rotate 0
  ✓ 纯平移 → translate3d + 三个 rotate 0
  ✓ 含旋转的 matrix3d → Euler 角正确
  ✓ 含 scale 的 matrix3d → 平移+旋转仍正确,scale 丢弃,提示

describe('parseTransform — 错误路径')
  ✓ 未知函数 foo
  ✓ 括号未闭合
  ✓ 参数数量不对
  ✓ scale 出现单位
  ✓ 多行输入混合:transform + transform-origin + perspective
  ✓ 多行中一行错 → 整体失败,带行号

describe('round-trip')
  ✓ stateToCss(s) → parseTransform → s' 等价(s' 中数值在 0.0001 内)
  ✓ 对随机生成的 100 条 transform 串做 round-trip
```

### 不写组件测试

UI 几乎全是表单与 `<pre>` 显示,纯函数测试已覆盖几乎所有逻辑,不写组件测试以降低维护成本。

### 手动验证清单(开发者 PR 前过一遍)

- [ ] 添加每个函数族至少一项,看预览与代码
- [ ] 列表项上移/下移,代码串顺序变化
- [ ] 拖 slider 顺滑(60fps,无卡顿)
- [ ] 删除最后一项,代码区 transform 行消失
- [ ] 反解析:贴入 `translateX(10px) rotate(45deg)` → 列表变两项
- [ ] 反解析:贴入 `matrix(0.7071,0.7071,-0.7071,0.7071,0,0)` → 列表变 rotate(45deg)
- [ ] 反解析:贴入错误串 → 红色提示,现有 state 不变
- [ ] 反解析:贴入多行含 origin/perspective → 三个字段都更新
- [ ] 复制按钮成功变绿
- [ ] 暗色主题下可读
