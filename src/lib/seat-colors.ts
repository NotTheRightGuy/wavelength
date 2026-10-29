export const SEAT_COLORS = ['#e5484d', '#2f6fdb', '#f2a93b', '#2fa36b', '#8e4ec6', '#e5589b'] as const

export function nextFreeColor(used: string[]): string | undefined {
  const taken = new Set(used.map((c) => c.toLowerCase()))
  return SEAT_COLORS.find((c) => !taken.has(c))
}
