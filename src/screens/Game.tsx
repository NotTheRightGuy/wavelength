import { useState } from 'react'
import { Board } from '@/components/board/Board'
import { Shutter } from '@/components/Shutter'
import { HostBar } from '@/components/HostBar'
import { Scoreboard } from '@/components/Scoreboard'
import { Cardstock, GameHeading } from '@/components/game'
import { useHostTimerFallback } from '@/lib/use-host-timer-fallback'
import { useNeedle } from '@/lib/use-needle'
import type { RoomState } from '@/lib/types'
import { CardLabels } from './phases/CardLabels'
import { CardPick } from './phases/CardPick'
import { Clue } from './phases/Clue'
import { Dial } from './phases/Dial'
import { End } from './phases/End'
import { LeftRight } from './phases/LeftRight'
import { Reveal } from './phases/Reveal'
import { Spin } from './phases/Spin'
import { Waiting } from './phases/Waiting'

/** Read-only board for spectators and for teams that are waiting. Follows the live needle in team mode. */
function WatchBoard({ state }: { state: RoomState }) {
  const round = state.round!
  const needle = useNeedle(round.id)
  const fixed = state.guesses.find((g) => g.seat_id === round.seat_id)?.dial
  const dial = round.phase === 'lr' ? (fixed ?? 50) : (needle.remote ?? 50)
  return <Board dial={dial} />
}

export function Game({ state, refresh }: { state: RoomState; refresh: () => void }) {
  const { room, round, seats, my_seat } = state
  const [paused, setPaused] = useState(false)
  useHostTimerFallback(state)
  const finished = room.game.phase === 'finished' || room.status === 'finished'

  let body: React.ReactNode
  if (finished) {
    body = <End state={state} />
  } else if (!round) {
    body = <Waiting text="Getting the next round ready…" />
  } else {
    const isFree = room.mode === 'free'
    const active = my_seat !== null && my_seat === round.seat_id
    const activeSeat = seats.find((s) => s.id === round.seat_id)
    const activeName = activeSeat?.name ?? 'The psychic'
    const card = state.cards.find((c) => c.id === round.card_id)
    const spectator = my_seat === null
    const guessersTotal = Math.max(0, seats.length - 1)

    let phase: React.ReactNode
    switch (round.phase) {
      case 'card_pick':
        phase = active
          ? <CardPick state={state} refresh={refresh} />
          : <Waiting text={isFree ? `${round.psychic_name} is choosing a card…` : `${activeName} is choosing a card…`} />
        break
      case 'spin':
        phase = active
          ? <Spin state={state} refresh={refresh} />
          : <Waiting text={`${activeName} is spinning for the target…`}><Shutter closed><Board dial={50} /></Shutter></Waiting>
        break
      case 'clue':
        phase = active
          ? <Clue state={state} refresh={refresh} />
          : <Waiting text={`${round.psychic_name} is thinking of a clue…`}><Shutter closed><Board dial={50} /></Shutter></Waiting>
        break
      case 'dial':
        if (isFree) {
          phase = !active && !spectator
            ? <Dial state={state} refresh={refresh} />
            : <Waiting text={`${state.locked_count ?? 0} of ${guessersTotal} players have locked in`} />
        } else if (spectator) {
          phase = <Dial state={state} refresh={refresh} watchOnly />
        } else {
          phase = active ? <Dial state={state} refresh={refresh} broadcast /> : <Dial state={state} refresh={refresh} watchOnly />
        }
        break
      case 'lr':
        phase = spectator
          ? <WatchBoard state={state} />
          : active
            ? <Waiting text="Other teams are guessing left or right…"><WatchBoard state={state} /></Waiting>
            : <LeftRight state={state} refresh={refresh} />
        break
      case 'reveal':
        phase = <Reveal state={state} paused={paused} onTogglePause={() => setPaused((p) => !p)} />
        break
    }
    body = (
      <>
        <CardLabels card={card} clue={round.clue} />
        {phase}
      </>
    )
  }

  const tiedNames = (room.game.sd_tied ?? []).map((id) => seats.find((s) => s.id === id)?.name).filter(Boolean)
  const suddenDeath = room.game.phase === 'sudden_death' && !finished

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-4 py-4">
      <Scoreboard seats={seats} activeSeatId={finished ? null : round?.seat_id} mySeatId={my_seat} />
      {suddenDeath && (
        <Cardstock role="status" padding="sm" className="text-center">
          <GameHeading level={2} size="subheading" tone="card">Sudden death</GameHeading>
          {tiedNames.length > 0 && <p className="text-lg text-ink-soft">{tiedNames.join(' and ')} are tied</p>}
        </Cardstock>
      )}
      <div key={round?.id} className="flex flex-col gap-4">{body}</div>
      <div className="mt-auto"><HostBar state={state} paused={paused} onTogglePause={() => setPaused((p) => !p)} /></div>
    </main>
  )
}
