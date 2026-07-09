// Orchestrator tests. Per-model logic (config shape, loader, chat template)
// is tested in ./tokenizers/<model>.test.js. This file covers the cross-cutting
// behavior the orchestrator owns: the MODULE registry, the module-level cache,
// the getEncoder sync accessor, countTokens, renderMessages(modelId, ...)
// dispatch, and the end-to-end "messages cost more than bare text" invariant.

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  MODEL_CONFIGS,
  loadTokenizer,
  getEncoder,
  countTokens,
  renderMessages,
  renderKimiMessages,
  _resetCacheForTests,
} from './token-counter.js'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURE = readFileSync(
  path.join(__dirname, '__fixtures__/mini.tiktoken'),
  'utf8',
)
const DSV4_TOKENIZER_JSON = readFileSync(
  path.join(__dirname, '../../../public/tokenizers/deepseek-v4-pro.json'),
  'utf8',
)

function stubKimiFixture() {
  vi.stubGlobal('fetch', async () => ({
    ok: true,
    status: 200,
    text: async () => FIXTURE,
  }))
}

function stubDeepSeekFixture() {
  vi.stubGlobal('fetch', async () => ({
    ok: true,
    status: 200,
    text: async () => DSV4_TOKENIZER_JSON,
  }))
}

describe('MODEL_CONFIGS (orchestrator)', () => {
  it('aggregates all model config entries', () => {
    const ids = MODEL_CONFIGS.map((m) => m.id)
    expect(ids).toEqual(['kimi-k2', 'deepseek-v4-pro', 'deepseek-v4-flash'])
  })
})

describe('loadTokenizer cache + adapter access', () => {
  beforeEach(() => {
    _resetCacheForTests()
    vi.restoreAllMocks()
  })

  it('does not re-fetch on the second call for the same model (cache hit)', async () => {
    const calls = []
    vi.stubGlobal('fetch', async (url) => {
      calls.push(url)
      return { ok: true, status: 200, text: async () => FIXTURE }
    })
    await loadTokenizer('kimi-k2')
    await loadTokenizer('kimi-k2')
    expect(calls.length).toBe(1)
  })

  it('throws when fetch rejects (network error)', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new Error('network')
    })
    await expect(loadTokenizer('kimi-k2')).rejects.toThrow()
  })

  it('throws when fetch returns 404', async () => {
    vi.stubGlobal('fetch', async () => ({
      ok: false,
      status: 404,
      text: async () => 'not found',
    }))
    await expect(loadTokenizer('kimi-k2')).rejects.toThrow()
  })

  it('allows retry after a fetch failure (no poisoned cache)', async () => {
    let attempt = 0
    vi.stubGlobal('fetch', async () => {
      attempt++
      if (attempt === 1) throw new Error('boom')
      return { ok: true, status: 200, text: async () => FIXTURE }
    })
    await expect(loadTokenizer('kimi-k2')).rejects.toThrow()
    const enc = await loadTokenizer('kimi-k2')
    expect(enc.encode('hi').length).toBeGreaterThan(0)
  })

  it('throws on unknown model id', async () => {
    stubKimiFixture()
    await expect(loadTokenizer('nonexistent')).rejects.toThrow(/Unknown model/)
  })

  it('getEncoder returns null before load and the adapter after load', async () => {
    expect(getEncoder('kimi-k2')).toBeNull()
    stubKimiFixture()
    const enc = await loadTokenizer('kimi-k2')
    expect(getEncoder('kimi-k2')).toBe(enc)
  })
})

describe('renderMessages dispatch', () => {
  it('dispatches to kimi-k2 template by modelId', () => {
    const out = renderMessages('kimi-k2', [{ role: 'user', content: 'hi' }])
    expect(out).toBe(
      '<|im_user|>user<|im_middle|>hi<|im_end|><|im_assistant|>assistant<|im_middle|>',
    )
  })

  it('re-exports renderKimiMessages for back-compat', () => {
    expect(renderKimiMessages).toBeTypeOf('function')
    expect(renderKimiMessages([{ role: 'user', content: 'hi' }])).toBe(
      '<|im_user|>user<|im_middle|>hi<|im_end|><|im_assistant|>assistant<|im_middle|>',
    )
  })

  it('throws on unknown model', () => {
    expect(() => renderMessages('nonexistent', [])).toThrow(/Unknown model/)
  })
})

describe('countTokens', () => {
  let enc
  beforeEach(async () => {
    _resetCacheForTests()
    vi.restoreAllMocks()
    stubKimiFixture()
    enc = await loadTokenizer('kimi-k2')
  })

  it('returns 0 for the empty string', () => {
    expect(countTokens('', enc)).toBe(0)
  })

  it('returns 0 when adapter is falsy', () => {
    expect(countTokens('hi', null)).toBe(0)
  })

  it('returns a positive count for non-empty text', () => {
    expect(countTokens('hello world', enc)).toBeGreaterThan(0)
  })

  it('counts more tokens for longer text', () => {
    const small = countTokens('hello', enc)
    const large = countTokens('hello '.repeat(50), enc)
    expect(large).toBeGreaterThan(small)
  })
})

describe('end-to-end: messages cost more tokens than plain text', () => {
  beforeEach(() => {
    _resetCacheForTests()
    vi.restoreAllMocks()
  })

  it('kimi-k2: a single user "hi" costs strictly more as a message than as bare text', async () => {
    stubKimiFixture()
    const enc = await loadTokenizer('kimi-k2')
    const plain = countTokens('hi', enc)
    const asMessage = countTokens(
      renderMessages('kimi-k2', [{ role: 'user', content: 'hi' }]),
      enc,
    )
    expect(asMessage).toBeGreaterThan(plain)
  })

  it('deepseek-v4-pro: a single user "hi" costs strictly more than bare text', async () => {
    stubDeepSeekFixture()
    const enc = await loadTokenizer('deepseek-v4-pro')
    const plain = countTokens('hi', enc)
    const asMessage = countTokens(
      renderMessages('deepseek-v4-pro', [{ role: 'user', content: 'hi' }]),
      enc,
    )
    expect(asMessage).toBeGreaterThan(plain)
  })
})
