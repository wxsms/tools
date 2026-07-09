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
]

// Module-level cache: modelId -> Promise<Tiktoken> (so concurrent first calls
// share a single fetch). Resolved instances are also retrievable synchronously
// via getEncoder().
const encoderCache = new Map()
const encoderPromiseCache = new Map()

export function _resetCacheForTests() {
  encoderCache.clear()
  encoderPromiseCache.clear()
}
