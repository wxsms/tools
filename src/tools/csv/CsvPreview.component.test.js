import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

// 默认 mock；具体用例可覆盖
vi.mock('papaparse', () => ({
  default: {
    parse: vi.fn(),
  },
}))

import Papa from 'papaparse'
import CsvPreview from './CsvPreview.vue'

const SAMPLE_CSV = 'name,age\nAlice,30\nBob,25'

function mountIdle() {
  return mount(CsvPreview)
}

function setPapaResult(data, errors = []) {
  Papa.parse.mockReturnValue({ data, errors })
}

describe('CsvPreview - idle state', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders title', () => {
    const wrapper = mountIdle()
    expect(wrapper.text()).toContain('CSV 预览')
  })

  it('shows textarea with placeholder', () => {
    const wrapper = mountIdle()
    const ta = wrapper.find('textarea')
    expect(ta.exists()).toBe(true)
    expect(ta.attributes('placeholder')).toContain('粘贴 CSV')
  })

  it('disables 解析 button when textarea is empty', () => {
    const wrapper = mountIdle()
    const btn = wrapper.findAll('button').find(b => b.text().includes('解析'))
    expect(btn.element.disabled).toBe(true)
  })

  it('enables 解析 button when textarea has content', async () => {
    const wrapper = mountIdle()
    await wrapper.find('textarea').setValue(SAMPLE_CSV)
    const btn = wrapper.findAll('button').find(b => b.text().includes('解析'))
    expect(btn.element.disabled).toBe(false)
  })

  it('clears textarea on 清空 click', async () => {
    const wrapper = mountIdle()
    await wrapper.find('textarea').setValue(SAMPLE_CSV)
    const clearBtn = wrapper.findAll('button').find(b => b.text().includes('清空'))
    await clearBtn.trigger('click')
    expect(wrapper.find('textarea').element.value).toBe('')
  })

  it('fills textarea from file upload', async () => {
    const wrapper = mountIdle()
    const file = new File([SAMPLE_CSV], 'test.csv', { type: 'text/csv' })
    const input = wrapper.find('input[type="file"]')
    Object.defineProperty(input.element, 'files', { value: [file], writable: false })
    await input.trigger('change')
    await flushPromises()
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(wrapper.find('textarea').element.value).toBe(SAMPLE_CSV)
  })
})

describe('CsvPreview - parse → loaded', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('switches to loaded view showing row/col count', async () => {
    setPapaResult([
      ['name', 'age'],
      ['Alice', '30'],
      ['Bob', '25'],
    ])
    const wrapper = mountIdle()
    await wrapper.find('textarea').setValue(SAMPLE_CSV)
    const parseBtn = wrapper.findAll('button').find(b => b.text().includes('解析'))
    await parseBtn.trigger('click')
    expect(wrapper.text()).toContain('2 行')
    expect(wrapper.text()).toContain('2 列')
  })

  it('shows 更换 button in loaded state', async () => {
    setPapaResult([['a'], ['1']])
    const wrapper = mountIdle()
    await wrapper.find('textarea').setValue('a\n1')
    const parseBtn = wrapper.findAll('button').find(b => b.text().includes('解析'))
    await parseBtn.trigger('click')
    const swapBtn = wrapper.findAll('button').find(b => b.text().includes('更换'))
    expect(swapBtn.exists()).toBe(true)
  })

  it('returns to idle (with textarea preserved) on 更换 click', async () => {
    setPapaResult([['a'], ['1']])
    const wrapper = mountIdle()
    await wrapper.find('textarea').setValue('a\n1')
    const parseBtn = wrapper.findAll('button').find(b => b.text().includes('解析'))
    await parseBtn.trigger('click')
    const swapBtn = wrapper.findAll('button').find(b => b.text().includes('更换'))
    await swapBtn.trigger('click')
    expect(wrapper.find('textarea').exists()).toBe(true)
    expect(wrapper.find('textarea').element.value).toBe('a\n1')
  })

  it('shows "无数据行" when only header present', async () => {
    setPapaResult([['a', 'b']])
    const wrapper = mountIdle()
    await wrapper.find('textarea').setValue('a,b')
    const parseBtn = wrapper.findAll('button').find(b => b.text().includes('解析'))
    await parseBtn.trigger('click')
    expect(wrapper.text()).toContain('无数据行')
  })
})

describe('CsvPreview - error state', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows error message when PapaParse returns errors', async () => {
    setPapaResult([['a'], ['1']], [{ message: 'bad row' }])
    const wrapper = mountIdle()
    await wrapper.find('textarea').setValue('a\n1')
    const parseBtn = wrapper.findAll('button').find(b => b.text().includes('解析'))
    await parseBtn.trigger('click')
    expect(wrapper.text()).toContain('CSV 解析失败')
    expect(wrapper.text()).toContain('bad row')
    // textarea preserved
    expect(wrapper.find('textarea').exists()).toBe(true)
  })
})
