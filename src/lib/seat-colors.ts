// Plastic token colours: distinct from each other and readable on the teal table and on cream cardstock.
export const SEAT_COLORS = ['#e2383f', '#2f63e0', '#f5b41a', '#58b947', '#8b4fd6', '#ec5ba5'] as const

export function nextFreeColor(used: string[]): string | undefined {
  const taken = new Set(used.map((c) => c.toLowerCase()))
  return SEAT_COLORS.find((c) => !taken.has(c))
}
