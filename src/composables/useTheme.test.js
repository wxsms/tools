import { describe, it, expect, beforeEach, vi } from 'vitest'
import { nextTick } from 'vue'

// useTheme uses module-level state (singleton), so we need to reset between tests.
// We import fresh each time via vi.resetModules.

describe('useTheme', () => {
  beforeEach(() => {
    vi.resetModules()
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
    // jsdom doesn't implement matchMedia — provide a minimal mock
    window.matchMedia = vi.fn().mockReturnValue({ matches: false })
  })

  it('defaults to light when no stored preference and no media match', async () => {
    // window.matchMedia default in jsdom returns matches: false
    const { useTheme } = await import('../composables/useTheme.js')
    const { theme } = useTheme()
    expect(theme.value).toBe('light')
  })

  it('uses stored preference from localStorage', async () => {
    localStorage.setItem('theme-preference', 'dark')
    const { useTheme } = await import('../composables/useTheme.js')
    const { theme } = useTheme()
    expect(theme.value).toBe('dark')
  })

  it('toggleTheme switches between light and dark', async () => {
    const { useTheme } = await import('../composables/useTheme.js')
    const { theme, toggleTheme } = useTheme()
    expect(theme.value).toBe('light')
    toggleTheme()
    expect(theme.value).toBe('dark')
    toggleTheme()
    expect(theme.value).toBe('light')
  })

  it('persists theme to localStorage on change', async () => {
    const { useTheme } = await import('../composables/useTheme.js')
    const { toggleTheme } = useTheme()
    toggleTheme()
    await nextTick()
    expect(localStorage.getItem('theme-preference')).toBe('dark')
  })

  it('sets data-theme attribute on document element', async () => {
    const { useTheme } = await import('../composables/useTheme.js')
    const { toggleTheme } = useTheme()
    toggleTheme()
    await nextTick()
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })
})
