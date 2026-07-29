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
