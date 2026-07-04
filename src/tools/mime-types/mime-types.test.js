import { describe, it, expect } from 'vitest'
import { MIME_TYPES, getMimeGroups, searchMimeTypes } from './mime-types.js'

describe('MIME_TYPES data', () => {
  it('has at least 100 entries', () => {
    expect(MIME_TYPES.length).toBeGreaterThanOrEqual(100)
  })

  it('every entry has type, exts, and desc', () => {
    MIME_TYPES.forEach(item => {
      expect(item.type).toBeTruthy()
      expect(item.exts).toBeInstanceOf(Array)
      expect(item.exts.length).toBeGreaterThan(0)
      expect(item.desc).toBeTruthy()
    })
  })

  it('every type has a valid category prefix', () => {
    const validPrefixes = ['application', 'audio', 'font', 'image', 'message', 'model', 'multipart', 'text', 'video']
    MIME_TYPES.forEach(item => {
      const prefix = item.type.split('/')[0]
      expect(validPrefixes).toContain(prefix)
    })
  })
})

describe('getMimeGroups', () => {
  it('groups items by category', () => {
    const groups = getMimeGroups()
    expect(groups.length).toBeGreaterThan(0)
    groups.forEach(g => {
      expect(g.name).toBeTruthy()
      expect(g.items.length).toBeGreaterThan(0)
    })
  })
})

describe('searchMimeTypes', () => {
  it('finds by MIME type', () => {
    const results = searchMimeTypes('application/pdf')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].type).toBe('application/pdf')
  })

  it('finds by extension', () => {
    const results = searchMimeTypes('pdf')
    expect(results.some(r => r.type === 'application/pdf')).toBe(true)
  })

  it('finds by description', () => {
    const results = searchMimeTypes('PDF')
    expect(results.some(r => r.type === 'application/pdf')).toBe(true)
  })

  it('is case insensitive', () => {
    const results = searchMimeTypes('PDF')
    expect(results.length).toBeGreaterThan(0)
  })

  it('returns empty for no match', () => {
    const results = searchMimeTypes('zzzzzznotreal')
    expect(results).toEqual([])
  })

  it('returns all when query is empty', () => {
    const results = searchMimeTypes('')
    expect(results.length).toBe(MIME_TYPES.length)
  })
})
