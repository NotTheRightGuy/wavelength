import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export type GameHeadingProps = HTMLAttributes<HTMLHeadingElement> & {
  level?: 1 | 2 | 3 | 4
  /** Visual size, independent of the level. */
  size?: 'display' | 'title' | 'heading' | 'subheading'
  /** The surface underneath: the teal table (cream ink) or cardstock (dark ink). */
  tone?: 'table' | 'card'
}

const SIZE = {
  display: 'text-display tracking-[-0.01em]',
  title: 'text-title',
  heading: 'text-heading',
  subheading: 'text-subheading',
}

/** Display-face heading in chunky rounded type, balanced across lines. */
export function GameHeading({ level = 2, size, tone = 'table', className, ...props }: GameHeadingProps) {
  const Tag = `h${level}` as const
  const s = size ?? (level === 1 ? 'title' : level === 2 ? 'heading' : 'subheading')
  return (
    <Tag
      className={cn(
        'font-display font-normal text-balance',
        SIZE[s],
        tone === 'table' ? 'text-on-table [text-shadow:0_2px_3px_rgb(2_38_36/0.45)]' : 'text-ink',
        className,
      )}
      {...props}
    />
  )
}
