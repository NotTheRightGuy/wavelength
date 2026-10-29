import { BANDS } from './constants'

export type DialPoints = 0 | 2 | 3 | 4
export type LeftRight = 'left' | 'right'

export function bandPoints(target: number, dial: number): DialPoints {
  const distance = Math.abs(target - dial)
  for (const band of BANDS) {
    if (distance <= band.maxDistance) return band.points
  }
  return 0
}

/** `guess` states where the target is relative to the dial. */
export function leftRightCorrect(target: number, dial: number, guess: LeftRight): boolean {
  if (target === dial) return false
  return guess === (target < dial ? 'left' : 'right')
}
