import { motion, useSpring, useTransform } from 'motion/react'
import { useEffect } from 'react'
import { valueToPoint } from '@/lib/dial-geometry'
import { prefersReducedMotion } from '@/lib/haptics'

export function Needle({ value, cx, cy, r, color = '#d6262b', glow }: { value: number; cx: number; cy: number; r: number; color?: string; glow?: boolean }) {
  const spring = useSpring(value, prefersReducedMotion() ? { duration: 0 } : { stiffness: 260, damping: 26, mass: 0.6 })
  useEffect(() => { spring.set(value) }, [value, spring])
  const x2 = useTransform(spring, (v) => valueToPoint(cx, cy, r, v).x)
  const y2 = useTransform(spring, (v) => valueToPoint(cx, cy, r, v).y)
  return (
    <g style={glow ? { filter: `drop-shadow(0 0 8px ${color})` } : undefined}>
      <motion.line x1={cx} y1={cy} x2={x2} y2={y2} stroke={color} strokeWidth={7} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={16} fill="#2a2a2a" stroke="#555" strokeWidth={3} />
    </g>
  )
}
