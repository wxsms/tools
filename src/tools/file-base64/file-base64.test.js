import { describe, it, expect } from 'vitest'
import {
  IMAGE_MIMES,
  formatSize,
  mimeToExt,
  parseDataUrl,
  buildImageSrc,
} from './file-base64.js'

describe('IMAGE_MIMES', () => {
  it('contains 7 image mime types', () => {
    expect(IMAGE_MIMES).toHaveLength(7)
    expect(IMAGE_MIMES).toContain('image/png')
    expect(IMAGE_MIMES).toContain('image/jpeg')
    expect(IMAGE_MIMES).toContain('image/gif')
    expect(IMAGE_MIMES).toContain('image/svg+xml')
    expect(IMAGE_MIMES).toContain('image/webp')
    expect(IMAGE_MIMES).toContain('image/bmp')
    expect(IMAGE_MIMES).toContain('image/x-icon')
  })
})

describe('formatSize', () => {
  it('formats 0 bytes', () => {
    expect(formatSize(0)).toBe('0 B')
  })

  it('formats bytes under 1 KB', () => {
    expect(formatSize(1023)).toBe('1023 B')
  })

  it('formats exactly 1 KB', () => {
    expect(formatSize(1024)).toBe('1.0 KB')
  })

  it('formats 1.5 KB', () => {
    expect(formatSize(1536)).toBe('1.5 KB')
  })

  it('formats exactly 1 MB', () => {
    expect(formatSize(1048576)).toBe('1.00 MB')
  })

  it('formats 5 MB', () => {
    expect(formatSize(5242880)).toBe('5.00 MB')
  })
})

describe('mimeToExt', () => {
  it('maps image/png', () => {
    expect(mimeToExt('image/png')).toBe('.png')
  })

  it('maps image/jpeg', () => {
    expect(mimeToExt('image/jpeg')).toBe('.jpg')
  })

  it('maps image/svg+xml', () => {
    expect(mimeToExt('image/svg+xml')).toBe('.svg')
  })

  it('maps application/pdf', () => {
    expect(mimeToExt('application/pdf')).toBe('.pdf')
  })

  it('maps text/plain', () => {
    expect(mimeToExt('text/plain')).toBe('.txt')
  })

  it('maps application/json', () => {
    expect(mimeToExt('application/json')).toBe('.json')
  })

  it('returns .bin for unknown mime', () => {
    expect(mimeToExt('unknown/x')).toBe('.bin')
  })
})

describe('parseDataUrl', () => {
  it('parses data URL with image/png', () => {
    expect(parseDataUrl('data:image/png;base64,abc==')).toEqual({ base64: 'abc==', mime: 'image/png' })
  })

  it('parses data URL with text/plain', () => {
    expect(parseDataUrl('data:text/plain;base64,aGVsbG8=')).toEqual({ base64: 'aGVsbG8=', mime: 'text/plain' })
  })

  it('treats plain base64 as octet-stream', () => {
    expect(parseDataUrl('plainbase64')).toEqual({ base64: 'plainbase64', mime: 'application/octet-stream' })
  })

  it('returns null for malformed data URL', () => {
    expect(parseDataUrl('data:bad')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(parseDataUrl('')).toBeNull()
  })

  it('trims input before parsing', () => {
    expect(parseDataUrl('  data:image/png;base64,abc==  ')).toEqual({ base64: 'abc==', mime: 'image/png' })
  })
})

describe('buildImageSrc', () => {
  it('returns raw unchanged when it is a data:image URL', () => {
    expect(buildImageSrc('data:image/png;base64,abc', 'image/png')).toBe('data:image/png;base64,abc')
  })

  it('builds data URL for image/png raw base64', () => {
    expect(buildImageSrc('abc', 'image/png')).toBe('data:image/png;base64,abc')
  })

  it('builds data URL for image/jpeg raw base64', () => {
    expect(buildImageSrc('abc', 'image/jpeg')).toBe('data:image/jpeg;base64,abc')
  })

  it('returns empty string for non-image mime', () => {
    expect(buildImageSrc('abc', 'application/pdf')).toBe('')
  })

  it('returns empty string for empty raw', () => {
    expect(buildImageSrc('', 'image/png')).toBe('')
  })

  it('returns raw data URL unchanged even when mime differs', () => {
    expect(buildImageSrc('data:image/gif;base64,xyz', 'image/png')).toBe('data:image/gif;base64,xyz')
  })
})
