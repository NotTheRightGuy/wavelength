import { describe, expect, it } from 'vitest'
import { memberForTurn } from './rotation'

describe('memberForTurn', () => {
  it('cycles through members', () => {
    expect([0, 1, 2, 3].map((n) => memberForTurn(['Sam', 'Ana'], n))).toEqual(['Sam', 'Ana', 'Sam', 'Ana'])
  })
  it('handles a team with a single member', () => expect(memberForTurn(['Sam'], 5)).toBe('Sam'))
})
