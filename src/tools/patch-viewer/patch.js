/**
 * Parse unified diff / git diff patch text into structured data.
 *
 * Returns an array of file diffs, each containing hunks with line-level changes.
 */
export function parsePatch(text) {
  text = text.replace(/\r\n?/g, '\n')
  const lines = text.split('\n')
  const files = []
  let currentFile = null
  let currentHunk = null

  function pushCurrentFile() {
    if (currentFile && (currentFile.hunks.length > 0 || currentFile.from || currentFile.to)) {
      files.push(currentFile)
    }
    currentFile = null
    currentHunk = null
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // "diff --git" always starts a new file, even inside a hunk
    const diffGitMatch = line.match(/^diff --git a\/(.+) b\/(.+)$/)
    if (diffGitMatch) {
      pushCurrentFile()
      currentFile = { from: diffGitMatch[1], to: diffGitMatch[2], hunks: [], added: 0, deleted: 0 }
      continue
    }

    // Inside a hunk: process content lines FIRST (before matching --- / +++ as file headers)
    // A line like "--- old file" inside a hunk is a delete line with text "-- old file"
    if (currentHunk) {
      if (line.startsWith('+')) {
        currentHunk.lines.push({ type: 'add', text: line.slice(1) })
        currentFile.added++
        continue
      } else if (line.startsWith('-')) {
        currentHunk.lines.push({ type: 'delete', text: line.slice(1) })
        currentFile.deleted++
        continue
      } else if (line.startsWith(' ')) {
        currentHunk.lines.push({ type: 'context', text: line.slice(1) })
        continue
      } else if (line === '') {
        // Empty line could be a context line with trailing newline; treat as context
        // But also could be end-of-patch; only add if we haven't hit the next diff
        const nextLine = lines[i + 1] || ''
        if (nextLine.startsWith('diff ') || nextLine.startsWith('@@') || !nextLine) {
          // Likely end of content, skip
        } else {
          currentHunk.lines.push({ type: 'context', text: '' })
        }
        continue
      }
      // No recognized prefix — end of hunk content
      currentHunk = null
    }

    // File header: --- a/path or --- /dev/null (only matched outside a hunk)
    const fromMatch = line.match(/^--- (?:a\/)?(.+)$/)
    if (fromMatch) {
      // If there's already a file with hunks, push it first
      if (currentFile && currentFile.hunks.length > 0) {
        pushCurrentFile()
      }
      if (!currentFile) {
        currentFile = { from: fromMatch[1], to: '', hunks: [], added: 0, deleted: 0 }
      } else {
        currentFile.from = fromMatch[1]
      }
      // Peek ahead for +++ line
      if (i + 1 < lines.length) {
        const toMatch = lines[i + 1].match(/^\+\+\+ (?:b\/)?(.+)$/)
        if (toMatch) {
          currentFile.to = toMatch[1]
          i++ // skip the +++ line
        }
      }
      continue
    }

    // Skip other diff metadata lines
    if (line.startsWith('index ') || line.startsWith('new file') || line.startsWith('deleted file') || line.startsWith('similarity index') || line.startsWith('rename from') || line.startsWith('rename to') || line.startsWith('copy from') || line.startsWith('copy to') || line.startsWith('Binary files')) {
      continue
    }

    // Hunk header: @@ -l,s +l,s @@ optional text
    const hunkMatch = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/)
    if (hunkMatch && currentFile) {
      currentHunk = {
        oldStart: parseInt(hunkMatch[1]),
        oldCount: hunkMatch[2] !== undefined ? parseInt(hunkMatch[2]) : 1,
        newStart: parseInt(hunkMatch[3]),
        newCount: hunkMatch[4] !== undefined ? parseInt(hunkMatch[4]) : 1,
        lines: [],
      }
      currentFile.hunks.push(currentHunk)
      continue
    }
  }

  // Finalize: add last file
  pushCurrentFile()

  // Compute line numbers for each hunk
  for (const file of files) {
    for (const hunk of file.hunks) {
      let oldLine = hunk.oldStart
      let newLine = hunk.newStart
      for (const l of hunk.lines) {
        if (l.type === 'context') {
          l.oldNum = oldLine++
          l.newNum = newLine++
        } else if (l.type === 'delete') {
          l.oldNum = oldLine++
          l.newNum = ''
        } else if (l.type === 'add') {
          l.oldNum = ''
          l.newNum = newLine++
        }
      }
    }
  }

  return files
}

/**
 * Get display name for a file diff entry.
 */
export function getFileDisplayName(file) {
  if (file.from === '/dev/null') return file.to
  if (file.to === '/dev/null') return file.from
  // If renamed, show both
  if (file.from !== file.to) return `${file.from} → ${file.to}`
  return file.from
}

/**
 * Compute total stats across all files.
 */
export function computeTotalStats(files) {
  let added = 0
  let deleted = 0
  for (const f of files) {
    added += f.added
    deleted += f.deleted
  }
  return { added, deleted, files: files.length }
}
