import compact from 'emojibase-data/en/compact.json'
import shortcodesMap from 'emojibase-data/en/shortcodes/emojibase.json'

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

export const EMOJIS = compact
  .filter(e => VALID_GROUP_IDS.has(e.group))
  .map(e => ({
    hexcode: e.hexcode,
    char: e.unicode,
    label: e.label,
    shortcodes: shortcodesMap[e.hexcode] || [],
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
