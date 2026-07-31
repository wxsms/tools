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
  it('renders Chinese title without source link', async () => {
    const wrapper = await mountComponent()
    expect(wrapper.text()).toContain('KVCache 尺寸计算器')
    // Source link should NOT appear
    expect(wrapper.html()).not.toContain('kvcache.ai/tools/kv-cache-size-calculator')
    expect(wrapper.html()).not.toContain('github.com/kvcache-ai/kvcache-blog')
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

  it('default model is the first in the dropdown (deepseek-r1)', async () => {
    const wrapper = await mountComponent()
    const modelSelect = wrapper.find('select')
    expect(modelSelect.element.value).toBe('deepseek-r1')
    expect(wrapper.text()).toContain('GiB')
  })

  it('renders only one number input (tokens) — no sequences input', async () => {
    const wrapper = await mountComponent()
    const numberInputs = wrapper.findAll('input[type="number"]')
    expect(numberInputs.length).toBe(1)
    expect(wrapper.text()).not.toContain('Sequences')
    expect(wrapper.text()).toContain('输入长度')
  })

  it('recomputes when tokens input changes', async () => {
    const wrapper = await mountComponent()
    const tokensInput = wrapper.find('input[type="number"]')
    await tokensInput.setValue('10240')
    await nextTick()
    expect(wrapper.text()).toContain('GiB')
  })

  it('shows indexer precision selector and draft toggle for deepseek-v4-pro', async () => {
    const wrapper = await mountComponent()
    const modelSelect = wrapper.find('select')
    await modelSelect.setValue('deepseek-v4-pro')
    await nextTick()
    expect(wrapper.text()).toContain('Indexer 精度')
    expect(wrapper.text()).toContain('包含 draft KV cache')
    const selects = wrapper.findAll('select')
    const idxSelect = selects[selects.length - 1]
    expect(idxSelect.element.value).toBe('fp4_int4')
  })

  it('shows KDA checkpoint policy radios for kimi-k3', async () => {
    const wrapper = await mountComponent()
    const modelSelect = wrapper.find('select')
    await modelSelect.setValue('kimi-k3')
    await nextTick()
    expect(wrapper.text()).toContain('KDA 检查点策略')
    expect(wrapper.text()).toContain('Prompt 末尾状态')
    expect(wrapper.text()).toContain('固定间隔检查点')
    expect(wrapper.text()).toContain('linear-attention 状态')
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
    expect(wrapper.text()).toContain('检查点间隔')
  })

  it('shows linear-attention-state toggle but no KDA policy for qwen3.5-397b-a17b', async () => {
    const wrapper = await mountComponent()
    const modelSelect = wrapper.find('select')
    await modelSelect.setValue('qwen3.5-397b-a17b')
    await nextTick()
    expect(wrapper.text()).toContain('linear-attention 状态')
    expect(wrapper.text()).not.toContain('KDA 检查点策略')
  })

  it('shows indexer precision but no draft toggle for minimax-m3', async () => {
    const wrapper = await mountComponent()
    const modelSelect = wrapper.find('select')
    await modelSelect.setValue('minimax-m3')
    await nextTick()
    expect(wrapper.text()).toContain('Indexer 精度')
    expect(wrapper.text()).not.toContain('包含 draft KV cache')
  })

  it('hides indexer precision, draft toggle, linear-state toggle, and KDA policy for qwen3-8b', async () => {
    const wrapper = await mountComponent()
    const modelSelect = wrapper.find('select')
    await modelSelect.setValue('qwen3-8b')
    await nextTick()
    expect(wrapper.text()).not.toContain('Indexer 精度')
    expect(wrapper.text()).not.toContain('包含 draft KV cache')
    expect(wrapper.text()).not.toContain('linear-attention 状态')
    expect(wrapper.text()).not.toContain('KDA 检查点策略')
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
    expect(wrapper.html()).toMatch(/<details[^>]*>/)
    expect(wrapper.text()).toContain('公式详情')
  })

  it('Model line in results does not include the id in parentheses', async () => {
    const wrapper = await mountComponent()
    // Default model is deepseek-r1 → label "DeepSeek R1"
    expect(wrapper.text()).toContain('DeepSeek R1')
    expect(wrapper.text()).not.toContain('(deepseek-r1)')
  })

  it('preserves KV precision when switching models', async () => {
    const wrapper = await mountComponent()
    // Default deepseek-r1 has default precision bf16_fp16
    const precisionSelect = wrapper.findAll('select').find(s =>
      s.findAll('option').some(o => o.attributes('value') === 'fp8_int8'),
    )
    await precisionSelect.setValue('fp8_int8')
    await nextTick()
    expect(precisionSelect.element.value).toBe('fp8_int8')

    // Switch to qwen3-8b — precision should stay fp8_int8, not reset to bf16_fp16
    const modelSelect = wrapper.find('select')
    await modelSelect.setValue('qwen3-8b')
    await nextTick()
    expect(precisionSelect.element.value).toBe('fp8_int8')
  })

  it('preserves indexer precision when switching between indexer models', async () => {
    const wrapper = await mountComponent()
    // Switch to deepseek-v4-pro (has indexer, defaults to fp4_int4)
    const modelSelect = wrapper.find('select')
    await modelSelect.setValue('deepseek-v4-pro')
    await nextTick()
    const selects = wrapper.findAll('select')
    const idxSelect = selects[selects.length - 1]
    expect(idxSelect.element.value).toBe('fp4_int4')

    // Change indexer precision to fp8_int8
    await idxSelect.setValue('fp8_int8')
    await nextTick()
    expect(idxSelect.element.value).toBe('fp8_int8')

    // Switch to deepseek-v3.2 (also has indexer) — indexer precision should stay
    await modelSelect.setValue('deepseek-v3.2')
    await nextTick()
    const selects2 = wrapper.findAll('select')
    const idxSelect2 = selects2[selects2.length - 1]
    expect(idxSelect2.element.value).toBe('fp8_int8')
  })
})
