import { beforeEach, describe, expect, it } from 'vitest'
import { createSettings } from './settings'

function memoryStorage() {
  const m = new Map<string, string>()
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }
}

describe('settings', () => {
  let storage: ReturnType<typeof memoryStorage>
  beforeEach(() => { storage = memoryStorage() })

  it('defaults to unmuted at 0.7 volume', () => {
    expect(createSettings(storage).get()).toEqual({ muted: false, volume: 0.7 })
  })
  it('persists changes', () => {
    createSettings(storage).set({ muted: true })
    expect(createSettings(storage).get().muted).toBe(true)
  })
  it('clamps volume to 0..1', () => {
    const s = createSettings(storage)
    s.set({ volume: 4 })
    expect(s.get().volume).toBe(1)
  })
  it('notifies subscribers', () => {
    const s = createSettings(storage)
    let calls = 0
    s.subscribe(() => calls++)
    s.set({ volume: 0.2 })
    expect(calls).toBe(1)
  })
  it('survives a storage that throws', () => {
    const bad = { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } }
    const s = createSettings(bad)
    expect(() => s.set({ muted: true })).not.toThrow()
    expect(s.get().muted).toBe(true)
  })
})
