import { Tiktoken } from 'js-tiktoken'

// Special-token IDs copied from Kimi K2.7-Code tokenizer_config.json
// (added_tokens_decoder — full set; see spec for the verified subset).
export const KIMI_K2_SPECIAL_TOKENS = {
  '<|im_end|>': 163586,
  '<|im_user|>': 163587,
  '<|im_assistant|>': 163588,
  '<|im_system|>': 163594,
  '<|im_middle|>': 163601,
  '[BOS]': 163584,
  '[EOS]': 163585,
  '[EOT]': 163593,
}

// o200k_base-compatible BPE pre-split regex. Kimi K2's tokenizer_config.json
// does not ship a pat_str; K2's BPE mirrors o200k_base (128k ChatML-style vocab),
// so we reuse its pattern. If a divergence surfaces on specific inputs, this
// is the one line to revisit (see spec "loadTokenizer").
const O200K_PAT_STR =
  /[^\r\n\p{L}\p{N}]?[\p{L}\p{M}]+|\p{N}{1,3}| ?[^\s\p{L}\p{N}]+[\r\n]*|\s*[\r\n]+|\s+(?!\S)|\s+/u

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

// Adapter wraps the raw Tiktoken instance in the uniform { encode, decodeId }
// shape the component consumes.
function makeAdapter(enc, specialTokenNames) {
  // allowedSpecial = the set of special-token strings the encoder is allowed to
  // recognize and collapse to single ids (rather than byte-BPE'ing them). We
  // pass ALL the registered specials so the rendered ChatML envelope tokens
  // (e.g. <|im_end|>) collapse to their registered ids; ordinary text passes
  // through byte-BPE as before. disallowedSpecial = [] disables the default
  // throw-on-special behavior for any other special-looking substrings.
  return {
    encode(text) {
      return enc.encode(text, specialTokenNames, [])
    },
    decodeId(id) {
      // js-tiktoken 1.0.21 only exposes encode/decode on the Tiktoken class
      // (no decode_single_token_bytes). decode([id]) returns the piece string.
      return enc.decode([id])
    },
  }
}

// ChatML template constants. Spec §renderKimiMessages.
const ROLE_OPEN = {
  user: '<|im_user|>',
  assistant: '<|im_assistant|>',
  system: '<|im_system|>',
}
const MIDDLE = '<|im_middle|>'
const END = '<|im_end|>'
const ASSISTANT_TAIL = '<|im_assistant|>assistant<|im_middle|>'

function renderMessages(messages) {
  let out = ''
  for (const msg of messages) {
    const open = ROLE_OPEN[msg.role]
    if (!open) {
      throw new Error(`Unknown role: ${msg.role}`)
    }
    const name = msg.name || msg.role
    out += open + name + MIDDLE + msg.content + END
  }
  out += ASSISTANT_TAIL
  return out
}

async function load() {
  const res = await fetch(KIMI_K2_CONFIG.tokenizer.file)
  if (!res.ok) {
    throw new Error(
      `Failed to fetch ${KIMI_K2_CONFIG.tokenizer.file}: ${res.status}`,
    )
  }
  const text = await res.text()
  const enc = new Tiktoken({
    pat_str: O200K_PAT_STR,
    special_tokens: KIMI_K2_CONFIG.tokenizer.specialTokens,
    bpe_ranks: toCompressedBPE(text),
  })
  return makeAdapter(
    enc,
    Object.keys(KIMI_K2_CONFIG.tokenizer.specialTokens || {}),
  )
}

// Self-referential so load() / renderMessages() can read config fields without
// a separate import. The orchestrator imports this default export and reads
// the config off it.
const KIMI_K2_CONFIG = {
  id: 'kimi-k2',
  label: 'Kimi K2.7-Code',
  tokenizer: {
    type: 'tiktoken',
    file: '/tokenizers/kimi-k2.tiktoken',
    specialTokens: KIMI_K2_SPECIAL_TOKENS,
  },
  chatTemplate: 'kimi-k2',
}

export default {
  config: KIMI_K2_CONFIG,
  load,
  renderMessages,
}

// Named back-compat export for tests that import renderKimiMessages directly.
export { renderMessages as renderKimiMessages }
