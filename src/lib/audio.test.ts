import { describe, expect, it } from 'vitest'
import { audio } from './audio'
import { haptics, prefersReducedMotion } from './haptics'

describe('audio without AudioContext', () => {
  it('every function is a safe no-op', () => {
    expect(() => {
      audio.unlock(); audio.tick(); audio.tick(0.3); audio.ratchet(0.5); audio.clunk()
      audio.swoosh(); audio.drumroll(1000); audio.chime(3); audio.chime(0); audio.timerTick(); audio.stopAll()
    }).not.toThrow()
  })
  it('haptics and reduced-motion tolerate missing browser APIs', () => {
    expect(() => { haptics.tick(); haptics.thud() }).not.toThrow()
    expect(prefersReducedMotion()).toBe(false)
  })
})
