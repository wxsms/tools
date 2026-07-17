import { toolGroups } from '../tools.js'

/**
 * Flatten toolGroups into a single array of searchable entries.
 * Preserves group order and intra-group order.
 *
 * @param {Array} groups - toolGroups from src/tools.js
 * @returns {Array<{name: string, desc: string, path: string, groupName: string, icon: Object}>}
 */
export function buildSearchIndex(groups) {
  const index = []
  for (const group of groups) {
    for (const tool of group.tools) {
      index.push({
        name: tool.name,
        desc: tool.desc,
        path: tool.path,
        groupName: group.name,
        icon: tool.icon,
      })
    }
  }
  return index
}

// Eager-built singleton index — built once at module load.
export const searchIndex = buildSearchIndex(toolGroups)
