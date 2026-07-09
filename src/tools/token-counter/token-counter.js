import { Tiktoken } from 'js-tiktoken'

// Special-token IDs copied from Kimi K2.7-Code tokenizer_config.json
// (added_tokens_decoder — full set; see spec for the verified subset).
const KIMI_K2_SPECIAL_TOKENS = {
  '<|im_end|>': 163586,
  '<|im_user|>': 163587,
  '<|im_assistant|>': 163588,
  '<|im_system|>': 163594,
  '<|im_middle|>': 163601,
  '[BOS]': 163584,
  '[EOS]': 163585,
  '[EOT]': 163593,
}

export const MODEL_CONFIGS = [
  {
    id: 'kimi-k2',
    label: 'Kimi K2 (K2.7-Code)',
    tokenizer: {
      type: 'tiktoken',
      file: '/tokenizers/kimi-k2.tiktoken',
      specialTokens: KIMI_K2_SPECIAL_TOKENS,
    },
    chatTemplate: 'kimi-k2',
  },
]

// Module-level cache: modelId -> Promise<Tiktoken> (so concurrent first calls
// share a single fetch). Resolved instances are also retrievable synchronously
// via getEncoder().
const encoderCache = new Map()
const encoderPromiseCache = new Map()

export function _resetCacheForTests() {
  encoderCache.clear()
  encoderPromiseCache.clear()
}

// o200k_base-compatible BPE pre-split regex. Kimi K2's tokenizer_config.json
// does not ship a pat_str; K2's BPE mirrors o200k_base (128k ChatML-style vocab),
// so we reuse its pattern. If a divergence surfaces on specific inputs, this
// is the one line to revisit (see spec "loadTokenizer").
const O200K_PAT_STR =
  /[^\r\n\p{L}\p{N}]?[\p{L}\p{M}]+|\p{N}{1,3}| ?[^\s\p{L}\p{N}]+[\r\n]*|\s*[\r\n]+|\s+(?!\S)|\s+/u

const CONFIG_BY_ID = new Map(MODEL_CONFIGS.map((m) => [m.id, m]))

// js-tiktoken 1.0.21's Tiktoken constructor parses bpe_ranks in the compressed
// OpenAI-JS form `<firstB64> <offset> <b64> <b64> ...` (one rank per listed
// token, offset+i). Kimi K2's shipped .tiktoken (and our test fixture) use the
// standard 2-field `b64 rank` form. This transforms each 2-field line into a
// 1-token compressed line the constructor can parse.
function toCompressedBPE(text) {
  return text
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [b64, rank] = line.split(' ')
      return `${b64} ${rank} ${b64}`
    })
    .join('\n')
}

export async function loadTokenizer(modelId) {
  if (encoderCache.has(modelId)) return encoderCache.get(modelId)
  if (encoderPromiseCache.has(modelId)) return encoderPromiseCache.get(modelId)

  const config = CONFIG_BY_ID.get(modelId)
  if (!config) throw new Error(`Unknown model: ${modelId}`)

  const promise = (async () => {
    const res = await fetch(config.tokenizer.file)
    if (!res.ok) {
      throw new Error(`Failed to fetch ${config.tokenizer.file}: ${res.status}`)
    }
    const text = await res.text()
    const enc = new Tiktoken({
      pat_str: O200K_PAT_STR,
      special_tokens: config.tokenizer.specialTokens,
      bpe_ranks: toCompressedBPE(text),
    })
    encoderCache.set(modelId, enc)
    return enc
  })()

  encoderPromiseCache.set(modelId, promise)
  try {
    return await promise
  } catch (err) {
    encoderPromiseCache.delete(modelId)
    throw err
  }
}

export function getEncoder(modelId) {
  return encoderCache.get(modelId) ?? null
}
