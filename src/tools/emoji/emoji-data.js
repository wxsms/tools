export const GROUPS = [
  { id: 0, name: '笑脸与情感' },
  { id: 1, name: '人与身体' },
  { id: 3, name: '动物与自然' },
  { id: 4, name: '食物与饮料' },
  { id: 5, name: '旅行与地点' },
  { id: 6, name: '活动与事件' },
  { id: 7, name: '物品' },
  { id: 8, name: '符号' },
  { id: 9, name: '旗帜' },
]

const VALID_GROUP_IDS = new Set(GROUPS.map(g => g.id))

function normalizeShortcodes(value) {
  if (!value) return []
  if (Array.isArray(value)) return value
  return [value]
}

let cache = null
let pending = null

export async function loadEmojiData() {
  if (cache) return cache
  if (pending) return pending
  pending = (async () => {
    const [compact, shortcodesMap] = await Promise.all([
      import('emojibase-data/en/compact.json'),
      import('emojibase-data/en/shortcodes/emojibase.json'),
    ])
    const data = compact.default || compact
    const sc = shortcodesMap.default || shortcodesMap
    cache = data
      .filter(e => VALID_GROUP_IDS.has(e.group))
      .map(e => ({
        hexcode: e.hexcode,
        char: e.unicode,
        label: e.label,
        shortcodes: normalizeShortcodes(sc[e.hexcode]),
        tags: e.tags || [],
        group: e.group,
        order: e.order,
        skins: (e.skins || []).map(s => ({
          hexcode: s.hexcode,
          char: s.unicode,
          label: s.label,
        })),
      }))
      .sort((a, b) => a.order - b.order)
    return cache
  })()
  return pending
}

// 仅供测试同步使用：直接接收原始数据并预处理
export function preprocessEmojis(compact, shortcodesMap) {
  return compact
    .filter(e => VALID_GROUP_IDS.has(e.group))
    .map(e => ({
      hexcode: e.hexcode,
      char: e.unicode,
      label: e.label,
      shortcodes: normalizeShortcodes(shortcodesMap[e.hexcode]),
      tags: e.tags || [],
      group: e.group,
      order: e.order,
      skins: (e.skins || []).map(s => ({
        hexcode: s.hexcode,
        char: s.unicode,
        label: s.label,
      })),
    }))
    .sort((a, b) => a.order - b.order)
}
