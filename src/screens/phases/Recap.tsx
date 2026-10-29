import { Cardstock, GameHeading, TeamToken } from '@/components/game'
import { useRecap } from '@/lib/use-recap'
import type { RecapRound } from '@/lib/recap'
import type { RoomState, SeatView } from '@/lib/types'

const clueOf = (r: RecapRound) => (r.clue ? `“${r.clue}”` : 'Said out loud')
const missOf = (r: RecapRound) => (r.spread === 0 ? 'dead on' : `off by ${r.spread}`)

function Award({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <li className="flex flex-col gap-0.5 py-3 first:pt-0 last:pb-0">
      <span className="font-display text-xl text-ink">{label}</span>
      <span className="text-lg leading-snug font-semibold text-ink-soft">{children}</span>
    </li>
  )
}

function Who({ seat }: { seat: SeatView | undefined }) {
  if (!seat) return null
  return (
    <span className="inline-flex items-center gap-1.5 align-middle">
      <TeamToken color={seat.color} name={seat.name} size="sm" />
      <span className="font-extrabold text-ink">{seat.name}</span>
    </span>
  )
}

export function Recap({ state }: { state: RoomState }) {
  const { room, seats } = state
  const recap = useRecap(room.id, room.mode)
  if (!recap || recap.log.length === 0) return null
  const seatOf = (id: string) => seats.find((s) => s.id === id)
  const { bestClue, biggestMiss, perfectHits, callers, closestGuess, log } = recap
  const topCaller = callers[0]

  return (
    <Cardstock padding="md" aria-labelledby="recap-heading" className="flex flex-col gap-4">
      <GameHeading id="recap-heading" level={2} size="heading" tone="card">Game recap</GameHeading>

      <ul className="flex flex-col divide-y-2 divide-card-edge/60">
        {bestClue && (
          <Award label="Best clue">
            {clueOf(bestClue)} by {bestClue.psychicName} <Who seat={seatOf(bestClue.seatId)} />, {bestClue.left} ↔ {bestClue.right}, {missOf(bestClue)}
          </Award>
        )}
        {biggestMiss && (
          <Award label="Biggest miss">
            {clueOf(biggestMiss)} by {biggestMiss.psychicName} <Who seat={seatOf(biggestMiss.seatId)} />, {biggestMiss.left} ↔ {biggestMiss.right}, {missOf(biggestMiss)}
          </Award>
        )}
        {perfectHits > 0 && (
          <Award label="Bullseyes">
            {perfectHits} {perfectHits === 1 ? 'perfect hit' : 'perfect hits'} in the 4-point zone
          </Award>
        )}
        {topCaller && topCaller.correct > 0 && (
          <Award label="Sharpest left/right caller">
            <Who seat={seatOf(topCaller.seatId)} /> got {topCaller.correct} of {topCaller.total} right
          </Award>
        )}
        {closestGuess && (
          <Award label="Closest guess">
            <Who seat={seatOf(closestGuess.seatId)} /> in round {closestGuess.round}, {closestGuess.distance === 0 ? 'dead on' : `off by ${closestGuess.distance}`}
          </Award>
        )}
      </ul>

      <details className="group rounded-piece border-2 border-card-edge bg-cardstock-deep/40 open:pb-2">
        <summary className="cursor-pointer rounded-piece px-4 py-3 font-display text-xl text-ink outline-none select-none focus-visible:ring-4 focus-visible:ring-plastic-cobalt">
          Round by round ({log.length})
        </summary>
        <ol className="flex flex-col gap-3 px-4 pt-1 pb-2">
          {log.map((r) => (
            <li key={r.number} className="flex flex-col gap-0.5 border-t-2 border-card-edge/50 pt-3 first:border-t-0 first:pt-1">
              <span className="text-lg font-extrabold text-ink">
                {r.number}. {r.left} ↔ {r.right}
              </span>
              <span className="text-lg leading-snug font-semibold text-ink-soft">
                {r.psychicName} <Who seat={seatOf(r.seatId)} />: {clueOf(r)}
              </span>
              <span className="text-base font-semibold text-ink-soft tabular-nums">
                Target {r.target}
                {r.dial != null && <> · dial {r.dial}</>}
                {r.spread != null && <> · {missOf(r)}</>}
                {r.points > 0 && <> · +{r.points}</>}
              </span>
            </li>
          ))}
        </ol>
      </details>
    </Cardstock>
  )
}
