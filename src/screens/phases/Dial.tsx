import { LockIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Board } from '@/components/board/Board'
import { GameHeading, PlasticButton } from '@/components/game'
import { api } from '@/lib/api'
import { audio } from '@/lib/audio'
import { useNeedle } from '@/lib/use-needle'
import { useDeadline } from '@/lib/use-deadline'
import type { RoomState } from '@/lib/types'
import { Waiting } from './Waiting'

function CountdownRing({ secondsLeft, total }: { secondsLeft: number; total: number }) {
  const R = 26, C = 2 * Math.PI * R
  const frac = total > 0 ? Math.min(1, secondsLeft / total) : 0
  const urgent = secondsLeft <= 10
  return (
    <div role="timer" aria-label={`${secondsLeft} seconds left`} className="relative size-16 shrink-0">
      <svg viewBox="0 0 64 64" className="size-full -rotate-90" aria-hidden="true">
        <circle cx="32" cy="32" r={R} fill="var(--table-deep)" stroke="var(--table-shade)" strokeWidth="7" />
        <circle
          cx="32" cy="32" r={R} fill="none" strokeWidth="7" strokeLinecap="round"
          stroke={urgent ? 'var(--plastic-orange)' : 'var(--plastic-yellow)'}
          strokeDasharray={C} strokeDashoffset={C * (1 - frac)}
          className="transition-[stroke-dashoffset] duration-300 ease-linear motion-reduce:transition-none"
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center font-display text-xl text-on-table tabular-nums">{secondsLeft}</span>
    </div>
  )
}

/**
 * Dial phase. Play mode: interactive board, lock-in and deadline auto-lock.
 * Watch-only: read-only board following the live needle. `broadcast` sends the live needle (team mode).
 */
export function Dial({ state, refresh, watchOnly = false, broadcast = false }: {
  state: RoomState
  refresh: () => void
  watchOnly?: boolean
  broadcast?: boolean
}) {
  const round = state.round!
  const needle = useNeedle(round.id)
  const [d, setD] = useState(50)
  const dRef = useRef(50)
  const [submitted, setSubmitted] = useState(false)
  const [pending, setPending] = useState(false)
  const fired = useRef(false)
  const { secondsLeft, expired } = useDeadline(round.dial_deadline)

  const mine = state.guesses.find((g) => g.seat_id === state.my_seat)
  const locked = submitted || mine?.dial != null

  const lock = async (auto = false) => {
    setPending(true)
    try {
      await api.lockDial(round.id, dRef.current)
      setSubmitted(true)
      refresh()
    } catch (e) {
      if (!auto) toast.error((e as Error).message)
      setPending(false)
    }
  }

  useEffect(() => {
    if (secondsLeft !== null && secondsLeft > 0 && secondsLeft <= 10) audio.timerTick()
  }, [secondsLeft])

  useEffect(() => {
    if (watchOnly || locked || !expired || fired.current) return
    fired.current = true
    void lock(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchOnly, locked, expired])

  const ring = secondsLeft !== null && !locked && (
    <div className="flex justify-center"><CountdownRing secondsLeft={secondsLeft} total={state.room.timer_secs ?? secondsLeft} /></div>
  )

  if (watchOnly) {
    return (
      <>
        <GameHeading level={1} size="heading" className="text-center">Dialing it in…</GameHeading>
        {secondsLeft !== null && <div className="flex justify-center"><CountdownRing secondsLeft={secondsLeft} total={state.room.timer_secs ?? secondsLeft} /></div>}
        <Board dial={needle.remote ?? 50} />
      </>
    )
  }

  if (locked) {
    const waitingFor = Math.max(0, state.seats.length - 1 - (state.locked_count ?? 0))
    return (
      <>
        <Board dial={d} />
        <Waiting text={state.room.mode === 'free' ? `Locked in, waiting for ${waitingFor} more` : 'Locked in'} />
      </>
    )
  }

  return (
    <>
      <GameHeading level={1} size="heading" className="text-center">Where does the clue land?</GameHeading>
      {ring}
      <Board
        interactive
        dial={d}
        onDialChange={(v) => { setD(v); dRef.current = v; if (broadcast) needle.send(v) }}
      />
      <PlasticButton data-testid="lock-dial" size="xl" block loading={pending} onClick={() => lock()}>
        <LockIcon />
        Lock it in
      </PlasticButton>
    </>
  )
}
