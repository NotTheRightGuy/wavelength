import { describe, expect, it } from 'vitest'
import cases from './fixtures/scoring.json'
import { bandPoints, leftRightCorrect } from './scoring'

describe('bandPoints', () => {
  it.each(cases)('target $target dial $dial -> $points', ({ target, dial, points }) => {
    expect(bandPoints(target, dial)).toBe(points)
  })
})

describe('leftRightCorrect', () => {
  it('is correct when the target is left of the dial and guess is left', () => {
    expect(leftRightCorrect(30, 50, 'left')).toBe(true)
  })
  it('is correct when the target is right of the dial and guess is right', () => {
    expect(leftRightCorrect(70, 50, 'right')).toBe(true)
  })
  it('is wrong on the opposite guess', () => {
    expect(leftRightCorrect(30, 50, 'right')).toBe(false)
  })
  it('never scores when the dial is exactly on the target', () => {
    expect(leftRightCorrect(50, 50, 'left')).toBe(false)
    expect(leftRightCorrect(50, 50, 'right')).toBe(false)
  })
})
