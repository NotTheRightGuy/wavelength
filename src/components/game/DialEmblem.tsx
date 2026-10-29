import { animate, motion, useMotionValue } from 'motion/react'
import { useEffect, useId } from 'react'
import { prefersReducedMotion } from '@/lib/haptics'
import { cn } from '@/lib/utils'

const REST = 14 // degrees right of upright

/** The Dialed mark: a half-dial with scoring wedges and a red needle that swings on a spring. Tap or hover to wobble it. */
export function DialEmblem({ className, title = 'Dialed', swing = true }: { className?: string; title?: string; swing?: boolean }) {
  const id = useId().replace(/:/g, '')
  const rot = useMotionValue(swing && !prefersReducedMotion() ? -62 : REST)

  const wobble = (from?: number) => {
    if (prefersReducedMotion()) return
    if (from !== undefined) rot.set(from)
    animate(rot, REST, { type: 'spring', stiffness: 90, damping: 5.5, mass: 0.9, velocity: from === undefined ? 260 : 0 })
  }

  useEffect(() => {
    if (swing) wobble(-62)
    // mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <svg
      viewBox="0 0 240 140"
      role="img"
      aria-label={title}
      className={cn('overflow-visible', className)}
      onPointerEnter={(e) => { if (e.pointerType === 'mouse') wobble() }}
      onPointerDown={() => wobble()}
    >
      <defs>
        <radialGradient id={`f${id}`} cx="50%" cy="100%" r="100%">
          <stop offset="0%" stopColor="#fffaf0" />
          <stop offset="100%" stopColor="#f1dfb1" />
        </radialGradient>
        <linearGradient id={`r${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#14938c" />
          <stop offset="100%" stopColor="#054240" />
        </linearGradient>
        <filter id={`s${id}`} x="-20%" y="-20%" width="140%" height="160%">
          <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#02302e" floodOpacity="0.45" />
        </filter>
        <clipPath id={`c${id}`}>
          <path d="M 28 120 A 92 92 0 0 1 212 120 Z" />
        </clipPath>
      </defs>
      <g filter={`url(#s${id})`}>
        <path d="M 14 124 A 106 106 0 0 1 226 124 L 226 132 Q 226 136 222 136 L 18 136 Q 14 136 14 132 Z" fill={`url(#r${id})`} />
        <path d="M 28 120 A 92 92 0 0 1 212 120 Z" fill={`url(#f${id})`} />
        <g clipPath={`url(#c${id})`} transform="rotate(14 120 120)">
          {[
            { a: -26, b: -17, fill: '#2f63e0' },
            { a: -17, b: -8, fill: '#ffc426' },
            { a: -8, b: 8, fill: '#e8590f' },
            { a: 8, b: 17, fill: '#ffc426' },
            { a: 17, b: 26, fill: '#2f63e0' },
          ].map((w) => {
            const p = (deg: number, r: number) => {
              const t = ((deg - 90) * Math.PI) / 180
              return `${120 + Math.cos(t) * r} ${120 + Math.sin(t) * r}`
            }
            return <path key={w.a} d={`M ${p(w.a, 30)} L ${p(w.a, 92)} A 92 92 0 0 1 ${p(w.b, 92)} L ${p(w.b, 30)} A 30 30 0 0 0 ${p(w.a, 30)} Z`} fill={w.fill} />
          })}
        </g>
        {Array.from({ length: 11 }, (_, i) => (
          <line key={i} x1="120" y1="34" x2="120" y2={i % 5 === 0 ? 44 : 40} stroke="#10302d" strokeOpacity="0.45" strokeWidth="2.5" strokeLinecap="round" transform={`rotate(${-75 + i * 15} 120 120)`} />
        ))}
      </g>
      <motion.g style={{ rotate: rot, originX: 0.5, originY: 1 }}>
        <path d="M 120 120 L 116 116 L 120 40 L 124 116 Z" fill="#dc2329" stroke="#8f1217" strokeWidth="1.5" strokeLinejoin="round" />
      </motion.g>
      <circle cx="120" cy="120" r="15" fill="#1d2a29" />
      <circle cx="120" cy="120" r="11" fill="#dc2329" />
      <ellipse cx="116" cy="115" rx="5" ry="3" fill="#ffffff" opacity="0.55" />
    </svg>
  )
}
