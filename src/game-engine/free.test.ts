import { describe, expect, it } from 'vitest'
import { freePlayWinners, psychicOrder, psychicScore } from './free'

describe('psychicScore', () => {
  it('is the rounded average of guesser points', () => {
    expect(psychicScore([4, 3, 2])).toBe(3)
    expect(psychicScore([4, 3])).toBe(4) // 3.5 rounds up
    expect(psychicScore([0, 0, 2])).toBe(1)
  })
  it('is 0 without guessers', () => expect(psychicScore([])).toBe(0))
})

describe('psychicOrder', () => {
  it('repeats the player list once per lap', () => {
    expect(psychicOrder(['a', 'b', 'c'], 2)).toEqual(['a', 'b', 'c', 'a', 'b', 'c'])
  })
})

describe('freePlayWinners', () => {
  it('returns the single top scorer', () => expect(freePlayWinners({ a: 3, b: 5 })).toEqual(['b']))
  it('returns all tied top scorers', () => expect(freePlayWinners({ a: 5, b: 5, c: 1 })).toEqual(['a', 'b']))
})
