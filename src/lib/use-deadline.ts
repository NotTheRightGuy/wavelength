import { useEffect, useState } from 'react'

/** Counts down to an ISO deadline, re-rendering every 250 ms. Null/false when there is no deadline. */
export function useDeadline(isoDeadline: string | null | undefined): { secondsLeft: number | null; expired: boolean } {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!isoDeadline) return
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [isoDeadline])
  if (!isoDeadline) return { secondsLeft: null, expired: false }
  const ms = new Date(isoDeadline).getTime() - now
  return { secondsLeft: Math.max(0, Math.ceil(ms / 1000)), expired: ms <= 0 }
}
