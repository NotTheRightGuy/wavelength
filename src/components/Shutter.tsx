import { motion } from 'motion/react'
import { useEffect, useRef } from 'react'
import { audio } from '@/lib/audio'
import { prefersReducedMotion } from '@/lib/haptics'

const CLOSE_DURATION = 0.25

export function Shutter({ closed, children }: { closed: boolean; children: React.ReactNode }) {
  const prev = useRef<boolean | undefined>(undefined)
  // a (StrictMode) remount must behave like a first mount
  useEffect(() => () => { prev.current = undefined }, [])
  useEffect(() => {
    if (prev.current === undefined) { prev.current = closed; return }
    if (prev.current === closed) return
    prev.current = closed
    if (!closed) { audio.swoosh(); return }
    // clunk when the plates meet
    const id = setTimeout(() => audio.clunk(), prefersReducedMotion() ? 150 : CLOSE_DURATION * 1000)
    return () => clearTimeout(id)
  }, [closed])

  const reduced = prefersReducedMotion()
  const transition = reduced
    ? { duration: 0.15 }
    : closed
      ? { type: 'tween' as const, duration: CLOSE_DURATION, ease: 'easeIn' as const }
      : { type: 'spring' as const, stiffness: 180, damping: 11 }
  const pe = closed ? '' : 'pointer-events-none'

  return (
    <div className="relative overflow-hidden rounded-xl">
      {children}
      <motion.div aria-hidden="true" className={`absolute inset-y-0 left-0 w-1/2 bg-teal-800 border-r-4 border-teal-950 ${pe}`}
        initial={false} animate={reduced ? { opacity: closed ? 1 : 0, x: '0%' } : { opacity: 1, x: closed ? '0%' : '-105%' }} transition={transition} />
      <motion.div aria-hidden="true" className={`absolute inset-y-0 right-0 w-1/2 bg-teal-800 border-l-4 border-teal-950 ${pe}`}
        initial={false} animate={reduced ? { opacity: closed ? 1 : 0, x: '0%' } : { opacity: 1, x: closed ? '0%' : '105%' }} transition={transition} />
    </div>
  )
}
