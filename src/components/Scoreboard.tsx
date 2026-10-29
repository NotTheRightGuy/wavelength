import { motion, useReducedMotion } from 'motion/react'
import { TeamToken } from '@/components/game'
import type { SeatView } from '@/lib/types'
import { cn } from '@/lib/utils'

/** Compact row of seat tokens with spring-popping scores; the active seat is lit. */
export function Scoreboard({ seats, activeSeatId, mySeatId }: { seats: SeatView[]; activeSeatId?: string | null; mySeatId?: string | null }) {
  const reduced = useReducedMotion()
  return (
    <ul data-testid="scoreboard" aria-label="Scores" className="-mx-1 flex gap-2 overflow-x-auto px-1 pt-1 pb-2">
      {seats.map((s) => {
        const active = s.id === activeSeatId
        return (
          <li
            key={s.id}
            aria-current={active ? 'true' : undefined}
            aria-label={`${s.name}: ${s.score} points${active ? ', active' : ''}`}
            className={cn(
              'flex min-w-0 shrink-0 items-center gap-2 rounded-full py-1 pr-4 pl-1 transition-colors',
              active ? 'bg-plastic-cream text-ink ring-4 ring-plastic-yellow' : 'bg-table-deep text-on-table',
            )}
          >
            <TeamToken color={s.color} name={s.name} size="md" />
            <span className="max-w-24 truncate text-base font-extrabold">{s.name}{s.id === mySeatId ? ' (you)' : ''}</span>
            <motion.span
              key={s.score}
              initial={reduced ? false : { scale: 1.7 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 420, damping: 12 }}
              className="font-display text-2xl leading-none tabular-nums"
            >
              {s.score}
            </motion.span>
          </li>
        )
      })}
    </ul>
  )
}
