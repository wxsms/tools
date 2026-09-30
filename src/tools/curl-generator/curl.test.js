import { describe, it, expect } from 'vitest'
import { buildCurl, shellQuote, splitUrlQuery, rawContentType } from './curl.js'

describe('shellQuote', () => {
  it('wraps plain text', () => {
    expect(shellQuote('https://api.example.com')).toBe(`'https://api.example.com'`)
  })

  it('escapes single quotes', () => {
    expect(shellQuote(`it's`)).toBe(`'it'\\''s'`)
  })

  it('handles empty string', () => {
    expect(shellQuote('')).toBe(`''`)
  })
})

describe('buildCurl', () => {
  it('builds minimal GET request', () => {
    expect(buildCurl({ method: 'GET', url: 'https://a.com/x' })).toBe(`curl 'https://a.com/x'`)
  })

  it('omits -X for GET but includes for POST', () => {
    expect(buildCurl({ method: 'POST', url: 'https://a.com' })).toBe(`curl -X POST 'https://a.com'`)
  })

  it('appends query params with URL encoding', () => {
    const cmd = buildCurl({
      method: 'GET',
      url: 'https://a.com/x',
      queryParams: [
        { key: 'q', value: 'hello world' },
        { key: 'tag', value: 'a&b' },
      ],
    })
    expect(cmd).toBe(`curl 'https://a.com/x?q=hello%20world&tag=a%26b'`)
  })

  it('uses & when url already has a question mark', () => {
    const cmd = buildCurl({
      method: 'GET',
      url: 'https://a.com/x?limit=10',
      queryParams: [{ key: 'page', value: '2' }],
    })
    expect(cmd).toBe(`curl 'https://a.com/x?limit=10&page=2'`)
  })

  it('builds headers and skips empty keys', () => {
    const cmd = buildCurl({
      method: 'GET',
      url: 'https://a.com',
      headers: [
        { key: 'Authorization', value: 'Bearer t0k3n' },
        { key: '', value: 'ignored' },
      ],
    })
    expect(cmd).toBe(`curl 'https://a.com' -H 'Authorization: Bearer t0k3n'`)
  })

  it('skips disabled rows', () => {
    const cmd = buildCurl({
      method: 'GET',
      url: 'https://a.com',
      headers: [
        { key: 'A', value: '1', enabled: true },
        { key: 'B', value: '2', enabled: false },
      ],
      queryParams: [
        { key: 'x', value: '1', enabled: false },
        { key: 'y', value: '2' },
      ],
    })
    expect(cmd).toBe(`curl 'https://a.com?y=2' -H 'A: 1'`)
  })

  it('builds bare header when value empty', () => {
    const cmd = buildCurl({
      method: 'GET',
      url: 'https://a.com',
      headers: [{ key: 'X-Flag' }],
    })
    expect(cmd).toBe(`curl 'https://a.com' -H 'X-Flag'`)
  })

  it('adds JSON content type for raw json unless user provided one', () => {
    const base = { method: 'POST', url: 'https://a.com', bodyMode: 'raw', rawLang: 'json', rawBody: '{"a":1}' }
    expect(buildCurl(base)).toBe(`curl -X POST 'https://a.com' -H 'Content-Type: application/json' --data-raw '{"a":1}'`)
    expect(buildCurl({ ...base, headers: [{ key: 'content-type', value: 'text/custom' }] }))
      .toBe(`curl -X POST 'https://a.com' -H 'content-type: text/custom' --data-raw '{"a":1}'`)
  })

  it('raw other languages have no implicit content type', () => {
    const cmd = buildCurl({ method: 'POST', url: 'https://a.com', bodyMode: 'raw', rawLang: 'xml', rawBody: '<a/>' })
    expect(cmd).toBe(`curl -X POST 'https://a.com' --data-raw '<a/>'`)
  })

  it('builds urlencoded body with data-urlencode per field', () => {
    const cmd = buildCurl({
      method: 'POST',
      url: 'https://a.com/login',
      bodyMode: 'urlencoded',
      formEncoding: 'urlencoded',
      formPairs: [
        { key: 'user', value: 'a b' },
        { key: 'pass', value: "p'w" },
      ],
    })
    expect(cmd).toBe(`curl -X POST 'https://a.com/login' --data-urlencode 'user=a b' --data-urlencode 'pass=p'\\''w'`)
  })

  it('builds multipart form-data body with -F', () => {
    const cmd = buildCurl({
      method: 'POST',
      url: 'https://a.com/upload',
      bodyMode: 'form-data',
      formEncoding: 'form-data',
      formPairs: [
        { key: 'name', value: 'file' },
        { key: 'skip', value: 'x', enabled: false },
      ],
    })
    expect(cmd).toBe(`curl -X POST 'https://a.com/upload' -F 'name=file'`)
  })

  it('raw body preserves newlines', () => {
    const cmd = buildCurl({
      method: 'PUT',
      url: 'https://a.com',
      bodyMode: 'raw',
      rawLang: 'text',
      rawBody: 'line1\nline2',
    })
    expect(cmd).toBe(`curl -X PUT 'https://a.com' --data-raw 'line1
line2'`)
  })

  it('roundtrips through shellQuote for tricky values', () => {
    const cmd = buildCurl({
      method: 'POST',
      url: `https://a.com/it's`,
      bodyMode: 'raw',
      rawLang: 'text',
      rawBody: `he said "hi" & left`,
    })
    expect(cmd).toContain(`'https://a.com/it'\\''s'`)
    expect(cmd).toContain(`'he said "hi" & left'`)
  })
})

describe('rawContentType', () => {
  it('maps languages', () => {
    expect(rawContentType('json')).toBe('application/json')
    expect(rawContentType('xml')).toBe('application/xml')
    expect(rawContentType('html')).toBe('text/html')
    expect(rawContentType('text')).toBe('text/plain')
    expect(rawContentType('unknown')).toBe('text/plain')
  })
})

describe('splitUrlQuery', () => {
  it('returns base only when no query', () => {
    expect(splitUrlQuery('https://a.com/x')).toEqual({ base: 'https://a.com/x', queryParams: [] })
  })

  it('splits query pairs and decodes', () => {
    expect(splitUrlQuery('https://a.com/x?a=1&b=hello%20world')).toEqual({
      base: 'https://a.com/x',
      queryParams: [
        { key: 'a', value: '1' },
        { key: 'b', value: 'hello world' },
      ],
    })
  })

  it('handles valueless keys', () => {
    expect(splitUrlQuery('https://a.com?flag&x=2')).toEqual({
      base: 'https://a.com',
      queryParams: [
        { key: 'flag', value: '' },
        { key: 'x', value: '2' },
      ],
    })
  })
})
