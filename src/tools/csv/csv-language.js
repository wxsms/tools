import { StreamLanguage } from '@codemirror/language'

/**
 * A minimal CSV syntax highlighter for CodeMirror's StreamLanguage.
 *
 * Token types produced (mapped to defaultHighlightStyle tags):
 * - quoted strings (double-quoted, with "" escape)
 * - numbers (integer / float)
 * - the comma separator
 * - the first row is not specially tagged; standard string/number coloring
 *   is enough for readability.
 */
export const csvLang = StreamLanguage.define({
  name: 'csv',
  start() {
    return { inString: false }
  },
  token(stream, state) {
    // Quoted string state
    if (state.inString) {
      while (!stream.eol()) {
        const ch = stream.next()
        if (ch === '"') {
          if (stream.peek() === '"') {
            stream.next() // escaped quote
          } else {
            state.inString = false
            return 'string'
          }
        }
      }
      return 'string'
    }

    const ch = stream.peek()

    // Comma separator
    if (ch === ',') {
      stream.next()
      return 'operator'
    }

    // Quoted string start
    if (ch === '"') {
      stream.next()
      state.inString = true
      // consume until closing quote or eol
      while (!stream.eol()) {
        const c = stream.next()
        if (c === '"') {
          if (stream.peek() === '"') {
            stream.next()
          } else {
            state.inString = false
            return 'string'
          }
        }
      }
      return 'string'
    }

    // Number (integer or float, optional leading -)
    if (/[-0-9]/.test(ch)) {
      const match = stream.match(/^-?\d+(\.\d+)?/)
      if (match) return 'number'
      stream.next()
      return null
    }

    // Whitespace
    if (ch === ' ' || ch === '\t') {
      stream.eatWhile(/[ \t]/)
      return null
    }

    // Bare value (until comma or newline)
    stream.eatWhile(/[^,\n]/)
    return 'atom'
  },
  blankLine(state) {
    state.inString = false
  },
  copyState(state) {
    return { inString: state.inString }
  },
})
