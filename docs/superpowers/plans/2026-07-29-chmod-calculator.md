# chmod 权限计算器 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new tool at `/chmod` that lets users visually toggle 9 Unix permission bits (owner/group/other × r/w/x) and see the octal, symbolic, and binary representations update in real time, plus a copyable `chmod` command.

**Architecture:** One Vue component (`Chmod.vue`) holds a `bits` state object. Pure functions in `chmod.js` convert between bits ↔ octal string ↔ symbolic string ↔ binary string and build the `chmod` command. The component renders a 3×3 checkbox matrix on the left and the three representations + command text on the right; octal and symbolic input fields parse back into `bits` on blur. Invalid input leaves `bits` untouched and shows an inline warning.

**Tech Stack:** Vue 3 `<script setup>`, Tailwind + DaisyUI (existing), Vitest (existing), `@iconify/vue` (existing).

**Spec:** `docs/superpowers/specs/2026-07-29-chmod-calculator-design.md`

---

## File Structure

| File | Responsibility |
|---|---|
| `src/tools/chmod/chmod.js` | Pure functions: `bitsToOctal`, `octalToBits`, `bitsToSymbolic`, `symbolicToBits`, `bitsToBinary`, `buildChmodCommand`. No Vue, no DOM. |
| `src/tools/chmod/chmod.test.js` | Vitest unit tests for the pure functions. |
| `src/tools/chmod/Chmod.vue` | Vue view. 3×3 checkbox matrix + octal/symbolic/binary displays + chmod command + cheatsheet table. |
| `src/router.js` | Add one entry to the `components` map. |
| `src/routes.js` | Add one route meta entry. |
| `src/tools.js` | Add one sidebar entry in the "其他工具" group. |

---

## Task 1: Rename branch to feat/chmod

**Files:** none

- [ ] **Step 1: Rename current branch**

Current branch is `docs/chmod-design` (has the spec commit). Rename to reflect that this branch now carries implementation:

```bash
git -C E:/githome-windows/tools branch -m docs/chmod-design feat/chmod
```

- [ ] **Step 2: Verify the rename**

Run: `git -C E:/githome-windows/tools branch --show-current`
Expected: `feat/chmod`

---

## Task 2: TDD bits ↔ octal pure functions

**Files:**
- Create: `src/tools/chmod/chmod.js`
- Test: `src/tools/chmod/chmod.test.js`

- [ ] **Step 1: Write the failing tests**

Create `src/tools/chmod/chmod.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { bitsToOctal, octalToBits } from './chmod.js'

const ALL_FALSE = {
  owner:  { read: false, write: false, execute: false },
  group:  { read: false, write: false, execute: false },
  other:  { read: false, write: false, execute: false },
}

const ALL_TRUE = {
  owner:  { read: true, write: true, execute: true },
  group:  { read: true, write: true, execute: true },
  other:  { read: true, write: true, execute: true },
}

describe('bitsToOctal', () => {
  it('converts 755', () => {
    const bits = {
      owner: { read: true, write: true, execute: true },
      group: { read: true, write: false, execute: true },
      other: { read: true, write: false, execute: true },
    }
    expect(bitsToOctal(bits)).toBe('755')
  })

  it('converts 644', () => {
    const bits = {
      owner: { read: true, write: true, execute: false },
      group: { read: true, write: false, execute: false },
      other: { read: true, write: false, execute: false },
    }
    expect(bitsToOctal(bits)).toBe('644')
  })

  it('converts 000', () => {
    expect(bitsToOctal(ALL_FALSE)).toBe('000')
  })

  it('converts 777', () => {
    expect(bitsToOctal(ALL_TRUE)).toBe('777')
  })

  it('converts 700', () => {
    const bits = {
      owner: { read: true, write: true, execute: true },
      group: { read: false, write: false, execute: false },
      other: { read: false, write: false, execute: false },
    }
    expect(bitsToOctal(bits)).toBe('700')
  })
})

describe('octalToBits', () => {
  it('parses 755', () => {
    const bits = octalToBits('755')
    expect(bits.owner).toEqual({ read: true, write: true, execute: true })
    expect(bits.group).toEqual({ read: true, write: false, execute: true })
    expect(bits.other).toEqual({ read: true, write: false, execute: true })
  })

  it('parses 644', () => {
    const bits = octalToBits('644')
    expect(bits.owner).toEqual({ read: true, write: true, execute: false })
    expect(bits.group).toEqual({ read: true, write: false, execute: false })
    expect(bits.other).toEqual({ read: true, write: false, execute: false })
  })

  it('parses 000 to all false', () => {
    expect(octalToBits('000')).toEqual(ALL_FALSE)
  })

  it('parses 777 to all true', () => {
    expect(octalToBits('777')).toEqual(ALL_TRUE)
  })

  it('returns null for digit 8', () => {
    expect(octalToBits('8')).toBeNull()
  })

  it('returns null for digit 9', () => {
    expect(octalToBits('9')).toBeNull()
  })

  it('returns null for 4-digit input', () => {
    expect(octalToBits('1234')).toBeNull()
  })

  it('returns null for non-numeric', () => {
    expect(octalToBits('abc')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(octalToBits('')).toBeNull()
  })

  it('accepts 1-2 digit input (pads with leading zeros)', () => {
    expect(octalToBits('7')).toEqual({
      owner: { read: true, write: true, execute: true },
      group: { read: false, write: false, execute: false },
      other: { read: false, write: false, execute: false },
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd E:/githome-windows/tools && npm run test -- src/tools/chmod/chmod.test.js`
Expected: FAIL — `chmod.js` does not exist / import fails.

- [ ] **Step 3: Implement `bitsToOctal` and `octalToBits`**

Create `src/tools/chmod/chmod.js`:

```js
/**
 * Unix file permission bits.
 * @typedef {Object} PermBits
 * @property {{ read: boolean, write: boolean, execute: boolean }} owner
 * @property {{ read: boolean, write: boolean, execute: boolean }} group
 * @property {{ read: boolean, write: boolean, execute: boolean }} other
 */

/**
 * Convert a single rwx triple to its octal digit (0-7).
 * @param {{ read: boolean, write: boolean, execute: boolean }} triple
 * @returns {number}
 */
function tripleToDigit(triple) {
  return (triple.read ? 4 : 0) + (triple.write ? 2 : 0) + (triple.execute ? 1 : 0)
}

/**
 * Convert an octal digit (0-7) to a rwx triple.
 * @param {number} digit
 * @returns {{ read: boolean, write: boolean, execute: boolean }}
 */
function digitToTriple(digit) {
  return {
    read:   Boolean(digit & 4),
    write:  Boolean(digit & 2),
    execute: Boolean(digit & 1),
  }
}

/**
 * @param {PermBits} bits
 * @returns {string} 3-character octal string like "755"
 */
export function bitsToOctal(bits) {
  return String(tripleToDigit(bits.owner))
    + String(tripleToDigit(bits.group))
    + String(tripleToDigit(bits.other))
}

/**
 * @param {string} str
 * @returns {PermBits | null} null if input is not a 1-3 digit octal string with digits 0-7
 */
export function octalToBits(str) {
  if (typeof str !== 'string' || !/^[0-7]{1,3}$/.test(str)) return null
  const padded = str.padStart(3, '0')
  return {
    owner: digitToTriple(Number(padded[0])),
    group: digitToTriple(Number(padded[1])),
    other: digitToTriple(Number(padded[2])),
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd E:/githome-windows/tools && npm run test -- src/tools/chmod/chmod.test.js`
Expected: PASS — all 15 tests pass.

- [ ] **Step 5: Commit**

```bash
git -C E:/githome-windows/tools add src/tools/chmod/chmod.js src/tools/chmod/chmod.test.js
git -C E:/githome-windows/tools commit -m "feat(chmod): add bitsToOctal and octalToBits pure functions"
```

---

## Task 3: TDD bits ↔ symbolic pure functions

**Files:**
- Modify: `src/tools/chmod/chmod.js` (append two functions + exports)
- Modify: `src/tools/chmod/chmod.test.js` (append two describe blocks)

- [ ] **Step 1: Write the failing tests**

Append to `src/tools/chmod/chmod.test.js` (add `bitsToSymbolic` and `symbolicToBits` to the existing import line, then append two new describe blocks at the end):

Replace the import line at the top:

```js
import { bitsToOctal, octalToBits, bitsToSymbolic, symbolicToBits } from './chmod.js'
```

Append at the end of the file:

```js
describe('bitsToSymbolic', () => {
  it('converts 755', () => {
    const bits = {
      owner: { read: true, write: true, execute: true },
      group: { read: true, write: false, execute: true },
      other: { read: true, write: false, execute: true },
    }
    expect(bitsToSymbolic(bits)).toBe('u=rwx,g=rx,o=rx')
  })

  it('converts 644', () => {
    const bits = {
      owner: { read: true, write: true, execute: false },
      group: { read: true, write: false, execute: false },
      other: { read: true, write: false, execute: false },
    }
    expect(bitsToSymbolic(bits)).toBe('u=rw,g=r,o=r')
  })

  it('converts 000 with empty segments', () => {
    const bits = {
      owner: { read: false, write: false, execute: false },
      group: { read: false, write: false, execute: false },
      other: { read: false, write: false, execute: false },
    }
    expect(bitsToSymbolic(bits)).toBe('u=,g=,o=')
  })

  it('converts 777', () => {
    const bits = {
      owner: { read: true, write: true, execute: true },
      group: { read: true, write: true, execute: true },
      other: { read: true, write: true, execute: true },
    }
    expect(bitsToSymbolic(bits)).toBe('u=rwx,g=rwx,o=rwx')
  })

  it('converts 700', () => {
    const bits = {
      owner: { read: true, write: true, execute: true },
      group: { read: false, write: false, execute: false },
      other: { read: false, write: false, execute: false },
    }
    expect(bitsToSymbolic(bits)).toBe('u=rwx,g=,o=')
  })
})

describe('symbolicToBits', () => {
  it('parses u=rwx,g=rx,o=rx', () => {
    const bits = symbolicToBits('u=rwx,g=rx,o=rx')
    expect(bits.owner).toEqual({ read: true, write: true, execute: true })
    expect(bits.group).toEqual({ read: true, write: false, execute: true })
    expect(bits.other).toEqual({ read: true, write: false, execute: true })
  })

  it('parses u=rw,g=r,o=r', () => {
    const bits = symbolicToBits('u=rw,g=r,o=r')
    expect(bits.owner).toEqual({ read: true, write: true, execute: false })
    expect(bits.group).toEqual({ read: true, write: false, execute: false })
    expect(bits.other).toEqual({ read: true, write: false, execute: false })
  })

  it('parses u=,g=,o= as all false', () => {
    const bits = symbolicToBits('u=,g=,o=')
    expect(bits.owner).toEqual({ read: false, write: false, execute: false })
    expect(bits.group).toEqual({ read: false, write: false, execute: false })
    expect(bits.other).toEqual({ read: false, write: false, execute: false })
  })

  it('accepts reordered letters u=xwr as u=rwx', () => {
    const bits = symbolicToBits('u=xwr,g=,o=')
    expect(bits.owner).toEqual({ read: true, write: true, execute: true })
  })

  it('dedupes repeated letters u=rrr as u=r', () => {
    const bits = symbolicToBits('u=rrr,g=,o=')
    expect(bits.owner).toEqual({ read: true, write: false, execute: false })
  })

  it('returns null when missing o segment', () => {
    expect(symbolicToBits('u=rwx,g=rx')).toBeNull()
  })

  it('returns null when missing g segment', () => {
    expect(symbolicToBits('u=rwx,o=rx')).toBeNull()
  })

  it('returns null for invalid letter a', () => {
    expect(symbolicToBits('u=rwa,g=,o=')).toBeNull()
  })

  it('returns null for dash (we only accept rwx, not rwx-)', () => {
    expect(symbolicToBits('u=rw-,g=,o=')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(symbolicToBits('')).toBeNull()
  })

  it('returns null for malformed input without =', () => {
    expect(symbolicToBits('urwx,g=,o=')).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd E:/githome-windows/tools && npm run test -- src/tools/chmod/chmod.test.js`
Expected: FAIL — `bitsToSymbolic` and `symbolicToBits` are not exported.

- [ ] **Step 3: Implement `bitsToSymbolic` and `symbolicToBits`**

Append to `src/tools/chmod/chmod.js`:

```js
/**
 * @param {{ read: boolean, write: boolean, execute: boolean }} triple
 * @returns {string} e.g. "rwx", "rw", "" for all-false
 */
function tripleToLetters(triple) {
  let s = ''
  if (triple.read) s += 'r'
  if (triple.write) s += 'w'
  if (triple.execute) s += 'x'
  return s
}

/**
 * @param {PermBits} bits
 * @returns {string} e.g. "u=rwx,g=rx,o=rx"; empty segments stay as "u="
 */
export function bitsToSymbolic(bits) {
  return `u=${tripleToLetters(bits.owner)},g=${tripleToLetters(bits.group)},o=${tripleToLetters(bits.other)}`
}

/**
 * Parse one segment like "rwx" or "xwr" or "" into a triple.
 * Returns null if any character is not r/w/x.
 * @param {string} letters
 * @returns {{ read: boolean, write: boolean, execute: boolean } | null}
 */
function lettersToTriple(letters) {
  const triple = { read: false, write: false, execute: false }
  for (const ch of letters) {
    if (ch === 'r') triple.read = true
    else if (ch === 'w') triple.write = true
    else if (ch === 'x') triple.execute = true
    else return null
  }
  return triple
}

/**
 * @param {string} str
 * @returns {PermBits | null} null if format is not exactly u=...,g=...,o=... with only r/w/x letters
 */
export function symbolicToBits(str) {
  if (typeof str !== 'string') return null
  const re = /^u=([rwx]*),g=([rwx]*),o=([rwx]*)$/
  const m = str.match(re)
  if (!m) return null
  const owner = lettersToTriple(m[1])
  const group = lettersToTriple(m[2])
  const other = lettersToTriple(m[3])
  if (!owner || !group || !other) return null
  return { owner, group, other }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd E:/githome-windows/tools && npm run test -- src/tools/chmod/chmod.test.js`
Expected: PASS — all tests pass (the 15 from Task 2 plus the 16 new ones = 31 total).

- [ ] **Step 5: Commit**

```bash
git -C E:/githome-windows/tools add src/tools/chmod/chmod.js src/tools/chmod/chmod.test.js
git -C E:/githome-windows/tools commit -m "feat(chmod): add bitsToSymbolic and symbolicToBits pure functions"
```

---

## Task 4: TDD bitsToBinary and buildChmodCommand

**Files:**
- Modify: `src/tools/chmod/chmod.js` (append two functions + exports)
- Modify: `src/tools/chmod/chmod.test.js` (append two describe blocks)

- [ ] **Step 1: Write the failing tests**

Replace the import line at the top of `src/tools/chmod/chmod.test.js`:

```js
import {
  bitsToOctal, octalToBits,
  bitsToSymbolic, symbolicToBits,
  bitsToBinary, buildChmodCommand,
} from './chmod.js'
```

Append at the end of the file:

```js
describe('bitsToBinary', () => {
  it('converts 755', () => {
    const bits = {
      owner: { read: true, write: true, execute: true },
      group: { read: true, write: false, execute: true },
      other: { read: true, write: false, execute: true },
    }
    expect(bitsToBinary(bits)).toBe('111 101 101')
  })

  it('converts 644', () => {
    const bits = {
      owner: { read: true, write: true, execute: false },
      group: { read: true, write: false, execute: false },
      other: { read: true, write: false, execute: false },
    }
    expect(bitsToBinary(bits)).toBe('110 100 100')
  })

  it('converts 000 to all zeros', () => {
    const bits = {
      owner: { read: false, write: false, execute: false },
      group: { read: false, write: false, execute: false },
      other: { read: false, write: false, execute: false },
    }
    expect(bitsToBinary(bits)).toBe('000 000 000')
  })

  it('converts 777 to all ones', () => {
    const bits = {
      owner: { read: true, write: true, execute: true },
      group: { read: true, write: true, execute: true },
      other: { read: true, write: true, execute: true },
    }
    expect(bitsToBinary(bits)).toBe('111 111 111')
  })
})

describe('buildChmodCommand', () => {
  const BITS_755 = {
    owner: { read: true, write: true, execute: true },
    group: { read: true, write: false, execute: true },
    other: { read: true, write: false, execute: true },
  }

  it('builds octal-mode command with default filename', () => {
    expect(buildChmodCommand(BITS_755, { mode: 'octal' })).toBe('chmod 755 file.txt')
  })

  it('builds octal-mode command with custom filename', () => {
    expect(buildChmodCommand(BITS_755, { mode: 'octal', filename: 'script.sh' }))
      .toBe('chmod 755 script.sh')
  })

  it('builds symbolic-mode command with default filename', () => {
    expect(buildChmodCommand(BITS_755, { mode: 'symbolic' }))
      .toBe('chmod u=rwx,g=rx,o=rx file.txt')
  })

  it('builds symbolic-mode command with custom filename', () => {
    expect(buildChmodCommand(BITS_755, { mode: 'symbolic', filename: 'deploy.sh' }))
      .toBe('chmod u=rwx,g=rx,o=rx deploy.sh')
  })

  it('handles filenames with spaces by shell-quoting', () => {
    expect(buildChmodCommand(BITS_755, { mode: 'octal', filename: 'my file.txt' }))
      .toBe('chmod 755 "my file.txt"')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd E:/githome-windows/tools && npm run test -- src/tools/chmod/chmod.test.js`
Expected: FAIL — `bitsToBinary` and `buildChmodCommand` are not exported.

- [ ] **Step 3: Implement `bitsToBinary` and `buildChmodCommand`**

Append to `src/tools/chmod/chmod.js`:

```js
/**
 * @param {{ read: boolean, write: boolean, execute: boolean }} triple
 * @returns {string} 3 chars of "0"/"1", e.g. "110"
 */
function tripleToBinary(triple) {
  return (triple.read ? '1' : '0')
    + (triple.write ? '1' : '0')
    + (triple.execute ? '1' : '0')
}

/**
 * @param {PermBits} bits
 * @returns {string} 3 groups of 3 binary digits, space-separated, e.g. "111 101 101"
 */
export function bitsToBinary(bits) {
  return [tripleToBinary(bits.owner), tripleToBinary(bits.group), tripleToBinary(bits.other)].join(' ')
}

/**
 * Shell-quote a filename if it contains spaces (simple double-quote wrap; no edge cases
 * like embedded quotes since this is a copy-to-clipboard helper, not real shell parsing).
 * @param {string} filename
 * @returns {string}
 */
function quoteFilename(filename) {
  if (filename.includes(' ')) return `"${filename}"`
  return filename
}

/**
 * @param {PermBits} bits
 * @param {{ mode: 'octal' | 'symbolic', filename?: string }} opts
 * @returns {string} a ready-to-copy chmod command
 */
export function buildChmodCommand(bits, { mode, filename = 'file.txt' }) {
  const target = quoteFilename(filename)
  if (mode === 'octal') return `chmod ${bitsToOctal(bits)} ${target}`
  if (mode === 'symbolic') return `chmod ${bitsToSymbolic(bits)} ${target}`
  throw new Error(`buildChmodCommand: unknown mode ${mode}`)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd E:/githome-windows/tools && npm run test -- src/tools/chmod/chmod.test.js`
Expected: PASS — all tests pass (31 from previous tasks + 9 new = 40 total).

- [ ] **Step 5: Commit**

```bash
git -C E:/githome-windows/tools add src/tools/chmod/chmod.js src/tools/chmod/chmod.test.js
git -C E:/githome-windows/tools commit -m "feat(chmod): add bitsToBinary and buildChmodCommand"
```

---

## Task 5: Build Chmod.vue component

**Files:**
- Create: `src/tools/chmod/Chmod.vue`

- [ ] **Step 1: Create the component**

Create `src/tools/chmod/Chmod.vue`:

```vue
<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">
      chmod 权限计算
    </h1>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Left: checkbox matrix -->
      <div class="flex flex-col gap-4">
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">权限位</span></label>
          <table class="table table-zebra w-full">
            <thead>
              <tr>
                <th class="w-20" />
                <th class="text-center">r</th>
                <th class="text-center">w</th>
                <th class="text-center">x</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in rows" :key="row.key">
                <td class="font-mono font-semibold">
                  {{ row.label }}
                </td>
                <td class="text-center">
                  <input
                    v-model="bits[row.key].read"
                    type="checkbox"
                    class="checkbox checkbox-sm checkbox-primary"
                  >
                </td>
                <td class="text-center">
                  <input
                    v-model="bits[row.key].write"
                    type="checkbox"
                    class="checkbox checkbox-sm checkbox-primary"
                  >
                </td>
                <td class="text-center">
                  <input
                    v-model="bits[row.key].execute"
                    type="checkbox"
                    class="checkbox checkbox-sm checkbox-primary"
                  >
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Right: representations + command -->
      <div class="flex flex-col gap-4">
        <!-- Octal -->
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">数字模式</span></label>
          <input
            v-model="octalInput"
            type="text"
            maxlength="3"
            class="input input-bordered input-sm w-24 font-mono"
            @blur="onOctalBlur"
          >
          <p v-if="octalError" class="text-xs text-error mt-1">
            {{ octalError }}
          </p>
        </div>

        <!-- Symbolic -->
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">符号模式</span></label>
          <input
            v-model="symbolicInput"
            type="text"
            class="input input-bordered input-sm font-mono"
            @blur="onSymbolicBlur"
          >
          <p v-if="symbolicError" class="text-xs text-error mt-1">
            {{ symbolicError }}
          </p>
        </div>

        <!-- Binary (read-only) -->
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">二进制</span></label>
          <pre class="bg-base-200 rounded-lg p-3 font-mono text-sm">{{ binaryStr }}</pre>
        </div>

        <!-- Command -->
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">chmod 命令</span></label>
          <div class="flex gap-2 mb-2">
            <label class="flex items-center gap-1 cursor-pointer">
              <input
                v-model="cmdMode"
                type="radio"
                value="octal"
                name="chmod-cmd-mode"
                class="radio radio-sm radio-primary"
              >
              <span class="text-sm">数字</span>
            </label>
            <label class="flex items-center gap-1 cursor-pointer">
              <input
                v-model="cmdMode"
                type="radio"
                value="symbolic"
                name="chmod-cmd-mode"
                class="radio radio-sm radio-primary"
              >
              <span class="text-sm">符号</span>
            </label>
          </div>
          <input
            v-model="filename"
            type="text"
            class="input input-bordered input-sm w-full mb-2 font-mono"
            placeholder="文件名"
          >
          <div class="relative">
            <pre class="bg-base-200 rounded-lg p-3 font-mono text-sm break-all whitespace-pre-wrap">{{ command }}</pre>
            <button
              class="btn btn-ghost btn-xs btn-square absolute right-2 top-2"
              :title="copied ? '已复制！' : '复制'"
              @click="copyCommand"
            >
              <Icon
                v-if="copied"
                icon="lucide:check"
                class="w-4 h-4 text-success"
              />
              <Icon
                v-else
                icon="lucide:clipboard"
                class="w-4 h-4"
              />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Cheatsheet -->
    <div class="mt-6">
      <h2 class="text-lg font-semibold mb-2">
        权限小抄
      </h2>
      <div class="bg-base-200 rounded-lg p-4 font-mono text-sm">
        <div>r = 4　w = 2　x = 1</div>
        <div class="mt-2">
          7 = rwx　6 = rw-　5 = r-x　4 = r--　3 = -wx　2 = -w-　1 = --x　0 = ---
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Icon } from '@iconify/vue'
import { ref, computed, watch } from 'vue'
import { bitsToOctal, octalToBits, bitsToSymbolic, symbolicToBits, bitsToBinary, buildChmodCommand } from './chmod.js'

const rows = [
  { key: 'owner', label: 'u' },
  { key: 'group', label: 'g' },
  { key: 'other', label: 'o' },
]

const bits = ref({
  owner: { read: true, write: true, execute: true },
  group: { read: true, write: false, execute: true },
  other: { read: true, write: false, execute: true },
})

const octalInput = ref(bitsToOctal(bits.value))
const symbolicInput = ref(bitsToSymbolic(bits.value))
const octalError = ref('')
const symbolicError = ref('')

const cmdMode = ref('octal')
const filename = ref('file.txt')
const copied = ref(false)

const binaryStr = computed(() => bitsToBinary(bits.value))
const command = computed(() => buildChmodCommand(bits.value, { mode: cmdMode.value, filename: filename.value }))

// When bits change (via checkbox), refresh the input fields to mirror state.
watch(bits, () => {
  octalInput.value = bitsToOctal(bits.value)
  symbolicInput.value = bitsToSymbolic(bits.value)
}, { deep: true })

function onOctalBlur() {
  const parsed = octalToBits(octalInput.value)
  if (parsed === null) {
    octalError.value = '无效的八进制（仅 0-7，1-3 位）'
    octalInput.value = bitsToOctal(bits.value)
  } else {
    octalError.value = ''
    bits.value = parsed
  }
}

function onSymbolicBlur() {
  const parsed = symbolicToBits(symbolicInput.value)
  if (parsed === null) {
    symbolicError.value = '无效的符号表示（格式 u=...,g=...,o=...，仅 r/w/x）'
    symbolicInput.value = bitsToSymbolic(bits.value)
  } else {
    symbolicError.value = ''
    bits.value = parsed
  }
}

async function copyCommand() {
  try {
    await navigator.clipboard.writeText(command.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 1500)
  } catch {
    // clipboard unavailable; silently ignore
  }
}
</script>
```

- [ ] **Step 2: Lint**

Run: `cd E:/githome-windows/tools && npm run lint`
Expected: no errors. If lint flags any issue, fix it before continuing.

- [ ] **Step 3: Commit**

```bash
git -C E:/githome-windows/tools add src/tools/chmod/Chmod.vue
git -C E:/githome-windows/tools commit -m "feat(chmod): add Chmod.vue component with three-mode sync UI"
```

---

## Task 6: Register route, route meta, and sidebar entry

**Files:**
- Modify: `src/router.js` (add one entry to `components` map)
- Modify: `src/routes.js` (add one route meta entry)
- Modify: `src/tools.js` (add one entry in the "其他工具" group)

- [ ] **Step 1: Add component mapping in `src/router.js`**

In `src/router.js`, locate the `components` object (lines 5-63). After the line:

```js
  '/emoji': () => import('./tools/emoji/Emoji.vue'),
```

Add:

```js
  '/chmod': () => import('./tools/chmod/Chmod.vue'),
```

- [ ] **Step 2: Add route meta in `src/routes.js`**

In `src/routes.js`, append (after the last existing entry, before the closing `]`):

```js
  { path: '/chmod', meta: { title: 'chmod 权限计算', description: 'Unix 文件权限可视化计算，数字 / 符号 / 二进制三模式同步' } },
```

- [ ] **Step 3: Add sidebar entry in `src/tools.js`**

In `src/tools.js`, locate the "其他工具" group (starts at line 366). Its `tools` array currently has 取色器, 占位文本, 键盘测试. Append a fourth entry after the 键盘测试 entry:

```js
      {
        name: 'chmod 权限计算',
        path: '/chmod',
        desc: 'Unix 文件权限可视化计算，数字 / 符号 / 二进制三模式同步',
        icon: 'mdi:file-lock-outline',
      },
```

- [ ] **Step 4: Verify the dev server picks up the new route**

Run: `cd E:/githome-windows/tools && npm run dev`
Expected: dev server starts without errors. Open `http://localhost:5173/chmod` in a browser; the page should render the chmod tool with the default 755 state.

If everything renders correctly, stop the dev server (Ctrl+C).

- [ ] **Step 5: Commit**

```bash
git -C E:/githome-windows/tools add src/router.js src/routes.js src/tools.js
git -C E:/githome-windows/tools commit -m "feat(chmod): register /chmod route and sidebar entry"
```

---

## Task 7: Final verification

**Files:** none

- [ ] **Step 1: Run full test suite**

Run: `cd E:/githome-windows/tools && npm run test`
Expected: all tests pass, including the 40 new chmod tests and all pre-existing tests.

- [ ] **Step 2: Run lint on the whole project**

Run: `cd E:/githome-windows/tools && npm run lint`
Expected: no errors.

- [ ] **Step 3: Manual smoke test in browser**

Run: `cd E:/githome-windows/tools && npm run dev`

Open `http://localhost:5173/chmod` and verify:

1. Default state shows `755` in octal, `u=rwx,g=rx,o=rx` in symbolic, `111 101 101` in binary
2. Default chmod command is `chmod 755 file.txt`
3. Toggling any checkbox updates all four displays in real time
4. Typing `644` in the octal input, then clicking elsewhere (blur), updates the checkboxes to rw-/r--/r--
5. Typing `8` in the octal input, blurring, shows "无效的八进制" warning and reverts to previous value
6. Typing `u=rw,g=r,o=r` in the symbolic input, blurring, updates checkboxes
7. Typing `u=rwa,g=,o=` in the symbolic input, blurring, shows "无效的符号表示" warning and reverts
8. Switching command radio to "符号" updates the command to `chmod u=rwx,g=rx,o=rx file.txt`
9. Changing filename to `script.sh` updates command to `chmod 755 script.sh`
10. Clicking the copy button shows the green check icon briefly

If all 10 checks pass, stop the dev server.

- [ ] **Step 4: Verify working tree is clean**

Run: `git -C E:/githome-windows/tools status`
Expected: `nothing to commit, working tree clean`.

If there are uncommitted changes, investigate and commit or discard as appropriate before finishing.

- [ ] **Step 5: Verify branch has all commits**

Run: `git -C E:/githome-windows/tools log --oneline master..HEAD`
Expected: 6 commits (one per Task 2-6 plus this final verification if any fixups were needed).

The implementation is complete. Branch `feat/chmod` is ready for PR.
