import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  MODEL_CONFIGS,
  loadTokenizer,
  getEncoder,
  countTokens,
  renderKimiMessages,
  renderMessages,
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
// The DeepSeek-V4-Pro tokenizer.json is a 6.4 MB structured JSON file. Tests
// load it once at module scope (slow first run, cached afterwards) so we can
// exercise the HF-runtime path against real data.
const DSV4_TOKENIZER_JSON = readFileSync(
  path.join(__dirname, '../../../public/tokenizers/deepseek-v4-pro.json'),
  'utf8',
)

function stubFetch(contents = FIXTURE) {
  const calls = []
  const fn = async (url) => {
    calls.push(url)
    return {
      ok: true,
      status: 200,
      text: async () => contents,
    }
  }
  return { fn, calls }
}

describe('MODEL_CONFIGS', () => {
  it('exposes kimi-k2 as the first entry with the required fields', () => {
    const k2 = MODEL_CONFIGS.find((m) => m.id === 'kimi-k2')
    expect(k2).toBeDefined()
    expect(k2.label).toBe('Kimi K2 (K2.7-Code)')
    expect(k2.tokenizer.type).toBe('tiktoken')
    expect(k2.tokenizer.file).toBe('/tokenizers/kimi-k2.tiktoken')
    expect(k2.tokenizer.specialTokens).toBeInstanceOf(Object)
    expect(k2.tokenizer.specialTokens['<|im_end|>']).toBe(163586)
    expect(k2.tokenizer.specialTokens['<|im_user|>']).toBe(163587)
    expect(k2.tokenizer.specialTokens['<|im_assistant|>']).toBe(163588)
    expect(k2.tokenizer.specialTokens['<|im_system|>']).toBe(163594)
    expect(k2.tokenizer.specialTokens['<|im_middle|>']).toBe(163601)
    expect(k2.chatTemplate).toBe('kimi-k2')
  })
})

describe('loadTokenizer', () => {
  beforeEach(() => {
    _resetCacheForTests()
    vi.restoreAllMocks()
  })

  it('does not re-fetch on the second call for the same model (cache hit)', async () => {
    const { fn, calls } = stubFetch()
    vi.stubGlobal('fetch', fn)

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

  it('decodes single-byte known answers: ! -> rank 0, " -> rank 1', async () => {
    const { fn } = stubFetch()
    vi.stubGlobal('fetch', fn)
    const enc = await loadTokenizer('kimi-k2')
    expect(enc.encode('!').length).toBe(1)
    expect(enc.encode('!"').length).toBe(2)
  })

  it('getEncoder returns null before load and the instance after load', async () => {
    expect(getEncoder('kimi-k2')).toBeNull()
    const { fn } = stubFetch()
    vi.stubGlobal('fetch', fn)
    const enc = await loadTokenizer('kimi-k2')
    expect(getEncoder('kimi-k2')).toBe(enc)
  })
})

describe('countTokens', () => {
  let enc
  beforeEach(async () => {
    _resetCacheForTests()
    vi.restoreAllMocks()
    const { fn } = stubFetch()
    vi.stubGlobal('fetch', fn)
    enc = await loadTokenizer('kimi-k2')
  })

  it('returns 0 for the empty string', () => {
    expect(countTokens('', enc)).toBe(0)
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

describe('renderKimiMessages', () => {
  it('renders a single user message with the full ChatML envelope', () => {
    expect(renderKimiMessages([{ role: 'user', content: 'hi' }])).toBe(
      '<|im_user|>user<|im_middle|>hi<|im_end|><|im_assistant|>assistant<|im_middle|>',
    )
  })

  it('renders system + user in order', () => {
    expect(
      renderKimiMessages([
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
      renderKimiMessages([{ role: 'user', name: 'alice', content: 'hi' }]),
    ).toBe('<|im_user|>alice<|im_middle|>hi<|im_end|><|im_assistant|>assistant<|im_middle|>')
  })

  it('appends the open assistant tail exactly once', () => {
    const out = renderKimiMessages([{ role: 'user', content: 'x' }])
    const tail = '<|im_assistant|>assistant<|im_middle|>'
    expect(out.endsWith(tail)).toBe(true)
    expect(out.indexOf(tail)).toBe(out.length - tail.length)
  })
})

describe('end-to-end: messages mode costs more tokens than plain text', () => {
  it('a single user "hi" costs strictly more tokens as a message than as bare text', async () => {
    _resetCacheForTests()
    vi.restoreAllMocks()
    const { fn } = stubFetch()
    vi.stubGlobal('fetch', fn)
    const enc = await loadTokenizer('kimi-k2')

    const plain = countTokens('hi', enc)
    const asMessage = countTokens(
      renderKimiMessages([{ role: 'user', content: 'hi' }]),
      enc,
    )
    expect(asMessage).toBeGreaterThan(plain)
  })
})
describe("MODEL_CONFIGS — deepseek-v4-pro", () => {
  it("exposes deepseek-v4-pro as the second entry with hf runtime", () => {
    const dsv4 = MODEL_CONFIGS.find((m) => m.id === "deepseek-v4-pro")
    expect(dsv4).toBeDefined()
    expect(dsv4.label).toBe("DeepSeek V4 Pro")
    expect(dsv4.tokenizer.type).toBe("hf")
    expect(dsv4.tokenizer.file).toBe("/tokenizers/deepseek-v4-pro.json")
    expect(dsv4.chatTemplate).toBe("deepseek-v4")
  })
})

describe("loadTokenizer — deepseek-v4-pro (hf runtime)", () => {
  beforeEach(() => {
    _resetCacheForTests()
    vi.restoreAllMocks()
  })

  it("returns an adapter with encode + decodeId methods", async () => {
    vi.stubGlobal("fetch", async () => ({
      ok: true,
      status: 200,
      text: async () => DSV4_TOKENIZER_JSON,
    }))
    const enc = await loadTokenizer("deepseek-v4-pro")
    expect(typeof enc.encode).toBe("function")
    expect(typeof enc.decodeId).toBe("function")
  })

  it("encodes plain ASCII text to a positive token count", async () => {
    vi.stubGlobal("fetch", async () => ({
      ok: true,
      status: 200,
      text: async () => DSV4_TOKENIZER_JSON,
    }))
    const enc = await loadTokenizer("deepseek-v4-pro")
    expect(enc.encode("hello world").length).toBeGreaterThan(0)
  })

  it("caches the adapter across calls (no re-fetch)", async () => {
    const calls = []
    vi.stubGlobal("fetch", async (url) => {
      calls.push(url)
      return { ok: true, status: 200, text: async () => DSV4_TOKENIZER_JSON }
    })
    await loadTokenizer("deepseek-v4-pro")
    await loadTokenizer("deepseek-v4-pro")
    expect(calls.length).toBe(1)
  })

  it("throws on fetch failure and allows retry", async () => {
    let attempt = 0
    vi.stubGlobal("fetch", async () => {
      attempt++
      if (attempt === 1) throw new Error("boom")
      return { ok: true, status: 200, text: async () => DSV4_TOKENIZER_JSON }
    })
    await expect(loadTokenizer("deepseek-v4-pro")).rejects.toThrow()
    // retry succeeds because rejected promise was evicted from cache
    const enc = await loadTokenizer("deepseek-v4-pro")
    expect(enc.encode("hi").length).toBeGreaterThan(0)
  })
})

describe("renderMessages dispatch", () => {
  it("dispatches to kimi-k2 template by modelId", () => {
    const out = renderMessages("kimi-k2", [{ role: "user", content: "hi" }])
    expect(out).toBe(
      "<|im_user|>user<|im_middle|>hi<|im_end|><|im_assistant|>assistant<|im_middle|>",
    )
  })

  it("dispatches to deepseek-v4 template by modelId", () => {
    const out = renderMessages("deepseek-v4-pro", [{ role: "user", content: "hi" }])
    // BOS + <|User|>hi + open-assistant tail
    expect(out.startsWith("<｜begin▁of｜sentence｜>")).toBe(true)
    expect(out).toContain("<｜User｜>hi")
    expect(out.endsWith("<｜Assistant｜>" + String.fromCharCode(0x3c,0x2f,0x74,0x68,0x69,0x6e,0x6b,0x3e))).toBe(true)
  })

  it("renders DeepSeek V4 system + user in order", () => {
    const out = renderMessages("deepseek-v4-pro", [
      { role: "system", content: "be helpful" },
      { role: "user", content: "hi" },
    ])
    // BOS + raw system content (no wrapping) + <|User|>hi + assistant tail
    expect(out).toContain("be helpful<｜User｜>hi")
  })

  it("renders a completed assistant turn with EOS", () => {
    const out = renderMessages("deepseek-v4-pro", [
      { role: "user", content: "q" },
      { role: "assistant", content: "a" },
    ])
    // Assistant turn emits assistant-open + thinking-end + content + EOS
    expect(out).toContain(
      "<｜Assistant｜>" +
      String.fromCharCode(0x3c,0x2f,0x74,0x68,0x69,0x6e,0x6b,0x3e) +
      "a<｜end▁of｜sentence｜>",
    )
  })

  it("throws on unknown model", () => {
    expect(() => renderMessages("nonexistent", [])).toThrow(/Unknown model/)
  })
})

describe("end-to-end: DeepSeek V4 messages cost more tokens than plain text", () => {
  it("a single user message costs strictly more than bare text", async () => {
    _resetCacheForTests()
    vi.restoreAllMocks()
    vi.stubGlobal("fetch", async () => ({
      ok: true,
      status: 200,
      text: async () => DSV4_TOKENIZER_JSON,
    }))
    const enc = await loadTokenizer("deepseek-v4-pro")
    const plain = countTokens("hi", enc)
    const asMessage = countTokens(
      renderMessages("deepseek-v4-pro", [{ role: "user", content: "hi" }]),
      enc,
    )
    expect(asMessage).toBeGreaterThan(plain)
  })
})
