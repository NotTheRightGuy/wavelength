import { useRef } from 'react'
import type { PointerEvent } from 'react'
import { audio } from '@/lib/audio'
import { pointToValue } from '@/lib/dial-geometry'
import { haptics } from '@/lib/haptics'
import { Needle } from './Needle'
import { Wedges } from './Wedges'

const CX = 200, CY = 210

export interface BoardProps {
  target?: number | null
  dial: number
  onDialChange?: (v: number) => void
  interactive?: boolean
  showTarget?: boolean
  glow?: boolean
  ghostDials?: { id: string; value: number; color: string }[]
}

export function Board({ target, dial, onDialChange, interactive, showTarget, glow, ghostDials = [] }: BoardProps) {
  const svg = useRef<SVGSVGElement>(null)
  const lastTick = useRef(Math.round(dial / 2))

  const emit = (v: number) => {
    const clamped = Math.min(100, Math.max(0, v))
    const tickIndex = Math.round(clamped / 2)
    if (tickIndex !== lastTick.current) {
      lastTick.current = tickIndex
      audio.tick(clamped / 100)
      haptics.tick()
    }
    onDialChange?.(clamped)
  }

  const fromEvent = (e: PointerEvent<SVGSVGElement>) => {
    const el = svg.current!
    const pt = el.createSVGPoint()
    pt.x = e.clientX; pt.y = e.clientY
    const p = pt.matrixTransform(el.getScreenCTM()!.inverse())
    emit(pointToValue(CX, CY, p.x, p.y))
  }

  return (
    <svg
      ref={svg}
      viewBox="0 0 400 230"
      className="w-full max-w-xl touch-none select-none"
      role="slider"
      aria-label="Dial"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(dial)}
      tabIndex={interactive ? 0 : -1}
      data-testid="board"
      onPointerDown={(e) => { if (!interactive) return; e.currentTarget.setPointerCapture(e.pointerId); fromEvent(e) }}
      onPointerMove={(e) => { if (interactive && e.currentTarget.hasPointerCapture(e.pointerId)) fromEvent(e) }}
      onKeyDown={(e) => {
        if (!interactive) return
        const step = e.shiftKey ? 5 : 1
        if (e.key === 'ArrowLeft') emit(dial - step)
        if (e.key === 'ArrowRight') emit(dial + step)
      }}
    >
      <defs>
        <radialGradient id="face" cx="50%" cy="100%" r="100%">
          <stop offset="0%" stopColor="#f7ecd0" />
          <stop offset="100%" stopColor="#e6d4a6" />
        </radialGradient>
      </defs>
      <path d={`M ${CX - 180} ${CY} A 180 180 0 0 1 ${CX + 180} ${CY} Z`} fill="url(#face)" stroke="#0d6a73" strokeWidth={10} />
      {showTarget && target != null && <Wedges target={target} cx={CX} cy={CY} />}
      {ghostDials.map((g) => <Needle key={g.id} value={g.value} cx={CX} cy={CY} r={150} color={g.color} />)}
      <Needle value={dial} cx={CX} cy={CY} r={165} glow={glow} />
    </svg>
  )
}
