import { useEffect, useState } from 'react'
import { Collapsible } from '@base-ui/react/collapsible'
import { CheckIcon, ChevronDownIcon, MinusIcon, MonitorIcon, PencilIcon, PlusIcon, XIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Footer } from '@/components/Footer'
import { QrJoin } from '@/components/QrJoin'
import { Cardstock, GameHeading, PlasticButton, RoomCodeTiles, TeamToken, seatColorName, ui } from '@/components/game'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import { SEAT_COLORS } from '@/lib/seat-colors'
import type { Mode, RoomState, SeatView } from '@/lib/types'
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
  return (
    <GameHeading level={2} size="subheading" tone="card" className="mb-4">
      {children}
    </GameHeading>
  )
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
      <label className={ui.fieldLabel}>
        {mode === 'teams' ? 'Team name' : 'Your name'}
        <Input data-testid="seat-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={24} placeholder={mode === 'teams' ? 'e.g. Red' : 'e.g. Sam'} autoComplete="off" />
      </label>

      {showColor && (
        <div className="flex flex-col gap-2">
          <span className="text-label font-bold">Colour</span>
          <div className="flex flex-wrap gap-3.5 py-1" role="radiogroup" aria-label="Colour">
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
                  title={seatColorName(c)}
                  disabled={!free}
                  onClick={() => setColor(c)}
                  className={cn(
                    'grid size-12 place-items-center rounded-full transition-transform duration-300 ease-spring disabled:cursor-not-allowed disabled:opacity-30 disabled:saturate-50 motion-reduce:transition-none',
                    selected ? '-translate-y-1 scale-110' : 'hover:-translate-y-0.5',
                  )}
                >
                  <TeamToken color={c} size="md" initial="">
                    {selected ? <CheckIcon className="size-6 stroke-[3]" /> : !free ? <XIcon className="size-5 stroke-[3]" /> : ''}
                  </TeamToken>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {mode === 'teams' && (
        <div className="flex flex-col gap-2">
          <span className="text-label font-bold">Team members</span>
          <span className="-mt-1 text-base text-ink-soft">They take turns as the psychic.</span>
          {members.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {members.map((m, i) => (
                <li key={`${m}-${i}`} className="flex items-center gap-1 rounded-full bg-table py-1 pr-1 pl-4 text-base font-bold text-on-table shadow-lift-1">
                  {m}
                  <button type="button" aria-label={`Remove ${m}`} onClick={() => setMembers(members.filter((_, j) => j !== i))} className="flex size-9 items-center justify-center rounded-full transition-colors hover:bg-table-hi">
                    <XIcon className="size-4 stroke-[2.5]" />
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
              autoComplete="off"
            />
            <PlasticButton type="button" data-testid="add-member" variant="tertiary" size="lg" onClick={addMember} disabled={!draft.trim()} className="px-5">
              <PlusIcon />
              Add
            </PlasticButton>
          </div>
        </div>
      )}

      <div className="mt-1 flex gap-3">
        {onCancel && (
          <PlasticButton type="button" variant="quiet" size="lg" onClick={onCancel}>
            Cancel
          </PlasticButton>
        )}
        <PlasticButton data-testid="claim-seat" type="submit" size="lg" block loading={pending} disabled={!valid || pending} className="flex-1">
          {submitLabel}
        </PlasticButton>
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
    <li data-testid="seat-row" className="flex items-center gap-3 py-3 not-first:border-t-2 not-first:border-dashed not-first:border-card-edge/80">
      <TeamToken color={seat.color} name={seat.name} size="lg" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-xl font-extrabold">{seat.name}</span>
          {mine && <span className="shrink-0 rounded-full bg-plastic-yellow px-2.5 py-0.5 text-base leading-snug font-extrabold text-[#3a2600] shadow-lift-1">You</span>}
        </div>
        {mode === 'teams' && <p className="truncate text-base text-ink-soft">{seat.members.length ? seat.members.join(', ') : 'No members yet'}</p>}
      </div>
      {mine && (
        <PlasticButton type="button" variant="quiet" size="sm" onClick={onEdit}>
          <PencilIcon />
          Edit
        </PlasticButton>
      )}
      {canKick && (
        <PlasticButton type="button" data-testid="kick-seat" variant="danger" size="icon-sm" aria-label={`Kick ${seat.name}`} disabled={pending} onClick={onKick}>
          <XIcon />
        </PlasticButton>
      )}
    </li>
  )
}

function Stepper({ label, value, min, max, disabled, onChange }: { label: string; value: number; min: number; max: number; disabled: boolean; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-label font-bold">{label}</span>
      <div className="flex items-center gap-2">
        <PlasticButton type="button" variant="tertiary" size="icon-sm" aria-label={`Decrease ${label}`} disabled={disabled || value <= min} onClick={() => onChange(value - 1)}>
          <MinusIcon />
        </PlasticButton>
        <span data-testid="setting-value" className="w-12 text-center font-display text-heading tabular-nums">{value}</span>
        <PlasticButton type="button" variant="tertiary" size="icon-sm" aria-label={`Increase ${label}`} disabled={disabled || value >= max} onClick={() => onChange(value + 1)}>
          <PlusIcon />
        </PlasticButton>
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
    <Cardstock data-testid="host-settings" padding="none">
      <Collapsible.Root defaultOpen>
        <Collapsible.Trigger className="group/trigger flex w-full items-center justify-between gap-3 rounded-card px-5 py-4 text-left">
          <GameHeading level={2} size="subheading" tone="card">Game settings</GameHeading>
          <span className="grid size-10 place-items-center rounded-full bg-cardstock-deep text-ink shadow-lift-1 transition-transform duration-300 ease-spring group-data-panel-open/trigger:rotate-180 motion-reduce:transition-none">
            <ChevronDownIcon className="size-6 stroke-[2.5]" aria-hidden="true" />
          </span>
        </Collapsible.Trigger>
        <Collapsible.Panel className="h-[var(--collapsible-panel-height)] overflow-hidden transition-[height] duration-300 ease-out-expo data-ending-style:h-0 data-starting-style:h-0 motion-reduce:transition-none">
      <div className="flex flex-col gap-5 border-t-2 border-dashed border-card-edge/80 px-5 pt-4 pb-5">
        {room.mode === 'teams' ? (
          <Stepper label="Winning score" value={vals.winning} min={5} max={20} disabled={false} onChange={(v) => save({ winning: v })} />
        ) : (
          <Stepper label="Laps" value={vals.laps} min={1} max={5} disabled={false} onChange={(v) => save({ laps: v })} />
        )}
        <div className="flex flex-col gap-2">
          <span className="text-label font-bold">Dial timer (seconds)</span>
          <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Dial timer">
            {TIMERS.map((t) => {
              const on = vals.timer === t.value
              return (
                <PlasticButton
                  key={t.label}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  variant={on ? 'primary' : 'quiet'}
                  size="sm"
                  onClick={() => save({ timer: t.value })}
                  className="h-12 px-0 text-label tabular-nums"
                >
                  {t.label}
                </PlasticButton>
              )
            })}
          </div>
        </div>
      </div>
        </Collapsible.Panel>
      </Collapsible.Root>
      {pending && <span className="sr-only">Saving</span>}
    </Cardstock>
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
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-4 pt-16 pb-0">
      <header className="flex flex-col items-center gap-4 text-center">
        <GameHeading level={1} size="title">{room.mode === 'teams' ? 'Team game' : 'Free play'}</GameHeading>
        <RoomCodeTiles data-testid="room-code" aria-label={`Room code ${room.code}`} role="img" code={room.code} size="xl" flipIn />
      </header>

      <Cardstock pattern className="flex items-center gap-4">
        <QrJoin code={room.code} />
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <p className="text-label leading-snug font-bold">Scan the code or type the letters on the home screen to join.</p>
          <a href={`/screen/${room.code}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-md text-base font-bold text-plastic-cobalt underline hover:text-plastic-cobalt-lip">
            <MonitorIcon className="size-5 shrink-0 stroke-[2.5]" aria-hidden="true" />
            Open shared screen
          </a>
        </div>
      </Cardstock>

      <Cardstock>
        <Heading>
          {unit} <span className="tabular-nums">({seats.length}/{max})</span>
        </Heading>
        {seats.length === 0 ? (
          <div className="flex items-center gap-4 py-2 text-ink-soft">
            <div className="flex -space-x-2" aria-hidden="true">
              {Array.from({ length: min }, (_, i) => <TeamToken key={i} color="" empty size="lg" />)}
            </div>
            <p className="text-base">Nobody has taken a seat yet.</p>
          </div>
        ) : (
          <ul data-testid="seat-list" className="flex flex-col">
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
      </Cardstock>

      {!my_seat && (
        <Cardstock pattern>
          <Heading>{room.mode === 'teams' ? 'Claim a team seat' : 'Take a seat'}</Heading>
          <SeatForm
            mode={room.mode}
            usedColors={seats.map((s) => s.color)}
            showColor
            submitLabel="Take this seat"
            pending={pending}
            onSubmit={(name, color, members) => run(() => api.joinRoom(room.code, name, color, members))}
          />
        </Cardstock>
      )}

      {mySeat && editing && (
        <Cardstock pattern>
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
        </Cardstock>
      )}

      {is_host && <HostSettings state={state} refresh={refresh} />}

      {/* Stick the footer only when no form is open, so it never covers the claim/edit form. */}
      <div
        className={cn(
          '-mx-4 mt-auto px-4 pt-8 pb-[max(1.25rem,env(safe-area-inset-bottom))]',
          !my_seat || (mySeat && editing)
            ? ''
            : 'sticky bottom-0 z-10 bg-[linear-gradient(to_bottom,transparent,var(--table)_28%)]',
        )}
      >
        {is_host ? (
          <div className="flex flex-col gap-3">
            <PlasticButton data-testid="start-game" size="xl" block disabled={!canStart || pending} onClick={() => run(() => api.startGame(room.id))}>
              Start game
            </PlasticButton>
            {hint && <p className="text-center text-base font-semibold text-on-table-soft">{hint}</p>}
          </div>
        ) : (
          <p className="text-center font-display text-subheading text-on-table">Waiting for the host to start the game…</p>
        )}
      </div>
      <Footer />
    </main>
  )
}
