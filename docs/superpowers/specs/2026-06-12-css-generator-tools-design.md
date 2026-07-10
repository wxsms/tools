---
date: 2026-06-12
title: 4 CSS Generator Tools
status: approved
---

# 4 CSS Generator Tools Design

Add 4 CSS visual generator tools to wxsm's Kit: Box Shadow, Gradient, Border Radius, Triangle.

## Sidebar Group

New group "CSS" in `src/tools.js`, placed after "生成转换" and before "文本处理".

## Common Patterns

- **Layout**: Left-right split (`grid grid-cols-1 lg:grid-cols-2 gap-6`). Left = controls, Right = preview + code output.
- **Code output**: Font-mono block with copy button. Uses `navigator.clipboard.writeText`.
- **Range sliders**: DaisyUI `range range-sm` + inline value display (per memory: range tick marks don't align, use inline value).
- **Color inputs**: Native `<input type="color">` + text input side by side.
- **Route registration**: Each tool gets a route in `src/router.js` and entry in `src/tools.js`.
- **Wide layout**: All 4 tools use `meta: { wide: true }` in router to get full-width layout.

---

## 1. Box Shadow Generator

- **Sidebar name**: 盒阴影
- **Route**: `/box-shadow`
- **Icon**: `Square3Stack3dIcon`
- **File**: `src/views/BoxShadow.vue`

### Left Panel — Controls

- **Shadow list**: Each shadow is a row showing shorthand summary (e.g. `5px 5px 10px #000`). Click to select, delete button on each row.
- **"Add shadow" button**: Appends a new shadow with default values.
- **Selected shadow parameters** (visible when a shadow is selected):
  - X offset: range -100 ~ 100, default 5
  - Y offset: range -100 ~ 100, default 5
  - Blur radius: range 0 ~ 200, default 15
  - Spread radius: range -100 ~ 100, default 0
  - Color: color picker + text input, default `#000000`
  - Opacity: range 0 ~ 1, step 0.05, default 0.3
  - Inset: checkbox, default off

### Right Panel — Preview + Code

- **Preview card**: White square with current shadow(s) applied. Light grid background (`bg-[url('data:image/svg+xml,...')]` checkerboard pattern) to make shadows visible.
- **Code block**: `box-shadow: 5px 5px 15px rgba(0,0,0,0.3);` format. Multiple shadows comma-separated. + Copy button.

### Default State

One shadow: `5px 5px 15px rgba(0,0,0,0.3)`

### Data Model

```js
const shadows = ref([
  { x: 5, y: 5, blur: 15, spread: 0, color: '#000000', opacity: 0.3, inset: false }
])
const selectedIndex = ref(0)
```

---

## 2. Gradient Generator

- **Sidebar name**: 渐变
- **Route**: `/gradient`
- **Icon**: `SwatchIcon`
- **File**: `src/views/Gradient.vue`

### Left Panel — Controls

- **Gradient type**: Radio group — 线性 / 径向 / 锥形
- **Direction controls** (shown based on type):
  - Linear: angle range 0~360°, default 90
  - Radial: shape radio (circle / ellipse) + position select (center / top / bottom / left / right / top-left / top-right / bottom-left / bottom-right), default circle + center
  - Conic: start angle 0~360° + position select (same options), default 0 + center
- **Color stops list**: Each stop is a row: small color swatch + position percentage + delete button. Click to select.
- **"Add stop" button**: Appends a new stop at 100% with white color.
- **Selected stop detail**: Color picker + text input + position range (0~100%), step 1

### Right Panel — Preview + Code

- **Preview bar**: Wide rectangle showing current gradient. Min height 120px.
- **Code block**: `background: linear-gradient(90deg, #6366f1 0%, #ec4899 100%);` + Copy button.

### Default State

Linear gradient, 90°, two stops: `#6366f1` at 0%, `#ec4899` at 100%

### Data Model

```js
const type = ref('linear') // 'linear' | 'radial' | 'conic'
const angle = ref(90)
const shape = ref('circle') // radial only
const position = ref('center')
const stops = ref([
  { color: '#6366f1', position: 0 },
  { color: '#ec4899', position: 100 }
])
const selectedStopIndex = ref(0)
```

---

## 3. Border Radius Generator

- **Sidebar name**: 圆角
- **Route**: `/border-radius`
- **Icon**: `SquareIcon`
- **File**: `src/views/BorderRadius.vue`

### Left Panel — Controls

- **Link mode**: Checkbox "联动" — when on, all 4 corners move together; when off, each corner independent.
- **4 corner sliders** (shown individually when unlinked, single slider when linked):
  - Top-left / Top-right / Bottom-right / Bottom-left
  - Range 0~100, default 16
- **Unit**: Radio group — px / % / rem, default px

### Right Panel — Preview + Code

- **Preview square**: 200×200 box with dashed border, showing current border-radius.
- **Code block**: Smart shorthand:
  - All same: `border-radius: 16px`
  - TL=BR, TR=BL: `border-radius: 16px 24px`
  - All different: `border-radius: 16px 24px 8px 12px`
  + Copy button.

### Default State

Link mode on, 16px, unit px

### Data Model

```js
const linked = ref(true)
const corners = ref({ tl: 16, tr: 16, br: 16, bl: 16 })
const unit = ref('px')
```

When linked and user changes any corner, all 4 update to the same value.

---

## 4. Triangle Generator

- **Sidebar name**: 三角形
- **Route**: `/triangle`
- **Icon**: `PlayIcon`
- **File**: `src/views/Triangle.vue`

### Left Panel — Controls

- **Direction**: 4 radio buttons with direction labels — 上 / 右 / 下 / 左
- **Width**: range 0~200, default 100
- **Height**: range 0~200, default 100
- **Color**: color picker + text input, default `#6366f1`

### Right Panel — Preview + Code

- **Preview area**: Centered triangle on light grid background.
- **Code block**: Border hack output, e.g. for "up" direction:
  ```css
  width: 0;
  height: 0;
  border-left: 50px solid transparent;
  border-right: 50px solid transparent;
  border-bottom: 100px solid #6366f1;
  ```
  + Copy button.

### Logic

Border triangle rules:
- **Up**: border-bottom = solid color (height), border-left/right = transparent (width/2 each)
- **Down**: border-top = solid color (height), border-left/right = transparent (width/2 each)
- **Left**: border-right = solid color (width), border-top/bottom = transparent (height/2 each)
- **Right**: border-left = solid color (width), border-top/bottom = transparent (height/2 each)

Width controls the base of the triangle (split between two transparent borders).
Height controls the colored border width.

### Default State

Direction: up, width 100px, height 100px, color `#6366f1`

### Data Model

```js
const direction = ref('up') // 'up' | 'down' | 'left' | 'right'
const width = ref(100)
const height = ref(100)
const color = ref('#6366f1')
```

---

## Registration Steps (for all 4 tools)

For each tool, 3 files must be touched:

1. **Create view**: `src/views/ToolName.vue`
2. **Register route**: Add import + route in `src/router.js` with `meta: { wide: true }`
3. **Add sidebar entry**: Add to `toolGroups` in `src/tools.js` under new "CSS" group

### tools.js New Group

```js
{
  name: 'CSS',
  tools: [
    { name: '盒阴影', path: '/box-shadow', desc: 'CSS box-shadow 可视化生成', icon: Square3Stack3dIcon },
    { name: '渐变', path: '/gradient', desc: 'CSS 渐变可视化生成', icon: SwatchIcon },
    { name: '圆角', path: '/border-radius', desc: 'CSS border-radius 可视化生成', icon: SquareIcon },
    { name: '三角形', path: '/triangle', desc: 'CSS border 三角形生成', icon: PlayIcon },
  ]
}
```

### Icon Imports

```js
import { Square3Stack3dIcon, SwatchIcon, SquareIcon, PlayIcon } from '@heroicons/vue/24/outline'
```
