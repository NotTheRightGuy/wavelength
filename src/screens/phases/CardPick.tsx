import { useState } from 'react'
import { toast } from 'sonner'
import { GameHeading } from '@/components/game'
import { api } from '@/lib/api'
import type { RoomState } from '@/lib/types'

export function CardPick({ state, refresh }: { state: RoomState; refresh: () => void }) {
  const round = state.round!
  const [pending, setPending] = useState(false)
  const options = round.card_options.map((id) => state.cards.find((c) => c.id === id)).filter((c) => !!c)

  const pick = async (id: number) => {
    setPending(true)
    try {
      await api.pickCard(round.id, id)
      refresh()
    } catch (e) {
      toast.error((e as Error).message)
      setPending(false)
    }
  }

  return (
    <>
      <GameHeading level={1} size="heading" className="text-center">
        {round.psychic_name} is the psychic, pass the device to them.
      </GameHeading>
      <p className="text-center text-lg text-on-table-soft">Pick the spectrum you want to give clues for.</p>
      <div className="flex flex-col gap-4">
        {options.map((card, i) => (
          <button
            key={card.id}
            type="button"
            data-testid={`card-option-${i}`}
            aria-label={`Pick card: ${card.left_label} to ${card.right_label}`}
            disabled={pending}
            onClick={() => pick(card.id)}
            className="cardstock card-back p-6 text-center transition-transform duration-200 ease-spring hover:-translate-y-1 active:translate-y-0.5 active:scale-[0.98] disabled:opacity-60 motion-reduce:transition-none focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-plastic-yellow"
          >
            <span className="block font-display text-heading">{card.left_label}</span>
            <span aria-hidden="true" className="block py-1 text-2xl text-ink-soft">{'↔'}</span>
            <span className="block font-display text-heading">{card.right_label}</span>
          </button>
        ))}
      </div>
    </>
  )
}
