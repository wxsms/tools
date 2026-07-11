import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'

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

  it('disables 解析 button when textarea is empty', async () => {
    const wrapper = mountIdle()
    await wrapper.find('textarea').setValue('')
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

describe('CsvPreview - table rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  async function mountLoaded() {
    Papa.parse.mockReturnValue({
      data: [
        ['name', 'age', 'score'],
        ['Alice', '30', '85.5'],
        ['Bob', '25', '90.2'],
      ],
      errors: [],
    })
    const wrapper = mount(CsvPreview)
    await wrapper.find('textarea').setValue('name,age,score\nAlice,30,85.5\nBob,25,90.2')
    const parseBtn = wrapper.findAll('button').find(b => b.text().includes('解析'))
    await parseBtn.trigger('click')
    return wrapper
  }

  it('renders all column headers with type annotations', async () => {
    const wrapper = await mountLoaded()
    const text = wrapper.text()
    expect(text).toContain('name')
    expect(text).toContain('integer')
    expect(text).toContain('float')
    expect(text).toContain('string')
  })

  it('renders column stats in header row', async () => {
    const wrapper = await mountLoaded()
    const text = wrapper.text()
    // age 30, 25 → min:25 max:30
    expect(text).toContain('25')
    expect(text).toContain('30')
    // score avg = (85.5+90.2)/2 = 87.85
    expect(text).toContain('87.85')
  })

  it('renders data rows in body', async () => {
    const wrapper = await mountLoaded()
    const body = wrapper.find('.csv-body')
    expect(body.exists()).toBe(true)
    const rows = body.findAll('[data-row]')
    expect(rows.length).toBe(2)
    expect(body.text()).toContain('Alice')
    expect(body.text()).toContain('Bob')
  })

  it('truncates long cell content with title attribute', async () => {
    Papa.parse.mockReturnValue({
      data: [['col'], ['a'.repeat(500)]],
      errors: [],
    })
    const wrapper = mount(CsvPreview)
    await wrapper.find('textarea').setValue('col\n' + 'a'.repeat(500))
    const parseBtn = wrapper.findAll('button').find(b => b.text().includes('解析'))
    await parseBtn.trigger('click')
    const cell = wrapper.find('.csv-body [data-row]:first-child > div:first-child')
    expect(cell.attributes('title')).toBe('a'.repeat(500))
    expect(cell.classes()).toContain('truncate')
  })
})

describe('CsvPreview - virtual scroll', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders only a window of rows for large data', async () => {
    // 造 5000 行
    const data = [['v']]
    for (let i = 0; i < 5000; i++) data.push([String(i)])
    Papa.parse.mockReturnValue({ data, errors: [] })

    const wrapper = mount(CsvPreview)
    await wrapper.find('textarea').setValue('v\n' + Array.from({ length: 5000 }, (_, i) => i).join('\n'))
    const parseBtn = wrapper.findAll('button').find(b => b.text().includes('解析'))
    await parseBtn.trigger('click')

    const body = wrapper.find('.csv-body')
    const rows = body.findAll('[data-row]')
    // 5000 行不应全部渲染；窗口 + 缓冲应在合理范围（< 100）
    expect(rows.length).toBeLessThan(100)
    expect(rows.length).toBeGreaterThan(5)
  })

  it('updates rendered window on scroll', async () => {
    const data = [['v']]
    for (let i = 0; i < 5000; i++) data.push([String(i)])
    Papa.parse.mockReturnValue({ data, errors: [] })

    const wrapper = mount(CsvPreview)
    await wrapper.find('textarea').setValue('v\n' + Array.from({ length: 5000 }, (_, i) => i).join('\n'))
    const parseBtn = wrapper.findAll('button').find(b => b.text().includes('解析'))
    await parseBtn.trigger('click')

    // 抓 firstRow 当前显示的内容
    const body = wrapper.find('.csv-body')
    const beforeFirst = body.find('[data-row]').text()

    // 滚动到很底部
    const scrollEl = wrapper.find('.csv-scroll-container')
    // jsdom 不真实渲染高度，直接设 scrollTop 后触发 scroll
    scrollEl.element.scrollTop = 5000 * 36 - 600
    await scrollEl.trigger('scroll')

    const afterFirst = body.find('[data-row]').text()
    expect(afterFirst).not.toBe(beforeFirst)
  })
})

describe('CsvPreview - sort and filter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  async function mountLoaded() {
    Papa.parse.mockReturnValue({
      data: [
        ['name', 'age'],
        ['Alice', '30'],
        ['Bob', '25'],
        ['Carol', '35'],
      ],
      errors: [],
    })
    const wrapper = mount(CsvPreview)
    await wrapper.find('textarea').setValue('name,age\nAlice,30\nBob,25\nCarol,35')
    const parseBtn = wrapper.findAll('button').find(b => b.text().includes('解析'))
    await parseBtn.trigger('click')
    return wrapper
  }

  it('cycles sort state on column header click', async () => {
    const wrapper = await mountLoaded()
    const headers = wrapper.findAll('.csv-header-cell')
    // 点 age 列头（索引 1）→ asc
    await headers[1].trigger('click')
    let rows = wrapper.find('.csv-body').findAll('[data-row]')
    expect(rows[0].text()).toContain('Bob') // 25 最小

    // 再点 → desc
    await headers[1].trigger('click')
    rows = wrapper.find('.csv-body').findAll('[data-row]')
    expect(rows[0].text()).toContain('Carol') // 35 最大

    // 再点 → 回到无序（原序）
    await headers[1].trigger('click')
    rows = wrapper.find('.csv-body').findAll('[data-row]')
    expect(rows[0].text()).toContain('Alice')
  })

  it('renders a filter input per column', async () => {
    const wrapper = await mountLoaded()
    const inputs = wrapper.findAll('.csv-filter-input')
    expect(inputs.length).toBe(2)
  })

  it('filters rows by single column (case-insensitive contains)', async () => {
    const wrapper = await mountLoaded()
    const inputs = wrapper.findAll('.csv-filter-input')
    await inputs[0].setValue('ali')
    const rows = wrapper.find('.csv-body').findAll('[data-row]')
    expect(rows.length).toBe(1)
    expect(rows[0].text()).toContain('Alice')
  })

  it('filters rows by multiple columns with AND', async () => {
    const wrapper = await mountLoaded()
    const inputs = wrapper.findAll('.csv-filter-input')
    await inputs[0].setValue('a')   // Alice, Carol
    await inputs[1].setValue('3')   // age 含 3: Alice(30), Carol(35)
    const rows = wrapper.find('.csv-body').findAll('[data-row]')
    expect(rows.length).toBe(2)
    const text = rows.map(r => r.text()).join(' ')
    expect(text).toContain('Alice')
    expect(text).toContain('Carol')
    expect(text).not.toContain('Bob')
  })

  it('shows filter count in toolbar', async () => {
    const wrapper = await mountLoaded()
    const inputs = wrapper.findAll('.csv-filter-input')
    await inputs[0].setValue('ali')
    expect(wrapper.text()).toContain('筛选条件 1')
  })

  it('clears all filters on 清除 click', async () => {
    const wrapper = await mountLoaded()
    const inputs = wrapper.findAll('.csv-filter-input')
    await inputs[0].setValue('ali')
    const clearBtn = wrapper.findAll('button').find(b => b.text().includes('清除'))
    await clearBtn.trigger('click')
    const rows = wrapper.find('.csv-body').findAll('[data-row]')
    expect(rows.length).toBe(3)
  })

  it('shows displayed/total count "显示 N 行 / 共 M 行"', async () => {
    const wrapper = await mountLoaded()
    expect(wrapper.text()).toContain('显示 3 行')
    expect(wrapper.text()).toContain('共 3 行')
    const inputs = wrapper.findAll('.csv-filter-input')
    await inputs[0].setValue('ali')
    expect(wrapper.text()).toContain('显示 1 行')
    expect(wrapper.text()).toContain('共 3 行')
  })

  it('combines filter + sort (filter first, then sort)', async () => {
    const wrapper = await mountLoaded()
    // 筛 age 含 3 → Alice(30), Carol(35)
    const inputs = wrapper.findAll('.csv-filter-input')
    await inputs[1].setValue('3')
    // 排序 age desc
    const headers = wrapper.findAll('.csv-header-cell')
    await headers[1].trigger('click')
    await headers[1].trigger('click')
    const rows = wrapper.find('.csv-body').findAll('[data-row]')
    expect(rows[0].text()).toContain('Carol')
    expect(rows[1].text()).toContain('Alice')
    expect(rows.length).toBe(2)
  })
})

describe('CsvPreview - export', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // stub clipboard
    vi.stubGlobal('navigator', {
      ...navigator,
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  async function mountLoaded() {
    Papa.parse.mockReturnValue({
      data: [
        ['name', 'age'],
        ['Alice', '30'],
        ['Bob', '25'],
      ],
      errors: [],
    })
    const wrapper = mount(CsvPreview)
    await wrapper.find('textarea').setValue('name,age\nAlice,30\nBob,25')
    const parseBtn = wrapper.findAll('button').find(b => b.text().includes('解析'))
    await parseBtn.trigger('click')
    return wrapper
  }

  it('has 导出 dropdown button', async () => {
    const wrapper = await mountLoaded()
    const btn = wrapper.findAll('button').find(b => b.text().includes('导出'))
    expect(btn.exists()).toBe(true)
  })

  it('exports JSON to clipboard', async () => {
    const wrapper = await mountLoaded()
    // 展开 dropdown
    const dropdownBtn = wrapper.findAll('button').find(b => b.text().includes('导出'))
    await dropdownBtn.trigger('click')
    await nextTick()
    // 点击 JSON 选项
    const jsonBtn = wrapper.findAll('button').find(b => b.text().trim() === 'JSON')
    await jsonBtn.trigger('click')
    await nextTick()
    expect(navigator.clipboard.writeText).toHaveBeenCalled()
    const calledWith = navigator.clipboard.writeText.mock.calls[0][0]
    const parsed = JSON.parse(calledWith)
    expect(parsed).toEqual([
      { name: 'Alice', age: '30' },
      { name: 'Bob', age: '25' },
    ])
  })

  it('exports Markdown to clipboard', async () => {
    const wrapper = await mountLoaded()
    const dropdownBtn = wrapper.findAll('button').find(b => b.text().includes('导出'))
    await dropdownBtn.trigger('click')
    await nextTick()
    const mdBtn = wrapper.findAll('button').find(b => b.text().trim() === 'Markdown')
    await mdBtn.trigger('click')
    await nextTick()
    expect(navigator.clipboard.writeText).toHaveBeenCalled()
    const calledWith = navigator.clipboard.writeText.mock.calls[0][0]
    expect(calledWith).toContain('| name | age |')
    expect(calledWith).toContain('| --- | --- |')
    expect(calledWith).toContain('| Alice | 30 |')
  })

  it('exports filtered+sorted result (not original)', async () => {
    const wrapper = await mountLoaded()
    // 筛 name 含 'B'
    const inputs = wrapper.findAll('.csv-filter-input')
    await inputs[0].setValue('b')
    const dropdownBtn = wrapper.findAll('button').find(b => b.text().includes('导出'))
    await dropdownBtn.trigger('click')
    await nextTick()
    const jsonBtn = wrapper.findAll('button').find(b => b.text().trim() === 'JSON')
    await jsonBtn.trigger('click')
    await nextTick()
    const calledWith = navigator.clipboard.writeText.mock.calls[0][0]
    const parsed = JSON.parse(calledWith)
    expect(parsed).toEqual([{ name: 'Bob', age: '25' }])
  })

  it('shows 已复制 toast after export', async () => {
    const wrapper = await mountLoaded()
    const dropdownBtn = wrapper.findAll('button').find(b => b.text().includes('导出'))
    await dropdownBtn.trigger('click')
    await nextTick()
    const jsonBtn = wrapper.findAll('button').find(b => b.text().trim() === 'JSON')
    await jsonBtn.trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('已复制')
  })
})
