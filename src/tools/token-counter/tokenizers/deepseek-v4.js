import { Tokenizer as HFTokenizer } from '@huggingface/tokenizers'

// DeepSeek-V4 chat mode (thinking_mode="chat"), plain-text-content subset.
// Ported from encoding_dsv4.py encode_messages(..., thinking_mode="chat") at
// https://modelscope.cn/models/deepseek-ai/DeepSeek-V4-Pro  — see
// encoding/encoding_dsv4.py render_message(). v1 drops: tools, reasoning_content,
// latest_reminder, developer, task, response_format; only system/user/assistant
// with plain-text content are rendered.
//
// Chat-template token strings. The separators inside are:
//   "｜"   U+FF5C (fullwidth vertical line) at the angle-bracket boundaries
//   "▁"    U+2581 (lower-one-eighth-block, SentencePiece space marker) between words
// Verified byte-exact against tokenizer.json added_tokens entries:
//   id=0      <｜begin▁of▁sentence｜>     (BOS)
//   id=1      <｜end▁of▁sentence｜>       (EOS)
//   id=128803 <｜User｜>
//   id=128804 <｜Assistant｜>
//   id=128822  Assistant assistant                    (thinking-end)
const BOS = '<\uff5cbegin\u2581of\u2581sentence\uff5c>'
const EOS = '<\uff5cend\u2581of\u2581sentence\uff5c>'
const USER = '<\uff5cUser\uff5c>'
const ASSISTANT = '<\uff5cAssistant\uff5c>'
// Built via String.fromCharCode to keep the literal angle-bracket tag bytes
// out of source (an editor / pipeline layer was rewriting them). Verified
// bytes from encoding_dsv4.py: 3c 2f 74 68 69 6e 6b 3e.
const THINKING_END = String.fromCharCode(
  0x3c, 0x2f, 0x74, 0x68, 0x69, 0x6e, 0x6b, 0x3e,
)
const ASSISTANT_TAIL = ASSISTANT + THINKING_END

function makeAdapter(tok) {
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

function renderMessages(messages) {
  let out = BOS
  for (const msg of messages) {
    if (msg.role === 'system') {
      // System content is concatenated without special-token wrapping
      // (per encoding_dsv4.py system_msg_template = "{content}").
      out += msg.content || ''
    } else if (msg.role === 'user') {
      out += USER + (msg.content || '')
    } else if (msg.role === 'assistant') {
      // assistant_msg_template = "{reasoning}{content}{tool_calls}" + eos
      // In chat mode, completed assistant turns emit the thinking-end token
      // immediately after the assistant open token (closing the thinking
      // block), so the final string is assistant-open + thinking-end +
      // content + EOS.
      out += ASSISTANT + THINKING_END + (msg.content || '') + EOS
    } else {
      throw new Error(`Unknown role: ${msg.role}`)
    }
  }
  // Open assistant tail (simulates request awaiting response).
  out += ASSISTANT_TAIL
  return out
}

async function load() {
  const res = await fetch(DEEPSEEK_V4_CONFIG.tokenizer.file)
  if (!res.ok) {
    throw new Error(
      `Failed to fetch ${DEEPSEEK_V4_CONFIG.tokenizer.file}: ${res.status}`,
    )
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
  return makeAdapter(tok)
}

const DEEPSEEK_V4_CONFIG = {
  id: 'deepseek-v4-pro',
  label: 'DeepSeek V4 Pro',
  tokenizer: {
    type: 'hf',
    file: '/tokenizers/deepseek-v4-pro.json',
  },
  chatTemplate: 'deepseek-v4',
}

export default {
  config: DEEPSEEK_V4_CONFIG,
  load,
  renderMessages,
}
