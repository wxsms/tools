import kimiK2, { KIMI_K2_SPECIAL_TOKENS } from './kimi-k2.js'

// Kimi K2.6 (https://modelscope.cn/models/moonshotai/Kimi-K2.6) shares the
// K2.5 architecture and the K2.x family tokenizer. Same reuse story as
// kimi-k2-5.js — see that file's header comment.
const { load, renderMessages } = kimiK2

const KIMI_K2_6_CONFIG = {
  id: 'kimi-k2-6',
  label: 'Kimi K2.6',
  tokenizer: {
    type: 'tiktoken',
    file: '/tokenizers/kimi-k2.tiktoken',
    specialTokens: KIMI_K2_SPECIAL_TOKENS,
  },
  chatTemplate: 'kimi-k2',
}

export default {
  config: KIMI_K2_6_CONFIG,
  load,
  renderMessages,
}
