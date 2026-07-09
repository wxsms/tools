import { load, renderMessages } from './deepseek-v4.js'

// DeepSeek V4 Flash (https://modelscope.cn/models/deepseek-ai/DeepSeek-V4-Flash)
// shares the V4 Pro tokenizer byte-for-byte — the repo ships only safetensors
// and the README chat-template example loads deepseek-ai/DeepSeek-V4-Pro's
// tokenizer. So load() and renderMessages() are literally V4 Pro's, and only
// the config (id/label) differs here.
const DEEPSEEK_V4_FLASH_CONFIG = {
  id: 'deepseek-v4-flash',
  label: 'DeepSeek V4 Flash',
  tokenizer: {
    type: 'hf',
    file: '/tokenizers/deepseek-v4-pro.json',
  },
  chatTemplate: 'deepseek-v4',
}

export default {
  config: DEEPSEEK_V4_FLASH_CONFIG,
  load,
  renderMessages,
}
