import { toolGroups } from '../tools.js'

/**
 * Flatten toolGroups into a single array of searchable entries.
 * Preserves group order and intra-group order.
 *
 * @param {Array} groups - toolGroups from src/tools.js
 * @returns {Array<{name: string, desc: string, path: string, groupName: string, icon: string}>}
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

/**
 * Split text into segments, marking which parts match the query.
 * Case-insensitive. Preserves original case. Handles multiple matches.
 *
 * @param {string} text
 * @param {string} query
 * @returns {Array<{text: string, matched: boolean}>}
 */
export function highlightMatch(text, query) {
  const q = (query || '').trim()
  if (!q) {
    return [{ text, matched: false }]
  }

  const textLower = text.toLowerCase()
  const queryLower = q.toLowerCase()
  const segments = []
  let i = 0

  while (i < text.length) {
    const found = textLower.indexOf(queryLower, i)
    if (found === -1) {
      segments.push({ text: text.slice(i), matched: false })
      break
    }
    if (found > i) {
      segments.push({ text: text.slice(i, found), matched: false })
    }
    segments.push({ text: text.slice(found, found + q.length), matched: true })
    i = found + q.length
  }

  return segments
}

const FIELD_PRIORITY = {
  name: 0,
  path: 1,
  groupName: 2,
  desc: 3,
}

/**
 * Search an index for tools matching query. Returns results sorted by
 * field priority (name > path > groupName > desc); ties preserve index order.
 *
 * @param {string} query
 * @param {Array} index - output of buildSearchIndex
 * @returns {Array} matched entries, each with `matchedField` added
 */
export function searchTools(query, index) {
  const q = (query || '').trim().toLowerCase()
  if (!q) return []

  const matched = []
  for (const entry of index) {
    let matchedField = null
    if (entry.name.toLowerCase().includes(q)) {
      matchedField = 'name'
    } else if (entry.path.toLowerCase().includes(q)) {
      matchedField = 'path'
    } else if (entry.groupName.toLowerCase().includes(q)) {
      matchedField = 'groupName'
    } else if (entry.desc.toLowerCase().includes(q)) {
      matchedField = 'desc'
    }
    if (matchedField) {
      matched.push({ ...entry, matchedField })
    }
  }

  matched.sort((a, b) => FIELD_PRIORITY[a.matchedField] - FIELD_PRIORITY[b.matchedField])
  return matched
}

/**
 * Slice results to at most `limit` entries. Pure utility — keeps
 * searchTools free of UI concerns.
 *
 * @param {Array} results
 * @param {number} [limit=20]
 * @returns {Array}
 */
export function truncateResults(results, limit = 20) {
  return results.slice(0, limit)
}
