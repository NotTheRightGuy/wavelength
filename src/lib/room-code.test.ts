import { describe, expect, it } from 'vitest'
import { normalizeCode } from './room-code'

describe('normalizeCode', () => {
  it('uppercases, strips non-letters and caps at 4', () => {
    expect(normalizeCode('ab')).toBe('AB')
    expect(normalizeCode('a1b-c d')).toBe('ABCD')
    expect(normalizeCode('abcdefg')).toBe('ABCD')
    expect(normalizeCode('')).toBe('')
    expect(normalizeCode('1234')).toBe('')
  })
})
