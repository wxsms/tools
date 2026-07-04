/**
 * Parse a string into lowercased word tokens.
 * Handles: spaces, hyphens, underscores, camelCase boundaries.
 */
export function tokenize(str) {
  str = str.trim()
  if (!str) return []
  return str
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/(\d)([A-Z])/g, '$1 $2')
    .split(/[\s\-_]+/)
    .filter(Boolean)
    .map(w => w.toLowerCase())
}

/**
 * Convert input string to all supported case formats.
 * Returns an object keyed by format name.
 */
export function convertCases(str) {
  const words = tokenize(str)
  if (words.length === 0) {
    return {
      upper: '',
      lower: '',
      camel: '',
      pascal: '',
      snake: '',
      screamingSnake: '',
      kebab: '',
      title: '',
    }
  }

  const lower = words.map(w => w.toLowerCase())
  const upper = words.map(w => w.toUpperCase())
  const title = words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())

  return {
    upper: upper.join(' '),
    lower: lower.join(' '),
    camel: lower[0] + title.slice(1).join(''),
    pascal: title.join(''),
    snake: lower.join('_'),
    screamingSnake: upper.join('_'),
    kebab: lower.join('-'),
    title: title.join(' '),
  }
}
