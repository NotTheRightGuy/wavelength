import { useId, useRef } from 'react'
import type { PointerEvent } from 'react'
import { audio } from '@/lib/audio'
import { pointToValue } from '@/lib/dial-geometry'
import { haptics } from '@/lib/haptics'
import { cn } from '@/lib/utils'
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
  needleColor?: string
  className?: string
}

export function Board({ target, dial, onDialChange, interactive, showTarget, glow, ghostDials = [], needleColor, className }: BoardProps) {
  const faceId = `face-${useId().replace(/:/g, '')}`
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
      className={cn('w-full max-w-xl touch-none overflow-visible select-none', className)}
      role="slider"
      aria-label={interactive ? 'Guess dial' : 'Dial position'}
      aria-readonly={interactive ? undefined : true}
      aria-valuetext={`Dial at ${Math.round(dial)} of 100`}
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
        let next: number | null = null
        if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = dial - step
        else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = dial + step
        else if (e.key === 'Home') next = 0
        else if (e.key === 'End') next = 100
        if (next === null) return
        e.preventDefault()
        emit(next)
      }}
    >
      <defs>
        <radialGradient id={faceId} cx="50%" cy="100%" r="100%">
          <stop offset="0%" stopColor="#fffaf0" />
          <stop offset="70%" stopColor="#fcf2d8" />
          <stop offset="100%" stopColor="#efdcab" />
        </radialGradient>
        <linearGradient id={`${faceId}-rim`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#14938c" />
          <stop offset="55%" stopColor="#0a6f6b" />
          <stop offset="100%" stopColor="#054240" />
        </linearGradient>
        <filter id={`${faceId}-lift`} x="-10%" y="-10%" width="120%" height="130%">
          <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#02302e" floodOpacity="0.45" />
        </filter>
      </defs>
      {/* lacquered teal frame and base */}
      <g filter={`url(#${faceId}-lift)`}>
        <path d={`M ${CX - 192} ${CY + 2} A 192 192 0 0 1 ${CX + 192} ${CY + 2} L ${CX + 192} ${CY + 12} Q ${CX + 192} ${CY + 18} ${CX + 186} ${CY + 18} L ${CX - 186} ${CY + 18} Q ${CX - 192} ${CY + 18} ${CX - 192} ${CY + 12} Z`} fill={`url(#${faceId}-rim)`} />
      </g>
      <path d={`M ${CX - 186} ${CY + 1} A 186 186 0 0 1 ${CX + 186} ${CY + 1}`} fill="none" stroke="#ffffff" strokeOpacity={0.18} strokeWidth={2} />
      {/* cream cardstock face with printed ticks */}
      <path d={`M ${CX - 178} ${CY} A 178 178 0 0 1 ${CX + 178} ${CY} Z`} fill={`url(#${faceId})`} />
      {Array.from({ length: 21 }, (_, i) => (
        <line key={i} x1={CX} y1={CY - 176} x2={CX} y2={CY - (i % 5 === 0 ? 160 : 166)} stroke="#10302d" strokeOpacity={i % 5 === 0 ? 0.5 : 0.28} strokeWidth={i % 5 === 0 ? 3 : 2} strokeLinecap="round" transform={`rotate(${-90 + i * 9} ${CX} ${CY})`} />
      ))}
      {showTarget && target != null && <Wedges target={target} cx={CX} cy={CY} />}
      {ghostDials.map((g) => <Needle key={g.id} value={g.value} cx={CX} cy={CY} r={150} color={g.color} />)}
      <Needle value={dial} cx={CX} cy={CY} r={165} glow={glow} color={needleColor} smooth={!interactive} />
    </svg>
  )
}
