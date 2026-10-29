import { wedgePath } from '@/lib/dial-geometry'

const BANDS = [
  { from: -10, to: -6, fill: '#2f63e0' },
  { from: -6, to: -2, fill: '#ffc426' },
  { from: -2, to: 2, fill: '#e8590f' },
  { from: 2, to: 6, fill: '#ffc426' },
  { from: 6, to: 10, fill: '#2f63e0' },
]

export function Wedges({ target, cx, cy }: { target: number; cx: number; cy: number }) {
  return (
    <g>
      {BANDS.map((b) => (
        <path key={b.from} d={wedgePath(cx, cy, 96, 168, target + b.from, target + b.to)} fill={b.fill} stroke="#fffaf0" strokeOpacity={0.7} strokeWidth={1.5} />
      ))}
    </g>
  )
}
