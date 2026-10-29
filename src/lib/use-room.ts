import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from './api'
import { supabase } from './supabase'
import type { RoomState } from './types'

export function useRoom(code: string) {
  const [state, setState] = useState<RoomState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const reqId = useRef(0)
  const codeRef = useRef(code)
  codeRef.current = code

  const refresh = useCallback(() => {
    clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      const id = ++reqId.current
      const forCode = code
      try {
        const s = await api.getRoomState(code)
        if (id !== reqId.current || forCode !== codeRef.current) return // stale response
        if (!s) setError('Room not found')
        else {
          // Server returns an all-null round object for a lobby with no rounds; normalise to null.
          if (s.round && s.round.id == null) s.round = null
          setState(s)
          setError(null)
        }
      } catch (e) {
        if (id === reqId.current && forCode === codeRef.current) setError((e as Error).message)
      }
    }, 50)
  }, [code])

  useEffect(() => {
    setState(null)
    setError(null)
    refresh()
    const channel = supabase.channel(`db:${code}`)
    for (const table of ['rooms', 'seats', 'rounds', 'guesses']) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, refresh)
    }
    channel.subscribe()
    return () => {
      clearTimeout(timer.current)
      reqId.current++ // invalidate any in-flight response
      supabase.removeChannel(channel)
    }
  }, [code, refresh])

  // Free-play guesses are RLS-private, so the psychic/screen get no realtime events when a guesser locks in: poll the counter.
  const pollLocked = state?.room.mode === 'free' && state.round?.phase === 'dial'
  useEffect(() => {
    if (!pollLocked) return
    const id = setInterval(refresh, 2000)
    return () => clearInterval(id)
  }, [pollLocked, refresh])

  return { state, error, refresh }
}
