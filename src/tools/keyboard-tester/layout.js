// ANSI 键盘布局数据 — 用绝对坐标(1u = 1 单位)描述每个键的位置和大小
//
// 每个键:{ code, label, sub?, x, y, w?, h?, area? }
//   x, y   左上角坐标(以键盘左上角为原点,1u 为单位)
//   w, h   宽度/高度,默认 1;数字区的 + 和 Enter 跨 2 行高
//   area   'numpad' 标识数字区,用于 TKL 布局过滤
//
// code 用 KeyboardEvent.code(物理键位,不受系统布局影响)
//
// 键盘分区:
//   主区:    x ∈ [0, 15]
//   nav 区:  x ∈ [15.5, 18.5](3u 宽)
//   数字区:  x ∈ [19, 23](4u 宽)
//
// 主区每行宽度严格为 15u,便于对齐

export const Y_FN = 0             // F 行
export const Y_ROW1 = 1.25        // 数字行(从 F 行下方 0.25u 起)
export const ROW_H = 1

// 行 0:F 区 + nav 区控制键 + 数字区控制键
export const fnRow = [
  { code: 'Escape', label: 'Esc', x: 0, y: Y_FN, w: 1 },
  { code: 'F1', label: 'F1', x: 2, y: Y_FN, w: 1 },
  { code: 'F2', label: 'F2', x: 3, y: Y_FN, w: 1 },
  { code: 'F3', label: 'F3', x: 4, y: Y_FN, w: 1 },
  { code: 'F4', label: 'F4', x: 5, y: Y_FN, w: 1 },
  { code: 'F5', label: 'F5', x: 6.5, y: Y_FN, w: 1 },
  { code: 'F6', label: 'F6', x: 7.5, y: Y_FN, w: 1 },
  { code: 'F7', label: 'F7', x: 8.5, y: Y_FN, w: 1 },
  { code: 'F8', label: 'F8', x: 9.5, y: Y_FN, w: 1 },
  { code: 'F9', label: 'F9', x: 11, y: Y_FN, w: 1 },
  { code: 'F10', label: 'F10', x: 12, y: Y_FN, w: 1 },
  { code: 'F11', label: 'F11', x: 13, y: Y_FN, w: 1 },
  { code: 'F12', label: 'F12', x: 14, y: Y_FN, w: 1 },
  { code: 'PrintScreen', label: 'PrtSc', x: 15.5, y: Y_FN, w: 1 },
  { code: 'ScrollLock', label: 'ScrLk', x: 16.5, y: Y_FN, w: 1 },
  { code: 'Pause', label: 'Pause', x: 17.5, y: Y_FN, w: 1 },
  { code: 'NumLock', label: 'NumLk', x: 19, y: Y_FN, w: 1, area: 'numpad' },
  { code: 'NumpadDivide', label: '/', x: 20, y: Y_FN, w: 1, area: 'numpad' },
  { code: 'NumpadMultiply', label: '*', x: 21, y: Y_FN, w: 1, area: 'numpad' },
  { code: 'NumpadSubtract', label: '-', x: 22, y: Y_FN, w: 1, area: 'numpad' },
]

// 行 1:` 1..0 - = Backspace | Ins Home PgUp | Num7 Num8 Num9 Num+(跨2行)
export const row1 = [
  { code: 'Backquote', label: '`', sub: '~', x: 0, y: Y_ROW1 },
  { code: 'Digit1', label: '1', sub: '!', x: 1, y: Y_ROW1 },
  { code: 'Digit2', label: '2', sub: '@', x: 2, y: Y_ROW1 },
  { code: 'Digit3', label: '3', sub: '#', x: 3, y: Y_ROW1 },
  { code: 'Digit4', label: '4', sub: '$', x: 4, y: Y_ROW1 },
  { code: 'Digit5', label: '5', sub: '%', x: 5, y: Y_ROW1 },
  { code: 'Digit6', label: '6', sub: '^', x: 6, y: Y_ROW1 },
  { code: 'Digit7', label: '7', sub: '&', x: 7, y: Y_ROW1 },
  { code: 'Digit8', label: '8', sub: '*', x: 8, y: Y_ROW1 },
  { code: 'Digit9', label: '9', sub: '(', x: 9, y: Y_ROW1 },
  { code: 'Digit0', label: '0', sub: ')', x: 10, y: Y_ROW1 },
  { code: 'Minus', label: '-', sub: '_', x: 11, y: Y_ROW1 },
  { code: 'Equal', label: '=', sub: '+', x: 12, y: Y_ROW1 },
  { code: 'Backspace', label: 'Backspace', x: 13, y: Y_ROW1, w: 2 },
  { code: 'Insert', label: 'Ins', x: 15.5, y: Y_ROW1 },
  { code: 'Home', label: 'Home', x: 16.5, y: Y_ROW1 },
  { code: 'PageUp', label: 'PgUp', x: 17.5, y: Y_ROW1 },
  { code: 'Numpad7', label: '7', x: 19, y: Y_ROW1, area: 'numpad' },
  { code: 'Numpad8', label: '8', x: 20, y: Y_ROW1, area: 'numpad' },
  { code: 'Numpad9', label: '9', x: 21, y: Y_ROW1, area: 'numpad' },
  { code: 'NumpadAdd', label: '+', x: 22, y: Y_ROW1, h: 2, area: 'numpad' },
]

// 行 2:Tab(1.5) Q..] \(1.5) | Del End PgDn | Num4 Num5 Num6
export const row2 = [
  { code: 'Tab', label: 'Tab', x: 0, y: Y_ROW1 + ROW_H, w: 1.5 },
  { code: 'KeyQ', label: 'Q', x: 1.5, y: Y_ROW1 + ROW_H },
  { code: 'KeyW', label: 'W', x: 2.5, y: Y_ROW1 + ROW_H },
  { code: 'KeyE', label: 'E', x: 3.5, y: Y_ROW1 + ROW_H },
  { code: 'KeyR', label: 'R', x: 4.5, y: Y_ROW1 + ROW_H },
  { code: 'KeyT', label: 'T', x: 5.5, y: Y_ROW1 + ROW_H },
  { code: 'KeyY', label: 'Y', x: 6.5, y: Y_ROW1 + ROW_H },
  { code: 'KeyU', label: 'U', x: 7.5, y: Y_ROW1 + ROW_H },
  { code: 'KeyI', label: 'I', x: 8.5, y: Y_ROW1 + ROW_H },
  { code: 'KeyO', label: 'O', x: 9.5, y: Y_ROW1 + ROW_H },
  { code: 'KeyP', label: 'P', x: 10.5, y: Y_ROW1 + ROW_H },
  { code: 'BracketLeft', label: '[', sub: '{', x: 11.5, y: Y_ROW1 + ROW_H },
  { code: 'BracketRight', label: ']', sub: '}', x: 12.5, y: Y_ROW1 + ROW_H },
  { code: 'Backslash', label: '\\', sub: '|', x: 13.5, y: Y_ROW1 + ROW_H, w: 1.5 },
  { code: 'Delete', label: 'Del', x: 15.5, y: Y_ROW1 + ROW_H },
  { code: 'End', label: 'End', x: 16.5, y: Y_ROW1 + ROW_H },
  { code: 'PageDown', label: 'PgDn', x: 17.5, y: Y_ROW1 + ROW_H },
  { code: 'Numpad4', label: '4', x: 19, y: Y_ROW1 + ROW_H, area: 'numpad' },
  { code: 'Numpad5', label: '5', x: 20, y: Y_ROW1 + ROW_H, area: 'numpad' },
  { code: 'Numpad6', label: '6', x: 21, y: Y_ROW1 + ROW_H, area: 'numpad' },
  // NumpadAdd 跨 2 行,本行该位置被其占满,不需要第三排键
]

// 行 3:Caps(1.75) A..' Enter(2.25) | (nav 空) | Num1 Num2 Num3 NumEnter(跨2行)
export const row3 = [
  { code: 'CapsLock', label: 'Caps', x: 0, y: Y_ROW1 + ROW_H * 2, w: 1.75 },
  { code: 'KeyA', label: 'A', x: 1.75, y: Y_ROW1 + ROW_H * 2 },
  { code: 'KeyS', label: 'S', x: 2.75, y: Y_ROW1 + ROW_H * 2 },
  { code: 'KeyD', label: 'D', x: 3.75, y: Y_ROW1 + ROW_H * 2 },
  { code: 'KeyF', label: 'F', x: 4.75, y: Y_ROW1 + ROW_H * 2 },
  { code: 'KeyG', label: 'G', x: 5.75, y: Y_ROW1 + ROW_H * 2 },
  { code: 'KeyH', label: 'H', x: 6.75, y: Y_ROW1 + ROW_H * 2 },
  { code: 'KeyJ', label: 'J', x: 7.75, y: Y_ROW1 + ROW_H * 2 },
  { code: 'KeyK', label: 'K', x: 8.75, y: Y_ROW1 + ROW_H * 2 },
  { code: 'KeyL', label: 'L', x: 9.75, y: Y_ROW1 + ROW_H * 2 },
  { code: 'Semicolon', label: ';', sub: ':', x: 10.75, y: Y_ROW1 + ROW_H * 2 },
  { code: 'Quote', label: '\'', sub: '"', x: 11.75, y: Y_ROW1 + ROW_H * 2 },
  { code: 'Enter', label: 'Enter', x: 12.75, y: Y_ROW1 + ROW_H * 2, w: 2.25 },
  { code: 'Numpad1', label: '1', x: 19, y: Y_ROW1 + ROW_H * 2, area: 'numpad' },
  { code: 'Numpad2', label: '2', x: 20, y: Y_ROW1 + ROW_H * 2, area: 'numpad' },
  { code: 'Numpad3', label: '3', x: 21, y: Y_ROW1 + ROW_H * 2, area: 'numpad' },
  { code: 'NumpadEnter', label: 'Enter', x: 22, y: Y_ROW1 + ROW_H * 2, h: 2, area: 'numpad' },
]

// 行 4:Shift(2.25) Z../ Shift(2.75) | ↑ | Num0 Num.(NumEnter 在上方跨下来)
// 严格 ANSI 标准:↑ 对齐 nav 第 2 列(Ins Home PgUp 中 Home 列下方)
export const row4 = [
  { code: 'ShiftLeft', label: 'Shift', x: 0, y: Y_ROW1 + ROW_H * 3, w: 2.25 },
  { code: 'KeyZ', label: 'Z', x: 2.25, y: Y_ROW1 + ROW_H * 3 },
  { code: 'KeyX', label: 'X', x: 3.25, y: Y_ROW1 + ROW_H * 3 },
  { code: 'KeyC', label: 'C', x: 4.25, y: Y_ROW1 + ROW_H * 3 },
  { code: 'KeyV', label: 'V', x: 5.25, y: Y_ROW1 + ROW_H * 3 },
  { code: 'KeyB', label: 'B', x: 6.25, y: Y_ROW1 + ROW_H * 3 },
  { code: 'KeyN', label: 'N', x: 7.25, y: Y_ROW1 + ROW_H * 3 },
  { code: 'KeyM', label: 'M', x: 8.25, y: Y_ROW1 + ROW_H * 3 },
  { code: 'Comma', label: ',', sub: '<', x: 9.25, y: Y_ROW1 + ROW_H * 3 },
  { code: 'Period', label: '.', sub: '>', x: 10.25, y: Y_ROW1 + ROW_H * 3 },
  { code: 'Slash', label: '/', sub: '?', x: 11.25, y: Y_ROW1 + ROW_H * 3 },
  { code: 'ShiftRight', label: 'Shift', x: 12.25, y: Y_ROW1 + ROW_H * 3, w: 2.75 },
  { code: 'ArrowUp', label: '↑', x: 16.5, y: Y_ROW1 + ROW_H * 3 },
  { code: 'Numpad0', label: '0', x: 19, y: Y_ROW1 + ROW_H * 3, w: 2, area: 'numpad' },
  { code: 'NumpadDecimal', label: '.', x: 21, y: Y_ROW1 + ROW_H * 3, area: 'numpad' },
  // NumpadEnter 跨 2 行,本行该位置被其占满
]

// 行 5:Ctrl Win Alt Space Alt Win Menu Ctrl | ← ↓ →
export const row5 = [
  { code: 'ControlLeft', label: 'Ctrl', x: 0, y: Y_ROW1 + ROW_H * 4, w: 1.25 },
  { code: 'MetaLeft', label: 'Win', x: 1.25, y: Y_ROW1 + ROW_H * 4, w: 1.25 },
  { code: 'AltLeft', label: 'Alt', x: 2.5, y: Y_ROW1 + ROW_H * 4, w: 1.25 },
  { code: 'Space', label: 'Space', x: 3.75, y: Y_ROW1 + ROW_H * 4, w: 6.25 },
  { code: 'AltRight', label: 'Alt', x: 10, y: Y_ROW1 + ROW_H * 4, w: 1.25 },
  { code: 'MetaRight', label: 'Win', x: 11.25, y: Y_ROW1 + ROW_H * 4, w: 1.25 },
  { code: 'ContextMenu', label: 'Menu', x: 12.5, y: Y_ROW1 + ROW_H * 4, w: 1.25 },
  { code: 'ControlRight', label: 'Ctrl', x: 13.75, y: Y_ROW1 + ROW_H * 4, w: 1.25 },
  { code: 'ArrowLeft', label: '←', x: 15.5, y: Y_ROW1 + ROW_H * 4 },
  { code: 'ArrowDown', label: '↓', x: 16.5, y: Y_ROW1 + ROW_H * 4 },
  { code: 'ArrowRight', label: '→', x: 17.5, y: Y_ROW1 + ROW_H * 4 },
]

// 统一补齐 w/h 默认值,避免消费者再写 key.w ?? 1
function withDefaults(keys) {
  return keys.map(k => ({ w: 1, h: 1, ...k }))
}

export const layout104 = withDefaults([...fnRow, ...row1, ...row2, ...row3, ...row4, ...row5])

// 87 (TKL):去掉数字区
export const layout87 = layout104.filter(k => k.area !== 'numpad')

// 浏览器可能无法稳定捕获的键 — UI 上做标记
export const limitedCodes = ['MetaLeft', 'MetaRight', 'ContextMenu']

// 别名:某些浏览器/IME 状态下,keydown 的 e.code 不是 W3C 标准命名
// 而是 undefined / 退化值。这里把已知的退化形式归一到 layout 里的标准 code。
// zfrontier 的 KeyEventMap 用了 t.code || t.key 兜底,我们也用同思路。
//
// 例如:右 Shift 在某些 Chromium 版本下 e.code 可能为 "" / undefined,
// 此时 e.key 才是 "Shift";为区分左右,借助 e.location(1=left, 2=right)。
const aliases = {
  Shift: { 1: 'ShiftLeft', 2: 'ShiftRight' },
  Control: { 1: 'ControlLeft', 2: 'ControlRight' },
  Alt: { 1: 'AltLeft', 2: 'AltRight' },
  Meta: { 1: 'MetaLeft', 2: 'MetaRight' },
  OS: { 1: 'MetaLeft', 2: 'MetaRight' }, // 旧版 Firefox 用 OSLeft/OSRight
}

// 把 KeyboardEvent 归一到 layout 里使用的 code。
// 优先用 e.code,若与 layout code 不匹配但 e.key 在 alias 表中,
// 则按 e.location(1=左 / 2=右 / 3=numpad)选对应 physical code。
export function normalizeKeyCode(e, knownCodes) {
  const code = e.code
  if (code && knownCodes.has(code)) return code
  // fallback:按 e.key + location 找左右
  const alias = aliases[e.key]
  if (alias) {
    const loc = e.location || 1
    const mapped = alias[loc] || alias[1]
    if (mapped && knownCodes.has(mapped)) return mapped
  }
  // 仍找不到,返回原始 code 或 e.key,作为"未知键"记录用
  return code || e.key || ''
}
