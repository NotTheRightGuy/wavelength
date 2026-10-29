import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { motion } from 'motion/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Board } from '@/components/board/Board'
import { Shutter } from '@/components/Shutter'
import { Cardstock, GameHeading, PlasticButton, TeamToken } from '@/components/game'
import { api } from '@/lib/api'
import { audio } from '@/lib/audio'
import { haptics, prefersReducedMotion } from '@/lib/haptics'
import { buildRevealTimeline } from '@/lib/reveal-timeline'
import type { RoomState, RoundResult } from '@/lib/types'
import { cn } from '@/lib/utils'

const AUTO_NEXT_MS = 8000
const BAND: Record<number, string> = { 4: '#e8590f', 3: '#ffc426', 2: '#2a55cf' }
const bandColor = (p: number) => BAND[p] ?? '#8a9794'
const HEADLINE: Record<number, string> = { 4: 'Bullseye!', 3: 'So close!', 2: 'In the zone' }

interface Progress { open: boolean; glow: boolean; done: boolean; lr: string[]; pts: string[]; bonus: string[] }
const START: Progress = { open: false, glow: false, done: false, lr: [], pts: [], bonus: [] }

interface Flight { id: number; label: string; color: string; from: { x: number; y: number }; to: { x: number; y: number } }

function FlightChip({ f, reduced, onDone }: { f: Flight; reduced: boolean; onDone: () => void }) {
  const at = reduced ? f.to : f.from
  const dx = f.to.x - f.from.x
  const dy = f.to.y - f.from.y
  return (
    <div aria-hidden="true" className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2" style={{ left: at.x, top: at.y }}>
      <motion.div
        className="rounded-full bg-plastic-cream px-4 py-1 font-display text-3xl leading-none text-ink shadow-lift-2 ring-4"
        style={{ '--tw-ring-color': f.color } as React.CSSProperties}
        initial={{ opacity: 0, scale: 0.6 }}
        animate={reduced ? { opacity: [0, 1, 1, 0] } : { x: [0, 0, dx], y: [0, -36, dy], scale: [0.6, 1.4, 0.8], opacity: [0, 1, 1, 0] }}
        transition={{ duration: reduced ? 0.9 : 1, ease: 'easeInOut' }}
        onAnimationComplete={onDone}
      >
        {f.label}
      </motion.div>
    </div>
  )
}

function Chip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.span
      initial={prefersReducedMotion() ? { opacity: 0 } : { scale: 0.4, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={prefersReducedMotion() ? { duration: 0.15 } : { type: 'spring', stiffness: 420, damping: 12 }}
      className={cn('rounded-full bg-plastic-yellow px-3 py-0.5 font-display text-2xl leading-none text-[#3a2600]', className)}
    >
      {children}
    </motion.span>
  )
}

/**
 * The reveal ceremony: shutter opens, needle glows in the band colour, points chips fly to the scoreboard.
 * Tap anywhere to skip to the final state. The host sees Next turn and auto-advances 8 s after it completes.
 */
export function Reveal({ state, viewOnly = false, wide = false, paused = false }: {
  state: RoomState
  viewOnly?: boolean
  wide?: boolean
  paused?: boolean
  onTogglePause?: () => void
}) {
  const { room, seats } = state
  const round = state.round!
  const result = round.result
  const isTeams = room.mode === 'teams'
  const sd = room.game.phase === 'sudden_death'

  // No +1 for teams outside the tie-break during sudden death.
  const clean: RoundResult | null = useMemo(() => {
    if (!result) return null
    if (!sd) return result
    const tied = room.game.sd_tied ?? []
    return { ...result, entries: result.entries.map((e) => (tied.includes(e.seat_id) ? e : { ...e, lr_correct: false })) }
  }, [result, sd, room.game.sd_tied])

  const hasResult = clean !== null
  const latest = useRef({ clean, mode: room.mode })
  useEffect(() => { latest.current = { clean, mode: room.mode } })

  const [prog, setProg] = useState<Progress>(START)
  const [flights, setFlights] = useState<Flight[]>([])
  const [pending, setPending] = useState(false)
  const timers = useRef<number[]>([])
  const boardRef = useRef<HTMLDivElement>(null)
  const flightId = useRef(0)
  const reduced = prefersReducedMotion()

  const seatOf = (id: string) => seats.find((s) => s.id === id)
  const best = clean ? (isTeams ? clean.dial_points : Math.max(0, ...clean.entries.map((e) => e.points))) : 0

  const finalProgress = useCallback((): Progress => {
    const { clean: c, mode } = latest.current
    if (!c) return START
    const steps = buildRevealTimeline(c, mode)
    const ids = (k: string) => steps.filter((s) => s.kind === k && s.seatId).map((s) => s.seatId!)
    return { open: true, glow: true, done: true, lr: ids('lr'), pts: ids('points'), bonus: ids('bonus') }
  }, [])

  useEffect(() => {
    if (!hasResult) return
    const { clean: c, mode } = latest.current
    if (!c) return
    const steps = buildRevealTimeline(c, mode)
    const ids: number[] = []
    timers.current = ids
    setProg(START)
    setFlights([])

    const fly = (seatId: string, label: string, color: string) => {
      const board = boardRef.current
      const chip = document.querySelector<HTMLElement>(`[data-seat-id="${seatId}"]`)
      if (!board || !chip) return
      const b = board.getBoundingClientRect()
      const t = chip.getBoundingClientRect()
      setFlights((f) => [...f, {
        id: ++flightId.current, label, color,
        from: { x: b.left + b.width / 2, y: b.top + b.height * 0.55 },
        to: { x: t.left + t.width / 2, y: t.top + t.height / 2 },
      }])
    }

    for (const s of steps) {
      ids.push(window.setTimeout(() => {
        switch (s.kind) {
          case 'clunk': audio.clunk(); break
          case 'lr': audio.tick(0.8); setProg((p) => ({ ...p, lr: [...p.lr, s.seatId!] })); break
          case 'drumroll': audio.drumroll(900); break
          case 'open': setProg((p) => ({ ...p, open: true })); break
          case 'glow': setProg((p) => ({ ...p, glow: true })); haptics.thud(); break
          case 'points':
          case 'bonus': {
            audio.chime(s.points ?? 0)
            const seat = seats.find((x) => x.id === s.seatId)
            fly(s.seatId!, `+${s.points}`, seat?.color ?? '#ffc426')
            setProg((p) => (s.kind === 'points' ? { ...p, pts: [...p.pts, s.seatId!] } : { ...p, bonus: [...p.bonus, s.seatId!] }))
            break
          }
        }
      }, s.at))
    }
    ids.push(window.setTimeout(() => setProg((p) => ({ ...p, done: true })), steps[steps.length - 1].at + 600))
    return () => {
      ids.forEach(clearTimeout)
      audio.stopAll()
    }
    // restart only for a different round / when the result first arrives, never on state refreshes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round.id, hasResult])

  const skip = useCallback(() => {
    timers.current.forEach(clearTimeout)
    audio.stopAll()
    setFlights([])
    setProg(finalProgress())
  }, [finalProgress])

  useEffect(() => {
    if (!hasResult || prog.done) return
    window.addEventListener('pointerdown', skip)
    return () => window.removeEventListener('pointerdown', skip)
  }, [hasResult, prog.done, skip])

  // Host auto-advance, 8 s after the reveal completes unless paused.
  useEffect(() => {
    if (!prog.done || !state.is_host || paused) return
    const id = setTimeout(() => { api.nextTurn(room.id).catch(() => { /* already advanced */ }) }, AUTO_NEXT_MS)
    return () => clearTimeout(id)
  }, [prog.done, state.is_host, paused, room.id])

  const next = () => {
    setPending(true)
    api.nextTurn(room.id).catch((e: Error) => { toast.error(e.message); setPending(false) })
  }

  // Board contents
  const withDial = clean?.entries.filter((e) => e.dial != null) ?? []
  const main = isTeams ? withDial[0] : withDial.reduce<typeof withDial[number] | undefined>((a, e) => (!a || e.points > a.points ? e : a), undefined)
  const ghosts = isTeams ? [] : withDial.filter((e) => e !== main).map((e) => ({ id: e.seat_id, value: e.dial!, color: seatOf(e.seat_id)?.color ?? '#999' }))

  const rows = seats.filter((s) => clean?.entries.some((e) => e.seat_id === s.id) || (!isTeams && s.id === round.seat_id))
  const entryOf = (id: string) => clean?.entries.find((e) => e.seat_id === id)

  return (
    <div className={cn('flex flex-col gap-4', wide && 'lg:grid lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-center lg:gap-8')}>
      <div ref={boardRef} className="flex flex-col gap-3">
        <GameHeading
          level={1} size="heading"
          className={cn('text-center transition-opacity duration-200', prog.glow ? 'opacity-100' : 'opacity-0')}
        >
          {HEADLINE[best] ?? 'Missed it'}
        </GameHeading>
        <Shutter closed={!prog.open}>
          <Board
            dial={main?.dial ?? 50}
            target={clean?.target}
            showTarget={hasResult}
            glow={prog.glow}
            needleColor={prog.glow ? bandColor(best) : undefined}
            ghostDials={ghosts}
            className={wide ? 'max-w-none' : undefined}
          />
        </Shutter>
      </div>

      <div className="flex flex-col gap-4">
        <Cardstock padding="sm" aria-live="polite" aria-label="Round result">
          <ul className="flex flex-col gap-2">
            {rows.map((s) => {
              const e = entryOf(s.id)
              const isPsychic = !isTeams && s.id === round.seat_id
              const lrShown = !!e?.lr && prog.lr.includes(s.id)
              return (
                <li key={s.id} className="flex items-center gap-3">
                  <TeamToken color={s.color} name={s.name} size="md" />
                  <span className="min-w-0 flex-1 truncate text-xl font-extrabold">
                    {s.name}
                    {isPsychic && <span className="font-bold text-ink-soft"> (psychic)</span>}
                  </span>
                  {e?.dial != null && prog.open && <span className="text-xl font-bold tabular-nums">{Math.round(e.dial)}</span>}
                  {e?.lr && (
                    <span className={cn('transition-opacity', lrShown || prog.done ? 'opacity-100' : 'opacity-0')} aria-label={`Guessed ${e.lr}`}>
                      {e.lr === 'left' ? <ChevronLeftIcon className="size-7" /> : <ChevronRightIcon className="size-7" />}
                    </span>
                  )}
                  {e && e.points > 0 && prog.pts.includes(s.id) && <Chip>+{e.points}</Chip>}
                  {e?.lr_correct && prog.bonus.includes(s.id) && <Chip>+1</Chip>}
                  {isPsychic && clean && clean.psychic_points > 0 && prog.done && <Chip>+{clean.psychic_points}</Chip>}
                </li>
              )
            })}
          </ul>
        </Cardstock>

        {state.is_host ? (
          <PlasticButton data-testid="next-turn" size="xl" block loading={pending} onClick={next}>Next turn</PlasticButton>
        ) : (
          !viewOnly && <p role="status" className="text-center text-lg text-on-table">Waiting for host…</p>
        )}
      </div>

      {flights.map((f) => (
        <FlightChip key={f.id} f={f} reduced={reduced} onDone={() => setFlights((l) => l.filter((x) => x.id !== f.id))} />
      ))}
    </div>
  )
}
