import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import Timestamp from './Timestamp.vue'

async function mountComponent() {
  const wrapper = mount(Timestamp)
  await nextTick()
  return wrapper
}

// Helper: compute local datetime string from a timestamp (ms)
function toLocalString(ms) {
  const d = new Date(ms)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

describe('Timestamp', () => {
  it('renders title', async () => {
    const wrapper = await mountComponent()
    expect(wrapper.text()).toContain('时间戳转换器')
  })

  it('fills current timestamp on mount (10-digit by default)', async () => {
    const wrapper = await mountComponent()
    const inputs = wrapper.findAll('input')
    const ts = inputs[0].element.value
    expect(ts).toMatch(/^\d{10}$/)
  })

  it('converts 10-digit timestamp to date', async () => {
    const wrapper = await mountComponent()
    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('1718000000')
    await inputs[0].trigger('input')
    expect(inputs[1].element.value).toBe(toLocalString(1718000000000))
  })

  it('converts date to 10-digit timestamp', async () => {
    const wrapper = await mountComponent()
    const inputs = wrapper.findAll('input')
    const localStr = toLocalString(1718000000000)
    await inputs[1].setValue(localStr)
    await inputs[1].trigger('input')
    expect(inputs[0].element.value).toBe('1718000000')
  })

  it('switches to 13-digit mode and converts existing timestamp', async () => {
    const wrapper = await mountComponent()
    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('1718000000')
    await inputs[0].trigger('input')

    const btn13 = wrapper.findAll('button').find(b => b.text().includes('13 位'))
    await btn13.trigger('click')

    expect(inputs[0].element.value).toBe('1718000000000')
  })

  it('switches from 13-digit to 10-digit and converts', async () => {
    const wrapper = await mountComponent()
    const btn13 = wrapper.findAll('button').find(b => b.text().includes('13 位'))
    await btn13.trigger('click')
    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('1718000000000')
    await inputs[0].trigger('input')

    const btn10 = wrapper.findAll('button').find(b => b.text().includes('10 位'))
    await btn10.trigger('click')

    expect(inputs[0].element.value).toBe('1718000000')
  })

  it('shows error for non-digit timestamp', async () => {
    const wrapper = await mountComponent()
    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('abc')
    await inputs[0].trigger('input')
    expect(wrapper.text()).toContain('无效的时间戳')
  })

  it('shows error for out-of-range timestamp', async () => {
    const wrapper = await mountComponent()
    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('0')
    await inputs[0].trigger('input')
    expect(wrapper.text()).toContain('时间戳超出范围')
  })

  it('shows error for invalid date string', async () => {
    const wrapper = await mountComponent()
    const inputs = wrapper.findAll('input')
    await inputs[1].setValue('not-a-date')
    await inputs[1].trigger('input')
    expect(wrapper.text()).toContain('无效的日期字符串')
  })

  it('clears datetime when timestamp is emptied', async () => {
    const wrapper = await mountComponent()
    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('1718000000')
    await inputs[0].trigger('input')
    expect(inputs[1].element.value).toBeTruthy()
    await inputs[0].setValue('')
    await inputs[0].trigger('input')
    expect(inputs[1].element.value).toBe('')
  })

  it('clears timestamp when datetime is emptied', async () => {
    const wrapper = await mountComponent()
    const inputs = wrapper.findAll('input')
    const localStr = toLocalString(1718000000000)
    await inputs[1].setValue(localStr)
    await inputs[1].trigger('input')
    expect(inputs[0].element.value).toBeTruthy()
    await inputs[1].setValue('')
    await inputs[1].trigger('input')
    expect(inputs[0].element.value).toBe('')
  })

  it('clears all fields with Clear button', async () => {
    const wrapper = await mountComponent()
    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('1718000000')
    await inputs[0].trigger('input')
    const clearBtn = wrapper.findAll('button').find(b => b.text().includes('清空'))
    await clearBtn.trigger('click')
    expect(inputs[0].element.value).toBe('')
    expect(inputs[1].element.value).toBe('')
  })

  it('converts 13-digit timestamp to date when in millis mode', async () => {
    const wrapper = await mountComponent()
    const btn13 = wrapper.findAll('button').find(b => b.text().includes('13 位'))
    await btn13.trigger('click')
    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('1718000000000')
    await inputs[0].trigger('input')
    expect(inputs[1].element.value).toBe(toLocalString(1718000000000))
  })
})
