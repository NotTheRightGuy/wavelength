import { ArrowLeftIcon, ArrowRightIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Board } from '@/components/board/Board'
import { GameHeading, PlasticButton } from '@/components/game'
import { api } from '@/lib/api'
import type { RoomState } from '@/lib/types'
import { Waiting } from './Waiting'

/** Other teams guess whether the target is left or right of the locked needle. */
export function LeftRight({ state, refresh }: { state: RoomState; refresh: () => void }) {
  const round = state.round!
  const [pending, setPending] = useState<'left' | 'right' | null>(null)
  const dial = state.guesses.find((g) => g.seat_id === round.seat_id)?.dial ?? 50
  const mine = state.guesses.find((g) => g.seat_id === state.my_seat)
  const locked = !!mine?.lr

  const lock = async (side: 'left' | 'right') => {
    setPending(side)
    try {
      await api.lockLr(round.id, side)
      refresh()
    } catch (e) {
      toast.error((e as Error).message)
      setPending(null)
    }
  }

  return (
    <>
      <GameHeading level={1} size="heading" className="text-center">Is the target left or right of the needle?</GameHeading>
      <Board dial={dial} />
      {locked ? (
        <Waiting text="Locked, waiting for others" />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <PlasticButton data-testid="lr-left" aria-label="Target is to the left" variant="tertiary" size="xl" loading={pending === 'left'} disabled={pending !== null} onClick={() => lock('left')}>
            <ArrowLeftIcon />
            Left
          </PlasticButton>
          <PlasticButton data-testid="lr-right" aria-label="Target is to the right" variant="secondary" size="xl" loading={pending === 'right'} disabled={pending !== null} onClick={() => lock('right')}>
            Right
            <ArrowRightIcon />
          </PlasticButton>
        </div>
      )}
    </>
  )
}
