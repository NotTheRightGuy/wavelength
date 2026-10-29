import { describe, expect, it } from 'vitest'
import { buildRecap } from './recap'

const cards = [{ id: 1, left_label: 'Hot', right_label: 'Cold' }, { id: 2, left_label: 'Red flag', right_label: 'Marriage material' }]
const entry = (seat_id: string, dial: number | null, points: number, lr: 'left' | 'right' | null, lr_correct: boolean) => ({ seat_id, dial, points, lr, lr_correct })

describe('buildRecap (teams)', () => {
  const rounds = [
    { number: 1, seat_id: 'A', psychic_name: 'Sam', card_id: 1, clue: 'Tuesday', result: { target: 50, dial_points: 4, psychic_points: 0, entries: [entry('A', 51, 4, null, false), entry('B', null, 0, 'left', true)] } },
    { number: 2, seat_id: 'B', psychic_name: 'Kim', card_id: 2, clue: null, result: { target: 20, dial_points: 0, psychic_points: 0, entries: [entry('B', 60, 0, null, false), entry('A', null, 0, 'right', false)] } },
  ]
  const r = buildRecap({ rounds, cards, mode: 'teams' })
  it('finds the best clue and biggest miss', () => {
    expect(r.bestClue?.number).toBe(1)
    expect(r.bestClue?.spread).toBe(1)
    expect(r.biggestMiss?.number).toBe(2)
    expect(r.biggestMiss?.spread).toBe(40)
  })
  it('counts perfect hits and left/right callers', () => {
    expect(r.perfectHits).toBe(1)
    expect(r.callers).toEqual([{ seatId: 'B', correct: 1, total: 1 }, { seatId: 'A', correct: 0, total: 1 }])
  })
  it('keeps a round log with card labels', () => {
    expect(r.log.map((x) => `${x.left}|${x.right}`)).toEqual(['Hot|Cold', 'Red flag|Marriage material'])
  })
})

describe('buildRecap (free play)', () => {
  it('uses mean distance and the closest single guess', () => {
    const rounds = [{ number: 1, seat_id: 'P', psychic_name: 'Ana', card_id: 1, clue: 'x', result: { target: 50, dial_points: 0, psychic_points: 3, entries: [entry('B', 52, 4, null, false), entry('C', 60, 2, null, false)] } }]
    const r = buildRecap({ rounds, cards, mode: 'free' })
    expect(r.bestClue?.spread).toBe(6)
    expect(r.closestGuess).toEqual({ seatId: 'B', distance: 2, round: 1 })
    expect(r.perfectHits).toBe(1)
  })
})
