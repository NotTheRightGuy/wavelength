import { describe, expect, it } from 'vitest'
import { CARDS } from './cards'

describe('CARDS', () => {
  it('ships at least 150 pairs', () => expect(CARDS.length).toBeGreaterThanOrEqual(150))
  it('has non-empty, distinct sides', () => {
    for (const c of CARDS) {
      expect(c.left.trim()).not.toBe('')
      expect(c.right.trim()).not.toBe('')
      expect(c.left.toLowerCase()).not.toBe(c.right.toLowerCase())
    }
  })
  it('has no duplicate pairs', () => {
    const keys = CARDS.map((c) => `${c.left}|${c.right}`.toLowerCase())
    expect(new Set(keys).size).toBe(keys.length)
  })
})
