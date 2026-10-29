import { toast } from 'sonner'
import { Cardstock, GameHeading, PlasticButton } from '@/components/game'
import { api } from '@/lib/api'
import type { RoomState } from '@/lib/types'

// Placeholder body; the final podium replaces this.
export function End({ state }: { state: RoomState }) {
  const winners = (state.room.game.winners ?? []).map((id) => state.seats.find((s) => s.id === id)?.name).filter(Boolean)
  return (
    <Cardstock padding="lg" className="flex flex-col items-center gap-3 text-center">
      <GameHeading level={1} size="heading" tone="card">Game over</GameHeading>
      <p className="text-xl">{winners.length ? `Winners: ${winners.join(', ')}` : 'No winner this time'}</p>
      {state.is_host && (
        <PlasticButton size="lg" block onClick={() => api.rematch(state.room.id).catch((e: Error) => toast.error(e.message))}>
          Rematch
        </PlasticButton>
      )}
    </Cardstock>
  )
}
