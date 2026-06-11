/**
 * Test a regex pattern against a string and return all matches.
 * @param {string} pattern - The regex pattern (without delimiters)
 * @param {string} flags - The regex flags (e.g. 'gi')
 * @param {string} testString - The string to test against
 * @returns {{ matches: Array<{match: string, index: number, groups: object|null}>, error: string }}
 */
export function testRegex(pattern, flags, testString) {
  if (!pattern) return { matches: [], error: '' }

  let regex
  try {
    regex = new RegExp(pattern, flags)
  } catch (e) {
    return { matches: [], error: e.message }
  }

  if (!testString) return { matches: [], error: '' }

  const matches = []

  if (flags.includes('g')) {
    let m
    while ((m = regex.exec(testString)) !== null) {
      matches.push({
        match: m[0],
        index: m.index,
        groups: extractGroups(m),
      })
      if (m[0].length === 0) regex.lastIndex++
    }
  } else {
    const m = regex.exec(testString)
    if (m) {
      matches.push({
        match: m[0],
        index: m.index,
        groups: extractGroups(m),
      })
    }
  }

  return { matches, error: '' }
}

function extractGroups(matchResult) {
  const groups = {}
  let hasGroups = false

  if (matchResult.groups) {
    Object.assign(groups, matchResult.groups)
    hasGroups = true
  }

  for (let i = 1; i < matchResult.length; i++) {
    if (matchResult[i] !== undefined) {
      groups[i] = matchResult[i]
      hasGroups = true
    }
  }

  return hasGroups ? groups : null
}

/**
 * Build an array of text segments from the test string, marking matched regions.
 * @param {string} testString
 * @param {Array<{match: string, index: number}>} matches
 * @returns {Array<{text: string, isMatch: boolean, matchIndex: number}>}
 */
export function buildHighlightedSegments(testString, matches) {
  if (!matches.length) {
    return testString ? [{ text: testString, isMatch: false, matchIndex: -1 }] : []
  }

  const segments = []
  let cursor = 0

  for (let i = 0; i < matches.length; i++) {
    const { match, index } = matches[i]
    if (index > cursor) {
      segments.push({ text: testString.slice(cursor, index), isMatch: false, matchIndex: -1 })
    }
    segments.push({ text: match, isMatch: true, matchIndex: i })
    cursor = index + match.length
  }

  if (cursor < testString.length) {
    segments.push({ text: testString.slice(cursor), isMatch: false, matchIndex: -1 })
  }

  return segments
}
