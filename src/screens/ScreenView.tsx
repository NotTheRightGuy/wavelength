import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { HouseIcon } from 'lucide-react'
import { Board } from '@/components/board/Board'
import { HostBar } from '@/components/HostBar'
import { QrJoin } from '@/components/QrJoin'
import { Scoreboard } from '@/components/Scoreboard'
import { Shutter } from '@/components/Shutter'
import { Cardstock, DialEmblem, GameHeading, RoomCodeTiles, TeamToken } from '@/components/game'
import { buttonVariants } from '@/components/ui/button'
import { api } from '@/lib/api'
import { normalizeCode } from '@/lib/room-code'
import type { RoomState } from '@/lib/types'
import { useDeadline } from '@/lib/use-deadline'
import { useHostTimerFallback } from '@/lib/use-host-timer-fallback'
import { useNeedle } from '@/lib/use-needle'
import { useRoom } from '@/lib/use-room'
import { cn } from '@/lib/utils'
import { CardLabels } from './phases/CardLabels'
import { End } from './phases/End'
import { Reveal } from './phases/Reveal'

function LiveBoard({ state }: { state: RoomState }) {
  const round = state.round!
  const needle = useNeedle(round.id)
  const { secondsLeft } = useDeadline(round.phase === 'dial' ? round.dial_deadline : null)
  const fixed = state.guesses.find((g) => g.seat_id === round.seat_id)?.dial
  const dial = round.phase === 'lr' ? (fixed ?? 50) : (needle.remote ?? 50)
  const free = state.room.mode === 'free'
  return (
    <div className="flex flex-col items-center gap-4">
      <Board dial={dial} className="max-w-none" />
      <div className="flex items-center gap-6">
        {secondsLeft !== null && (
          <span role="timer" className={cn('font-display text-title tabular-nums', secondsLeft <= 10 ? 'text-plastic-orange' : 'text-on-table')}>{secondsLeft}</span>
        )}
        {free && round.phase === 'dial' && (
          <p className="text-2xl font-extrabold text-on-table">{state.locked_count ?? 0} of {Math.max(0, state.seats.length - 1)} locked in</p>
        )}
        {!free && round.phase === 'lr' && <p className="text-2xl font-extrabold text-on-table">Left or right?</p>}
      </div>
    </div>
  )
}

function ScreenLobby({ state }: { state: RoomState }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col items-center justify-center gap-8 px-6 py-8 text-center">
      <GameHeading level={1} size="heading">Join at your phone</GameHeading>
      <div className="flex flex-col items-center gap-8 md:flex-row">
        <RoomCodeTiles code={state.room.code} size="xl" aria-label={`Room code ${state.room.code}`} />
        <QrJoin code={state.room.code} size={220} />
      </div>
      <ul className="flex flex-wrap justify-center gap-4" aria-label="Players">
        {state.seats.map((s) => (
          <li key={s.id} className="rounded-full bg-table-deep py-1 pr-6 pl-1 text-2xl text-on-table">
            <TeamToken color={s.color} name={s.name} size="lg" showLabel />
          </li>
        ))}
      </ul>
    </main>
  )
}

function ScreenBody({ state }: { state: RoomState }) {
  const [paused, setPaused] = useState(false)
  useHostTimerFallback(state)
  const { room, round, seats } = state
  const finished = room.game.phase === 'finished' || room.status === 'finished'

  if (room.status === 'lobby') return <ScreenLobby state={state} />

  const toggle = () => setPaused((p) => !p)
  let center: React.ReactNode
  if (finished) {
    center = <div className="mx-auto flex w-full max-w-2xl flex-col gap-4"><End state={state} /></div>
  } else if (!round) {
    center = <GameHeading level={2} size="heading" className="text-center">Getting the next round ready…</GameHeading>
  } else {
    const card = state.cards.find((c) => c.id === round.card_id)
    const activeName = seats.find((s) => s.id === round.seat_id)?.name ?? round.psychic_name
    const closedText: Record<string, string> = {
      card_pick: `${activeName} is choosing a card…`,
      spin: `${activeName} is spinning for the target…`,
      clue: `${round.psychic_name} is thinking of a clue…`,
    }
    center = (
      <>
        <CardLabels card={card} clue={['dial', 'lr', 'reveal'].includes(round.phase) ? (round.clue ?? '') : null} />
        {round.phase === 'reveal' ? (
          <Reveal state={state} viewOnly wide paused={paused} onTogglePause={toggle} />
        ) : round.phase === 'dial' || round.phase === 'lr' ? (
          <LiveBoard state={state} />
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="w-full"><Shutter closed><Board dial={50} className="max-w-none" /></Shutter></div>
            <GameHeading level={2} size="heading" className="text-center">{closedText[round.phase]}</GameHeading>
          </div>
        )}
      </>
    )
  }

  const sd = room.game.phase === 'sudden_death' && !finished
  const tied = (room.game.sd_tied ?? []).map((id) => seats.find((s) => s.id === id)?.name).filter(Boolean)

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[1800px] flex-col gap-4 p-4 lg:p-8">
      <div className="grid flex-1 gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
        <div key={round?.id} className="flex flex-col gap-4">
          {sd && (
            <Cardstock role="status" padding="sm" className="text-center">
              <GameHeading level={2} size="subheading" tone="card">Sudden death</GameHeading>
              {tied.length > 0 && <p className="text-lg text-ink-soft">{tied.join(' and ')} are tied</p>}
            </Cardstock>
          )}
          {center}
        </div>
        <aside aria-label="Scores">
          <Scoreboard seats={seats} activeSeatId={finished ? null : round?.seat_id} large />
        </aside>
      </div>
      <HostBar state={state} paused={paused} onTogglePause={toggle} />
    </main>
  )
}

function ScreenRoom({ code }: { code: string }) {
  const { state, error } = useRoom(code)
  if (!state && error) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-6 px-4 text-center">
        <Cardstock pattern padding="lg" className="flex w-full flex-col items-center gap-3">
          <GameHeading level={1} size="heading" tone="card">Room not found</GameHeading>
          <Link to="/" className={cn(buttonVariants({ variant: 'default', size: 'lg' }), 'mt-3 w-full')}><HouseIcon />Back home</Link>
        </Cardstock>
      </main>
    )
  }
  if (!state) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4">
        <DialEmblem className="w-36" title="" />
        <p role="status" className="font-display text-subheading text-on-table">Loading room…</p>
      </main>
    )
  }
  return <ScreenBody state={state} />
}

/** Big-screen, read-only view of a room (/screen/:code). */
export default function ScreenView() {
  const code = normalizeCode(useParams().code ?? '')
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let alive = true
    setReady(false)
    // Fails harmlessly when this session is already a member (e.g. the host).
    api.joinAsViewer(code).catch(() => undefined).finally(() => { if (alive) setReady(true) })
    return () => { alive = false }
  }, [code])
  return ready ? <ScreenRoom code={code} /> : (
    <main className="flex min-h-dvh items-center justify-center">
      <p role="status" className="font-display text-subheading text-on-table">Connecting…</p>
    </main>
  )
}
