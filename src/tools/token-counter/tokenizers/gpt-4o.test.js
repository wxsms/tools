import { describe, it, expect } from 'vitest'

import gpt4o from './gpt-4o.js'

describe('gpt-4o module — config shape', () => {
  it('exposes the gpt-4o config entry with the required fields', () => {
    const cfg = gpt4o.config
    expect(cfg.id).toBe('gpt-4o')
    expect(cfg.label).toBe('GPT-4o')
    expect(cfg.tokenizer.type).toBe('tiktoken-builtin')
    expect(cfg.chatTemplate).toBe('gpt-4o-chatml')
  })
})

describe('gpt-4o module — load() adapter', () => {
  it('returns an adapter with encode + decodeId methods', async () => {
    const adapter = await gpt4o.load()
    expect(typeof adapter.encode).toBe('function')
    expect(typeof adapter.decodeId).toBe('function')
  })

  it('encodes plain ASCII text to a positive token count', async () => {
    const adapter = await gpt4o.load()
    // Canonical o200k_base sanity check: "hello world" is exactly 2 tokens.
    expect(adapter.encode('hello world')).toEqual([24912, 2375])
    expect(adapter.encode('hello world').length).toBe(2)
  })

  it('collapses registered harmony special-token strings to single ids', async () => {
    const adapter = await gpt4o.load()
    expect(adapter.encode('<|start|>')).toEqual([200006])
    expect(adapter.encode('<|end|>')).toEqual([200007])
    expect(adapter.encode('<|message|>')).toEqual([200008])
    expect(adapter.encode('<|return|>')).toEqual([200002])
  })

  it('encodes a full single-message envelope to the expected id sequence', async () => {
    const adapter = await gpt4o.load()
    // <.|start|>user<|message|>hi<|end|><|start|>assistant<|message|>
    // 200006  user(1428)  200008  hi(3686)  200007  200006  assistant(173781)  200008
    expect(
      adapter.encode('<|start|>user<|message|>hi<|end|><|start|>assistant<|message|>'),
    ).toEqual([200006, 1428, 200008, 3686, 200007, 200006, 173781, 200008])
  })

  it('decodes a special-token id back to its surface string', async () => {
    const adapter = await gpt4o.load()
    expect(adapter.decodeId(200006)).toBe('<|start|>')
    expect(adapter.decodeId(200007)).toBe('<|end|>')
  })
})

describe('gpt-4o module — renderMessages (ChatML template)', () => {
  it('renders a single user message with the full ChatML envelope', () => {
    expect(gpt4o.renderMessages([{ role: 'user', content: 'hi' }])).toBe(
      '<|start|>user<|message|>hi<|end|><|start|>assistant<|message|>',
    )
  })

  it('renders system + user in order', () => {
    expect(
      gpt4o.renderMessages([
        { role: 'system', content: 'be helpful' },
        { role: 'user', content: 'hi' },
      ]),
    ).toBe(
      '<|start|>system<|message|>be helpful<|end|>' +
        '<|start|>user<|message|>hi<|end|>' +
        '<|start|>assistant<|message|>',
    )
  })

  it('uses an explicit name with <|return|> separator when provided', () => {
    expect(
      gpt4o.renderMessages([{ role: 'user', name: 'alice', content: 'hi' }]),
    ).toBe(
      '<|start|>user<|return|>alice<|message|>hi<|end|><|start|>assistant<|message|>',
    )
  })

  it('appends the open assistant tail exactly once', () => {
    const out = gpt4o.renderMessages([{ role: 'user', content: 'x' }])
    const tail = '<|start|>assistant<|message|>'
    expect(out.endsWith(tail)).toBe(true)
    expect(out.indexOf(tail)).toBe(out.length - tail.length)
  })

  it('throws on unknown role', () => {
    expect(() =>
      gpt4o.renderMessages([{ role: 'developer', content: 'x' }]),
    ).toThrow(/Unknown role/)
  })
})
