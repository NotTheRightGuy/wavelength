import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { inkOn, shade } from './tokens'

export type TeamTokenSize = 'sm' | 'md' | 'lg' | 'xl'

const DISC: Record<TeamTokenSize, string> = {
  sm: 'size-7 text-sm',
  md: 'size-11 text-lg',
  lg: 'size-14 text-2xl',
  xl: 'size-20 text-4xl',
}

export type TeamTokenProps = {
  /** Token colour (one of SEAT_COLORS, any hex works). */
  color: string
  /** Team or player name; its initial is printed on the disc unless `initial` or `children` is given. */
  name?: string
  /** Override the printed character(s). Pass '' for a blank disc. */
  initial?: string
  /** Show the name next to the disc. */
  showLabel?: boolean
  size?: TeamTokenSize
  /** Dashed empty seat instead of a coloured disc. */
  empty?: boolean
  /** Content printed on the disc instead of the initial (e.g. an icon). */
  children?: ReactNode
  className?: string
  labelClassName?: string
}

/** A plastic game token: a coloured disc with a rim highlight and a soft drop shadow. */
export function TeamToken({ color, name, initial, showLabel = false, size = 'md', empty = false, children, className, labelClassName }: TeamTokenProps) {
  const mark = children ?? (initial ?? (name ? Array.from(name.trim())[0]?.toUpperCase() : ''))
  const disc = empty ? (
    <span aria-hidden="true" className={cn('inline-block shrink-0 rounded-full border-[3px] border-dashed border-current opacity-60', DISC[size])} />
  ) : (
    <span
      aria-hidden="true"
      className={cn('relative inline-grid shrink-0 place-items-center rounded-full font-display leading-none', DISC[size])}
      style={{
        color: inkOn(color),
        backgroundColor: color,
        backgroundImage: `radial-gradient(circle at 35% 28%, rgb(255 255 255 / 0.55), transparent 42%), radial-gradient(circle at 50% 50%, transparent 58%, ${shade(color, 0.22)} 100%)`,
        boxShadow: `inset 0 0 0 2px rgb(255 255 255 / 0.35), inset 0 -3px 0 1px ${shade(color, 0.3)}, 0 0 0 2.5px var(--plastic-cream), 0 1px 2px 2.5px rgb(2 38 36 / 0.35), 0 6px 12px -2px rgb(2 38 36 / 0.45)`,
      }}
    >
      {mark}
    </span>
  )
  if (!showLabel || !name) return <span className={cn('inline-flex', className)}>{disc}</span>
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-3', className)}>
      {disc}
      <span className={cn('truncate font-extrabold', labelClassName)}>{name}</span>
    </span>
  )
}
