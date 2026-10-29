import type { ElementType, HTMLAttributes, Ref } from 'react'
import { cn } from '@/lib/utils'

export type CardstockProps = HTMLAttributes<HTMLElement> & {
  /** Element to render (section by default). */
  as?: ElementType
  /** Show the printed card-back pattern (a tiny repeated dial motif). */
  pattern?: boolean
  /** Inner padding. */
  padding?: 'none' | 'sm' | 'md' | 'lg'
  ref?: Ref<HTMLElement>
}

const PAD = { none: '', sm: 'p-4', md: 'p-5', lg: 'p-6 sm:p-8' }

/** A cream cardstock panel lying on the table. Never nest one inside another. */
export function Cardstock({ as: Tag = 'section', pattern = false, padding = 'md', className, ...props }: CardstockProps) {
  return <Tag className={cn('cardstock', pattern && 'card-back', PAD[padding], className)} {...props} />
}
