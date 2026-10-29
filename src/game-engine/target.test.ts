import { describe, expect, it } from 'vitest'
import { generateTarget } from './target'

describe('generateTarget', () => {
  it('returns 10 for rng 0 (target fits at the left edge)', () => {
    expect(generateTarget(() => 0)).toBe(10)
  })
  it('never exceeds 90 (target fits at the right edge)', () => {
    expect(generateTarget(() => 0.999999999)).toBeLessThanOrEqual(90)
  })
  it('stays within 10..90 across many draws', () => {
    for (let i = 0; i < 5000; i++) {
      const t = generateTarget()
      expect(t).toBeGreaterThanOrEqual(10)
      expect(t).toBeLessThanOrEqual(90)
    }
  })
})
