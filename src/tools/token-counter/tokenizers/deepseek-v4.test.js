import { describe, it, expect, beforeEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import deepseekV4 from './deepseek-v4.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TOKENIZER_JSON = readFileSync(
  path.join(__dirname, '../../../../public/tokenizers/deepseek-v4-pro.json'),
  'utf8',
)

// DeepSeek-V4 envelope string constants, byte-exact (see deepseek-v4.js).
//   "｜"  U+FF5C at angle-bracket boundaries
//   "▁"   U+2581 between word segments
const BOS = '<\uff5cbegin\u2581of\u2581sentence\uff5c>'
const EOS = '<\uff5cend\u2581of\u2581sentence\uff5c>'
const USER = '<\uff5cUser\uff5c>'
const ASSISTANT = '<\uff5cAssistant\uff5c>'
const THINKING_END = String.fromCharCode(
  0x3c, 0x2f, 0x74, 0x68, 0x69, 0x6e, 0x6b, 0x3e,
)

function stubFixture() {
  vi.stubGlobal('fetch', async () => ({
    ok: true,
    status: 200,
    text: async () => TOKENIZER_JSON,
  }))
}

describe('deepseek-v4 module — config shape', () => {
  it('exposes the deepseek-v4-pro config entry with the required fields', () => {
    const cfg = deepseekV4.config
    expect(cfg.id).toBe('deepseek-v4-pro')
    expect(cfg.label).toBe('DeepSeek V4 Pro')
    expect(cfg.tokenizer.type).toBe('hf')
    expect(cfg.tokenizer.file).toBe('/tokenizers/deepseek-v4-pro.json')
    expect(cfg.chatTemplate).toBe('deepseek-v4')
  })
})

describe('deepseek-v4 module — load() adapter', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns an adapter with encode + decodeId methods', async () => {
    stubFixture()
    const adapter = await deepseekV4.load()
    expect(typeof adapter.encode).toBe('function')
    expect(typeof adapter.decodeId).toBe('function')
  })

  it('encodes plain ASCII text to a positive token count', async () => {
    stubFixture()
    const adapter = await deepseekV4.load()
    expect(adapter.encode('hello world').length).toBeGreaterThan(0)
  })

  it('collapses the BOS literal to a single special-token id (0)', async () => {
    stubFixture()
    const adapter = await deepseekV4.load()
    expect(adapter.encode(BOS)).toEqual([0])
  })

  it('decodes the BOS id back to its surface string', async () => {
    stubFixture()
    const adapter = await deepseekV4.load()
    expect(adapter.decodeId(0)).toBe(BOS)
  })

  it('throws when fetch rejects', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new Error('boom')
    })
    await expect(deepseekV4.load()).rejects.toThrow()
  })

  it('throws when fetch returns 404', async () => {
    vi.stubGlobal('fetch', async () => ({
      ok: false,
      status: 404,
      text: async () => 'not found',
    }))
    await expect(deepseekV4.load()).rejects.toThrow()
  })
})

describe('deepseek-v4 module — renderMessages (chat-mode template)', () => {
  it('renders a single user message: BOS + <|User|>hi + assistant tail', () => {
    const out = deepseekV4.renderMessages([{ role: 'user', content: 'hi' }])
    expect(out.startsWith(BOS)).toBe(true)
    expect(out).toContain(USER + 'hi')
    expect(out.endsWith(ASSISTANT + THINKING_END)).toBe(true)
  })

  it('renders system + user in order (system content is unwrapped)', () => {
    const out = deepseekV4.renderMessages([
      { role: 'system', content: 'be helpful' },
      { role: 'user', content: 'hi' },
    ])
    expect(out).toContain('be helpful' + USER + 'hi')
  })

  it('renders a completed assistant turn with thinking-end + EOS', () => {
    const out = deepseekV4.renderMessages([
      { role: 'user', content: 'q' },
      { role: 'assistant', content: 'a' },
    ])
    expect(out).toContain(
      ASSISTANT + THINKING_END + 'a' + EOS,
    )
  })

  it('throws on unknown role', () => {
    expect(() =>
      deepseekV4.renderMessages([{ role: 'tool', content: 'x' }]),
    ).toThrow(/Unknown role/)
  })
})
