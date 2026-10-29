// Design-system helpers shared by the game pieces and screens.
// Colour values live as CSS custom properties in src/index.css; these are class recipes and small utilities.

/** Human names for the six seat token colours (index-aligned with SEAT_COLORS). */
export const SEAT_COLOR_NAMES: Record<string, string> = {
  '#e2383f': 'Red',
  '#2f63e0': 'Blue',
  '#f5b41a': 'Yellow',
  '#58b947': 'Green',
  '#8b4fd6': 'Purple',
  '#ec5ba5': 'Pink',
}

export function seatColorName(hex: string): string {
  return SEAT_COLOR_NAMES[hex.toLowerCase()] ?? hex
}

function luminance(hex: string): number {
  const m = hex.replace('#', '')
  const full = m.length === 3 ? m.split('').map((c) => c + c).join('') : m
  const [r, g, b] = [0, 2, 4].map((i) => {
    const v = parseInt(full.slice(i, i + 2), 16) / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Readable ink (dark teal or white) for text printed on a coloured token. */
export function inkOn(hex: string): string {
  if (!/^#?[0-9a-f]{3,6}$/i.test(hex)) return '#ffffff'
  return luminance(hex) > 0.3 ? '#10302d' : '#ffffff'
}

/** Darker shade of a colour for token rims and lips. */
export function shade(hex: string, amount = 0.32): string {
  return `color-mix(in oklch, ${hex}, #02302e ${Math.round(amount * 100)}%)`
}

/** Class recipes. */
export const ui = {
  /** Body copy on the teal table. */
  tableText: 'text-lg text-on-table',
  /** Secondary copy on the teal table (teal-tinted, AA on --table). */
  tableTextSoft: 'text-base text-on-table-soft',
  /** Secondary copy on cardstock (cream-tinted brown, AA on --cardstock). */
  cardTextSoft: 'text-base text-ink-soft',
  /** Form field label on cardstock. */
  fieldLabel: 'flex flex-col gap-2 text-label font-bold text-ink',
  /** Readable measure for paragraphs. */
  measure: 'max-w-[68ch]',
  /** Scores, room codes, counters. */
  numerals: 'tabular-nums',
  /** Thin perforated divider between rows on a card. */
  perforation: 'border-t-2 border-dashed border-card-edge/80',
} as const
