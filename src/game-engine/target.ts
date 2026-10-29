import { BOARD_MAX, BOARD_MIN, TARGET_HALF_WIDTH } from './constants'

export function generateTarget(rng: () => number = Math.random): number {
  const span = BOARD_MAX - BOARD_MIN - 2 * TARGET_HALF_WIDTH
  const raw = BOARD_MIN + TARGET_HALF_WIDTH + rng() * span
  return Math.round(raw * 100) / 100
}
