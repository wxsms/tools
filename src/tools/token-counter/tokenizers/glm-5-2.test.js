import { describe, it, expect, beforeEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import glm5_2 from './glm-5-2.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const MINI_JSON = readFileSync(
  path.join(__dirname, '../__fixtures__/mini-glm.json'),
  'utf8',
)

// Role-tag tokens the GLM-5.2 renderer uses. Built via String.fromCharCode so
// the raw bytes stay out of the test source.
const LT = String.fromCharCode(0x3c), GT = String.fromCharCode(0x3e), PIPE = String.fromCharCode(0x7c)
const SYSTEM = LT + PIPE + 'system' + PIPE + GT
const USER = LT + PIPE + 'user' + PIPE + GT
const ASSISTANT = LT + PIPE + 'assistant' + PIPE + GT

function stubFixture() {
  vi.stubGlobal('fetch', async () => ({
    ok: true,
    status: 200,
    text: async () => MINI_JSON,
  }))
}

describe('glm-5-2 module — config shape', () => {
  it('exposes the glm-5-2 config entry with the required fields', () => {
    const cfg = glm5_2.config
    expect(cfg.id).toBe('glm-5-2')
    expect(cfg.label).toBe('GLM 5.2')
    expect(cfg.tokenizer.type).toBe('hf')
    expect(cfg.tokenizer.file).toBe('/tokenizers/glm-5-2.json')
    expect(cfg.chatTemplate).toBe('glm-5-2')
  })
})

describe('glm-5-2 module — load() adapter (mini fixture)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns an adapter with encode + decodeId methods', async () => {
    stubFixture()
    const adapter = await glm5_2.load()
    expect(typeof adapter.encode).toBe('function')
    expect(typeof adapter.decodeId).toBe('function')
  })

  it('encodes plain ASCII text to a positive token count', async () => {
    stubFixture()
    const adapter = await glm5_2.load()
    expect(adapter.encode('hello world').length).toBeGreaterThan(0)
  })

  it('collapses the user-tag literal to its registered id (1)', async () => {
    stubFixture()
    const adapter = await glm5_2.load()
    expect(adapter.encode(USER)).toEqual([1])
  })

  it('decodes the user-tag id back to its surface string', async () => {
    stubFixture()
    const adapter = await glm5_2.load()
    expect(adapter.decodeId(1)).toBe(USER)
  })
})

describe('glm-5-2 module — renderMessages (instant-mode template)', () => {
  it('renders a single user message: user-tag + hi + assistant-tag', () => {
    expect(glm5_2.renderMessages([{ role: 'user', content: 'hi' }])).toBe(
      USER + 'hi' + ASSISTANT,
    )
  })

  it('renders system + user in order', () => {
    expect(
      glm5_2.renderMessages([
        { role: 'system', content: 'be helpful' },
        { role: 'user', content: 'hi' },
      ]),
    ).toBe(SYSTEM + 'be helpful' + USER + 'hi' + ASSISTANT)
  })

  it('renders a completed assistant turn (no trailing wrapper added by renderer)', () => {
    expect(
      glm5_2.renderMessages([
        { role: 'user', content: 'q' },
        { role: 'assistant', content: 'a' },
      ]),
    ).toBe(USER + 'q' + ASSISTANT + 'a' + ASSISTANT)
  })

  it('throws on unknown role', () => {
    expect(() =>
      glm5_2.renderMessages([{ role: 'tool', content: 'x' }]),
    ).toThrow(/Unknown role/)
  })
})
