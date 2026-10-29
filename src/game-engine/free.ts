export function psychicScore(guesserPoints: number[]): number {
  if (guesserPoints.length === 0) return 0
  return Math.round(guesserPoints.reduce((a, b) => a + b, 0) / guesserPoints.length)
}

export function psychicOrder(playerIds: string[], laps: number): string[] {
  return Array.from({ length: laps }, () => playerIds).flat()
}

export function freePlayWinners(totals: Record<string, number>): string[] {
  const top = Math.max(...Object.values(totals))
  return Object.keys(totals).filter((id) => totals[id] === top)
}
