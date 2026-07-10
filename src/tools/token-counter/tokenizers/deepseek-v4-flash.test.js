import { describe, it, expect, beforeEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import deepseekV4Flash from './deepseek-v4-flash.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TOKENIZER_JSON = readFileSync(
  path.join(__dirname, '../../../../public/tokenizers/deepseek-v4-pro.json'),
  'utf8',
)

// Same envelope constants as the V4 Pro test — Flash reuses V4 Pro's
// chat template byte-for-byte.
const BOS = '<\uff5cbegin\u2581of\u2581sentence\uff5c>'
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

describe('deepseek-v4-flash module — config shape', () => {
  it('exposes the deepseek-v4-flash config entry with the required fields', () => {
    const cfg = deepseekV4Flash.config
    expect(cfg.id).toBe('deepseek-v4-flash')
    expect(cfg.label).toBe('DeepSeek V4 Flash')
    expect(cfg.tokenizer.type).toBe('hf')
    expect(cfg.tokenizer.file).toBe('/tokenizers/deepseek-v4-pro.json')
    expect(cfg.chatTemplate).toBe('deepseek-v4')
  })
})

describe('deepseek-v4-flash module — wiring smoke test', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('load() returns an adapter that encodes plain ASCII to >0 tokens', async () => {
    stubFixture()
    const adapter = await deepseekV4Flash.load()
    expect(typeof adapter.encode).toBe('function')
    expect(adapter.encode('hello world').length).toBeGreaterThan(0)
  })

  it('renderMessages wraps a user message with BOS + assistant tail', () => {
    const out = deepseekV4Flash.renderMessages([
      { role: 'user', content: 'hi' },
    ])
    expect(out.startsWith(BOS)).toBe(true)
    expect(out.endsWith(ASSISTANT + THINKING_END)).toBe(true)
  })
})
