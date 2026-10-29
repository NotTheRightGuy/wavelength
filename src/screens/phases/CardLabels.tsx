import { ArrowLeftRightIcon } from 'lucide-react'
import { Cardstock } from '@/components/game'
import type { CardView } from '@/lib/types'

/** The spectrum card (left label, arrows, right label) plus the clue once it is in. */
export function CardLabels({ card, clue }: { card: CardView | undefined; clue: string | null }) {
  if (!card) return null
  return (
    <Cardstock padding="sm" className="flex flex-col items-center gap-2 text-center" aria-label={`Spectrum: ${card.left_label} to ${card.right_label}`}>
      <p className="flex w-full items-center justify-between gap-3 text-xl font-extrabold">
        <span className="min-w-0 flex-1 text-left">{card.left_label}</span>
        <ArrowLeftRightIcon aria-hidden="true" className="size-6 shrink-0 text-ink-soft" />
        <span className="min-w-0 flex-1 text-right">{card.right_label}</span>
      </p>
      {clue !== null && (
        <p data-testid="clue-text" className="font-display text-heading text-balance break-words">
          {clue ? `“${clue}”` : 'The clue is spoken aloud'}
        </p>
      )}
    </Cardstock>
  )
}
