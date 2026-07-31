import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import KvCache from './KvCache.vue'

async function mountComponent() {
  const wrapper = mount(KvCache)
  await nextTick()
  return wrapper
}

describe('KvCache view — new kvcache.ai UI', () => {
  it('renders title with upstream source link', async () => {
    const wrapper = await mountComponent()
    expect(wrapper.text()).toContain('KV Cache Calculator')
    expect(wrapper.html()).toContain('https://kvcache.ai/tools/kv-cache-size-calculator/')
    expect(wrapper.html()).toContain('github.com/kvcache-ai/kvcache-blog')
  })

  it('renders model select with 12 family optgroups', async () => {
    const wrapper = await mountComponent()
    const groups = wrapper.findAll('optgroup')
    expect(groups.length).toBe(12)
    const labels = groups.map(g => g.attributes('label'))
    expect(labels).toEqual([
      'DeepSeek', 'GLM', 'Kimi', 'Qwen3.6', 'Qwen3.5',
      'Qwen3', 'Qwen2.5', 'Llama', 'Gemma', 'Cohere', 'MiMo', 'MiniMax',
    ])
  })

  it('default model qwen3-8b auto-computes on mount', async () => {
    const wrapper = await mountComponent()
    expect(wrapper.text()).toContain('GiB')
  })

  it('recomputes when tokens input changes', async () => {
    const wrapper = await mountComponent()
    const tokensInput = wrapper.find('input[type="number"]')
    await tokensInput.setValue('10240')
    await nextTick()
    expect(wrapper.text()).toContain('GiB')
  })

  it('recomputes when sequences input changes', async () => {
    const wrapper = await mountComponent()
    const inputs = wrapper.findAll('input[type="number"]')
    await inputs[1].setValue('4')
    await nextTick()
    expect(wrapper.text()).toContain('GiB')
  })

  it('shows indexer precision selector and draft toggle for deepseek-v4-pro', async () => {
    const wrapper = await mountComponent()
    const modelSelect = wrapper.find('select')
    await modelSelect.setValue('deepseek-v4-pro')
    await nextTick()
    expect(wrapper.text()).toContain('Indexer 精度')
    expect(wrapper.text()).toContain('Include draft KV cache')
    const selects = wrapper.findAll('select')
    const idxSelect = selects[selects.length - 1]
    expect(idxSelect.element.value).toBe('fp4_int4')
  })

  it('shows KDA checkpoint policy radios for kimi-k3', async () => {
    const wrapper = await mountComponent()
    const modelSelect = wrapper.find('select')
    await modelSelect.setValue('kimi-k3')
    await nextTick()
    expect(wrapper.text()).toContain('KDA Checkpoint Policy')
    expect(wrapper.text()).toContain('Prompt-End State')
    expect(wrapper.text()).toContain('Fixed Interval Checkpoints')
    expect(wrapper.text()).toContain('linear-attention state')
  })

  it('reveals interval input when Fixed Interval is selected for kimi-k3', async () => {
    const wrapper = await mountComponent()
    const modelSelect = wrapper.find('select')
    await modelSelect.setValue('kimi-k3')
    await nextTick()
    const fixedRadio = wrapper.findAll('input[type="radio"]').find(r =>
      r.attributes('value') === 'fixed_interval',
    )
    await fixedRadio.setValue(true)
    await nextTick()
    expect(wrapper.text()).toContain('Checkpoint interval')
  })

  it('shows linear-attention-state toggle but no KDA policy for qwen3.5-397b-a17b', async () => {
    const wrapper = await mountComponent()
    const modelSelect = wrapper.find('select')
    await modelSelect.setValue('qwen3.5-397b-a17b')
    await nextTick()
    expect(wrapper.text()).toContain('linear-attention state')
    expect(wrapper.text()).not.toContain('KDA Checkpoint Policy')
  })

  it('shows indexer precision but no draft toggle for minimax-m3', async () => {
    const wrapper = await mountComponent()
    const modelSelect = wrapper.find('select')
    await modelSelect.setValue('minimax-m3')
    await nextTick()
    expect(wrapper.text()).toContain('Indexer 精度')
    expect(wrapper.text()).not.toContain('Include draft KV cache')
  })

  it('hides indexer precision, draft toggle, linear-state toggle, and KDA policy for qwen3-8b', async () => {
    const wrapper = await mountComponent()
    expect(wrapper.text()).not.toContain('Indexer 精度')
    expect(wrapper.text()).not.toContain('Include draft KV cache')
    expect(wrapper.text()).not.toContain('linear-attention state')
    expect(wrapper.text()).not.toContain('KDA Checkpoint Policy')
  })

  it('has no compute button — auto-recompute only', async () => {
    const wrapper = await mountComponent()
    const buttons = wrapper.findAll('button')
    expect(buttons.some(b => b.text().includes('计算') || b.text().includes('Compute'))).toBe(false)
  })

  it('no longer has forward/reverse mode tabs', async () => {
    const wrapper = await mountComponent()
    expect(wrapper.text()).not.toContain('反算')
    expect(wrapper.text()).not.toContain('正向')
  })

  it('shows formula breakdown in a collapsed details element', async () => {
    const wrapper = await mountComponent()
    // Match the details element regardless of Vue's data-v-* scope attribute
    expect(wrapper.html()).toMatch(/<details[^>]*>/)
    expect(wrapper.text()).toContain('Formula breakdown')
  })
})
