import { describe, it, expect } from 'vitest'

import gpt3_5 from './gpt-3-5.js'

describe('gpt-3.5 module — config shape', () => {
  it('exposes the gpt-3.5 config entry with the required fields', () => {
    const cfg = gpt3_5.config
    expect(cfg.id).toBe('gpt-3.5-turbo')
    expect(cfg.label).toBe('GPT-3.5')
    expect(cfg.tokenizer.type).toBe('tiktoken-builtin')
    expect(cfg.chatTemplate).toBe('gpt-3.5-chatml')
  })
})

describe('gpt-3.5 module — load() adapter', () => {
  it('returns an adapter with encode + decodeId methods', async () => {
    const adapter = await gpt3_5.load()
    expect(typeof adapter.encode).toBe('function')
    expect(typeof adapter.decodeId).toBe('function')
  })

  it('encodes plain ASCII text to a positive token count', async () => {
    const adapter = await gpt3_5.load()
    // Canonical cl100k_base sanity check: "hello world" is exactly 2 tokens.
    expect(adapter.encode('hello world')).toEqual([15339, 1917])
    expect(adapter.encode('hello world').length).toBe(2)
  })

  it('collapses registered ChatML special-token strings to single ids', async () => {
    const adapter = await gpt3_5.load()
    expect(adapter.encode('<|im_start|>')).toEqual([100264])
    expect(adapter.encode('<|im_end|>')).toEqual([100265])
  })

  it('encodes a full single-message envelope to the expected id sequence', async () => {
    const adapter = await gpt3_5.load()
    // <|im_start|>user\nhi<|im_end|>\n<|im_start|>assistant\n
    // 100264  882  198  6151  100265  198  100264  78191  198
    expect(
      adapter.encode('<|im_start|>user\nhi<|im_end|>\n<|im_start|>assistant\n'),
    ).toEqual([100264, 882, 198, 6151, 100265, 198, 100264, 78191, 198])
  })

  it('decodes a special-token id back to its surface string', async () => {
    const adapter = await gpt3_5.load()
    expect(adapter.decodeId(100264)).toBe('<|im_start|>')
    expect(adapter.decodeId(100265)).toBe('<|im_end|>')
  })
})

describe('gpt-3.5 module — renderMessages (ChatML template)', () => {
  it('renders a single user message with the full ChatML envelope', () => {
    expect(gpt3_5.renderMessages([{ role: 'user', content: 'hi' }])).toBe(
      '<|im_start|>user\nhi<|im_end|>\n<|im_start|>assistant\n',
    )
  })

  it('renders system + user in order', () => {
    expect(
      gpt3_5.renderMessages([
        { role: 'system', content: 'be helpful' },
        { role: 'user', content: 'hi' },
      ]),
    ).toBe(
      '<|im_start|>system\nbe helpful<|im_end|>\n' +
        '<|im_start|>user\nhi<|im_end|>\n' +
        '<|im_start|>assistant\n',
    )
  })

  it('uses an explicit name with a separator line when provided', () => {
    expect(
      gpt3_5.renderMessages([{ role: 'user', name: 'alice', content: 'hi' }]),
    ).toBe(
      '<|im_start|>user\nalice\nhi<|im_end|>\n<|im_start|>assistant\n',
    )
  })

  it('appends the open assistant tail exactly once', () => {
    const out = gpt3_5.renderMessages([{ role: 'user', content: 'x' }])
    const tail = '<|im_start|>assistant\n'
    expect(out.endsWith(tail)).toBe(true)
    expect(out.indexOf(tail)).toBe(out.length - tail.length)
  })

  it('throws on unknown role', () => {
    expect(() =>
      gpt3_5.renderMessages([{ role: 'developer', content: 'x' }]),
    ).toThrow(/Unknown role/)
  })
})
