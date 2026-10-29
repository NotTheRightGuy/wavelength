import { CrownIcon, FlagIcon, PauseIcon, PlayIcon, SkipForwardIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { PlasticButton, TeamToken } from '@/components/game'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { api } from '@/lib/api'
import type { RoomState } from '@/lib/types'

function ConfirmDialog({ open, onOpenChange, title, children, confirmLabel, danger, pending, onConfirm }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  children?: React.ReactNode
  confirmLabel: string
  danger?: boolean
  pending: boolean
  onConfirm: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        {children}
        <div className="flex gap-3">
          <PlasticButton variant="quiet" size="lg" className="flex-1" onClick={() => onOpenChange(false)}>Cancel</PlasticButton>
          <PlasticButton variant={danger ? 'danger' : 'primary'} size="lg" className="flex-1" loading={pending} onClick={onConfirm}>{confirmLabel}</PlasticButton>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** Compact host-only control strip: skip the turn, pause auto-next, pass host, end the game. */
export function HostBar({ state, paused, onTogglePause }: { state: RoomState; paused: boolean; onTogglePause: () => void }) {
  const [dialog, setDialog] = useState<'pass' | 'end' | null>(null)
  const [target, setTarget] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  if (!state.is_host) return null

  const { room, round } = state
  const canSkip = round?.phase === 'dial' || round?.phase === 'lr'
  const candidates = state.seats.filter((s) => s.id !== state.my_seat && s.session_id)
  const chosen = candidates.find((s) => s.id === target)

  const run = async (fn: () => Promise<void>, done: string) => {
    setPending(true)
    try {
      await fn()
      toast.success(done)
      setDialog(null)
      setTarget(null)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <div role="toolbar" aria-label="Host controls" className="flex flex-wrap items-center justify-center gap-2 rounded-piece bg-table-deep p-2">
        {canSkip && round && (
          <PlasticButton size="sm" variant="secondary" onClick={() => run(() => api.revealRound(round.id), 'Turn skipped')}>
            <SkipForwardIcon />
            Skip turn
          </PlasticButton>
        )}
        <PlasticButton size="sm" variant="teal" aria-pressed={paused} onClick={onTogglePause}>
          {paused ? <PlayIcon /> : <PauseIcon />}
          {paused ? 'Resume auto-next' : 'Pause auto-next'}
        </PlasticButton>
        <PlasticButton size="sm" variant="teal" onClick={() => { setTarget(null); setDialog('pass') }}>
          <CrownIcon />
          Pass host
        </PlasticButton>
        <PlasticButton size="sm" variant="danger" onClick={() => setDialog('end')}>
          <FlagIcon />
          End game
        </PlasticButton>
      </div>

      <ConfirmDialog
        open={dialog === 'pass'}
        onOpenChange={(o) => !o && setDialog(null)}
        title="Pass host control"
        confirmLabel="Pass host"
        pending={pending}
        onConfirm={() => chosen?.session_id && run(() => api.transferHost(room.id, chosen.session_id!), `${chosen.name} is now the host`)}
      >
        {candidates.length === 0 ? (
          <p className="text-lg text-ink-soft">No one else has a seat yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {candidates.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  aria-pressed={target === s.id}
                  onClick={() => setTarget(s.id)}
                  className="flex w-full items-center gap-3 rounded-full py-1 pr-4 pl-1 text-left text-xl font-extrabold aria-pressed:bg-plastic-yellow/60 aria-pressed:ring-4 aria-pressed:ring-plastic-yellow"
                >
                  <TeamToken color={s.color} name={s.name} size="md" />
                  <span className="truncate">{s.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog === 'end'}
        onOpenChange={(o) => !o && setDialog(null)}
        title="End the game now?"
        confirmLabel="End game"
        danger
        pending={pending}
        onConfirm={() => run(() => api.endGame(room.id), 'Game ended')}
      >
        <p className="text-lg text-ink-soft">The highest score wins. You can start a rematch afterwards.</p>
      </ConfirmDialog>
    </>
  )
}
