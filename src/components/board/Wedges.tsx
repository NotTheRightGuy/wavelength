import { wedgePath } from '@/lib/dial-geometry'

const BANDS = [
  { from: -10, to: -6, fill: '#3b82c4' },
  { from: -6, to: -2, fill: '#f4c542' },
  { from: -2, to: 2, fill: '#f2682a' },
  { from: 2, to: 6, fill: '#f4c542' },
  { from: 6, to: 10, fill: '#3b82c4' },
]

export function Wedges({ target, cx, cy }: { target: number; cx: number; cy: number }) {
  return (
    <g>
      {BANDS.map((b) => (
        <path key={b.from} d={wedgePath(cx, cy, 96, 168, target + b.from, target + b.to)} fill={b.fill} stroke="#00000033" strokeWidth={1} />
      ))}
    </g>
  )
}
