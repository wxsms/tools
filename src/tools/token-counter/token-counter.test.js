import { describe, it, expect } from 'vitest'
import { MODEL_CONFIGS } from './token-counter.js'

describe('MODEL_CONFIGS', () => {
  it('exposes kimi-k2 as the first entry with the required fields', () => {
    const k2 = MODEL_CONFIGS.find((m) => m.id === 'kimi-k2')
    expect(k2).toBeDefined()
    expect(k2.label).toBe('Kimi K2 (K2.7-Code)')
    expect(k2.tokenizer.type).toBe('tiktoken')
    expect(k2.tokenizer.file).toBe('/tokenizers/kimi-k2.tiktoken')
    expect(k2.tokenizer.specialTokens).toBeInstanceOf(Object)
    expect(k2.tokenizer.specialTokens['<|im_end|>']).toBe(163586)
    expect(k2.tokenizer.specialTokens['<|im_user|>']).toBe(163587)
    expect(k2.tokenizer.specialTokens['<|im_assistant|>']).toBe(163588)
    expect(k2.tokenizer.specialTokens['<|im_system|>']).toBe(163594)
    expect(k2.tokenizer.specialTokens['<|im_middle|>']).toBe(163601)
    expect(k2.chatTemplate).toBe('kimi-k2')
  })
})
