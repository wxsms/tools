/**
 * Unix file permission bits.
 * @typedef {Object} PermBits
 * @property {{ read: boolean, write: boolean, execute: boolean }} owner
 * @property {{ read: boolean, write: boolean, execute: boolean }} group
 * @property {{ read: boolean, write: boolean, execute: boolean }} other
 */

/**
 * Convert a single rwx triple to its octal digit (0-7).
 * @param {{ read: boolean, write: boolean, execute: boolean }} triple
 * @returns {number}
 */
function tripleToDigit(triple) {
  return (triple.read ? 4 : 0) + (triple.write ? 2 : 0) + (triple.execute ? 1 : 0)
}

/**
 * Convert an octal digit (0-7) to a rwx triple.
 * @param {number} digit
 * @returns {{ read: boolean, write: boolean, execute: boolean }}
 */
function digitToTriple(digit) {
  return {
    read:   Boolean(digit & 4),
    write:  Boolean(digit & 2),
    execute: Boolean(digit & 1),
  }
}

/**
 * @param {PermBits} bits
 * @returns {string} 3-character octal string like "755"
 */
export function bitsToOctal(bits) {
  return String(tripleToDigit(bits.owner))
    + String(tripleToDigit(bits.group))
    + String(tripleToDigit(bits.other))
}

/**
 * @param {string} str
 * @returns {PermBits | null} null if input is not a 1-3 digit octal string with digits 0-7
 */
export function octalToBits(str) {
  if (typeof str !== 'string' || !/^[0-7]{1,3}$/.test(str)) return null
  const padded = str.padStart(3, '0')
  return {
    owner: digitToTriple(Number(padded[0])),
    group: digitToTriple(Number(padded[1])),
    other: digitToTriple(Number(padded[2])),
  }
}

/**
 * @param {{ read: boolean, write: boolean, execute: boolean }} triple
 * @returns {string} e.g. "rwx", "rw", "" for all-false
 */
function tripleToLetters(triple) {
  let s = ''
  if (triple.read) s += 'r'
  if (triple.write) s += 'w'
  if (triple.execute) s += 'x'
  return s
}

/**
 * @param {PermBits} bits
 * @returns {string} e.g. "u=rwx,g=rx,o=rx"; empty segments stay as "u="
 */
export function bitsToSymbolic(bits) {
  return `u=${tripleToLetters(bits.owner)},g=${tripleToLetters(bits.group)},o=${tripleToLetters(bits.other)}`
}

/**
 * Parse one segment like "rwx" or "xwr" or "" into a triple.
 * Returns null if any character is not r/w/x.
 * @param {string} letters
 * @returns {{ read: boolean, write: boolean, execute: boolean } | null}
 */
function lettersToTriple(letters) {
  const triple = { read: false, write: false, execute: false }
  for (const ch of letters) {
    if (ch === 'r') triple.read = true
    else if (ch === 'w') triple.write = true
    else if (ch === 'x') triple.execute = true
    else return null
  }
  return triple
}

/**
 * @param {string} str
 * @returns {PermBits | null} null if format is not exactly u=...,g=...,o=... with only r/w/x letters
 */
export function symbolicToBits(str) {
  if (typeof str !== 'string') return null
  const re = /^u=([rwx]*),g=([rwx]*),o=([rwx]*)$/
  const m = str.match(re)
  if (!m) return null
  const owner = lettersToTriple(m[1])
  const group = lettersToTriple(m[2])
  const other = lettersToTriple(m[3])
  if (!owner || !group || !other) return null
  return { owner, group, other }
}

/**
 * @param {{ read: boolean, write: boolean, execute: boolean }} triple
 * @returns {string} 3 chars of "0"/"1", e.g. "110"
 */
function tripleToBinary(triple) {
  return (triple.read ? '1' : '0')
    + (triple.write ? '1' : '0')
    + (triple.execute ? '1' : '0')
}

/**
 * @param {PermBits} bits
 * @returns {string} 3 groups of 3 binary digits, space-separated, e.g. "111 101 101"
 */
export function bitsToBinary(bits) {
  return [tripleToBinary(bits.owner), tripleToBinary(bits.group), tripleToBinary(bits.other)].join(' ')
}

/**
 * Shell-quote a filename if it contains spaces (simple double-quote wrap; no edge cases
 * like embedded quotes since this is a copy-to-clipboard helper, not real shell parsing).
 * @param {string} filename
 * @returns {string}
 */
function quoteFilename(filename) {
  if (filename.includes(' ')) return `"${filename}"`
  return filename
}

/**
 * @param {PermBits} bits
 * @param {{ mode: 'octal' | 'symbolic', filename?: string }} opts
 * @returns {string} a ready-to-copy chmod command
 */
export function buildChmodCommand(bits, { mode, filename = 'file.txt' }) {
  const target = quoteFilename(filename)
  if (mode === 'octal') return `chmod ${bitsToOctal(bits)} ${target}`
  if (mode === 'symbolic') return `chmod ${bitsToSymbolic(bits)} ${target}`
  throw new Error(`buildChmodCommand: unknown mode ${mode}`)
}

/**
 * Valid Unix file type characters as shown by ls -l.
 * d=directory, -=regular file, l=symlink, b=block device, c=char device,
 * p=FIFO/pipe, s=socket.
 */
const FILE_TYPES = ['-', 'd', 'l', 'b', 'c', 'p', 's']

/**
 * @param {{ read: boolean, write: boolean, execute: boolean }} triple
 * @returns {string} 3 chars of "r"/"w"/"x"/"-", e.g. "rwx" or "r-x"
 */
function tripleToLsLetters(triple) {
  return (triple.read ? 'r' : '-')
    + (triple.write ? 'w' : '-')
    + (triple.execute ? 'x' : '-')
}

/**
 * @param {PermBits} bits
 * @param {string} typeChar  single-char file type prefix ('-', 'd', 'l', ...)
 * @returns {string} 10-char ls -l permission string, e.g. "-rwxr-xr-x"
 */
export function bitsToLsFormat(bits, typeChar = '-') {
  return typeChar + tripleToLsLetters(bits.owner) + tripleToLsLetters(bits.group) + tripleToLsLetters(bits.other)
}

/**
 * @param {string} str
 * @returns {{ type: string, owner: Object, group: Object, other: Object } | null}
 *   null if input is not a 9-char rwx-style string (with optional leading type char).
 *   When input is 9 chars (no type prefix), type defaults to "-".
 */
export function lsFormatToBits(str) {
  if (typeof str !== 'string') return null
  let typeChar = '-'
  let perm = str
  if (str.length === 10) {
    typeChar = str[0]
    perm = str.slice(1)
  } else if (str.length !== 9) {
    return null
  }
  if (!FILE_TYPES.includes(typeChar)) return null
  const re = /^([rwx-]{3})([rwx-]{3})([rwx-]{3})$/
  const m = perm.match(re)
  if (!m) return null
  const owner = lettersOrDashToTriple(m[1])
  const group = lettersOrDashToTriple(m[2])
  const other = lettersOrDashToTriple(m[3])
  if (!owner || !group || !other) return null
  return { type: typeChar, owner, group, other }
}

/**
 * Parse a 3-char "rwx" / "r-x" / "---" segment into a triple.
 * Returns null if any char is not r/w/x/-.
 * @param {string} seg
 * @returns {{ read: boolean, write: boolean, execute: boolean } | null}
 */
function lettersOrDashToTriple(seg) {
  const triple = { read: false, write: false, execute: false }
  for (const ch of seg) {
    if (ch === 'r') triple.read = true
    else if (ch === 'w') triple.write = true
    else if (ch === 'x') triple.execute = true
    else if (ch !== '-') return null
  }
  return triple
}

/**
 * @param {string} str  e.g. "111 101 101" or "111101101"
 * @returns {PermBits | null} null if not exactly 9 binary digits (with optional single spaces)
 */
export function binaryToBits(str) {
  if (typeof str !== 'string') return null
  const compact = str.replace(/\s+/g, '')
  if (!/^[01]{9}$/.test(compact)) return null
  const seg = (start) => ({
    read:   compact[start] === '1',
    write:  compact[start + 1] === '1',
    execute: compact[start + 2] === '1',
  })
  return {
    owner: seg(0),
    group: seg(3),
    other: seg(6),
  }
}

/**
 * @param {{ read: boolean, write: boolean, execute: boolean }} triple
 * @returns {string}
 */
function describeTriple(triple) {
  const caps = []
  if (triple.read) caps.push('可读')
  if (triple.write) caps.push('可写')
  if (triple.execute) caps.push('可执行')
  if (caps.length === 0) return '无任何权限 — 不能查看、修改或运行'

  const ops = []
  if (triple.read) ops.push('可查看内容')
  if (triple.write) ops.push('修改')
  if (triple.execute) ops.push('作为程序运行')
  const opsText = ops.join('、')

  const missing = []
  if (!triple.read && (triple.write || triple.execute)) missing.push('查看')
  if (!triple.write && (triple.read || triple.execute)) missing.push('修改')
  if (!triple.execute && (triple.read || triple.write)) missing.push('运行')
  const tail = missing.length > 0 ? `不能${missing.join('、')}` : ''

  const head = caps.join(' · ')
  return tail ? `${head} — ${opsText}, ${tail}` : `${head} — ${opsText}`
}

/**
 * @param {PermBits} bits
 * @returns {{ owner: string, group: string, other: string }}
 */
export function describePerm(bits) {
  return {
    owner: describeTriple(bits.owner),
    group: describeTriple(bits.group),
    other: describeTriple(bits.other),
  }
}
