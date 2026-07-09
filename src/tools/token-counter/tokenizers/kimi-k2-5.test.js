import { describe, it, expect, beforeEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import kimiK2_5 from './kimi-k2-5.js'
import { KIMI_K2_SPECIAL_TOKENS } from './kimi-k2.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURE = readFileSync(
  path.join(__dirname, '../__fixtures__/mini.tiktoken'),
  'utf8',
)

// ChatML envelope tokens reused from kimi-k2.js.
const USER_OPEN = '<|im_user|>'
const ASSISTANT_TAIL = '<|im_assistant|>assistant<|im_middle|>'

function stubFixture() {
  vi.stubGlobal('fetch', async () => ({
    ok: true,
    status: 200,
    text: async () => FIXTURE,
  }))
}

describe('kimi-k2-5 module — config shape', () => {
  it('exposes the kimi-k2-5 config entry with the required fields', () => {
    const cfg = kimiK2_5.config
    expect(cfg.id).toBe('kimi-k2-5')
    expect(cfg.label).toBe('Kimi K2.5')
    expect(cfg.tokenizer.type).toBe('tiktoken')
    expect(cfg.tokenizer.file).toBe('/tokenizers/kimi-k2.tiktoken')
    expect(cfg.tokenizer.specialTokens).toBe(KIMI_K2_SPECIAL_TOKENS)
    expect(cfg.chatTemplate).toBe('kimi-k2')
  })
})

describe('kimi-k2-5 module — wiring smoke test', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('load() returns an adapter that encodes plain ASCII to >0 tokens', async () => {
    stubFixture()
    const adapter = await kimiK2_5.load()
    expect(typeof adapter.encode).toBe('function')
    expect(adapter.encode('hello world').length).toBeGreaterThan(0)
  })

  it('renderMessages wraps a user message with the ChatML envelope', () => {
    const out = kimiK2_5.renderMessages([{ role: 'user', content: 'hi' }])
    expect(out.startsWith(USER_OPEN)).toBe(true)
    expect(out.endsWith(ASSISTANT_TAIL)).toBe(true)
  })
})
