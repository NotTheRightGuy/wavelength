import { useEffect, useMemo, useRef } from 'react'
import { api } from './api'
import type { RoomState } from './types'
import { useDeadline } from './use-deadline'

const GRACE_MS = 5000

/** Host client only: if the dial round is still open 5 s after its deadline, force the reveal (once per round). */
export function useHostTimerFallback(state: RoomState | null) {
  const round = state?.round ?? null
  const armed = !!state?.is_host && round?.phase === 'dial' && !!round.dial_deadline
  const shifted = useMemo(
    () => (armed && round?.dial_deadline ? new Date(new Date(round.dial_deadline).getTime() + GRACE_MS).toISOString() : null),
    [armed, round?.dial_deadline],
  )
  const { expired } = useDeadline(shifted)
  const firedFor = useRef<string | null>(null)
  useEffect(() => {
    if (!armed || !expired || !round || firedFor.current === round.id) return
    firedFor.current = round.id
    api.revealRound(round.id).catch(() => { /* someone else already revealed */ })
  }, [armed, expired, round])
}
