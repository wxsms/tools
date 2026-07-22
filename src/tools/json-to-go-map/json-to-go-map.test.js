import { describe, it, expect } from 'vitest'
import { jsonToGoMap } from './json-to-go-map.js'

describe('jsonToGoMap', () => {
  it('returns empty code for empty input', () => {
    const r = jsonToGoMap('')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.code).toBe('')
  })

  it('returns empty code for whitespace-only input', () => {
    const r = jsonToGoMap('   \n\t  ')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.code).toBe('')
  })

  it('returns a clean error for invalid JSON', () => {
    const r = jsonToGoMap('{ not json')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/JSON 解析失败/)
  })

  it('handles top-level string', () => {
    const r = jsonToGoMap('"hello"')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.code).toBe('"hello"')
  })

  it('handles top-level number', () => {
    const r = jsonToGoMap('42')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.code).toBe('42')
  })

  it('handles top-level boolean', () => {
    const r = jsonToGoMap('true')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.code).toBe('true')
  })

  it('converts top-level null to nil', () => {
    const r = jsonToGoMap('null')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.code).toBe('nil')
  })

  it('converts a simple flat object', () => {
    const r = jsonToGoMap('{"key": "value"}')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.code).toBe('map[string]interface{}{\n\t"key": "value",\n}')
  })

  it('indents nested objects correctly', () => {
    const r = jsonToGoMap('{"outer": {"inner": 1}}')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.code).toBe(
      'map[string]interface{}{\n' +
      '\t"outer": map[string]interface{}{\n' +
      '\t\t"inner": 1,\n' +
      '\t},\n' +
      '}'
    )
  })

  it('handles arrays of mixed types', () => {
    const r = jsonToGoMap('["A", "B", 1]')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.code).toBe(
      '[]interface{}{\n' +
      '\t"A",\n' +
      '\t"B",\n' +
      '\t1,\n' +
      '}'
    )
  })

  it('handles null value inside object', () => {
    const r = jsonToGoMap('{"key": null}')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.code).toBe('map[string]interface{}{\n\t"key": nil,\n}')
  })

  it('handles empty object', () => {
    const r = jsonToGoMap('{}')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.code).toBe('map[string]interface{}{}')
  })

  it('handles empty array', () => {
    const r = jsonToGoMap('[]')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.code).toBe('[]interface{}{}')
  })

  it('handles a complex nested input', () => {
    const r = jsonToGoMap('{"array":["A","B",1],"foo":{"bar":0.5}}')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.code).toBe(
      'map[string]interface{}{\n' +
      '\t"array": []interface{}{\n' +
      '\t\t"A",\n' +
      '\t\t"B",\n' +
      '\t\t1,\n' +
      '\t},\n' +
      '\t"foo": map[string]interface{}{\n' +
      '\t\t"bar": 0.5,\n' +
      '\t},\n' +
      '}'
    )
  })

  it('uses interface{} by default', () => {
    const r = jsonToGoMap('{"a": 1}')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.code).toContain('interface{}')
    expect(r.code).not.toContain('any')
  })

  it('swaps interface{} for any when useAny: true', () => {
    const r = jsonToGoMap('{"a": [1]}', { useAny: true })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.code).toContain('map[string]any{')
    expect(r.code).toContain('[]any{')
    expect(r.code).not.toContain('interface{}')
  })
})
