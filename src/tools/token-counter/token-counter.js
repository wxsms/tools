// Registry-based orchestrator. Each per-model module under ./tokenizers/
// exports a default { config, load, renderMessages }. New models = add a
// file + register it in MODELS below; no other edits needed here.

import gpt4o from './tokenizers/gpt-4o.js'
import gpt4 from './tokenizers/gpt-4.js'
import kimiK2_5 from './tokenizers/kimi-k2-5.js'
import kimiK2_6 from './tokenizers/kimi-k2-6.js'
import kimiK2 from './tokenizers/kimi-k2.js'
import deepseekV4 from './tokenizers/deepseek-v4.js'
import deepseekV4Flash from './tokenizers/deepseek-v4-flash.js'
import glm5_2 from './tokenizers/glm-5-2.js'

const MODELS = [gpt4o, gpt4, kimiK2_5, kimiK2_6, kimiK2, deepseekV4, deepseekV4Flash, glm5_2]

export const MODEL_CONFIGS = MODELS.map((m) => m.config)

const BY_ID = new Map(MODELS.map((m) => [m.config.id, m]))

// Module-level cache: modelId -> Promise<adapter>. The promise cache lets
// concurrent first calls share a single fetch; the resolved adapter lives
// in the same map once ready.
const encoderCache = new Map() // modelId -> adapter (resolved)
const encoderPromiseCache = new Map() // modelId -> Promise<adapter>

export function _resetCacheForTests() {
  encoderCache.clear()
  encoderPromiseCache.clear()
}

export async function loadTokenizer(modelId) {
  if (encoderCache.has(modelId)) return encoderCache.get(modelId)
  if (encoderPromiseCache.has(modelId)) return encoderPromiseCache.get(modelId)

  const mod = BY_ID.get(modelId)
  if (!mod) throw new Error(`Unknown model: ${modelId}`)

  const promise = (async () => {
    const adapter = await mod.load()
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

export function renderMessages(modelId, messages) {
  const mod = BY_ID.get(modelId)
  if (!mod) throw new Error(`Unknown model: ${modelId}`)
  return mod.renderMessages(messages)
}

// Per-id piece list for the preview. Prefers the adapter's `tokens(source)`
// (which returns the real per-token strings the tokenizer emits) when
// available — used by GLM-5.2 / DeepSeek (HF `tokenizers` backend) so the
// chip count matches the token count exactly. Falls back to a per-id
// `decodeId` loop for adapters that don't implement `tokens()` (Kimi K2 uses
// `js-tiktoken` which exposes no such field).
export function tokenPieces(adapter, source) {
  if (adapter && typeof adapter.tokens === 'function') {
    const pieces = adapter.tokens(source)
    return pieces.map((piece, i) => ({ id: i, piece }))
  }
  const ids = adapter.encode(source)
  return ids.map((id) => ({ id, piece: adapter.decodeId(id) }))
}

// Back-compat: existing tests import renderKimiMessages directly. Re-export
// from the per-model module so they keep working.
export { renderKimiMessages } from './tokenizers/kimi-k2.js'
