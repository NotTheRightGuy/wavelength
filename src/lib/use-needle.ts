import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from './supabase'
import { throttle } from './throttle'

/** Live needle position over Realtime broadcast (about 20 Hz). */
export function useNeedle(roundId: string | undefined) {
  const [remote, setRemote] = useState<number | null>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | undefined>(undefined)

  useEffect(() => {
    if (!roundId) return
    setRemote(null)
    const channel = supabase.channel(`needle:${roundId}`)
    channel.on('broadcast', { event: 'needle' }, ({ payload }) => setRemote(payload.value as number))
    channel.subscribe()
    channelRef.current = channel
    return () => { supabase.removeChannel(channel); channelRef.current = undefined }
  }, [roundId])

  const send = useMemo(
    () => throttle((value: number) => {
      channelRef.current?.send({ type: 'broadcast', event: 'needle', payload: { value } })
    }, 50),
    [],
  )
  return { remote, send }
}
