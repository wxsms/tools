import { describe, it, expect } from 'vitest'
import { decodeBase64url, annotateTimeFields, decodeJwt } from './jwt-decode.js'

describe('decodeBase64url', () => {
  it('decodes standard base64url JWT header', () => {
    expect(decodeBase64url('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'))
      .toBe('{"alg":"HS256","typ":"JWT"}')
  })

  it('decodes base64url with - and _ characters', () => {
    const encoded = btoa('hello').replace('+', '-').replace('/', '_').replace('=', '')
    expect(decodeBase64url(encoded)).toBe('hello')
  })
})

describe('annotateTimeFields', () => {
  it('annotates iat with formatted UTC time', () => {
    const ts = 1732864000
    const date = new Date(ts * 1000)
    const y = date.getUTCFullYear()
    const m = String(date.getUTCMonth() + 1).padStart(2, '0')
    const d = String(date.getUTCDate()).padStart(2, '0')
    const h = String(date.getUTCHours()).padStart(2, '0')
    const min = String(date.getUTCMinutes()).padStart(2, '0')
    const sec = String(date.getUTCSeconds()).padStart(2, '0')
    const expected = `${ts} // ${y}-${m}-${d} ${h}:${min}:${sec} UTC`

    const obj = { iat: ts }
    annotateTimeFields(obj)
    expect(obj.iat).toBe(expected)
  })

  it('leaves non-time fields unchanged', () => {
    const obj = { foo: 'bar', iat: 1732864000 }
    annotateTimeFields(obj)
    expect(obj.foo).toBe('bar')
  })

  it('does not annotate string time values', () => {
    const obj = { iat: '100' }
    annotateTimeFields(obj)
    expect(obj.iat).toBe('100')
  })

  it('does not annotate values below 1e9', () => {
    const obj = { iat: 100 }
    annotateTimeFields(obj)
    expect(obj.iat).toBe(100)
  })

  it('does not annotate values above 1e10', () => {
    const obj = { iat: 99999999999 }
    annotateTimeFields(obj)
    expect(obj.iat).toBe(99999999999)
  })

  it('annotates both exp and nbf fields', () => {
    const expTs = 1764400000
    const nbfTs = 1732864000
    const obj = { exp: expTs, nbf: nbfTs }
    annotateTimeFields(obj)
    expect(obj.exp).toContain(' // ')
    expect(obj.nbf).toContain(' // ')
    expect(obj.exp.startsWith(expTs.toString())).toBe(true)
    expect(obj.nbf.startsWith(nbfTs.toString())).toBe(true)
  })
})

describe('decodeJwt', () => {
  const defaultToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IuW8oOS4iSIsImlhdCI6MTczMjg2NDAwMCwiZXhwIjoxNzY0NDAwMDAwfQ.4DLecMqe5D8R8F64fF8LZ9Kq3VK7nJaPENPK9xXkx6Y'

  it('decodes a standard JWT token', () => {
    const result = decodeJwt(defaultToken)
    expect(result.error).toBe('')
    expect(result.header).toContain('"alg": "HS256"')
    expect(result.payload).toContain('"name": "张三"')
    expect(result.payload).toContain(' // ')
    expect(result.signature).toMatch(/^[0-9a-f]{64}$/)
  })

  it('returns error for 2-segment token', () => {
    const result = decodeJwt('a.b')
    expect(result.error).toContain('必须由 3 个')
    expect(result.header).toBeNull()
    expect(result.payload).toBeNull()
    expect(result.signature).toBeNull()
  })

  it('returns error for 4-segment token', () => {
    const result = decodeJwt('a.b.c.d')
    expect(result.error).toContain('必须由 3 个')
    expect(result.header).toBeNull()
    expect(result.payload).toBeNull()
    expect(result.signature).toBeNull()
  })

  it('returns empty error and null fields for empty string', () => {
    const result = decodeJwt('')
    expect(result.error).toBe('')
    expect(result.header).toBeNull()
    expect(result.payload).toBeNull()
    expect(result.signature).toBeNull()
  })

  it('handles invalid payload with decode-failure marker', () => {
    // header: eyJhIjoxfQ decodes to {"a":1}
    const result = decodeJwt('eyJhIjoxfQ.@@@.c2ln')
    expect(result.header).toContain('"a": 1')
    expect(result.payload).toContain('[解码失败：')
  })

  it('handles invalid signature with decode-failure marker', () => {
    const result = decodeJwt('eyJhIjoxfQ.eyJiIjoyfQ.@@@')
    expect(result.signature).toContain('[解码失败：')
  })
})
