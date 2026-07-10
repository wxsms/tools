import kimiK2, { KIMI_K2_SPECIAL_TOKENS } from './kimi-k2.js'

// Kimi K2.5 (https://modelscope.cn/models/moonshotai/Kimi-K2.5) ships no
// tokenizer.json — only safetensors. ModelScope reports its 160K vocab and
// ChatML envelope match the K2.x family, so we reuse the K2.7-Code tiktoken
// file + the simple ChatML renderer already shipped under kimi-k2.js. Only
// the config (id/label) differs here. Counts match K2.5 instant-mode usage.
const { load, renderMessages } = kimiK2

const KIMI_K2_5_CONFIG = {
  id: 'kimi-k2-5',
  label: 'Kimi K2.5',
  tokenizer: {
    type: 'tiktoken',
    file: '/tokenizers/kimi-k2.tiktoken',
    specialTokens: KIMI_K2_SPECIAL_TOKENS,
  },
  chatTemplate: 'kimi-k2',
}

export default {
  config: KIMI_K2_5_CONFIG,
  load,
  renderMessages,
}
