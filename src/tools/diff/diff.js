import * as Diff from 'diff'

export function computeDiff(left, right) {
  const lineChanges = Diff.diffLines(left, right)
  const result = []
  let oldNum = 0
  let newNum = 0

  for (const change of lineChanges) {
    const lines = change.value.replace(/\n$/, '').split('\n')
    for (const text of lines) {
      if (change.added) {
        newNum++
        result.push({ type: 'add', text, oldNum: '', newNum })
      } else if (change.removed) {
        oldNum++
        result.push({ type: 'delete', text, oldNum, newNum: '' })
      } else {
        oldNum++
        newNum++
        result.push({ type: 'equal', text, oldNum, newNum })
      }
    }
  }

  return addInlineHighlights(result)
}

/**
 * For consecutive delete+add pairs, compute word-level diff
 * and attach segments for inline highlighting.
 */
export function addInlineHighlights(lines) {
  const result = []
  let i = 0
  while (i < lines.length) {
    const deletes = []
    while (i < lines.length && lines[i].type === 'delete') {
      deletes.push(lines[i])
      i++
    }
    const adds = []
    while (i < lines.length && lines[i].type === 'add') {
      adds.push(lines[i])
      i++
    }

    if (deletes.length > 0 && adds.length > 0) {
      const pairCount = Math.min(deletes.length, adds.length)
      for (let p = 0; p < pairCount; p++) {
        // diffWordsWithSpace keeps leading/trailing whitespace as separate
        // tokens so that identical indented content stays aligned between
        // the delete and add lines (diffWords would merge whitespace into
        // the changed token and shift the shared suffix).
        const wordDiff = Diff.diffWordsWithSpace(deletes[p].text, adds[p].text)
        deletes[p].segments = wordDiff
          .filter(p => !p.added)
          .map(p => ({ type: p.removed ? 'delete' : 'equal', text: p.value }))
        adds[p].segments = wordDiff
          .filter(p => !p.removed)
          .map(p => ({ type: p.added ? 'add' : 'equal', text: p.value }))
      }
      result.push(...deletes, ...adds)
    } else {
      result.push(...deletes, ...adds)
    }

    while (i < lines.length && lines[i].type !== 'delete' && lines[i].type !== 'add') {
      result.push(lines[i])
      i++
    }
  }
  return result
}

export function computeStats(lines) {
  let added = 0
  let deleted = 0
  let unchanged = 0
  for (const line of lines) {
    if (line.type === 'add') added++
    else if (line.type === 'delete') deleted++
    else unchanged++
  }
  return { added, deleted, unchanged }
}

export function computeDisplayLines(lines, showMode, unfolded, context = 3) {
  if (showMode === 'full') return lines

  // compact mode: show changed lines + N context lines, fold the rest
  const visible = new Set()
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].type !== 'equal') {
      for (let j = Math.max(0, i - context); j <= Math.min(lines.length - 1, i + context); j++) {
        visible.add(j)
      }
    }
  }

  const result = []
  let i = 0
  while (i < lines.length) {
    if (visible.has(i)) {
      result.push(lines[i])
      i++
      continue
    }

    // Collect consecutive invisible lines
    const foldStart = i
    while (i < lines.length && !visible.has(i)) i++
    const foldEnd = i

    // Check if this fold region is unfolded by user
    const isUnfolded = [...unfolded].some(u => u >= foldStart && u < foldEnd)
    if (isUnfolded) {
      for (let j = foldStart; j < foldEnd; j++) {
        result.push(lines[j])
      }
    } else {
      result.push({ type: 'fold', foldIndex: foldStart, count: foldEnd - foldStart })
    }
  }
  return result
}

/**
 * Convert the linear displayLines (unified) into paired rows for split view.
 *
 * Each output row has the shape:
 *   { type: 'fold', foldIndex, count }                       // spans both columns
 *   { type: 'equal', left, right }                            // both sides present
 *   { type: 'modify', left, right }                           // delete on left, add on right
 *   { type: 'delete', left, right: null }                     // left only
 *   { type: 'add', left: null, right }                        // right only
 *
 * `left`/`right` are the original line objects (with text/oldNum/newNum/segments).
 */
export function computeSplitRows(displayLines) {
  const rows = []
  let i = 0
  while (i < displayLines.length) {
    const item = displayLines[i]

    if (item.type === 'fold') {
      rows.push({ type: 'fold', foldIndex: item.foldIndex, count: item.count })
      i++
      continue
    }

    if (item.type === 'equal') {
      rows.push({ type: 'equal', left: item, right: item })
      i++
      continue
    }

    // Collect a run of consecutive delete lines, then a run of add lines.
    const deletes = []
    while (i < displayLines.length && displayLines[i].type === 'delete') {
      deletes.push(displayLines[i])
      i++
    }
    const adds = []
    while (i < displayLines.length && displayLines[i].type === 'add') {
      adds.push(displayLines[i])
      i++
    }

    // Pair up deletes and adds row by row; leftover lines go solo.
    const pairCount = Math.min(deletes.length, adds.length)
    for (let p = 0; p < pairCount; p++) {
      rows.push({ type: 'modify', left: deletes[p], right: adds[p] })
    }
    for (let p = pairCount; p < deletes.length; p++) {
      rows.push({ type: 'delete', left: deletes[p], right: null })
    }
    for (let p = pairCount; p < adds.length; p++) {
      rows.push({ type: 'add', left: null, right: adds[p] })
    }
  }
  return rows
}
