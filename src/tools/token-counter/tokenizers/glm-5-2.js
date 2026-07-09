import { Tokenizer as HFTokenizer } from '@huggingface/tokenizers'

// GLM-5.2 (https://modelscope.cn/models/ZhipuAI/GLM-5.2) ships its own HF
// native tokenizer.json (vocab 154,820). We load that file directly via the
// @huggingface/tokenizers wrapper, same recipe as deepseek-v4.js. The chat
// template is the minimal instant-style subset of the repo's chat_template.jinja
// (system/user/assistant, plain-text content only, no  helpers).
const LT = String.fromCharCode(0x3c)   // "<"
const GT = String.fromCharCode(0x3e)    // ">"
const PIPE = String.fromCharCode(0x7c)  // "|"
const SYSTEM = LT + PIPE + 'system' + PIPE + GT
const USER = LT + PIPE + 'user' + PIPE + GT
const ASSISTANT = LT + PIPE + 'assistant' + PIPE + GT

function makeAdapter(tok) {
  return {
    encode(text) {
      // add_special_tokens=true lets the encoder collapse role-tag literals
      // (e.g. USER) to their registered ids. Mirrors deepseek-v4.js.
      return tok.encode(text, { add_special_tokens: true }).ids
    },
    decodeId(id) {
      // Decode a single id. For byte-fragment ids this returns U+FFFD, as
      // the standalone byte is not a complete UTF-8 sequence. The preview
      // uses `tokens()` instead, so a chip is exactly one tokenizer token.
      const tokenStr = tok.id_to_token(id)
      if (tokenStr === undefined) return ''
      let bytes = ''
      for (const c of tokenStr) bytes += String.fromCharCode(c.charCodeAt(0) & 0xff)
      try {
        return decodeURIComponent(escape(bytes))
      } catch {
        return '\uFFFD'
      }
    },
    // Returns the tokenizer's per-id strings as emitted by HF's encode()
    // (the "tokens" field). Each entry is one real token; the preview shows
    // one chip per entry. Byte-fragment tokens (e.g. `Ġè®` for a 3-byte CJK
    // split) keep their byte-level form. This is the tokenizer's own
    // ground-truth representation — no merging or guessing.
    tokens(text) {
      const out = tok.encode(text, { add_special_tokens: true })
      return out.tokens
    },
  }
}

function renderMessages(messages) {
  let out = ''
  for (const msg of messages) {
    const tag = { user: USER, assistant: ASSISTANT, system: SYSTEM }[msg.role]
    if (!tag) throw new Error(`Unknown role: ${msg.role}`)
    out += tag + (msg.content || '')
  }
  out += ASSISTANT
  return out
}

async function load() {
  const res = await fetch(GLM_5_2_CONFIG.tokenizer.file)
  if (!res.ok) {
    throw new Error(
      `Failed to fetch ${GLM_5_2_CONFIG.tokenizer.file}: ${res.status}`,
    )
  }
  const json =
    typeof res.json === 'function'
      ? await res.json()
      : JSON.parse(await res.text())
  const tok = new HFTokenizer(json, {
    additional_special_tokens: (json.added_tokens || [])
      .filter((t) => t.special && t.content)
      .map((t) => t.content),
  })
  return makeAdapter(tok)
}

const GLM_5_2_CONFIG = {
  id: 'glm-5-2',
  label: 'GLM 5.2',
  tokenizer: {
    type: 'hf',
    file: '/tokenizers/glm-5-2.json',
  },
  chatTemplate: 'glm-5-2',
}

export default {
  config: GLM_5_2_CONFIG,
  load,
  renderMessages,
}
