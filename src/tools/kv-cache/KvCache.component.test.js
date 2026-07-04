import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import KvCache from './KvCache.vue'

async function mountComponent() {
  const wrapper = mount(KvCache)
  await nextTick()
  return wrapper
}

// Component tests focus on UI interaction only — deep numeric correctness
// lives in ./kv-cache.test.js. Here we just verify the main flow:
// mount → auto-compute → input change → recompute → mode tab → reverse.
describe('KvCache view — main interaction flow', () => {
  it('renders title', async () => {
    const wrapper = await mountComponent()
    expect(wrapper.text()).toContain('KV Cache 尺寸计算器')
  })

  it('has no compute buttons — auto-trigger only', async () => {
    const wrapper = await mountComponent()
    expect(wrapper.findAll('button.btn-primary').length).toBe(0)
  })

  it('auto-computes on mount with default values', async () => {
    const wrapper = await mountComponent()
    expect(wrapper.text()).toContain('KV Cache Size')
  })

  it('shows Token 输入 in K units with helper text', async () => {
    const wrapper = await mountComponent()
    expect(wrapper.text()).toContain('Token 数 (K)')
    expect(wrapper.text()).toContain('1K = 1024 tokens')
  })

  it('recomputes when tokensK input changes', async () => {
    const wrapper = await mountComponent()
    const input = wrapper.find('input[type="number"]')
    // Change from default 1K to 10K — should still produce a KV Cache Size headline
    await input.setValue('10')
    await nextTick()
    expect(wrapper.text()).toContain('KV Cache Size')
    const before10 = wrapper.text()

    // Changing again should produce a different (larger) value
    await input.setValue('100')
    await nextTick()
    expect(wrapper.text()).not.toBe(before10)
  })

  it('rejects 0 / negative / non-numeric tokensK with error message', async () => {
    const wrapper = await mountComponent()
    const input = wrapper.find('input[type="number"]')
    for (const v of ['0', '-1', 'abc']) {
      await input.setValue(v)
      await nextTick()
      expect(wrapper.text()).toContain('请输入有效的 Token 数')
    }
  })

  it('switches to reverse mode via tab and shows Maximum Tokens', async () => {
    const wrapper = await mountComponent()
    const reverseTab = wrapper.findAll('[role="tab"]').find(t => t.text().includes('反算'))
    await reverseTab.trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('Maximum Tokens')
    expect(wrapper.text()).toMatch(/K\s*\(/) // K + raw-tokens-in-parens format
  })

  it('rejects 0 / negative GPU RAM in reverse mode', async () => {
    const wrapper = await mountComponent()
    const reverseTab = wrapper.findAll('[role="tab"]').find(t => t.text().includes('反算'))
    await reverseTab.trigger('click')
    await nextTick()
    const input = wrapper.find('input[type="number"]')
    for (const v of ['0', '-1']) {
      await input.setValue(v)
      await nextTick()
      expect(wrapper.text()).toContain('请输入有效的 GPU 显存')
    }
  })

  it('switches model and recomputes (architecture label visible)', async () => {
    const wrapper = await mountComponent()
    // Default Qwen3-8B (GQA). Switch to DeepSeek-V3 (MLA) — details should
    // now contain the MLA architecture label.
    const modelSelect = wrapper.findAll('select').find(s =>
      s.findAll('option').some(o => o.text().includes('DeepSeek-V3')),
    )
    await modelSelect.setValue('deepseek-ai/DeepSeek-V3')
    await nextTick()
    expect(wrapper.text()).toContain('Multi-head Latent Attention')
  })

  it('disables dtype selector for DSA models (DeepSeek-V4-Pro)', async () => {
    const wrapper = await mountComponent()
    const modelSelect = wrapper.findAll('select').find(s =>
      s.findAll('option').some(o => o.text().includes('DeepSeek-V4-Pro')),
    )
    await modelSelect.setValue('deepseek-ai/DeepSeek-V4-Pro')
    await nextTick()
    expect(wrapper.text()).toContain('DeepSeek V4 使用原生混合精度')
    const dtypeSelect = wrapper.findAll('select').find(s =>
      s.findAll('option').some(o => o.attributes('value') === 'fp8'),
    )
    expect(dtypeSelect.attributes('disabled')).toBeDefined()
  })

  it('round-trips forward ↔ reverse without stale state', async () => {
    const wrapper = await mountComponent()
    const input = wrapper.find('input[type="number"]')
    await input.setValue('100')
    await nextTick()

    const reverseTab = wrapper.findAll('[role="tab"]').find(t => t.text().includes('反算'))
    await reverseTab.trigger('click')
    await nextTick()

    const fwdTab = wrapper.findAll('[role="tab"]').find(t => t.text().includes('正向'))
    await fwdTab.trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('KV Cache Size')
  })
})
