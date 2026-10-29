import { describe, expect, it } from 'vitest'
import { SEAT_COLORS, nextFreeColor } from './seat-colors'

describe('seat colours', () => {
  it('has 6 distinct preset colours', () => {
    expect(SEAT_COLORS).toHaveLength(6)
    expect(new Set(SEAT_COLORS).size).toBe(6)
  })
  it('nextFreeColor returns the first unused preset', () => {
    expect(nextFreeColor([])).toBe(SEAT_COLORS[0])
    expect(nextFreeColor([SEAT_COLORS[0]])).toBe(SEAT_COLORS[1])
    expect(nextFreeColor([SEAT_COLORS[0].toUpperCase(), SEAT_COLORS[1]])).toBe(SEAT_COLORS[2])
  })
  it('returns undefined when all are used', () => {
    expect(nextFreeColor([...SEAT_COLORS])).toBeUndefined()
  })
})
