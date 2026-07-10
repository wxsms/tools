import { getEncoding } from 'js-tiktoken'

// GPT-4 / GPT-4-turbo use the cl100k_base BPE vocabulary (shared with
// GPT-3.5-turbo / text-embedding-3-*). The ChatML envelope tokens
// <|im_start|> / <|im_end|> are NOT registered specials in cl100k_base
// itself (they encode to 6 byte-BPE ids each); we register them via
// getEncoding's extendSpecialTokens at the official ids the OpenAI API
// uses (100264 / 100265), so the envelope collapses to single tokens —
// matching what the API actually counts (cookbook GPT-4 rules: +3 per
// message, +1 if name, +3 priming at end).
const CHATML_SPECIAL_TOKENS = {
  '<|im_start|>': 100264,
  '<|im_end|>': 100265,
}

const ROLE_NEWLINE = {
  system: 'system',
  user: 'user',
  assistant: 'assistant',
  tool: 'tool',
}

function makeAdapter(enc, specialTokenNames) {
  return {
    encode(text) {
      return enc.encode(text, specialTokenNames, [])
    },
    decodeId(id) {
      return enc.decode([id])
    },
  }
}

function renderMessages(messages) {
  let out = ''
  for (const msg of messages) {
    const role = ROLE_NEWLINE[msg.role]
    if (!role) throw new Error(`Unknown role: ${msg.role}`)
    // GPT-4 ChatML with name: `<|im_start|>{role}\n{name}\n{content}<|im_end|>\n`.
    // The `\n{name}` line adds 1 separator token plus the name's own tokens,
    // matching cookbook's tokens_per_name = 1 simplification (which counts the
    // separator, not the name string — same idea as kimi-k2's name path).
    if (msg.name) {
      out +=
        '<|im_start|>' +
        role +
        '\n' +
        msg.name +
        '\n' +
        (msg.content || '') +
        '<|im_end|>\n'
    } else {
      out +=
        '<|im_start|>' +
        role +
        '\n' +
        (msg.content || '') +
        '<|im_end|>\n'
    }
  }
  // Final assistant priming: <|im_start|>assistant\n (3 tokens).
  out += '<|im_start|>assistant\n'
  return out
}

// Stays async to match the orchestrator's uniform `await mod.load()` shape
// shared by every other tokenizer module.
async function load() {
  const enc = getEncoding('cl100k_base', CHATML_SPECIAL_TOKENS)
  return makeAdapter(enc, Object.keys(CHATML_SPECIAL_TOKENS))
}

const GPT_4_CONFIG = {
  id: 'gpt-4',
  label: 'GPT-4',
  tokenizer: {
    type: 'tiktoken-builtin',
  },
  chatTemplate: 'gpt-4-chatml',
}

export default {
  config: GPT_4_CONFIG,
  load,
  renderMessages,
}
