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
      // (e.g. USER, built from 3c 7c 75 73 65 72 7c 3e) to their registered
      // ids. Mirrors deepseek-v4.js.
      const out = tok.encode(text, { add_special_tokens: true })
      return out.ids
    },
    decodeId(id) {
      return tok.decode([id], { skip_special_tokens: false })
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
