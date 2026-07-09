import { describe, it, expect, beforeEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import kimiK2 from './kimi-k2.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURE = readFileSync(
  path.join(__dirname, '../__fixtures__/mini.tiktoken'),
  'utf8',
)

function stubFixture() {
  vi.stubGlobal('fetch', async () => ({
    ok: true,
    status: 200,
    text: async () => FIXTURE,
  }))
}

describe('kimi-k2 module — config shape', () => {
  it('exposes the kimi-k2 config entry with the required fields', () => {
    const cfg = kimiK2.config
    expect(cfg.id).toBe('kimi-k2')
    expect(cfg.label).toBe('Kimi K2.7-Code')
    expect(cfg.tokenizer.type).toBe('tiktoken')
    expect(cfg.tokenizer.file).toBe('/tokenizers/kimi-k2.tiktoken')
    expect(cfg.tokenizer.specialTokens).toBeInstanceOf(Object)
    expect(cfg.tokenizer.specialTokens['<|im_end|>']).toBe(163586)
    expect(cfg.tokenizer.specialTokens['<|im_user|>']).toBe(163587)
    expect(cfg.tokenizer.specialTokens['<|im_assistant|>']).toBe(163588)
    expect(cfg.tokenizer.specialTokens['<|im_system|>']).toBe(163594)
    expect(cfg.tokenizer.specialTokens['<|im_middle|>']).toBe(163601)
    expect(cfg.chatTemplate).toBe('kimi-k2')
  })
})

describe('kimi-k2 module — load() adapter', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns an adapter with encode + decodeId methods', async () => {
    stubFixture()
    const adapter = await kimiK2.load()
    expect(typeof adapter.encode).toBe('function')
    expect(typeof adapter.decodeId).toBe('function')
  })

  it('decodes single-byte known answers: ! -> rank 0, " -> rank 1', async () => {
    stubFixture()
    const adapter = await kimiK2.load()
    expect(adapter.encode('!')).toEqual([0])
    expect(adapter.encode('!"').length).toBe(2)
  })

  it('collapses registered special-token strings to single ids', async () => {
    stubFixture()
    const adapter = await kimiK2.load()
    expect(adapter.encode('<|im_end|>')).toEqual([163586])
    expect(adapter.encode('<|im_user|>')).toEqual([163587])
    expect(adapter.encode('<|im_system|>')).toEqual([163594])
    // Ordinary text still byte-BPEs to multiple ids.
    expect(adapter.encode('hello').length).toBeGreaterThan(1)
  })

  it('decodes a special-token id back to its surface string', async () => {
    stubFixture()
    const adapter = await kimiK2.load()
    expect(adapter.decodeId(163586)).toBe('<|im_end|>')
    expect(adapter.decodeId(71)).toBe('h')
  })

  it('throws when fetch rejects', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new Error('network')
    })
    await expect(kimiK2.load()).rejects.toThrow()
  })

  it('throws when fetch returns 404', async () => {
    vi.stubGlobal('fetch', async () => ({
      ok: false,
      status: 404,
      text: async () => 'not found',
    }))
    await expect(kimiK2.load()).rejects.toThrow()
  })
})

describe('kimi-k2 module — renderMessages (ChatML template)', () => {
  it('renders a single user message with the full ChatML envelope', () => {
    expect(kimiK2.renderMessages([{ role: 'user', content: 'hi' }])).toBe(
      '<|im_user|>user<|im_middle|>hi<|im_end|><|im_assistant|>assistant<|im_middle|>',
    )
  })

  it('renders system + user in order', () => {
    expect(
      kimiK2.renderMessages([
        { role: 'system', content: 'be helpful' },
        { role: 'user', content: 'hi' },
      ]),
    ).toBe(
      '<|im_system|>system<|im_middle|>be helpful<|im_end|>' +
        '<|im_user|>user<|im_middle|>hi<|im_end|>' +
        '<|im_assistant|>assistant<|im_middle|>',
    )
  })

  it('uses an explicit name when provided', () => {
    expect(
      kimiK2.renderMessages([{ role: 'user', name: 'alice', content: 'hi' }]),
    ).toBe(
      '<|im_user|>alice<|im_middle|>hi<|im_end|><|im_assistant|>assistant<|im_middle|>',
    )
  })

  it('appends the open assistant tail exactly once', () => {
    const out = kimiK2.renderMessages([{ role: 'user', content: 'x' }])
    const tail = '<|im_assistant|>assistant<|im_middle|>'
    expect(out.endsWith(tail)).toBe(true)
    expect(out.indexOf(tail)).toBe(out.length - tail.length)
  })

  it('throws on unknown role', () => {
    expect(() => kimiK2.renderMessages([{ role: 'tool', content: 'x' }])).toThrow(
      /Unknown role/,
    )
  })
})
