export function encodeUnicode(str, format) {
  if (format === 'js') {
    let result = ''
    for (const ch of str) {
      const cp = ch.codePointAt(0)
      if (cp > 0xFFFF) {
        // Surrogate pair encoding
        const hi = Math.floor((cp - 0x10000) / 0x400) + 0xD800
        const lo = ((cp - 0x10000) % 0x400) + 0xDC00
        result += '\\u' + hi.toString(16).padStart(4, '0') + '\\u' + lo.toString(16).padStart(4, '0')
      } else {
        result += '\\u' + cp.toString(16).padStart(4, '0')
      }
    }
    return result
  } else {
    let result = ''
    for (const ch of str) {
      const cp = ch.codePointAt(0)
      result += '&#x' + cp.toString(16) + ';'
    }
    return result
  }
}

export function decodeUnicode(str, format) {
  if (format === 'js') {
    // Decode \uXXXX sequences, handling surrogate pairs
    const surrogateRegex = /\\u([0-9a-fA-F]{4})\\u([0-9a-fA-F]{4})/g
    const singleRegex = /\\u([0-9a-fA-F]{4})/g

    let result = str
    // First pass: replace surrogate pairs
    result = result.replace(surrogateRegex, (_, hi, lo) => {
      const hiVal = parseInt(hi, 16)
      const loVal = parseInt(lo, 16)
      if (hiVal >= 0xD800 && hiVal <= 0xDBFF && loVal >= 0xDC00 && loVal <= 0xDFFF) {
        const cp = (hiVal - 0xD800) * 0x400 + (loVal - 0xDC00) + 0x10000
        return String.fromCodePoint(cp)
      }
      // Not a valid surrogate pair, return as-is
      return '\\u' + hi + '\\u' + lo
    })
    // Second pass: replace remaining single \uXXXX
    result = result.replace(singleRegex, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    return result
  } else {
    // Decode &#xXXXX; sequences
    return str.replace(/&#x([0-9a-fA-F]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
  }
}

export function autoDetectDirection(str, format) {
  if (format === 'js') {
    return /\\u[0-9a-fA-F]{4}/.test(str)
  } else {
    return /&#x[0-9a-fA-F]+;/i.test(str)
  }
}
