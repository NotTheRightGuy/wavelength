import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Cardstock, GameHeading, PlasticButton, TeamToken } from '@/components/game'
import { api } from '@/lib/api'
import { audio } from '@/lib/audio'
import { prefersReducedMotion } from '@/lib/haptics'
import { SEAT_COLORS } from '@/lib/seat-colors'
import type { RoomState } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Recap } from './Recap'

const PIECES = 40

function Confetti() {
  const [pieces] = useState(() =>
    Array.from({ length: PIECES }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: 8 + Math.random() * 10,
      color: SEAT_COLORS[i % SEAT_COLORS.length],
      delay: Math.random() * 0.6,
      duration: 2.4 + Math.random() * 1.8,
      drift: (Math.random() - 0.5) * 240,
      spin: (Math.random() - 0.5) * 900,
      round: i % 3 === 0,
    })),
  )
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          className={cn('absolute top-0', p.round ? 'rounded-full' : 'rounded-[2px]')}
          style={{ left: `${p.left}%`, width: p.size, height: p.size * (p.round ? 1 : 0.6), backgroundColor: p.color }}
          initial={{ y: '-10vh', x: 0, rotate: 0, opacity: 1 }}
          animate={{ y: '110vh', x: p.drift, rotate: p.spin, opacity: [1, 1, 0.8] }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'easeIn' }}
        />
      ))}
    </div>
  )
}

export function End({ state }: { state: RoomState }) {
  const { room, seats } = state
  const winners = (room.game.winners ?? []).map((id) => seats.find((s) => s.id === id)).filter((s) => !!s)
  const ranked = [...seats].sort((a, b) => b.score - a.score)
  const [pending, setPending] = useState(false)
  const showConfetti = !prefersReducedMotion()

  useEffect(() => {
    const id = setTimeout(() => audio.chime(4), 150)
    return () => { clearTimeout(id); audio.stopAll() }
  }, [])

  const shared = winners.length > 1
  const title = winners.length === 0 ? 'Game over' : shared ? (room.mode === 'free' ? 'Shared win' : 'Tied win') : `${winners[0].name} wins`

  const rematch = () => {
    setPending(true)
    api.rematch(room.id).catch((e: Error) => { toast.error(e.message); setPending(false) })
  }

  let rank = 0
  return (
    <>
      {showConfetti && <Confetti />}
      <Cardstock pattern padding="lg" className="flex flex-col items-center gap-4 text-center">
        <div className="flex -space-x-3">
          {winners.map((w) => <TeamToken key={w.id} color={w.color} name={w.name} size="xl" />)}
        </div>
        <GameHeading level={1} size="title" tone="card" className="text-balance">{title}</GameHeading>
        {shared && <p className="text-xl font-bold text-ink-soft">{winners.map((w) => w.name).join(', ')}</p>}
      </Cardstock>

      <Cardstock padding="md" aria-label="Final scores">
        <ol className="flex flex-col gap-3">
          {ranked.map((s, i) => {
            if (i === 0 || s.score !== ranked[i - 1].score) rank = i + 1
            const won = winners.some((w) => w.id === s.id)
            return (
              <li key={s.id} className={cn('flex items-center gap-3 rounded-full py-1 pr-5 pl-2', won && 'bg-plastic-yellow/50')}>
                <span className="w-7 text-center font-display text-2xl tabular-nums">{rank}</span>
                <TeamToken color={s.color} name={s.name} size="md" />
                <span className="min-w-0 flex-1 truncate text-xl font-extrabold">{s.name}</span>
                <span className="font-display text-3xl leading-none tabular-nums">{s.score}</span>
              </li>
            )
          })}
        </ol>
      </Cardstock>

      <Recap state={state} />

      {state.is_host ? (
        <PlasticButton data-testid="rematch" size="xl" block loading={pending} onClick={rematch}>Rematch</PlasticButton>
      ) : (
        <Cardstock role="status" padding="md" className="text-center">
          <GameHeading level={2} size="subheading" tone="card">Waiting for the host</GameHeading>
        </Cardstock>
      )}
    </>
  )
}
