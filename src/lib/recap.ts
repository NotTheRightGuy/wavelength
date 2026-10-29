import type { Mode, RoundResult } from './types'

export interface RecapRoundRow {
  number: number
  seat_id: string
  psychic_name: string
  card_id: number | null
  clue: string | null
  result: RoundResult | null
}

export interface RecapCard {
  id: number
  left_label: string
  right_label: string
}

export interface RecapRound {
  number: number
  seatId: string
  psychicName: string
  clue: string | null
  left: string
  right: string
  target: number
  /** The active team's dial (team mode); null in free play or when no dial was locked. */
  dial: number | null
  /** How far the guess landed from the target: the dial's distance (teams) or the guessers' mean distance (free play). Null when nobody guessed. */
  spread: number | null
  /** Points the psychic's side earned this round. */
  points: number
}

export interface Recap {
  log: RecapRound[]
  bestClue: RecapRound | null
  biggestMiss: RecapRound | null
  perfectHits: number
  /** Team mode: left/right calls per team, best first. */
  callers: { seatId: string; correct: number; total: number }[]
  /** Free play: the single closest guess of the game. */
  closestGuess: { seatId: string; distance: number; round: number } | null
}

const round1 = (n: number) => Math.round(n * 10) / 10

export function buildRecap(input: { rounds: RecapRoundRow[]; cards: RecapCard[]; mode: Mode }): Recap {
  const cardById = new Map(input.cards.map((c) => [c.id, c]))
  const callers = new Map<string, { correct: number; total: number }>()
  let perfectHits = 0
  let closestGuess: Recap['closestGuess'] = null
  const log: RecapRound[] = []

  for (const r of [...input.rounds].sort((a, b) => a.number - b.number)) {
    const res = r.result
    if (!res) continue
    const card = r.card_id != null ? cardById.get(r.card_id) : undefined
    let dial: number | null = null
    let spread: number | null = null
    let points = 0

    if (input.mode === 'teams') {
      dial = res.entries.find((e) => e.seat_id === r.seat_id)?.dial ?? null
      spread = dial == null ? null : round1(Math.abs(res.target - dial))
      points = res.dial_points
      if (res.dial_points === 4) perfectHits++
      for (const e of res.entries) {
        if (e.seat_id === r.seat_id || !e.lr) continue
        const c = callers.get(e.seat_id) ?? { correct: 0, total: 0 }
        c.total++
        if (e.lr_correct) c.correct++
        callers.set(e.seat_id, c)
      }
    } else {
      const guesses = res.entries.filter((e) => e.dial != null)
      if (guesses.length > 0) {
        const dists = guesses.map((e) => Math.abs(res.target - (e.dial as number)))
        spread = round1(dists.reduce((a, b) => a + b, 0) / dists.length)
        guesses.forEach((e, i) => {
          if (e.points === 4) perfectHits++
          if (!closestGuess || dists[i] < closestGuess.distance) {
            closestGuess = { seatId: e.seat_id, distance: round1(dists[i]), round: r.number }
          }
        })
      }
      points = res.psychic_points
    }

    log.push({
      number: r.number,
      seatId: r.seat_id,
      psychicName: r.psychic_name,
      clue: r.clue,
      left: card?.left_label ?? '?',
      right: card?.right_label ?? '?',
      target: round1(res.target),
      dial: dial == null ? null : round1(dial),
      spread,
      points,
    })
  }

  const scored = log.filter((r) => r.spread != null)
  const bestClue = scored.reduce<RecapRound | null>((best, r) => (!best || (r.spread as number) < (best.spread as number) ? r : best), null)
  const biggestMiss = scored.reduce<RecapRound | null>((worst, r) => (!worst || (r.spread as number) > (worst.spread as number) ? r : worst), null)

  return {
    log,
    bestClue,
    biggestMiss: biggestMiss && biggestMiss !== bestClue ? biggestMiss : null,
    perfectHits,
    callers: [...callers.entries()]
      .map(([seatId, c]) => ({ seatId, ...c }))
      .sort((a, b) => b.correct - a.correct || a.total - b.total),
    closestGuess,
  }
}
