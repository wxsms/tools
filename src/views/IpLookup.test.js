import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import IpLookup from './IpLookup.vue'

const mockData = {
  ip: '8.8.8.8',
  city: 'Mountain View',
  region: 'California',
  country_name: 'United States',
  country_code: 'US',
  latitude: 37.386,
  longitude: -122.0838,
  timezone: 'America/Los_Angeles',
  org: 'Google LLC',
  asn: 'AS15169',
}

describe('IpLookup', () => {
  beforeEach(() => {
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(mockData) })
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders title', () => {
    const wrapper = mount(IpLookup)
    expect(wrapper.text()).toContain('IP 查询')
  })

  it('has input and search button', () => {
    const wrapper = mount(IpLookup)
    expect(wrapper.find('input').exists()).toBe(true)
    expect(wrapper.findAll('button').find(b => b.text().includes('查询'))).toBeTruthy()
  })

  it('fetches current IP on mount', async () => {
    mount(IpLookup)
    await new Promise(r => setTimeout(r, 100))
    expect(global.fetch).toHaveBeenCalledWith('https://ipapi.co/json/')
  })
})
