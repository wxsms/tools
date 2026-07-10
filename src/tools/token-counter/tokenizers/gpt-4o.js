import { getEncoding } from 'js-tiktoken'

// GPT-4o / GPT-4.1 / o-series use the o200k_base BPE vocabulary. The chat
// envelope tokens (<|start|>, <|end|>, <|message|>, ...) belong to the
// o200k_harmony encoding layered on top of o200k_base; we register them
// via getEncoding's extendSpecialTokens so the envelope collapses to
// single ids — matching what the OpenAI API actually counts (cookbook:
// +3 per message, +1 if name, +3 priming at end). ids verified from
// upstream tiktoken openai_public.py.
const HARMONY_SPECIAL_TOKENS = {
  '<|startoftext|>': 199998,
  '<|return|>': 200002,
  '<|channel|>': 200005,
  '<|start|>': 200006,
  '<|end|>': 200007,
  '<|message|>': 200008,
}

const ROLE_OPEN = {
  system: '<|start|>system',
  user: '<|start|>user',
  assistant: '<|start|>assistant',
  tool: '<|start|>tool',
}

function makeAdapter(enc, specialTokenNames) {
  // allowedSpecial = the envelope tokens the encoder is allowed to collapse
  // to their registered ids. disallowedSpecial = [] disables the default
  // throw-on-special behavior for any other special-looking substrings.
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
    const open = ROLE_OPEN[msg.role]
    if (!open) throw new Error(`Unknown role: ${msg.role}`)
    // When a name is provided, render `<|return|>{name}<|message|>` (costs
    // +1 over the no-name path, matching cookbook's tokens_per_name = 1).
    if (msg.name) {
      out +=
        open +
        '<|return|>' +
        msg.name +
        '<|message|>' +
        (msg.content || '') +
        '<|end|>'
    } else {
      out += open + '<|message|>' + (msg.content || '') + '<|end|>'
    }
  }
  // Final assistant priming: <|start|>assistant<|message|> = 3 envelope tokens.
  out += '<|start|>assistant<|message|>'
  return out
}

// Stays async to match the orchestrator's uniform `await mod.load()` shape
// used by every other tokenizer module (kimi-k2 / glm-5-2 / deepseek-v4).
async function load() {
  const enc = getEncoding('o200k_base', HARMONY_SPECIAL_TOKENS)
  return makeAdapter(enc, Object.keys(HARMONY_SPECIAL_TOKENS))
}

const GPT_4O_CONFIG = {
  id: 'gpt-4o',
  label: 'GPT-4o',
  tokenizer: {
    type: 'tiktoken-builtin',
  },
  chatTemplate: 'gpt-4o-chatml',
}

export default {
  config: GPT_4O_CONFIG,
  load,
  renderMessages,
}
