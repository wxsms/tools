import { describe, it, expect } from 'vitest'
import {
  xmlEscape, normalizeColor, displayText, fontSizeFor, buildSvg, svgToDataUri, svgToBase64Uri,
} from './placeholder.js'

describe('xmlEscape', () => {
  it('escapes XML special characters', () => {
    expect(xmlEscape(`<a & "b" 'c'>`)).toBe('&lt;a &amp; &quot;b&quot; &#39;c&#39;&gt;')
  })

  it('handles null and undefined', () => {
    expect(xmlEscape(null)).toBe('')
    expect(xmlEscape(undefined)).toBe('')
  })
})

describe('normalizeColor', () => {
  it('accepts hex 3/6/8 digits', () => {
    expect(normalizeColor('#abc', 'x')).toBe('#abc')
    expect(normalizeColor('#AABBCC', 'x')).toBe('#AABBCC')
    expect(normalizeColor('#aabbccdd', 'x')).toBe('#aabbccdd')
  })

  it('accepts rgb()/hsl() functional forms', () => {
    expect(normalizeColor('rgb(1, 2, 3)', 'x')).toBe('rgb(1, 2, 3)')
    expect(normalizeColor('HSLA(0,0%,0%,.5)', 'x')).toBe('HSLA(0,0%,0%,.5)')
  })

  it('accepts known named colors', () => {
    expect(normalizeColor('Tomato', 'x')).toBe('Tomato')
    expect(normalizeColor('transparent', 'x')).toBe('transparent')
  })

  it('falls back on invalid input', () => {
    expect(normalizeColor('javascript:alert(1)', '#ccc')).toBe('#ccc')
    expect(normalizeColor('', '#ccc')).toBe('#ccc')
    expect(normalizeColor('#12', '#ccc')).toBe('#ccc')
  })
})

describe('displayText', () => {
  it('defaults to width × height', () => {
    expect(displayText('', 600, 400)).toBe('600 × 400')
    expect(displayText(null, 600, 400)).toBe('600 × 400')
  })

  it('supports {w} and {h} placeholders', () => {
    expect(displayText('{w}x{h}', 640, 480)).toBe('640x480')
  })

  it('keeps custom text as-is', () => {
    expect(displayText('  Hero Image  ', 600, 400)).toBe('Hero Image')
  })
})

describe('fontSizeFor', () => {
  it('scales with the short side', () => {
    // "600 × 400" = 9 字符,byLineLength = 400*1.6/9 ≈ 71 成为限制项
    expect(fontSizeFor('600 × 400', 600, 400)).toBe(71)
    expect(fontSizeFor('60 × 40', 60, 40)).toBe(8)
  })

  it('shrinks for long text', () => {
    const short = fontSizeFor('Hi', 600, 400)
    const long = fontSizeFor('A'.repeat(40), 600, 400)
    expect(long).toBeLessThan(short)
    expect(long).toBeGreaterThanOrEqual(8)
  })

  it('caps at 120', () => {
    expect(fontSizeFor('x', 2000, 2000)).toBe(120)
  })
})

describe('buildSvg', () => {
  it('produces svg with size, colors and default label', () => {
    const svg = buildSvg({ width: 600, height: 400, background: '#eee', foreground: '#333' })
    expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">')
    expect(svg).toContain('fill="#eee"')
    expect(svg).toContain('fill="#333"')
    expect(svg).toContain('600 × 400')
  })

  it('renders custom text with escaped characters', () => {
    const svg = buildSvg({
      width: 300, height: 200, background: '#fff', foreground: '#000', text: `<b>&"`,
    })
    expect(svg).toContain('&lt;b&gt;&amp;&quot;')
    expect(svg).not.toContain('<b>')
  })

  it('renders multiple lines as tspans', () => {
    const svg = buildSvg({
      width: 300, height: 200, background: '#fff', foreground: '#000', text: 'line1\nline2',
    })
    expect((svg.match(/<tspan /g) || []).length).toBe(2)
  })

  it('does not break attributes with quotes in colors (fallback handled upstream)', () => {
    const svg = buildSvg({ width: 10, height: 10, background: `"onload="`, foreground: '#000' })
    expect(svg).toContain('fill="&quot;onload=&quot;"')
  })
})

describe('data uris', () => {
  it('svgToDataUri percent-encodes the svg', () => {
    expect(svgToDataUri('<svg/>')).toBe('data:image/svg+xml,%3Csvg%2F%3E')
  })

  it('svgToBase64Uri encodes ascii-safe base64', () => {
    const uri = svgToBase64Uri('<svg/>')
    expect(uri).toBe('data:image/svg+xml;base64,PHN2Zy8+')
  })
})
