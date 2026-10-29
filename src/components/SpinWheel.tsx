import { motion, type MotionValue } from 'motion/react'

// Cream cardstock target wheel in a teal lacquer rim, with the scoring wedge printed on it.
export function SpinWheel({ angle }: { angle: MotionValue<number> }) {
  const arc = (a: number, b: number, fill: string) => {
    const p = (deg: number, r: number) => {
      const t = ((deg - 90) * Math.PI) / 180
      return `${100 + Math.cos(t) * r} ${100 + Math.sin(t) * r}`
    }
    return <path d={`M 100 100 L ${p(a, 80)} A 80 80 0 0 1 ${p(b, 80)} Z`} fill={fill} />
  }
  return (
    <motion.svg viewBox="0 0 200 200" className="h-48 w-48 overflow-visible drop-shadow-[0_6px_8px_rgb(2_38_36/0.45)]" style={{ rotate: angle }} data-testid="spin-wheel" aria-hidden="true">
      <circle cx="100" cy="100" r="96" fill="#0a6f6b" />
      <circle cx="100" cy="100" r="96" fill="none" stroke="#14938c" strokeWidth="3" />
      <circle cx="100" cy="100" r="86" fill="#fcf2d8" />
      {Array.from({ length: 24 }, (_, i) => (
        <line key={i} x1="100" y1="16" x2="100" y2={i % 6 === 0 ? 30 : 25} stroke="#10302d" strokeOpacity="0.4" strokeWidth={i % 6 === 0 ? 3.5 : 2.5} strokeLinecap="round" transform={`rotate(${i * 15} 100 100)`} />
      ))}
      {arc(-30, -18, '#2f63e0')}
      {arc(-18, -6, '#ffc426')}
      {arc(-6, 6, '#e8590f')}
      {arc(6, 18, '#ffc426')}
      {arc(18, 30, '#2f63e0')}
      <circle cx="100" cy="100" r="17" fill="#1d2a29" />
      <circle cx="100" cy="100" r="12" fill="#dc2329" />
      <ellipse cx="96" cy="95" rx="5" ry="3" fill="#ffffff" opacity="0.55" />
    </motion.svg>
  )
}
