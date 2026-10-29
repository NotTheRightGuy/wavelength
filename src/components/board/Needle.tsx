import { motion, useSpring, useTransform } from 'motion/react'
import { useEffect } from 'react'
import { valueToPoint } from '@/lib/dial-geometry'
import { prefersReducedMotion } from '@/lib/haptics'

export function Needle({ value, cx, cy, r, color = '#d6262b', glow, smooth = true }: { value: number; cx: number; cy: number; r: number; color?: string; glow?: boolean; smooth?: boolean }) {
  const spring = useSpring(value, prefersReducedMotion() ? { duration: 0 } : { stiffness: 260, damping: 26, mass: 0.6 })
  useEffect(() => { if (smooth) spring.set(value); else spring.jump(value) }, [value, spring, smooth])
  const x2 = useTransform(spring, (v) => valueToPoint(cx, cy, r, v).x)
  const y2 = useTransform(spring, (v) => valueToPoint(cx, cy, r, v).y)
  return (
    <g style={{ filter: glow ? 'drop-shadow(0 3px 3px rgb(2 38 36 / 0.45)) drop-shadow(0 8px 10px rgb(2 38 36 / 0.35))' : 'drop-shadow(0 2px 2px rgb(2 38 36 / 0.4))' }}>
      {glow && <motion.line x1={cx} y1={cy} x2={x2} y2={y2} stroke="#fff7e6" strokeWidth={13} strokeLinecap="round" />}
      <motion.line x1={cx} y1={cy} x2={x2} y2={y2} stroke={color} strokeWidth={7} strokeLinecap="round" />
      {/* chunky plastic hub cap */}
      <circle cx={cx} cy={cy} r={18} fill="#1d2a29" />
      <circle cx={cx} cy={cy} r={13} fill={color} />
      <ellipse cx={cx - 4} cy={cy - 5} rx={5.5} ry={3.2} fill="#ffffff" opacity={0.55} />
    </g>
  )
}
