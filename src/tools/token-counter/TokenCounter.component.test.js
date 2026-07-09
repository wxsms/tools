import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import TokenCounter from './TokenCounter.vue'
import { _resetCacheForTests } from './token-counter.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURE = readFileSync(
  path.join(__dirname, '__fixtures__/mini.tiktoken'),
  'utf8',
)

async function mountLoaded() {
  vi.stubGlobal('fetch', async () => ({
    ok: true,
    status: 200,
    text: async () => FIXTURE,
  }))
  const wrapper = mount(TokenCounter)
  // flush the onMounted fetch
  await nextTick()
  await nextTick()
  return wrapper
}

beforeEach(() => {
  _resetCacheForTests()
  vi.restoreAllMocks()
})

describe('TokenCounter.vue', () => {
  it('renders the title "Token 计数器"', async () => {
    const wrapper = await mountLoaded()
    expect(wrapper.text()).toContain('Token 计数器')
  })

  it('shows the model dropdown with kimi-k2 as an option', async () => {
    const wrapper = await mountLoaded()
    const select = wrapper.find('select')
    expect(select.exists()).toBe(true)
    expect(select.text()).toContain('Kimi K2')
  })

  it('renders the plain-text input area by default', async () => {
    const wrapper = await mountLoaded()
    expect(wrapper.find('textarea').exists()).toBe(true)
  })
})

describe('TokenCounter.vue — messages mode', () => {
  it('toggles to messages mode on click and shows a message row', async () => {
    const wrapper = await mountLoaded()
    const buttons = wrapper.findAll('button')
    const msgBtn = buttons.find((b) => b.text().includes('Messages'))
    expect(msgBtn).toBeTruthy()
    await msgBtn.trigger('click')
    await nextTick()
    const selects = wrapper.findAll('select')
    expect(selects.length).toBeGreaterThanOrEqual(2) // model dropdown + at least 1 role
    expect(wrapper.text()).toContain('system')
  })

  it('adds a new message row on "添加消息" click', async () => {
    const wrapper = await mountLoaded()
    const msgBtn = wrapper.findAll('button').find((b) => b.text().includes('Messages'))
    await msgBtn.trigger('click')
    await nextTick()

    const addBtn = wrapper.findAll('button').find((b) => b.text().includes('添加消息'))
    expect(addBtn).toBeTruthy()
    const before = wrapper.findAll('textarea').length
    await addBtn.trigger('click')
    await nextTick()
    expect(wrapper.findAll('textarea').length).toBe(before + 1)
  })

  it('deletes a row on trash button click', async () => {
    const wrapper = await mountLoaded()
    const msgBtn = wrapper.findAll('button').find((b) => b.text().includes('Messages'))
    await msgBtn.trigger('click')
    await nextTick()

    const addBtn = wrapper.findAll('button').find((b) => b.text().includes('添加消息'))
    await addBtn.trigger('click')
    await nextTick()
    const before = wrapper.findAll('textarea').length

    const delBtn = wrapper.findAll('button').find((b) => b.attributes('title') === '删除')
    expect(delBtn).toBeTruthy()
    await delBtn.trigger('click')
    await nextTick()
    expect(wrapper.findAll('textarea').length).toBe(before - 1)
  })
})
