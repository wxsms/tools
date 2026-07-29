import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Chmod from './Chmod.vue'

function mountComponent() {
  return mount(Chmod)
}

describe('Chmod', () => {
  it('renders title', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('chmod 权限计算')
  })

  it('defaults to 755 across all representations', () => {
    const wrapper = mountComponent()
    expect(wrapper.find('[data-testid="octal-input"]').element.value).toBe('755')
    expect(wrapper.find('[data-testid="symbolic-input"]').element.value).toBe('u=rwx,g=rx,o=rx')
    expect(wrapper.find('[data-testid="binary-input"]').element.value).toBe('111 101 101')
    expect(wrapper.find('[data-testid="ls-input"]').element.value).toBe('-rwxr-xr-x')
  })

  it('shows explanation text for each group', () => {
    const wrapper = mountComponent()
    const text = wrapper.text()
    expect(text).toContain('u (user)')
    expect(text).toContain('g (group)')
    expect(text).toContain('o (other)')
    // 755: owner has all perms, group/other have read+execute
    expect(text).toContain('可读 · 可写 · 可执行')
    expect(text).toContain('可读 · 可执行')
  })

  it('shows default chmod command with octal mode', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('chmod 755 file.txt')
  })

  it('syncs all inputs when a checkbox is toggled', async () => {
    const wrapper = mountComponent()
    // Toggle owner.execute off → 655 instead of 755
    const checkboxes = wrapper.findAll('input[type="checkbox"]')
    // owner is row 0, execute is col 2 → index 2
    await checkboxes[2].setValue(false)
    expect(wrapper.find('[data-testid="octal-input"]').element.value).toBe('655')
    expect(wrapper.find('[data-testid="symbolic-input"]').element.value).toBe('u=rw,g=rx,o=rx')
    expect(wrapper.find('[data-testid="binary-input"]').element.value).toBe('110 101 101')
    expect(wrapper.find('[data-testid="ls-input"]').element.value).toBe('-rw-r-xr-x')
  })

  it('parses valid octal input on blur and syncs other fields, preserving the octal text', async () => {
    const wrapper = mountComponent()
    const octal = wrapper.find('[data-testid="octal-input"]')
    await octal.setValue('644')
    await octal.trigger('blur')
    expect(wrapper.find('[data-testid="symbolic-input"]').element.value).toBe('u=rw,g=r,o=r')
    expect(wrapper.find('[data-testid="binary-input"]').element.value).toBe('110 100 100')
    expect(wrapper.find('[data-testid="ls-input"]').element.value).toBe('-rw-r--r--')
    // octal input itself keeps what the user typed
    expect(octal.element.value).toBe('644')
    // checkbox state updated: owner.read still true, owner.execute now false
    const checkboxes = wrapper.findAll('input[type="checkbox"]')
    expect(checkboxes[0].element.checked).toBe(true)  // owner.read
    expect(checkboxes[2].element.checked).toBe(false) // owner.execute
  })

  it('shows error and reverts on invalid octal input', async () => {
    const wrapper = mountComponent()
    const octal = wrapper.find('[data-testid="octal-input"]')
    await octal.setValue('8')
    await octal.trigger('blur')
    expect(wrapper.text()).toContain('无效的八进制')
    // reverted to 755 (the prior state)
    expect(octal.element.value).toBe('755')
  })

  it('parses valid symbolic input on blur and syncs', async () => {
    const wrapper = mountComponent()
    const sym = wrapper.find('[data-testid="symbolic-input"]')
    await sym.setValue('u=rw,g=r,o=r')
    await sym.trigger('blur')
    expect(wrapper.find('[data-testid="octal-input"]').element.value).toBe('644')
    expect(wrapper.find('[data-testid="binary-input"]').element.value).toBe('110 100 100')
    // symbolic input preserved
    expect(sym.element.value).toBe('u=rw,g=r,o=r')
  })

  it('shows error on invalid symbolic input', async () => {
    const wrapper = mountComponent()
    const sym = wrapper.find('[data-testid="symbolic-input"]')
    await sym.setValue('u=rwa,g=,o=')
    await sym.trigger('blur')
    expect(wrapper.text()).toContain('无效的符号')
    expect(sym.element.value).toBe('u=rwx,g=rx,o=rx')
  })

  it('parses valid binary input on blur and syncs', async () => {
    const wrapper = mountComponent()
    const bin = wrapper.find('[data-testid="binary-input"]')
    await bin.setValue('110 100 100')
    await bin.trigger('blur')
    expect(wrapper.find('[data-testid="octal-input"]').element.value).toBe('644')
    expect(wrapper.find('[data-testid="symbolic-input"]').element.value).toBe('u=rw,g=r,o=r')
    expect(bin.element.value).toBe('110 100 100')
  })

  it('shows error on invalid binary input', async () => {
    const wrapper = mountComponent()
    const bin = wrapper.find('[data-testid="binary-input"]')
    await bin.setValue('110abc100')
    await bin.trigger('blur')
    expect(wrapper.text()).toContain('无效的二进制')
  })

  it('parses ls -l input with type prefix and syncs fileType', async () => {
    const wrapper = mountComponent()
    const ls = wrapper.find('[data-testid="ls-input"]')
    await ls.setValue('drw-r--r--')
    await ls.trigger('blur')
    expect(wrapper.find('[data-testid="octal-input"]').element.value).toBe('644')
    expect(wrapper.find('[data-testid="file-type-select"]').element.value).toBe('d')
    // ls input preserved
    expect(ls.element.value).toBe('drw-r--r--')
  })

  it('parses ls -l input without type prefix (defaults to -)', async () => {
    const wrapper = mountComponent()
    const ls = wrapper.find('[data-testid="ls-input"]')
    await ls.setValue('rw-r--r--')
    await ls.trigger('blur')
    expect(wrapper.find('[data-testid="octal-input"]').element.value).toBe('644')
    expect(wrapper.find('[data-testid="file-type-select"]').element.value).toBe('-')
  })

  it('shows error on invalid ls -l input', async () => {
    const wrapper = mountComponent()
    const ls = wrapper.find('[data-testid="ls-input"]')
    await ls.setValue('rwxr-xr-z')
    await ls.trigger('blur')
    expect(wrapper.text()).toContain('无效的 ls -l 格式')
  })

  it('updates ls input prefix when file type selector changes', async () => {
    const wrapper = mountComponent()
    const select = wrapper.find('[data-testid="file-type-select"]')
    await select.setValue('d')
    // default bits are 755, so ls should become drwxr-xr-x
    expect(wrapper.find('[data-testid="ls-input"]').element.value).toBe('drwxr-xr-x')
  })

  it('switches chmod command to symbolic mode', async () => {
    const wrapper = mountComponent()
    const radios = wrapper.findAll('input[type="radio"]')
    // first radio is octal, second is symbolic
    await radios[1].setValue(true)
    expect(wrapper.text()).toContain('chmod u=rwx,g=rx,o=rx file.txt')
  })

  it('updates command when filename changes', async () => {
    const wrapper = mountComponent()
    const filenameInput = wrapper.findAll('input[type="text"]').find(i => i.element.value === 'file.txt')
    await filenameInput.setValue('script.sh')
    expect(wrapper.text()).toContain('chmod 755 script.sh')
  })
})
