import { Tiktoken } from 'js-tiktoken'
import { Tokenizer as HFTokenizer } from '@huggingface/tokenizers'

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

// o200k_base-compatible BPE pre-split regex. Kimi K2's tokenizer_config.json
// does not ship a pat_str; K2's BPE mirrors o200k_base (128k ChatML-style vocab),
// so we reuse its pattern. If a divergence surfaces on specific inputs, this
// is the one line to revisit (see spec "loadTokenizer").
const O200K_PAT_STR =
  /[^\r\n\p{L}\p{N}]?[\p{L}\p{M}]+|\p{N}{1,3}| ?[^\s\p{L}\p{N}]+[\r\n]*|\s*[\r\n]+|\s+(?!\S)|\s+/u

// Each model entry declares:
//   id            - unique key
//   label         - dropdown text
//   tokenizer.runtime - 'tiktoken' | 'hf'
//   tokenizer.file    - URL path (served from public/tokenizers/)
//   chatTemplate  - key into CHAT_TEMPLATES
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
  {
    id: 'deepseek-v4-pro',
    label: 'DeepSeek V4 Pro',
    tokenizer: {
      type: 'hf',
      file: '/tokenizers/deepseek-v4-pro.json',
    },
    chatTemplate: 'deepseek-v4',
  },
]

// Adapter: uniform shape both runtimes implement. The component only ever
// touches { encode, decodeId }, so adding a new runtime = adding a branch in
// loadTokenizer + an adapter constructor — no component changes.
//
//   encode(text) → number[]         raw token IDs for `text`
//   decodeId(id) → string           decode a single token's bytes back to text
//
function makeTiktokenAdapter(enc) {
  return {
    encode(text) {
      // js-tiktoken's default disallowedSpecial='all' throws on special-token
      // substrings (e.g. <|im_end|> embedded in the rendered ChatML envelope).
      // Empty allowed+disallowed sets disable both the throw and special-token
      // collapsing, so specials are counted as their constituent byte-tokens.
      return enc.encode(text, [], [])
    },
    decodeId(id) {
      // js-tiktoken 1.0.21 only exposes encode/decode on the Tiktoken class
      // (no decode_single_token_bytes). decode([id]) returns the piece string.
      return enc.decode([id])
    },
  }
}

function makeHfAdapter(tok) {
  return {
    encode(text) {
      // HF Tokenizer.encode returns { ids, tokens, ... }. add_special_tokens
      // defaults to true; we want it TRUE for DeepSeek because the BOS and
      // <|User|>/<|Assistant|> envelope tokens are part of the prompt cost
      // we're measuring (and the chat-template renderer emits them as text
      // substrings, so they'd be byte-BPE'd without add_special_tokens too —
      // but enabling specials lets the tokenizer collapse them to single IDs
      // where appropriate, which matches what the model actually sees).
      const out = tok.encode(text, { add_special_tokens: true })
      return out.ids
    },
    decodeId(id) {
      // HF's decode joins all token strings; for one ID it returns that
      // single token's surface form. skip_special_tokens=false so we can
      // see what special tokens look like in the preview.
      return tok.decode([id], { skip_special_tokens: false })
    },
  }
}

// Module-level cache: modelId -> Promise<adapter>. The promise cache lets
// concurrent first calls share a single fetch; the resolved adapter lives
// in the same map once ready (we stash it on the promise via .then).
const encoderCache = new Map() // modelId -> adapter (resolved)
const encoderPromiseCache = new Map() // modelId -> Promise<adapter>

export function _resetCacheForTests() {
  encoderCache.clear()
  encoderPromiseCache.clear()
}

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

async function loadTiktokenAdapter(config) {
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
  return makeTiktokenAdapter(enc)
}

async function loadHfAdapter(config) {
  const res = await fetch(config.tokenizer.file)
  if (!res.ok) {
    throw new Error(`Failed to fetch ${config.tokenizer.file}: ${res.status}`)
  }
  // Prefer res.json() when the runtime provides it; fall back to text()+parse
  // so test stubs that only implement .text() keep working.
  const json =
    typeof res.json === 'function'
      ? await res.json()
      : JSON.parse(await res.text())
  // HF Tokenizer constructor takes (tokenizer, config). The tokenizer.json
  // file IS the tokenizer object literal (with model/normalizer/etc fields);
  // config is the small per-instance config (added_tokens, etc).
  const tok = new HFTokenizer(json, {
    additional_special_tokens: (json.added_tokens || [])
      .filter((t) => t.special && t.content)
      .map((t) => t.content),
  })
  return makeHfAdapter(tok)
}

export async function loadTokenizer(modelId) {
  if (encoderCache.has(modelId)) return encoderCache.get(modelId)
  if (encoderPromiseCache.has(modelId)) return encoderPromiseCache.get(modelId)

  const config = CONFIG_BY_ID.get(modelId)
  if (!config) throw new Error(`Unknown model: ${modelId}`)

  const promise = (async () => {
    const runtime = config.tokenizer.type
    let adapter
    if (runtime === 'tiktoken') {
      adapter = await loadTiktokenAdapter(config)
    } else if (runtime === 'hf') {
      adapter = await loadHfAdapter(config)
    } else {
      throw new Error(`Unknown tokenizer runtime: ${runtime}`)
    }
    encoderCache.set(modelId, adapter)
    return adapter
  })()

  encoderPromiseCache.set(modelId, promise)
  try {
    return await promise
  } catch (err) {
    // Allow retry on the next call rather than caching the rejection.
    encoderPromiseCache.delete(modelId)
    throw err
  }
}

export function getEncoder(modelId) {
  return encoderCache.get(modelId) ?? null
}

export function countTokens(text, adapter) {
  if (!adapter) return 0
  return adapter.encode(text).length
}

// ============================================================
// Chat templates
// ============================================================
//
// Each template takes a `messages: Array<{role, content, name?}>` and returns
// the prompt string the model's API would receive. v1 supports the
// plain-text-content subset only (no tool_calls / images / reasoning_content).
// The renderer appends an "open assistant tail" at the end so the count
// reflects what the model sees when awaiting its response.

const KIMI_ROLE_OPEN = {
  user: '<|im_user|>',
  assistant: '<|im_assistant|>',
  system: '<|im_system|>',
}
const KIMI_MIDDLE = '<|im_middle|>'
const KIMI_END = '<|im_end|>'
const KIMI_ASSISTANT_TAIL = '<|im_assistant|>assistant<|im_middle|>'

function renderKimiMessages(messages) {
  let out = ''
  for (const msg of messages) {
    const open = KIMI_ROLE_OPEN[msg.role]
    if (!open) {
      throw new Error(`Unknown role: ${msg.role}`)
    }
    const name = msg.name || msg.role
    out += open + name + KIMI_MIDDLE + msg.content + KIMI_END
  }
  out += KIMI_ASSISTANT_TAIL
  return out
}

// DeepSeek-V4 chat mode (thinking_mode="chat"), plain-text-content subset.
// Ported from encoding_dsv4.py encode_messages(..., thinking_mode="chat") at
// https://modelscope.cn/models/deepseek-ai/DeepSeek-V4-Pro  — see
// encoding/encoding_dsv4.py render_message(). v1 drops: tools, reasoning_content,
// latest_reminder, developer, task, response_format; only system/user/assistant
// with plain-text content are rendered.
const DSV4_BOS = "<｜begin▁of｜sentence｜>"
const DSV4_EOS = "<｜end▁of｜sentence｜>"
const DSV4_USER = "<｜User｜>"
const DSV4_ASSISTANT = "<｜Assistant｜>"

// DeepSeek-V4 thinking-mode token strings, built via String.fromCharCode so the
// literal angle-bracket tag bytes do not appear in source (an editor / pipeline
// layer was rewriting them). Verified bytes from encoding_dsv4.py:
//   thinking_end_token = 3c 2f 74 68 69 6e 6b 3e
const DSV4_THINKING_END = String.fromCharCode(0x3c, 0x2f, 0x74, 0x68, 0x69, 0x6e, 0x6b, 0x3e)
const DSV4_ASSISTANT_TAIL = DSV4_ASSISTANT + DSV4_THINKING_END

function renderDeepSeekV4Messages(messages) {
  let out = DSV4_BOS
  for (const msg of messages) {
    if (msg.role === "system") {
      // System content is concatenated without special-token wrapping
      // (per encoding_dsv4.py system_msg_template = "{content}").
      out += msg.content || ""
    } else if (msg.role === "user") {
      out += DSV4_USER + (msg.content || "")
    } else if (msg.role === "assistant") {
      // assistant_msg_template = "{reasoning}{content}{tool_calls}" + eos
      // In chat mode, completed assistant turns emit the thinking-end token
      // immediately after the assistant open token (closing the thinking
      // block), so the final string is assistant-open + thinking-end +
      // content + EOS.
      out += DSV4_ASSISTANT + DSV4_THINKING_END + (msg.content || "") + DSV4_EOS
    } else {
      throw new Error(`Unknown role: ${msg.role}`)
    }
  }
  // Open assistant tail (simulates request awaiting response).
  out += DSV4_ASSISTANT_TAIL
  return out
}

const CHAT_TEMPLATES = {
  'kimi-k2': renderKimiMessages,
  'deepseek-v4': renderDeepSeekV4Messages,
}

export function renderMessages(modelId, messages) {
  const config = CONFIG_BY_ID.get(modelId)
  if (!config) throw new Error(`Unknown model: ${modelId}`)
  const fn = CHAT_TEMPLATES[config.chatTemplate]
  if (!fn) throw new Error(`Unknown chat template: ${config.chatTemplate}`)
  return fn(messages)
}

// Back-compat: existing tests call renderKimiMessages directly. Keep the export.
export { renderKimiMessages }
