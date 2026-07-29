import { describe, it, expect } from 'vitest'
import {
  bitsToOctal, octalToBits,
  bitsToSymbolic, symbolicToBits,
  bitsToBinary, buildChmodCommand,
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
