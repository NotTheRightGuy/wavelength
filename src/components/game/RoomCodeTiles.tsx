import { motion } from 'motion/react'
import { useEffect, type HTMLAttributes } from 'react'
import { audio } from '@/lib/audio'
import { prefersReducedMotion } from '@/lib/haptics'
import { cn } from '@/lib/utils'

export type RoomCodeTilesProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
  /** The room code; shorter codes leave blank tiles. */
  code: string
  /** Number of tiles (default 4). */
  length?: number
  size?: 'md' | 'lg' | 'xl'
  /** Flip the tiles in one by one on mount (the room-entered moment). */
  flipIn?: boolean
  /** Tile index that shows an input caret (code entry); undefined for none. */
  caret?: number
}

const TILE = {
  md: 'h-16 w-14 text-4xl rounded-tile',
  lg: 'h-20 w-16 text-5xl rounded-piece',
  xl: 'h-24 w-[4.75rem] text-6xl rounded-piece max-[380px]:h-20 max-[380px]:w-16 max-[380px]:text-5xl',
}

const STAGGER = 0.11

/** The room code as four chunky cream tiles. */
export function RoomCodeTiles({ code, length = 4, size = 'lg', flipIn = false, caret, className, ...props }: RoomCodeTilesProps) {
  const reduced = prefersReducedMotion()
  const animateIn = flipIn && !reduced
  const letters = Array.from({ length }, (_, i) => code[i] ?? '')

  // Each tile clacks onto the table as it lands.
  useEffect(() => {
    if (!animateIn) return
    const ids = letters.map((_, i) => setTimeout(() => audio.tick(0.3 + i * 0.12), (i * STAGGER + 0.22) * 1000))
    return () => ids.forEach(clearTimeout)
    // only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={cn('flex justify-center gap-2.5 [perspective:600px]', className)} {...props}>
      {letters.map((ch, i) => (
        <motion.span
          key={i}
          className={cn(
            'cardstock relative grid place-items-center font-display leading-none text-ink tabular-nums',
            TILE[size],
          )}
          style={{ transformOrigin: '50% 0%' }}
          initial={animateIn ? { rotateX: -82, y: -10 } : false}
          animate={{ rotateX: 0, y: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 15, mass: 0.8, delay: i * STAGGER }}
        >
          {ch}
          {caret === i && (
            <span aria-hidden="true" className="absolute bottom-3 left-1/2 h-1.5 w-7 -translate-x-1/2 animate-pulse rounded-full bg-plastic-orange motion-reduce:animate-none" />
          )}
        </motion.span>
      ))}
    </div>
  )
}
