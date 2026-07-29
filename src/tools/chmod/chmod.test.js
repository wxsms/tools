import { describe, it, expect } from 'vitest'
import {
  bitsToOctal, octalToBits,
  bitsToSymbolic, symbolicToBits,
  bitsToBinary, binaryToBits,
  buildChmodCommand,
  bitsToLsFormat, lsFormatToBits,
  describePerm,
} from './chmod.js'

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
    // '7' → '007' → only other has rwx (matches chmod 7 file = chmod 007 file)
    expect(octalToBits('7')).toEqual({
      owner: { read: false, write: false, execute: false },
      group: { read: false, write: false, execute: false },
      other: { read: true, write: true, execute: true },
    })
  })
})

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

describe('bitsToLsFormat', () => {
  it('converts 755', () => {
    const bits = {
      owner: { read: true, write: true, execute: true },
      group: { read: true, write: false, execute: true },
      other: { read: true, write: false, execute: true },
    }
    expect(bitsToLsFormat(bits, '-')).toBe('-rwxr-xr-x')
  })

  it('converts 644 with d prefix', () => {
    const bits = {
      owner: { read: true, write: true, execute: false },
      group: { read: true, write: false, execute: false },
      other: { read: true, write: false, execute: false },
    }
    expect(bitsToLsFormat(bits, 'd')).toBe('drw-r--r--')
  })

  it('converts 000 with - prefix', () => {
    const bits = {
      owner: { read: false, write: false, execute: false },
      group: { read: false, write: false, execute: false },
      other: { read: false, write: false, execute: false },
    }
    expect(bitsToLsFormat(bits, '-')).toBe('----------')
  })

  it('converts 777 with l prefix', () => {
    const bits = {
      owner: { read: true, write: true, execute: true },
      group: { read: true, write: true, execute: true },
      other: { read: true, write: true, execute: true },
    }
    expect(bitsToLsFormat(bits, 'l')).toBe('lrwxrwxrwx')
  })
})

describe('lsFormatToBits', () => {
  it('parses -rwxr-xr-x', () => {
    const bits = lsFormatToBits('-rwxr-xr-x')
    expect(bits.type).toBe('-')
    expect(bits.owner).toEqual({ read: true, write: true, execute: true })
    expect(bits.group).toEqual({ read: true, write: false, execute: true })
    expect(bits.other).toEqual({ read: true, write: false, execute: true })
  })

  it('parses drw-r--r--', () => {
    const bits = lsFormatToBits('drw-r--r--')
    expect(bits.type).toBe('d')
    expect(bits.owner).toEqual({ read: true, write: true, execute: false })
    expect(bits.group).toEqual({ read: true, write: false, execute: false })
    expect(bits.other).toEqual({ read: true, write: false, execute: false })
  })

  it('parses lrwxrwxrwx', () => {
    const bits = lsFormatToBits('lrwxrwxrwx')
    expect(bits.type).toBe('l')
    expect(bits.owner).toEqual({ read: true, write: true, execute: true })
  })

  it('parses ----------', () => {
    const bits = lsFormatToBits('----------')
    expect(bits.type).toBe('-')
    expect(bits.owner).toEqual({ read: false, write: false, execute: false })
    expect(bits.group).toEqual({ read: false, write: false, execute: false })
    expect(bits.other).toEqual({ read: false, write: false, execute: false })
  })

  it('parses rwxr-xr-x without type prefix (defaults to -)', () => {
    const bits = lsFormatToBits('rwxr-xr-x')
    expect(bits.type).toBe('-')
    expect(bits.owner).toEqual({ read: true, write: true, execute: true })
  })

  it('returns null for too-short input', () => {
    expect(lsFormatToBits('rwx')).toBeNull()
  })

  it('returns null for too-long input', () => {
    expect(lsFormatToBits('-rwxr-xr-x-')).toBeNull()
  })

  it('returns null for invalid chars in permission section', () => {
    expect(lsFormatToBits('-rwxr-xr-z')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(lsFormatToBits('')).toBeNull()
  })
})

describe('binaryToBits', () => {
  it('parses 111 101 101', () => {
    const bits = binaryToBits('111 101 101')
    expect(bits.owner).toEqual({ read: true, write: true, execute: true })
    expect(bits.group).toEqual({ read: true, write: false, execute: true })
    expect(bits.other).toEqual({ read: true, write: false, execute: true })
  })

  it('parses 111101101 without spaces', () => {
    const bits = binaryToBits('111101101')
    expect(bits.owner).toEqual({ read: true, write: true, execute: true })
    expect(bits.group).toEqual({ read: true, write: false, execute: true })
    expect(bits.other).toEqual({ read: true, write: false, execute: true })
  })

  it('parses 110 100 100', () => {
    const bits = binaryToBits('110 100 100')
    expect(bits.owner).toEqual({ read: true, write: true, execute: false })
    expect(bits.group).toEqual({ read: true, write: false, execute: false })
    expect(bits.other).toEqual({ read: true, write: false, execute: false })
  })

  it('parses 000 000 000 as all false', () => {
    const bits = binaryToBits('000 000 000')
    expect(bits.owner).toEqual({ read: false, write: false, execute: false })
    expect(bits.group).toEqual({ read: false, write: false, execute: false })
    expect(bits.other).toEqual({ read: false, write: false, execute: false })
  })

  it('returns null for too-short input', () => {
    expect(binaryToBits('111')).toBeNull()
  })

  it('returns null for too-long input', () => {
    expect(binaryToBits('111 101 101 1')).toBeNull()
  })

  it('returns null for invalid chars', () => {
    expect(binaryToBits('111 101 10a')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(binaryToBits('')).toBeNull()
  })

  it('roundtrips with bitsToBinary', () => {
    const bits = {
      owner: { read: true, write: false, execute: true },
      group: { read: false, write: true, execute: false },
      other: { read: true, write: true, execute: false },
    }
    expect(binaryToBits(bitsToBinary(bits))).toEqual(bits)
  })
})

describe('describePerm', () => {
  it('describes 755', () => {
    const bits = {
      owner: { read: true, write: true, execute: true },
      group: { read: true, write: false, execute: true },
      other: { read: true, write: false, execute: true },
    }
    const d = describePerm(bits)
    expect(d.owner).toBe('可读 · 可写 · 可执行 — 可查看内容、修改、作为程序运行')
    expect(d.group).toBe('可读 · 可执行 — 可查看内容、作为程序运行, 不能修改')
    expect(d.other).toBe('可读 · 可执行 — 可查看内容、作为程序运行, 不能修改')
  })

  it('describes 644', () => {
    const bits = {
      owner: { read: true, write: true, execute: false },
      group: { read: true, write: false, execute: false },
      other: { read: true, write: false, execute: false },
    }
    const d = describePerm(bits)
    expect(d.owner).toBe('可读 · 可写 — 可查看内容、修改, 不能运行')
    expect(d.group).toBe('可读 — 可查看内容, 不能修改、运行')
    expect(d.other).toBe('可读 — 可查看内容, 不能修改、运行')
  })

  it('describes 000', () => {
    const bits = {
      owner: { read: false, write: false, execute: false },
      group: { read: false, write: false, execute: false },
      other: { read: false, write: false, execute: false },
    }
    const d = describePerm(bits)
    expect(d.owner).toBe('无任何权限 — 不能查看、修改或运行')
    expect(d.group).toBe('无任何权限 — 不能查看、修改或运行')
    expect(d.other).toBe('无任何权限 — 不能查看、修改或运行')
  })

  it('describes 777', () => {
    const bits = {
      owner: { read: true, write: true, execute: true },
      group: { read: true, write: true, execute: true },
      other: { read: true, write: true, execute: true },
    }
    const d = describePerm(bits)
    expect(d.other).toBe('可读 · 可写 · 可执行 — 可查看内容、修改、作为程序运行')
  })

  it('describes 700', () => {
    const bits = {
      owner: { read: true, write: true, execute: true },
      group: { read: false, write: false, execute: false },
      other: { read: false, write: false, execute: false },
    }
    const d = describePerm(bits)
    expect(d.owner).toBe('可读 · 可写 · 可执行 — 可查看内容、修改、作为程序运行')
    expect(d.group).toBe('无任何权限 — 不能查看、修改或运行')
  })
})
