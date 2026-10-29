import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from './api'
import { supabase } from './supabase'
import type { RoomState } from './types'

export function useRoom(code: string) {
  const [state, setState] = useState<RoomState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const refresh = useCallback(() => {
    clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      try {
        const s = await api.getRoomState(code)
        if (!s) setError('Room not found')
        else {
          // Server returns an all-null round object for a lobby with no rounds; normalise to null.
          if (s.round && s.round.id == null) s.round = null
          setState(s)
          setError(null)
        }
      } catch (e) { setError((e as Error).message) }
    }, 50)
  }, [code])

  useEffect(() => {
    refresh()
    const channel = supabase.channel(`db:${code}`)
    for (const table of ['rooms', 'seats', 'rounds', 'guesses']) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, refresh)
    }
    channel.subscribe()
    return () => { clearTimeout(timer.current); supabase.removeChannel(channel) }
  }, [code, refresh])

  return { state, error, refresh }
}
