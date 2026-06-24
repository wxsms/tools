import { describe, it, expect } from 'vitest'
import { tokenize } from './cli-format.js'

describe('tokenize', () => {
  it('splits on whitespace', () => {
    expect(tokenize('command --flag value')).toEqual([
      { raw: 'command' },
      { raw: '--flag' },
      { raw: 'value' },
    ])
  })

  it('returns empty array for empty string', () => {
    expect(tokenize('')).toEqual([])
  })

  it('returns empty array for whitespace-only string', () => {
    expect(tokenize('   \n\t  ')).toEqual([])
  })
})
