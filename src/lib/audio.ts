import { settings } from './settings'

let ctx: AudioContext | undefined
let master: GainNode | undefined
const live = new Set<AudioScheduledSourceNode>()

/** Returns the shared context, or undefined where Web Audio is unavailable. */
function ac(): AudioContext | undefined {
  if (typeof AudioContext === 'undefined') return undefined
  if (!ctx) {
    ctx = new AudioContext()
    master = ctx.createGain()
    master.connect(ctx.destination)
  }
  if (master) master.gain.value = settings.get().muted ? 0 : settings.get().volume
  return ctx
}

function blip(freq: number, dur: number, type: OscillatorType = 'square', gain = 0.2, when = 0, slideTo?: number) {
  const c = ac()
  if (!c || !master) return
  const t = c.currentTime + when
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, t)
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur)
  g.gain.setValueAtTime(gain, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(master)
  o.start(t)
  o.stop(t + dur + 0.02)
  live.add(o)
  o.onended = () => live.delete(o)
}

function noise(dur: number, from: number, to: number, gain = 0.25) {
  const c = ac()
  if (!c || !master) return
  const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  const src = c.createBufferSource()
  src.buffer = buf
  const f = c.createBiquadFilter()
  f.type = 'bandpass'
  f.frequency.setValueAtTime(from, c.currentTime)
  f.frequency.exponentialRampToValueAtTime(to, c.currentTime + dur)
  const g = c.createGain()
  g.gain.setValueAtTime(gain, c.currentTime)
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur)
  src.connect(f).connect(g).connect(master)
  src.start()
  live.add(src)
  src.onended = () => live.delete(src)
}

export const audio = {
  /** Call inside a user gesture (click/touch) so iOS allows playback. */
  unlock() { void ac()?.resume() },
  /** Dial tick; `pitch` 0..1 shifts the note with needle position. */
  tick(pitch = 0.5) { blip(500 + pitch * 500, 0.04, 'square', 0.12) },
  /** Crank ratchet click; faster cranking -> higher and shorter. */
  ratchet(speed: number) {
    const s = Math.min(1, Math.max(0, speed))
    blip(700 + s * 900, 0.03 - s * 0.01, 'square', 0.14)
  },
  clunk() { blip(140, 0.18, 'triangle', 0.5, 0, 60); noise(0.08, 400, 200, 0.2) },
  swoosh() { noise(0.45, 300, 3200, 0.22) },
  drumroll(ms: number) {
    const hits = Math.max(4, Math.floor(ms / 45))
    for (let i = 0; i < hits; i++) blip(120 + i * 4, 0.05, 'triangle', 0.08 + (i / hits) * 0.18, (i * ms) / hits / 1000)
  },
  chime(points: number) {
    const notes = [523.25, 659.25, 783.99, 1046.5]
    const n = Math.max(0, Math.min(4, points))
    for (let i = 0; i < n; i++) blip(notes[i], 0.35, 'sine', 0.22, i * 0.09)
    if (n === 0) blip(200, 0.4, 'sawtooth', 0.12, 0, 90)
  },
  timerTick() { blip(900, 0.05, 'square', 0.1) },
  stopAll() { live.forEach((n) => { try { n.stop() } catch { /* already stopped */ } }); live.clear() },
}
