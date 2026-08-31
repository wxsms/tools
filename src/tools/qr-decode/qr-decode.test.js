import { describe, it, expect } from 'vitest'
import { detectType } from './qr-decode.js'

describe('detectType — URL', () => {
  it('recognizes https URL', () => {
    const r = detectType('https://example.com/path?q=1')
    expect(r.type).toBe('url')
    expect(r.title).toBe('URL')
    expect(r.fields[0].label).toBe('链接')
    expect(r.fields[0].value).toBe('https://example.com/path?q=1')
    expect(r.fields[0].action).toBe('link')
  })

  it('recognizes http URL', () => {
    expect(detectType('http://foo.bar').type).toBe('url')
  })

  it('recognizes ftp URL', () => {
    expect(detectType('ftp://ftp.example.com').type).toBe('url')
  })
})

describe('detectType — WiFi', () => {
  it('parses WPA with password', () => {
    const r = detectType('WIFI:T:WPA;S:MySSID;P:p@ssw0rd;;')
    expect(r.type).toBe('wifi')
    const map = Object.fromEntries(r.fields.map(f => [f.label, f.value]))
    expect(map['SSID']).toBe('MySSID')
    expect(map['密码']).toBe('p@ssw0rd')
    expect(map['加密类型']).toBe('WPA')
  })

  it('parses WEP', () => {
    const r = detectType('WIFI:T:WEP;S:Net;P:12345;;')
    const map = Object.fromEntries(r.fields.map(f => [f.label, f.value]))
    expect(map['加密类型']).toBe('WEP')
  })

  it('parses nopass', () => {
    const r = detectType('WIFI:T:nopass;S:OpenNet;;')
    const map = Object.fromEntries(r.fields.map(f => [f.label, f.value]))
    expect(map['加密类型']).toBe('无密码')
    expect(map['密码']).toBe('')
  })

  it('unescapes special chars', () => {
    const r = detectType('WIFI:T:WPA;S:My\\;SSID;P:p\\:ss;;')
    const map = Object.fromEntries(r.fields.map(f => [f.label, f.value]))
    expect(map['SSID']).toBe('My;SSID')
    expect(map['密码']).toBe('p:ss')
  })

  it('is case-insensitive on the WIFI prefix', () => {
    expect(detectType('wifi:T:WPA;S:X;P:y;;').type).toBe('wifi')
  })
})

describe('detectType — vCard', () => {
  it('parses common fields', () => {
    const text = 'BEGIN:VCARD\nVERSION:3.0\nFN:张三\nTEL:13800138000\nEMAIL:zs@example.com\nORG:Acme\nEND:VCARD'
    const r = detectType(text)
    expect(r.type).toBe('vcard')
    const map = Object.fromEntries(r.fields.map(f => [f.label, f.value]))
    expect(map['姓名']).toBe('张三')
    expect(map['电话']).toBe('13800138000')
    expect(map['邮箱']).toBe('zs@example.com')
    expect(map['组织']).toBe('Acme')
  })

  it('falls back to N when FN absent', () => {
    const text = 'BEGIN:VCARD\nVERSION:3.0\nN:Doe;John;;;\nTEL:123\nEND:VCARD'
    const r = detectType(text)
    const map = Object.fromEntries(r.fields.map(f => [f.label, f.value]))
    expect(map['姓名']).toBe('Doe John')
  })

  it('is case-insensitive on BEGIN:VCARD', () => {
    expect(detectType('begin:vcard\nEND:VCARD').type).toBe('vcard')
  })
})

describe('detectType — mailto', () => {
  it('parses plain address', () => {
    const r = detectType('mailto:foo@bar.com')
    expect(r.type).toBe('mailto')
    expect(r.fields[0].value).toBe('foo@bar.com')
  })

  it('parses with subject', () => {
    const r = detectType('mailto:foo@bar.com?subject=Hi')
    const map = Object.fromEntries(r.fields.map(f => [f.label, f.value]))
    expect(map['邮箱']).toBe('foo@bar.com')
    expect(map['主题']).toBe('Hi')
  })

  it('parses with subject and body', () => {
    const r = detectType('mailto:foo@bar.com?subject=Hi&body=Hello')
    const map = Object.fromEntries(r.fields.map(f => [f.label, f.value]))
    expect(map['主题']).toBe('Hi')
    expect(map['正文']).toBe('Hello')
  })

  it('is case-insensitive', () => {
    expect(detectType('MAILTO:foo@bar.com').type).toBe('mailto')
  })
})

describe('detectType — tel', () => {
  it('parses phone', () => {
    const r = detectType('tel:+8613800138000')
    expect(r.type).toBe('tel')
    expect(r.fields[0].value).toBe('+8613800138000')
    expect(r.fields[0].action).toBe('link')
  })
})

describe('detectType — sms', () => {
  it('parses number only', () => {
    const r = detectType('sms:13800138000')
    expect(r.type).toBe('sms')
    expect(r.fields[0].value).toBe('13800138000')
  })

  it('parses with body', () => {
    const r = detectType('sms:13800138000?body=Hello')
    const map = Object.fromEntries(r.fields.map(f => [f.label, f.value]))
    expect(map['号码']).toBe('13800138000')
    expect(map['内容']).toBe('Hello')
  })

  it('parses smsto scheme', () => {
    expect(detectType('smsto:13800138000').type).toBe('sms')
  })
})

describe('detectType — geo', () => {
  it('parses coordinates', () => {
    const r = detectType('geo:39.9,116.4')
    expect(r.type).toBe('geo')
    const map = Object.fromEntries(r.fields.map(f => [f.label, f.value]))
    expect(map['纬度']).toBe('39.9')
    expect(map['经度']).toBe('116.4')
    expect(r.fields.some(f => f.action === 'link')).toBe(true)
  })
})

describe('detectType — text fallback', () => {
  it('returns text for plain string', () => {
    const r = detectType('hello world')
    expect(r.type).toBe('text')
    expect(r.title).toBe('纯文本')
  })

  it('returns text for empty string', () => {
    expect(detectType('').type).toBe('text')
  })

  it('returns text for whitespace-only string', () => {
    expect(detectType('   ').type).toBe('text')
  })

  it('returns text for unknown scheme', () => {
    expect(detectType('foo:bar').type).toBe('text')
  })

  it('returns text for null/undefined input', () => {
    expect(detectType(null).type).toBe('text')
    expect(detectType(undefined).type).toBe('text')
  })
})
