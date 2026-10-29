import { toast } from 'sonner'
import { Cardstock, GameHeading, PlasticButton } from '@/components/game'
import { api } from '@/lib/api'
import type { RoomState } from '@/lib/types'

// Placeholder body; the reveal ceremony replaces this.
export function Reveal({ state }: { state: RoomState }) {
  const round = state.round!
  const result = round.result
  return (
    <Cardstock padding="lg" className="flex flex-col items-center gap-3 text-center">
      <GameHeading level={1} size="heading" tone="card">Round revealed</GameHeading>
      {result && (
        <>
          <p className="text-xl">Target: <b>{result.target}</b></p>
          <ul className="text-lg">
            {result.entries.map((e) => (
              <li key={e.seat_id}>{state.seats.find((s) => s.id === e.seat_id)?.name ?? 'Player'}: {e.dial ?? 'no dial'} ({e.points} pts)</li>
            ))}
          </ul>
        </>
      )}
      {state.is_host && (
        <PlasticButton data-testid="next-turn" size="lg" block onClick={() => api.nextTurn(state.room.id).catch((e: Error) => toast.error(e.message))}>
          Next turn
        </PlasticButton>
      )}
    </Cardstock>
  )
}
