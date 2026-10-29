export const BOARD_MIN = 0
export const BOARD_MAX = 100
export const TARGET_HALF_WIDTH = 10
/** Distance from the target centre -> points. Order matters (innermost first). */
export const BANDS = [
  { maxDistance: 2, points: 4 },
  { maxDistance: 6, points: 3 },
  { maxDistance: 10, points: 2 },
] as const
export const DEFAULT_WINNING_SCORE = 10
export const DEFAULT_LAPS = 2
export const LR_BONUS = 1
