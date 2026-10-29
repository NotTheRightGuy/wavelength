import type { RoundResult } from './types'

export interface RevealStep {
  at: number
  kind: 'clunk' | 'lr' | 'drumroll' | 'open' | 'glow' | 'points' | 'bonus'
  seatId?: string
  points?: number
}

/** Pure schedule of the reveal ceremony; `at` is ms from the start (about 3.5 s in team mode). */
export function buildRevealTimeline(result: RoundResult, mode: 'teams' | 'free'): RevealStep[] {
  const steps: RevealStep[] = [{ at: 0, kind: 'clunk' }]
  const lr = result.entries.filter((e) => e.lr)
  lr.forEach((e, i) => steps.push({ at: 250 + i * 150, kind: 'lr', seatId: e.seat_id }))
  const drumStart = 250 + lr.length * 150
  steps.push({ at: drumStart, kind: 'drumroll' })
  const open = drumStart + 900
  steps.push({ at: open, kind: 'open' })
  steps.push({ at: open + 350, kind: 'glow' })
  const scored = result.entries.filter((e) => e.points > 0)
  scored.forEach((e, i) => steps.push({ at: open + 700 + i * 200, kind: 'points', seatId: e.seat_id, points: e.points }))
  const bonusStart = open + 700 + Math.max(scored.length, 1) * 200 + 200
  if (mode === 'teams') {
    result.entries.filter((e) => e.lr_correct).forEach((e, i) =>
      steps.push({ at: bonusStart + i * 180, kind: 'bonus', seatId: e.seat_id, points: 1 }))
  }
  return steps
}
