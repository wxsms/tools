import { describe, it, expect } from 'vitest'
import { jsonToToml, tomlToJson } from './json-toml.js'

describe('jsonToToml', () => {
  it('returns empty string for empty input', () => {
    expect(jsonToToml('')).toBe('')
    expect(jsonToToml('   ')).toBe('')
  })

  it('converts simple object', () => {
    const toml = jsonToToml('{"a":1,"b":"x"}')
    expect(toml).toContain('a = 1')
    expect(toml).toContain('b = "x"')
  })

  it('converts nested object and array', () => {
    const toml = jsonToToml('{"a":{"b":[1,2]}}')
    expect(toml).toContain('[a]')
    expect(toml).toContain('b = [ 1, 2 ]')
  })

  it('handles Unicode / Chinese (smol-toml quotes non-ASCII keys)', () => {
    const toml = jsonToToml('{"名字":"小明"}')
    expect(toml).toContain('"名字" = "小明"')
  })

  it('handles null and booleans', () => {
    // smol-toml silently drops null-valued keys (TOML has no null).
    // Test booleans here; null-drop behavior is covered separately.
    const toml = jsonToToml('{"b":true,"c":false}')
    expect(toml).toContain('b = true')
    expect(toml).toContain('c = false')
  })

  it('throws for top-level primitive (TOML requires table at top level)', () => {
    expect(() => jsonToToml('"hello"')).toThrow()
    expect(() => jsonToToml('42')).toThrow()
  })

  it('silently drops null values (TOML has no null)', () => {
    // smol-toml's stringify skips null-valued keys instead of throwing.
    // Recorded behavior: round-trip will lose null keys.
    const toml = jsonToToml('{"a":1,"b":null}')
    expect(toml).toContain('a = 1')
    expect(toml).not.toContain('b')
  })

  it('throws for top-level array', () => {
    expect(() => jsonToToml('[1,2,3]')).toThrow()
  })

  it('throws SyntaxError for invalid JSON', () => {
    expect(() => jsonToToml('{invalid')).toThrow()
  })
})

describe('tomlToJson', () => {
  it('returns empty string for empty input', () => {
    expect(tomlToJson('')).toBe('')
    expect(tomlToJson('   ')).toBe('')
  })

  it('converts simple TOML to JSON', () => {
    const json = tomlToJson('a = 1\nb = "x"')
    expect(JSON.parse(json)).toEqual({ a: 1, b: 'x' })
  })

  it('ignores comments', () => {
    const json = tomlToJson('a = 1 # comment')
    expect(JSON.parse(json)).toEqual({ a: 1 })
  })

  it('converts nested table and array', () => {
    const json = tomlToJson('[a]\nb = [1, 2]')
    expect(JSON.parse(json)).toEqual({ a: { b: [1, 2] } })
  })

  it('throws for invalid TOML', () => {
    expect(() => tomlToJson('a =')).toThrow()
  })

  it('throws for duplicate keys', () => {
    expect(() => tomlToJson('a = 1\na = 2')).toThrow()
  })
})

describe('bidirectional idempotence', () => {
  it('JSON → TOML → JSON equals parsed original', () => {
    const original = '{"a":1,"b":{"c":"x"},"d":[1,2]}'
    const back = tomlToJson(jsonToToml(original))
    expect(JSON.parse(back)).toEqual(JSON.parse(original))
  })

  it('round-trips Chinese values', () => {
    const original = '{"名字":"小明","城市":"北京"}'
    const back = tomlToJson(jsonToToml(original))
    expect(JSON.parse(back)).toEqual(JSON.parse(original))
  })
})

describe('TOML comments are lost in round-trip', () => {
  it('TOML with comment → JSON → TOML has no comment', () => {
    const toml = 'a = 1 # comment'
    const json = tomlToJson(toml)
    expect(json).not.toContain('#')
    const backToToml = jsonToToml(json)
    expect(backToToml).not.toContain('#')
  })
})
