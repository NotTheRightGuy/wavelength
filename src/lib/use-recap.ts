import { useEffect, useState } from 'react'
import { buildRecap, type Recap, type RecapCard, type RecapRoundRow } from './recap'
import { supabase } from './supabase'
import type { Mode } from './types'

/** Loads every revealed round of the room (readable by members via RLS) and builds the end-of-game recap. */
export function useRecap(roomId: string, mode: Mode): Recap | null {
  const [recap, setRecap] = useState<Recap | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: rounds } = await supabase
        .from('rounds')
        .select('number, seat_id, psychic_name, card_id, clue, result')
        .eq('room_id', roomId)
        .order('number')
      if (!rounds || cancelled) return
      const ids = [...new Set(rounds.map((r) => r.card_id).filter((id): id is number => id != null))]
      const { data: cards } = ids.length
        ? await supabase.from('cards').select('id, left_label, right_label').in('id', ids)
        : { data: [] as RecapCard[] }
      if (cancelled) return
      setRecap(buildRecap({ rounds: rounds as RecapRoundRow[], cards: (cards ?? []) as RecapCard[], mode }))
    })().catch(() => { /* the recap is a bonus; the scoreboard still shows */ })
    return () => { cancelled = true }
  }, [roomId, mode])

  return recap
}
