import { describe, it, expect } from 'vitest'
import { parsePatch, getFileDisplayName, computeTotalStats } from '../utils/patch.js'

const SIMPLE_PATCH = `diff --git a/hello.txt b/hello.txt
index abc1234..def5678 100644
--- a/hello.txt
+++ b/hello.txt
@@ -1,3 +1,4 @@
 Hello
-World
+Beautiful World
+Nice to see you
 Goodbye
`

const MULTI_FILE_PATCH = `${SIMPLE_PATCH}diff --git a/new.txt b/new.txt
new file mode 100644
--- /dev/null
+++ b/new.txt
@@ -0,0 +1,2 @@
+Hello
+World
`

const DELETED_FILE_PATCH = `diff --git a/old.txt b/old.txt
deleted file mode 100644
--- a/old.txt
+++ /dev/null
@@ -1,2 +0,0 @@
-Hello
-World
`

const PLAIN_UNIFIED_PATCH = `--- a/foo.js
+++ b/foo.js
@@ -1,5 +1,5 @@
 const x = 1
-const y = 2
+const y = 3
 const z = 4
`

const MULTI_HUNK_PATCH = `diff --git a/big.txt b/big.txt
--- a/big.txt
+++ b/big.txt
@@ -1,3 +1,3 @@
 aaa
-bbb
+BBB
 ccc
@@ -10,3 +10,3 @@
 jjj
-kkk
+KKK
 lll
`

describe('parsePatch', () => {
  it('parses a single-file git diff', () => {
    const files = parsePatch(SIMPLE_PATCH)
    expect(files).toHaveLength(1)
    expect(files[0].from).toBe('hello.txt')
    expect(files[0].to).toBe('hello.txt')
    expect(files[0].added).toBe(2)
    expect(files[0].deleted).toBe(1)
    expect(files[0].hunks).toHaveLength(1)
    expect(files[0].hunks[0].oldStart).toBe(1)
    expect(files[0].hunks[0].oldCount).toBe(3)
    expect(files[0].hunks[0].newStart).toBe(1)
    expect(files[0].hunks[0].newCount).toBe(4)
  })

  it('parses multiple files in one patch', () => {
    const files = parsePatch(MULTI_FILE_PATCH)
    expect(files).toHaveLength(2)
    expect(files[0].from).toBe('hello.txt')
    expect(files[1].from).toBe('/dev/null')
    expect(files[1].to).toBe('new.txt')
  })

  it('handles deleted files', () => {
    const files = parsePatch(DELETED_FILE_PATCH)
    expect(files).toHaveLength(1)
    expect(files[0].from).toBe('old.txt')
    expect(files[0].to).toBe('/dev/null')
    expect(files[0].added).toBe(0)
    expect(files[0].deleted).toBe(2)
  })

  it('handles plain unified diff without diff --git header', () => {
    const files = parsePatch(PLAIN_UNIFIED_PATCH)
    expect(files).toHaveLength(1)
    expect(files[0].from).toBe('foo.js')
    expect(files[0].to).toBe('foo.js')
    expect(files[0].added).toBe(1)
    expect(files[0].deleted).toBe(1)
  })

  it('computes correct line numbers', () => {
    const files = parsePatch(SIMPLE_PATCH)
    const lines = files[0].hunks[0].lines
    // context "Hello" -> old:1, new:1
    expect(lines[0].oldNum).toBe(1)
    expect(lines[0].newNum).toBe(1)
    // delete "World" -> old:2, new:''
    expect(lines[1].oldNum).toBe(2)
    expect(lines[1].newNum).toBe('')
    // add "Beautiful World" -> old:'', new:2
    expect(lines[2].oldNum).toBe('')
    expect(lines[2].newNum).toBe(2)
    // add "Nice to see you" -> old:'', new:3
    expect(lines[3].oldNum).toBe('')
    expect(lines[3].newNum).toBe(3)
    // context "Goodbye" -> old:3, new:4
    expect(lines[4].oldNum).toBe(3)
    expect(lines[4].newNum).toBe(4)
  })

  it('handles multiple hunks per file', () => {
    const files = parsePatch(MULTI_HUNK_PATCH)
    expect(files).toHaveLength(1)
    expect(files[0].hunks).toHaveLength(2)
    expect(files[0].added).toBe(2)
    expect(files[0].deleted).toBe(2)
  })

  it('returns empty array for empty input', () => {
    expect(parsePatch('')).toHaveLength(0)
  })

  it('parses 3+ consecutive new files with only add lines', () => {
    const patch = `diff --git a/a.py b/a.py
new file mode 100644
--- /dev/null
+++ b/a.py
@@ -0,0 +1,2 @@
+line1
+line2
diff --git a/b.yaml b/b.yaml
new file mode 100644
--- /dev/null
+++ b/b.yaml
@@ -0,0 +1,3 @@
+key1: val1
+key2: val2
+key3: val3
diff --git a/c.sh b/c.sh
new file mode 100644
--- /dev/null
+++ b/c.sh
@@ -0,0 +1,1 @@
+#!/bin/bash
diff --git a/d.py b/d.py
--- a/d.py
+++ b/d.py
@@ -1,2 +1,2 @@
 hello
-world
+WORLD
`
    const files = parsePatch(patch)
    expect(files).toHaveLength(4)
    expect(files[0].to).toBe('a.py')
    expect(files[0].added).toBe(2)
    expect(files[0].deleted).toBe(0)
    expect(files[1].to).toBe('b.yaml')
    expect(files[1].added).toBe(3)
    expect(files[2].to).toBe('c.sh')
    expect(files[2].added).toBe(1)
    expect(files[3].from).toBe('d.py')
    expect(files[3].added).toBe(1)
    expect(files[3].deleted).toBe(1)
  })

  it('parses CRLF line endings (Windows patch file)', () => {
    // Simulate a Windows patch file with \r\n line endings
    const patch = 'diff --git a/hello.txt b/hello.txt\r\n' +
      'index abc1234..def5678 100644\r\n' +
      '--- a/hello.txt\r\n' +
      '+++ b/hello.txt\r\n' +
      '@@ -1,3 +1,4 @@\r\n' +
      ' Hello\r\n' +
      '-World\r\n' +
      '+Beautiful World\r\n' +
      '+Nice to see you\r\n' +
      ' Goodbye\r\n'
    const files = parsePatch(patch)
    expect(files).toHaveLength(1)
    expect(files[0].from).toBe('hello.txt')
    expect(files[0].to).toBe('hello.txt')
    expect(files[0].added).toBe(2)
    expect(files[0].deleted).toBe(1)
    expect(files[0].hunks).toHaveLength(1)
    expect(files[0].hunks[0].lines).toHaveLength(5)
    // Verify line content has no trailing \r
    expect(files[0].hunks[0].lines[0].text).toBe('Hello')
    expect(files[0].hunks[0].lines[1].text).toBe('World')
  })

  it('parses multi-file patch with CRLF line endings', () => {
    const patch = 'diff --git a/a.py b/a.py\r\n' +
      'new file mode 100644\r\n' +
      '--- /dev/null\r\n' +
      '+++ b/a.py\r\n' +
      '@@ -0,0 +1,2 @@\r\n' +
      '+line1\r\n' +
      '+line2\r\n' +
      'diff --git a/b.js b/b.js\r\n' +
      '--- a/b.js\r\n' +
      '+++ b/b.js\r\n' +
      '@@ -1,2 +1,2 @@\r\n' +
      ' const x = 1\r\n' +
      '-const y = 2\r\n' +
      '+const y = 3\r\n'
    const files = parsePatch(patch)
    expect(files).toHaveLength(2)
    expect(files[0].from).toBe('/dev/null')
    expect(files[0].to).toBe('a.py')
    expect(files[0].added).toBe(2)
    expect(files[1].from).toBe('b.js')
    expect(files[1].to).toBe('b.js')
    expect(files[1].added).toBe(1)
    expect(files[1].deleted).toBe(1)
  })

  it('parses mixed LF and CRLF line endings', () => {
    const patch = 'diff --git a/foo.txt b/foo.txt\n' +   // LF
      '--- a/foo.txt\r\n' +                                // CRLF
      '+++ b/foo.txt\n' +                                  // LF
      '@@ -1,2 +1,2 @@\r\n' +                              // CRLF
      ' aaa\n' +                                           // LF
      '-bbb\r\n' +                                         // CRLF
      '+BBB\n'                                             // LF
    const files = parsePatch(patch)
    expect(files).toHaveLength(1)
    expect(files[0].from).toBe('foo.txt')
    expect(files[0].added).toBe(1)
    expect(files[0].deleted).toBe(1)
    expect(files[0].hunks[0].lines[1].text).toBe('bbb')
    expect(files[0].hunks[0].lines[2].text).toBe('BBB')
  })

  it('does not split on --- / +++ inside hunk content', () => {
    const patch = `diff --git a/test.patch b/test.patch
--- a/test.patch
+++ b/test.patch
@@ -1,5 +1,5 @@
--- old file
+++ new file
 hello
-world
+WORLD
 bye
`
    const files = parsePatch(patch)
    expect(files).toHaveLength(1)
    expect(files[0].from).toBe('test.patch')
    // "--- old file" and "-world" are deletes; "+++ new file" and "+WORLD" are adds
    expect(files[0].added).toBe(2)
    expect(files[0].deleted).toBe(2)
    const lines = files[0].hunks[0].lines
    expect(lines).toHaveLength(6)
    // "--- old file" inside a hunk is a delete line (text: "-- old file")
    expect(lines[0].type).toBe('delete')
    expect(lines[0].text).toBe('-- old file')
    // "+++ new file" inside a hunk is an add line (text: "++ new file")
    expect(lines[1].type).toBe('add')
    expect(lines[1].text).toBe('++ new file')
  })
})

describe('getFileDisplayName', () => {
  it('shows "to" path for new files', () => {
    expect(getFileDisplayName({ from: '/dev/null', to: 'new.txt' })).toBe('new.txt')
  })

  it('shows "from" path for deleted files', () => {
    expect(getFileDisplayName({ from: 'old.txt', to: '/dev/null' })).toBe('old.txt')
  })

  it('shows arrow for renamed files', () => {
    expect(getFileDisplayName({ from: 'a.txt', to: 'b.txt' })).toBe('a.txt → b.txt')
  })

  it('shows single name for unchanged file name', () => {
    expect(getFileDisplayName({ from: 'foo.js', to: 'foo.js' })).toBe('foo.js')
  })
})

describe('computeTotalStats', () => {
  it('computes totals across files', () => {
    const files = parsePatch(MULTI_FILE_PATCH)
    const stats = computeTotalStats(files)
    expect(stats.files).toBe(2)
    expect(stats.added).toBe(4)
    expect(stats.deleted).toBe(1)
  })

  it('returns zeros for empty array', () => {
    const stats = computeTotalStats([])
    expect(stats.files).toBe(0)
    expect(stats.added).toBe(0)
    expect(stats.deleted).toBe(0)
  })
})
