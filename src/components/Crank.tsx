import { animate, useMotionValue } from 'motion/react'
import type { AnimationPlaybackControls } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { audio } from '@/lib/audio'
import { CLICK_STEP, GEAR_RATIO, clicksCrossed, unwrapDelta } from '@/lib/crank'
import { haptics, prefersReducedMotion } from '@/lib/haptics'
import { PlasticButton } from './game'
import { SpinWheel } from './SpinWheel'

const DEG = 180 / Math.PI
const MAX_WHEEL_VELOCITY = 4000 // deg/s
const SAMPLE_WINDOW_MS = 100

export function Crank({ onDone, onProgress, minTurns = 2 }: {
  onDone: () => void
  onProgress?: (turns: number) => void
  minTurns?: number
}) {
  const wheel = useMotionValue(0)
  const [knob, setKnob] = useState(0) // radians, for the knob position
  const track = useRef<HTMLDivElement>(null)
  const last = useRef<{ a: number; t: number } | null>(null)
  const samples = useRef<{ d: number; t: number }[]>([])
  const travelled = useRef(0) // total wheel degrees, absolute
  const crankTotal = useRef(0)
  const lastWheel = useRef(0)
  const finished = useRef(false)
  const unmounted = useRef(false)
  const autoRunning = useRef(false)
  const anim = useRef<AnimationPlaybackControls | null>(null)
  const onDoneRef = useRef(onDone)
  const onProgressRef = useRef(onProgress)
  useEffect(() => { onDoneRef.current = onDone; onProgressRef.current = onProgress })
  // stop animations on unmount; re-arm on (StrictMode) remount
  useEffect(() => {
    unmounted.current = false
    return () => { unmounted.current = true; anim.current?.stop(); anim.current = null }
  }, [])

  const finish = () => {
    if (finished.current || unmounted.current) return
    finished.current = true
    anim.current = null
    haptics.thud()
    audio.clunk()
    onDoneRef.current()
  }
  const enough = () => travelled.current >= minTurns * 360
  const addTravel = (deg: number) => {
    travelled.current += deg
    onProgressRef.current?.(travelled.current / 360)
  }
  const stopAnim = () => { anim.current?.stop(); anim.current = null }

  const wheelTick = (w: number, speedScale: number) => {
    const dW = Math.abs(w - lastWheel.current)
    const prev = lastWheel.current
    lastWheel.current = w
    addTravel(dW)
    if (clicksCrossed(prev / DEG, w / DEG, CLICK_STEP * GEAR_RATIO) > 0) audio.ratchet(Math.min(1, dW / speedScale))
  }

  const turn = (deltaRad: number, dt: number) => {
    const prevTotal = crankTotal.current
    crankTotal.current += deltaRad
    const wheelDeg = deltaRad * GEAR_RATIO * DEG
    wheel.set(wheel.get() + wheelDeg)
    lastWheel.current = wheel.get()
    addTravel(Math.abs(wheelDeg))
    const speed = Math.min(1, Math.abs(deltaRad / Math.max(dt, 0.001)) / 12)
    const n = clicksCrossed(prevTotal, crankTotal.current, CLICK_STEP)
    for (let i = 0; i < Math.min(n, 3); i++) { audio.ratchet(speed); if (i === 0) haptics.tick() }
  }

  const angleOf = (e: React.PointerEvent) => {
    const r = track.current!.getBoundingClientRect()
    return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2))
  }

  const onDown = (e: React.PointerEvent) => {
    if (finished.current || autoRunning.current) return
    audio.unlock()
    e.currentTarget.setPointerCapture(e.pointerId)
    stopAnim() // grab the coasting wheel
    samples.current = []
    last.current = { a: angleOf(e), t: performance.now() }
    setKnob(last.current.a)
  }
  const onMove = (e: React.PointerEvent) => {
    if (!last.current || finished.current || autoRunning.current) return
    const a = angleOf(e)
    const t = performance.now()
    const dt = (t - last.current.t) / 1000
    const d = unwrapDelta(last.current.a, a)
    last.current = { a, t }
    samples.current.push({ d, t })
    samples.current = samples.current.filter((s) => t - s.t <= SAMPLE_WINDOW_MS)
    setKnob(a)
    turn(d, dt)
  }
  const onUp = () => {
    if (!last.current) return
    last.current = null
    if (finished.current || autoRunning.current) return
    const now = performance.now()
    const recent = samples.current.filter((s) => now - s.t <= SAMPLE_WINDOW_MS)
    samples.current = []
    // angular velocity (rad/s) over the recent window; zero if the pointer paused before release
    const span = recent.length ? Math.max(now - recent[0].t, 16) : 0
    const rad = recent.reduce((s, x) => s + x.d, 0)
    let v = span ? (rad / (span / 1000)) * GEAR_RATIO * DEG : 0
    v = Math.max(-MAX_WHEEL_VELOCITY, Math.min(MAX_WHEEL_VELOCITY, v))
    if (prefersReducedMotion() || Math.abs(v) < 5) { if (enough()) finish(); return }
    lastWheel.current = wheel.get()
    const ctl = animate(wheel, wheel.get() + v * 0.6, {
      type: 'inertia', velocity: v, power: 0.6, timeConstant: 400, restDelta: 1,
      onUpdate: (w: number) => wheelTick(w, 20),
      onComplete: () => { if (anim.current === ctl && enough()) finish() },
    })
    anim.current = ctl
  }

  const autoSpin = () => {
    if (finished.current || autoRunning.current) return
    audio.unlock()
    if (prefersReducedMotion()) { travelled.current = Math.max(travelled.current, minTurns * 360); finish(); return }
    autoRunning.current = true
    stopAnim()
    last.current = null
    lastWheel.current = wheel.get()
    const to = wheel.get() + 360 * (minTurns + 1.3)
    const ctl = animate(wheel, to, {
      duration: 2.6, ease: [0.1, 0.7, 0.2, 1],
      onUpdate: (w: number) => wheelTick(w, 12),
      onComplete: () => { travelled.current = Math.max(travelled.current, minTurns * 360); finish() },
    })
    anim.current = ctl
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <SpinWheel angle={wheel} />
      <div ref={track} className="relative size-40 touch-none rounded-full bg-table-deep shadow-[inset_0_4px_8px_rgb(2_38_36/0.6),inset_0_-2px_2px_rgb(255_255_255/0.12),0_1px_0_rgb(255_255_255/0.15)]"
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} data-testid="crank-track">
        {/* groove the handle runs in */}
        <div className="pointer-events-none absolute inset-[22px] rounded-full border-[3px] border-dashed border-table-hi/50" />
        {/* crank arm from the hub to the handle */}
        <div className="pointer-events-none absolute top-1/2 left-1/2 h-4 w-[60px] origin-left -translate-y-1/2 rounded-full bg-plastic-orange-lip shadow-[0_2px_3px_rgb(2_38_36/0.5)]"
          style={{ transform: `translateY(-50%) rotate(${knob}rad)` }} />
        <div className="pointer-events-none absolute top-1/2 left-1/2 size-9 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_38%_30%,#ffd9bd,var(--plastic-orange)_50%,var(--plastic-orange-lip))] shadow-lift-1" />
        <div className="pointer-events-none absolute size-12 rounded-full bg-[radial-gradient(circle_at_36%_28%,#ffd2b0,var(--plastic-orange)_45%,var(--plastic-orange-lip))] shadow-[inset_0_-3px_0_rgb(110_34_0/0.35),0_3px_4px_rgb(2_38_36/0.45),0_10px_16px_-4px_rgb(2_38_36/0.5)]"
          style={{ left: `calc(50% + ${Math.cos(knob) * 56}px - 24px)`, top: `calc(50% + ${Math.sin(knob) * 56}px - 24px)` }} />
      </div>
      <p className="font-display text-subheading text-on-table">Crank me</p>
      <PlasticButton type="button" variant="quiet" size="sm" onClick={autoSpin} data-testid="spin-for-me">Spin for me</PlasticButton>
    </div>
  )
}
