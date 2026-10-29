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
    <div className="relative overflow-hidden rounded-card">
      {children}
      <motion.div aria-hidden="true" className={`absolute inset-y-0 left-0 w-1/2 ${PLATE} rounded-r-sm shadow-[inset_-3px_0_4px_rgb(2_38_36/0.5)] ${pe}`}
        initial={false} animate={reduced ? { opacity: closed ? 1 : 0, x: '0%' } : { opacity: 1, x: closed ? '0%' : '-105%' }} transition={transition}>
        <Rivets side="left" />
      </motion.div>
      <motion.div aria-hidden="true" className={`absolute inset-y-0 right-0 w-1/2 ${PLATE} rounded-l-sm shadow-[inset_3px_0_4px_rgb(2_38_36/0.5)] ${pe}`}
        initial={false} animate={reduced ? { opacity: closed ? 1 : 0, x: '0%' } : { opacity: 1, x: closed ? '0%' : '105%' }} transition={transition}>
        <Rivets side="right" />
      </motion.div>
    </div>
  )
}

// Teal lacquer plate with fine horizontal grooves and a lamp sheen.
const PLATE =
  'bg-table [background-image:linear-gradient(to_bottom,rgb(255_255_255/0.14),transparent_40%,rgb(2_38_36/0.25)),repeating-linear-gradient(to_bottom,transparent_0_14px,rgb(2_38_36/0.18)_14px_16px,rgb(255_255_255/0.06)_16px_17px)]'

function Rivets({ side }: { side: 'left' | 'right' }) {
  const x = side === 'left' ? 'left-3' : 'right-3'
  const seam = side === 'left' ? 'right-0 border-r-2' : 'left-0 border-l-2'
  return (
    <>
      <span className={`absolute inset-y-0 ${seam} border-table-shade/60`} />
      {['top-3', 'bottom-3'].map((y) => (
        <span key={y} className={`absolute ${x} ${y} size-3 rounded-full bg-[radial-gradient(circle_at_35%_30%,#d4f0ea,#7fb5ad_55%,#054240)] shadow-[0_1px_2px_rgb(2_38_36/0.6)]`} />
      ))}
    </>
  )
}
