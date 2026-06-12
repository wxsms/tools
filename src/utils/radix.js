/**
 * Check whether a string contains only valid digits for the given base.
 */
export function isValidForBase(str, base) {
  if (!str) return true
  const validChars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'.slice(0, base)
  return str.toUpperCase().split('').every(c => validChars.includes(c))
}

/**
 * Convert a number string from one base to another.
 * Returns null if the input is invalid for the source base.
 */
export function convertRadix(str, fromBase, toBase) {
  if (!str) return ''
  const upper = str.toUpperCase()
  if (!isValidForBase(upper, fromBase)) return null
  const decimal = parseInt(upper, fromBase)
  // isNaN guards against out-of-range bases where parseInt returns NaN
  if (isNaN(decimal)) return null
  return decimal.toString(toBase).toUpperCase()
}
