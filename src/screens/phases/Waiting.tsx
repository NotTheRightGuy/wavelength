import type { ReactNode } from 'react'
import { Cardstock, GameHeading } from '@/components/game'

/** A friendly "someone else is on it" card, optionally with a board or other content beneath. */
export function Waiting({ text, sub, children }: { text: string; sub?: string; children?: ReactNode }) {
  return (
    <>
      {children}
      <Cardstock role="status" pattern padding="lg" className="flex flex-col items-center gap-2 text-center">
        <GameHeading level={2} size="subheading" tone="card">{text}</GameHeading>
        {sub && <p className="text-lg text-ink-soft">{sub}</p>}
      </Cardstock>
    </>
  )
}
