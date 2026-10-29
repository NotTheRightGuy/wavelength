import { motion, type MotionValue } from 'motion/react'

export function SpinWheel({ angle }: { angle: MotionValue<number> }) {
  return (
    <motion.svg viewBox="0 0 200 200" className="w-48 h-48" style={{ rotate: angle }} data-testid="spin-wheel" aria-hidden="true">
      <circle cx="100" cy="100" r="95" fill="#f7ecd0" stroke="#0d6a73" strokeWidth="8" />
      {Array.from({ length: 24 }, (_, i) => (
        <line key={i} x1="100" y1="12" x2="100" y2="26" stroke="#0d6a73" strokeWidth="3" transform={`rotate(${i * 15} 100 100)`} />
      ))}
      <path d="M100 100 L100 20 A80 80 0 0 1 140 31 Z" fill="#f2682a" />
      <circle cx="100" cy="100" r="14" fill="#2a2a2a" />
    </motion.svg>
  )
}
