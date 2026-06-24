import { describe, it, expect } from 'vitest'
import { tokenize, toSingleLine } from './cli-format.js'

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

  it('handles double-quoted value with spaces', () => {
    expect(tokenize('docker run --name "my container"')).toEqual([
      { raw: 'docker' },
      { raw: 'run' },
      { raw: '--name' },
      { raw: '"my container"' },
    ])
  })

  it('handles single-quoted value with spaces', () => {
    expect(tokenize("git commit -m 'fix: hello world'")).toEqual([
      { raw: 'git' },
      { raw: 'commit' },
      { raw: '-m' },
      { raw: "'fix: hello world'" },
    ])
  })

  it('preserves escaped space outside quotes', () => {
    expect(tokenize('echo hello\\ world')).toEqual([
      { raw: 'echo' },
      { raw: 'hello\\ world' },
    ])
  })

  it('treats = as part of token', () => {
    expect(tokenize('--output=/path/to/file')).toEqual([
      { raw: '--output=/path/to/file' },
    ])
  })

  it('handles backslash-newline continuation', () => {
    expect(tokenize('command \\\n  --flag value')).toEqual([
      { raw: 'command' },
      { raw: '--flag' },
      { raw: 'value' },
    ])
  })

  it('preserves Windows-style backslash paths (no escape of next char)', () => {
    expect(tokenize('C:\\Users\\foo')).toEqual([
      { raw: 'C:\\Users\\foo' },
    ])
  })

  it('throws on unterminated single quote', () => {
    expect(() => tokenize("echo 'unterminated")).toThrow(/引号未闭合/)
  })

  it('throws on unterminated double quote', () => {
    expect(() => tokenize('echo "unterminated')).toThrow(/引号未闭合/)
  })

  it('handles mixed quotes and escapes', () => {
    expect(tokenize('cmd --msg "it\'s \\"ok\\"" --flag')).toEqual([
      { raw: 'cmd' },
      { raw: '--msg' },
      { raw: '"it\'s \\"ok\\""' },
      { raw: '--flag' },
    ])
  })

  it('handles adjacent quoted and unquoted parts in one token', () => {
    expect(tokenize('echo "hello"world\'foo\'')).toEqual([
      { raw: 'echo' },
      { raw: '"hello"world\'foo\'' },
    ])
  })
})

describe('toSingleLine', () => {
  it('joins multi-line with backslash continuation into one line', () => {
    const input = 'command \\\n  --flag1 value1 \\\n  --flag2 value2'
    expect(toSingleLine(input)).toBe('command --flag1 value1 --flag2 value2')
  })

  it('joins tokens already on one line', () => {
    expect(toSingleLine('command --flag value')).toBe('command --flag value')
  })

  it('preserves quoted values with spaces', () => {
    expect(toSingleLine('docker run --name "my container"')).toBe('docker run --name "my container"')
  })

  it('returns empty string for empty input', () => {
    expect(toSingleLine('')).toBe('')
  })

  it('returns empty string for whitespace-only input', () => {
    expect(toSingleLine('   \n  ')).toBe('')
  })

  it('throws on unterminated quote (propagates from tokenize)', () => {
    expect(() => toSingleLine("echo 'unterminated")).toThrow(/引号未闭合/)
  })
})
