import { describe, it, expect } from 'vitest'
import { htmlToMarkdown } from './md-html.js'

describe('htmlToMarkdown', () => {
  it('converts <h1>', () => {
    expect(htmlToMarkdown('<h1>x</h1>')).toBe('# x')
  })

  it('converts <h2>', () => {
    expect(htmlToMarkdown('<h2>x</h2>')).toBe('## x')
  })

  it('converts <h3>', () => {
    expect(htmlToMarkdown('<h3>x</h3>')).toBe('### x')
  })

  it('converts <h6>', () => {
    expect(htmlToMarkdown('<h6>x</h6>')).toBe('###### x')
  })

  it('converts <p>', () => {
    expect(htmlToMarkdown('<p>hello</p>')).toBe('hello')
  })

  it('converts <strong>', () => {
    expect(htmlToMarkdown('<strong>x</strong>')).toContain('**x**')
  })

  it('converts <b>', () => {
    expect(htmlToMarkdown('<b>x</b>')).toContain('**x**')
  })

  it('converts <em>', () => {
    expect(htmlToMarkdown('<em>x</em>')).toContain('*x*')
  })

  it('converts <i>', () => {
    expect(htmlToMarkdown('<i>x</i>')).toContain('*x*')
  })

  it('converts <del>', () => {
    expect(htmlToMarkdown('<del>x</del>')).toContain('~~x~~')
  })

  it('converts inline <code>', () => {
    expect(htmlToMarkdown('<code>x</code>')).toContain('`x`')
  })

  it('converts <pre><code> code block', () => {
    const out = htmlToMarkdown('<pre><code class="language-js">console.log(1)</code></pre>')
    expect(out).toContain('```js')
    expect(out).toContain('console.log(1)')
    expect(out).toContain('```')
  })

  it('converts <a>', () => {
    expect(htmlToMarkdown('<a href="u">t</a>')).toContain('[t](u)')
  })

  it('converts <img>', () => {
    expect(htmlToMarkdown('<img src="s" alt="a">')).toContain('![a](s)')
  })

  it('converts <ul>', () => {
    const out = htmlToMarkdown('<ul><li>a</li><li>b</li></ul>')
    expect(out).toContain('- a')
    expect(out).toContain('- b')
  })

  it('converts <ol>', () => {
    const out = htmlToMarkdown('<ol><li>a</li><li>b</li></ol>')
    expect(out).toContain('1. a')
    expect(out).toContain('2. b')
  })

  it('converts <blockquote>', () => {
    expect(htmlToMarkdown('<blockquote>x</blockquote>')).toContain('> x')
  })

  it('converts <hr>', () => {
    expect(htmlToMarkdown('<hr>')).toContain('---')
  })

  it('converts <table>', () => {
    const out = htmlToMarkdown('<table><tr><th>H</th></tr><tr><td>a</td></tr></table>')
    expect(out).toContain('| H |')
    expect(out).toContain('|----------|')
    expect(out).toContain('| a |')
  })

  it('returns empty string for empty input', () => {
    expect(htmlToMarkdown('')).toBe('')
  })

  it('converts composite HTML', () => {
    const out = htmlToMarkdown('<h1>T</h1><p>para</p>')
    expect(out).toContain('# T')
    expect(out).toContain('para')
  })
})
