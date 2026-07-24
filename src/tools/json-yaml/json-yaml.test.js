import { describe, it, expect } from 'vitest'
import { jsonToYaml, yamlToJson } from './json-yaml.js'

describe('jsonToYaml', () => {
  it('returns empty string for empty input', () => {
    expect(jsonToYaml('')).toBe('')
    expect(jsonToYaml('   ')).toBe('')
  })

  it('converts simple object', () => {
    const yaml = jsonToYaml('{"a":1,"b":"x"}')
    expect(yaml).toContain('a: 1')
    expect(yaml).toContain('b: x')
  })

  it('converts nested object and array', () => {
    const yaml = jsonToYaml('{"a":{"b":[1,2]}}')
    expect(yaml).toContain('a:')
    expect(yaml).toContain('b:')
    expect(yaml).toContain('- 1')
    expect(yaml).toContain('- 2')
  })

  it('handles Unicode / Chinese', () => {
    const yaml = jsonToYaml('{"名字":"小明"}')
    expect(yaml).toContain('名字: 小明')
  })

  it('handles null and booleans', () => {
    const yaml = jsonToYaml('{"a":null,"b":true,"c":false}')
    expect(yaml).toContain('a: null')
    expect(yaml).toContain('b: true')
    expect(yaml).toContain('c: false')
  })

  it('handles top-level primitive', () => {
    expect(jsonToYaml('"hello"')).toContain('hello')
    expect(jsonToYaml('42')).toContain('42')
  })

  it('throws SyntaxError for invalid JSON', () => {
    expect(() => jsonToYaml('{invalid')).toThrow()
  })
})

describe('yamlToJson', () => {
  it('returns empty string for empty input', () => {
    expect(yamlToJson('')).toBe('')
    expect(yamlToJson('   ')).toBe('')
  })

  it('converts simple YAML to JSON', () => {
    const json = yamlToJson('a: 1\nb: x')
    expect(JSON.parse(json)).toEqual({ a: 1, b: 'x' })
  })

  it('ignores comments', () => {
    const json = yamlToJson('a: 1 # comment')
    expect(JSON.parse(json)).toEqual({ a: 1 })
  })

  it('converts nested and array', () => {
    const json = yamlToJson('a:\n  b:\n  - 1\n  - 2')
    expect(JSON.parse(json)).toEqual({ a: { b: [1, 2] } })
  })

  it('handles top-level primitive', () => {
    const json = yamlToJson('hello')
    expect(JSON.parse(json)).toBe('hello')
  })

  it('handles null', () => {
    const json = yamlToJson('a: null')
    expect(JSON.parse(json)).toEqual({ a: null })
  })

  it('throws for invalid YAML', () => {
    expect(() => yamlToJson('a: {unclosed')).toThrow()
  })
})

describe('bidirectional idempotence', () => {
  it('JSON → YAML → JSON equals parsed original', () => {
    const original = '{"a":1,"b":{"c":"x"},"d":[1,2]}'
    const back = yamlToJson(jsonToYaml(original))
    expect(JSON.parse(back)).toEqual(JSON.parse(original))
  })
})

describe('known edge cases (recorded behavior)', () => {
  it('large integer loses precision (YAML parses as number)', () => {
    const json = yamlToJson('big: 999999999999999999')
    const parsed = JSON.parse(json)
    expect(typeof parsed.big).toBe('number')
  })

  it('YAML comments are lost in yamlToJson path', () => {
    const json = yamlToJson('a: 1 # comment')
    expect(json).not.toContain('#')
  })
})
