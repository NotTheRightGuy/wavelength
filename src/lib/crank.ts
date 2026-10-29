export const GEAR_RATIO = 2.5
export const CLICK_STEP = Math.PI / 12

export function unwrapDelta(prev: number, next: number): number {
  let d = next - prev
  while (d > Math.PI) d -= 2 * Math.PI
  while (d <= -Math.PI) d += 2 * Math.PI
  return d
}

export function clicksCrossed(prevAngle: number, nextAngle: number, step: number): number {
  return Math.abs(Math.floor(nextAngle / step) - Math.floor(prevAngle / step))
}
