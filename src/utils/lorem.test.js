import { describe, it, expect } from 'vitest'
import { generateLorem } from './lorem.js'

describe('generateLorem', () => {
  it('generates English text with default params', () => {
    const result = generateLorem({ lang: 'en', paragraphs: 3, sentencesPerParagraph: [3, 5] })
    expect(result.length).toBe(3)
    result.forEach(p => {
      expect(p.split(/[.!?]/).filter(Boolean).length).toBeGreaterThanOrEqual(3)
      expect(p.split(/[.!?]/).filter(Boolean).length).toBeLessThanOrEqual(5)
    })
  })

  it('generates Chinese text', () => {
    const result = generateLorem({ lang: 'zh', paragraphs: 2, sentencesPerParagraph: [2, 4] })
    expect(result.length).toBe(2)
    result.forEach(p => {
      expect(p).toBeTruthy()
    })
  })

  it('returns empty array for 0 paragraphs', () => {
    const result = generateLorem({ lang: 'en', paragraphs: 0, sentencesPerParagraph: [3, 5] })
    expect(result).toEqual([])
  })

  it('respects paragraph count', () => {
    const result = generateLorem({ lang: 'en', paragraphs: 5, sentencesPerParagraph: [1, 1] })
    expect(result.length).toBe(5)
  })

  it('respects sentence count range', () => {
    const result = generateLorem({ lang: 'en', paragraphs: 10, sentencesPerParagraph: [2, 2] })
    result.forEach(p => {
      const sentenceCount = p.split(/[.!?]/).filter(s => s.trim()).length
      expect(sentenceCount).toBe(2)
    })
  })

  it('generates different text on successive calls', () => {
    const result1 = generateLorem({ lang: 'en', paragraphs: 3, sentencesPerParagraph: [3, 5] })
    const result2 = generateLorem({ lang: 'en', paragraphs: 3, sentencesPerParagraph: [3, 5] })
    expect(result1.join('')).not.toBe(result2.join(''))
  })
})
