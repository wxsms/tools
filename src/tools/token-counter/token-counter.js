// Registry-based orchestrator. Each per-model module under ./tokenizers/
// exports a default { config, load, renderMessages }. New models = add a
// file + register it in MODELS below; no other edits needed here.

import kimiK2 from './tokenizers/kimi-k2.js'
import deepseekV4 from './tokenizers/deepseek-v4.js'
import deepseekV4Flash from './tokenizers/deepseek-v4-flash.js'
import kimiK2_5 from './tokenizers/kimi-k2-5.js'
import kimiK2_6 from './tokenizers/kimi-k2-6.js'

const MODELS = [kimiK2, deepseekV4, deepseekV4Flash, kimiK2_5, kimiK2_6]

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

// Back-compat: existing tests import renderKimiMessages directly. Re-export
// from the per-model module so they keep working.
export { renderKimiMessages } from './tokenizers/kimi-k2.js'
