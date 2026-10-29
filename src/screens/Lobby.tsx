import { useEffect, useState } from 'react'
import { MinusIcon, PlusIcon, XIcon } from 'lucide-react'
import { toast } from 'sonner'
import { QrJoin } from '@/components/QrJoin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import { SEAT_COLORS } from '@/lib/seat-colors'
import type { Mode, RoomState, SeatView } from '@/lib/types'
import { btnPrimary, btnSmall, fieldInput, plate } from '@/lib/ui-classes'
import { cn } from '@/lib/utils'

const TIMERS: { label: string; value: number | null }[] = [
  { label: 'Off', value: null },
  { label: '60', value: 60 },
  { label: '90', value: 90 },
  { label: '120', value: 120 },
]

function minSeats(mode: Mode) {
  return mode === 'teams' ? 2 : 3
}

function Heading({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 text-sm font-extrabold tracking-widest text-teal-800 uppercase">{children}</h2>
}

function ColorChip({ color, className }: { color: string; className?: string }) {
  return <span className={cn('inline-block size-5 shrink-0 rounded-full border-2 border-white shadow-[0_0_0_2px_rgba(4,47,46,0.35)]', className)} style={{ backgroundColor: color }} />
}

function SeatForm({
  mode,
  usedColors,
  initialName = '',
  initialMembers = [],
  showColor,
  submitLabel,
  pending,
  onSubmit,
  onCancel,
}: {
  mode: Mode
  usedColors: string[]
  initialName?: string
  initialMembers?: string[]
  showColor: boolean
  submitLabel: string
  pending: boolean
  onSubmit: (name: string, color: string, members: string[]) => void
  onCancel?: () => void
}) {
  const used = new Set(usedColors.map((c) => c.toLowerCase()))
  const allUsed = SEAT_COLORS.every((c) => used.has(c))
  const isFree = (c: string) => allUsed || !used.has(c)
  const [name, setName] = useState(initialName)
  const [color, setColor] = useState<string>(() => SEAT_COLORS.find(isFree) ?? SEAT_COLORS[0])
  const [members, setMembers] = useState<string[]>(initialMembers)
  const [draft, setDraft] = useState('')
  // If the chosen colour gets taken by someone else while the form is open, move to a free one.
  const effectiveColor = isFree(color) ? color : (SEAT_COLORS.find(isFree) ?? color)

  function addMember() {
    const m = draft.trim()
    if (!m) return
    setMembers((prev) => [...prev, m])
    setDraft('')
  }

  const pendingDraft = draft.trim()
  const allMembers = pendingDraft ? [...members, pendingDraft] : members
  const valid = name.trim().length > 0 && (mode === 'free' || allMembers.length > 0)

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (valid && !pending) onSubmit(name.trim(), effectiveColor, mode === 'free' ? [name.trim()] : allMembers)
      }}
    >
      <label className="flex flex-col gap-1.5 text-sm font-bold text-teal-900">
        {mode === 'teams' ? 'Team name' : 'Your name'}
        <Input data-testid="seat-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={24} placeholder={mode === 'teams' ? 'e.g. Red' : 'e.g. Sam'} className={fieldInput} autoComplete="off" />
      </label>

      {showColor && (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-bold text-teal-900">Colour</span>
          <div className="flex flex-wrap gap-3" role="radiogroup" aria-label="Colour">
            {SEAT_COLORS.map((c) => {
              const free = isFree(c)
              const selected = c === effectiveColor
              return (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={c}
                  disabled={!free}
                  onClick={() => setColor(c)}
                  className={cn(
                    'size-11 rounded-full border-4 border-white shadow-[0_0_0_2px_rgba(4,47,46,0.35)] transition-transform disabled:opacity-25',
                    selected && 'scale-110 shadow-[0_0_0_4px_#f97316]',
                  )}
                  style={{ backgroundColor: c }}
                />
              )
            })}
          </div>
        </div>
      )}

      {mode === 'teams' && (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-bold text-teal-900">Team members (they take turns as psychic)</span>
          {members.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {members.map((m, i) => (
                <li key={`${m}-${i}`} className="flex items-center gap-1 rounded-full bg-teal-800 py-1 pr-1 pl-3 text-sm font-bold text-[#f7ecd0]">
                  {m}
                  <button type="button" aria-label={`Remove ${m}`} onClick={() => setMembers(members.filter((_, j) => j !== i))} className="flex size-6 items-center justify-center rounded-full hover:bg-teal-600">
                    <XIcon className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <Input
              data-testid="member-input"
              aria-label="Member name"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addMember()
                }
              }}
              maxLength={24}
              placeholder="Add a member name"
              className={fieldInput}
              autoComplete="off"
            />
            <Button type="button" data-testid="add-member" onClick={addMember} disabled={!draft.trim()} className={cn(btnSmall, 'h-12 px-4')}>
              Add
            </Button>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        {onCancel && (
          <Button type="button" onClick={onCancel} className={cn(btnSmall, 'h-14 bg-teal-900/15 text-teal-900 shadow-none hover:bg-teal-900/25')}>
            Cancel
          </Button>
        )}
        <Button data-testid="claim-seat" type="submit" disabled={!valid || pending} className={btnPrimary}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}

function SeatRow({
  seat,
  mode,
  mine,
  canKick,
  pending,
  onKick,
  onEdit,
}: {
  seat: SeatView
  mode: Mode
  mine: boolean
  canKick: boolean
  pending: boolean
  onKick: () => void
  onEdit: () => void
}) {
  return (
    <li data-testid="seat-row" className="flex items-center gap-3 rounded-2xl border-2 border-teal-800/15 bg-white/70 px-3 py-2.5">
      <ColorChip color={seat.color} className="size-7" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-base font-extrabold">{seat.name}</span>
          {mine && <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[0.65rem] font-extrabold text-white uppercase">You</span>}
        </div>
        {mode === 'teams' && <p className="truncate text-sm text-teal-900/70">{seat.members.length ? seat.members.join(', ') : 'No members yet'}</p>}
      </div>
      {mine && (
        <Button type="button" onClick={onEdit} className="h-9 rounded-lg bg-teal-900/10 px-3 text-sm font-bold text-teal-900 hover:bg-teal-900/20">
          Edit
        </Button>
      )}
      {canKick && (
        <Button type="button" data-testid="kick-seat" aria-label={`Kick ${seat.name}`} disabled={pending} onClick={onKick} className="size-9 rounded-lg bg-red-600/10 p-0 text-red-700 hover:bg-red-600/20">
          <XIcon className="size-4" />
        </Button>
      )}
    </li>
  )
}

function Stepper({ label, value, min, max, disabled, onChange }: { label: string; value: number; min: number; max: number; disabled: boolean; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-base font-bold">{label}</span>
      <div className="flex items-center gap-3">
        <Button type="button" aria-label={`Decrease ${label}`} disabled={disabled || value <= min} onClick={() => onChange(value - 1)} className={cn(btnSmall, 'size-11 p-0')}>
          <MinusIcon />
        </Button>
        <span data-testid="setting-value" className="w-8 text-center text-2xl font-black tabular-nums">{value}</span>
        <Button type="button" aria-label={`Increase ${label}`} disabled={disabled || value >= max} onClick={() => onChange(value + 1)} className={cn(btnSmall, 'size-11 p-0')}>
          <PlusIcon />
        </Button>
      </div>
    </div>
  )
}

function HostSettings({ state, refresh }: { state: RoomState; refresh: () => void }) {
  const { room } = state
  const [pending, setPending] = useState(false)
  // Local copy so quick successive changes build on each other instead of on a stale snapshot.
  const [vals, setVals] = useState({ winning: room.winning_score, laps: room.laps, timer: room.timer_secs })
  useEffect(() => {
    setVals({ winning: room.winning_score, laps: room.laps, timer: room.timer_secs })
  }, [room.winning_score, room.laps, room.timer_secs])

  async function save(patch: Partial<typeof vals>) {
    const next = { ...vals, ...patch }
    setVals(next)
    setPending(true)
    try {
      await api.updateRoomSettings(room.id, next.winning, next.laps, next.timer)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setPending(false)
      refresh()
    }
  }

  return (
    <section className={plate} data-testid="host-settings">
      <Heading>Game settings</Heading>
      <div className="flex flex-col gap-4">
        {room.mode === 'teams' ? (
          <Stepper label="Winning score" value={vals.winning} min={5} max={20} disabled={false} onChange={(v) => save({ winning: v })} />
        ) : (
          <Stepper label="Laps" value={vals.laps} min={1} max={5} disabled={false} onChange={(v) => save({ laps: v })} />
        )}
        <div className="flex flex-col gap-2">
          <span className="text-base font-bold">Dial timer (seconds)</span>
          <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Dial timer">
            {TIMERS.map((t) => {
              const on = vals.timer === t.value
              return (
                <Button
                  key={t.label}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => save({ timer: t.value })}
                  className={cn('h-11 rounded-xl text-base font-extrabold', on ? 'bg-orange-500 text-white shadow-[0_3px_0_0_#9a3412]' : 'bg-teal-900/10 text-teal-900 hover:bg-teal-900/20')}
                >
                  {t.label}
                </Button>
              )
            })}
          </div>
        </div>
      </div>
      {pending && <span className="sr-only">Saving</span>}
    </section>
  )
}

export default function Lobby({ state, refresh }: { state: RoomState; refresh: () => void }) {
  const { room, seats, my_seat, is_host } = state
  const [pending, setPending] = useState(false)
  const [editing, setEditing] = useState(false)
  const mySeat = seats.find((s) => s.id === my_seat)

  // Joiners without a seat get no realtime events (RLS), so poll while in the lobby.
  useEffect(() => {
    if (room.status !== 'lobby') return
    const id = setInterval(refresh, 3000)
    return () => clearInterval(id)
  }, [room.status, refresh])

  async function run(fn: () => Promise<unknown>) {
    setPending(true)
    try {
      await fn()
      refresh()
      return true
    } catch (e) {
      toast.error((e as Error).message)
      return false
    } finally {
      setPending(false)
    }
  }

  const min = minSeats(room.mode)
  const emptyTeam = room.mode === 'teams' && seats.some((s) => s.members.length === 0)
  const canStart = seats.length >= min && !emptyTeam
  const hint =
    seats.length < min
      ? `Need ${min - seats.length} more ${room.mode === 'teams' ? 'team' : 'player'}${min - seats.length === 1 ? '' : 's'} to start`
      : emptyTeam
        ? 'Every team needs at least one member'
        : null
  const unit = room.mode === 'teams' ? 'Teams' : 'Players'
  const max = room.mode === 'teams' ? 6 : 12

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-5 px-4 pt-12 pb-10">
      <section className={cn(plate, 'flex items-center gap-4')}>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-extrabold tracking-widest text-teal-800 uppercase">Room code</p>
          <p data-testid="room-code" aria-label={`Room code ${room.code}`} className="mt-1 text-6xl leading-none font-black tracking-[0.12em] text-teal-900">
            {room.code}
          </p>
          <p className="mt-2 text-sm font-semibold text-teal-900/70">{room.mode === 'teams' ? 'Team game' : 'Free play'}. Scan or type the code to join.</p>
        </div>
        <QrJoin code={room.code} />
      </section>

      <a href={`/screen/${room.code}`} target="_blank" rel="noreferrer" className="text-center text-sm font-bold text-[#f7ecd0] underline underline-offset-4">
        Open shared screen (for a TV or laptop)
      </a>

      <section className={plate}>
        <Heading>
          {unit} ({seats.length}/{max})
        </Heading>
        {seats.length === 0 ? (
          <p className="py-2 text-center text-sm text-teal-900/70">Nobody has taken a seat yet.</p>
        ) : (
          <ul data-testid="seat-list" className="flex flex-col gap-2">
            {seats.map((s) => (
              <SeatRow
                key={s.id}
                seat={s}
                mode={room.mode}
                mine={s.id === my_seat}
                canKick={is_host && s.id !== my_seat}
                pending={pending}
                onKick={() => run(() => api.kickSeat(s.id))}
                onEdit={() => setEditing(true)}
              />
            ))}
          </ul>
        )}
      </section>

      {!my_seat && (
        <section className={plate}>
          <Heading>{room.mode === 'teams' ? 'Claim a team seat' : 'Take a seat'}</Heading>
          <SeatForm
            mode={room.mode}
            usedColors={seats.map((s) => s.color)}
            showColor
            submitLabel="Take this seat"
            pending={pending}
            onSubmit={(name, color, members) => run(() => api.joinRoom(room.code, name, color, members))}
          />
        </section>
      )}

      {mySeat && editing && (
        <section className={plate}>
          <Heading>Edit your seat</Heading>
          <SeatForm
            mode={room.mode}
            usedColors={[]}
            initialName={mySeat.name}
            initialMembers={mySeat.members}
            showColor={false}
            submitLabel="Save"
            pending={pending}
            onCancel={() => setEditing(false)}
            onSubmit={async (name, _color, members) => {
              if (await run(() => api.updateSeat(mySeat.id, name, members))) setEditing(false)
            }}
          />
        </section>
      )}

      {is_host && <HostSettings state={state} refresh={refresh} />}

      {is_host ? (
        <div className="flex flex-col gap-2">
          <Button data-testid="start-game" disabled={!canStart || pending} onClick={() => run(() => api.startGame(room.id))} className={btnPrimary}>
            Start game
          </Button>
          {hint && <p className="text-center text-sm font-semibold text-teal-100/80">{hint}</p>}
        </div>
      ) : (
        <p className="text-center text-base font-bold text-teal-100/90">Waiting for the host to start the game…</p>
      )}
    </main>
  )
}
