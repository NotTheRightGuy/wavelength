import { describe, expect, it } from 'vitest'
import { CLICK_STEP, clicksCrossed, unwrapDelta } from './crank'

describe('unwrapDelta', () => {
  it('returns the plain difference for small moves', () => expect(unwrapDelta(0.1, 0.3)).toBeCloseTo(0.2))
  it('wraps across the ±π seam going forward', () => expect(unwrapDelta(Math.PI - 0.1, -Math.PI + 0.1)).toBeCloseTo(0.2))
  it('wraps across the seam going backward', () => expect(unwrapDelta(-Math.PI + 0.1, Math.PI - 0.1)).toBeCloseTo(-0.2))
})

describe('clicksCrossed', () => {
  it('counts ratchet boundaries crossed', () => {
    expect(clicksCrossed(0, CLICK_STEP * 2.5, CLICK_STEP)).toBe(2)
    expect(clicksCrossed(CLICK_STEP * 0.5, CLICK_STEP * 0.9, CLICK_STEP)).toBe(0)
  })
  it('counts backward motion too', () => {
    expect(clicksCrossed(CLICK_STEP * 3.2, CLICK_STEP * 0.8, CLICK_STEP)).toBe(3)
  })
})
