import { useSyncExternalStore } from 'react'

export interface Settings { muted: boolean; volume: number }
interface Store { getItem(k: string): string | null; setItem(k: string, v: string): void }
const KEY = 'dialed.settings'
const DEFAULTS: Settings = { muted: false, volume: 0.7 }

export function createSettings(storage: Store) {
  let current: Settings = { ...DEFAULTS }
  try {
    const raw = storage.getItem(KEY)
    if (raw) current = { ...DEFAULTS, ...JSON.parse(raw) }
  } catch { /* storage unavailable: keep defaults */ }
  const listeners = new Set<() => void>()
  return {
    get: () => current,
    set(patch: Partial<Settings>) {
      current = { ...current, ...patch, volume: Math.min(1, Math.max(0, patch.volume ?? current.volume)) }
      try { storage.setItem(KEY, JSON.stringify(current)) } catch { /* ignore */ }
      listeners.forEach((l) => l())
    },
    subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn) } },
  }
}

const safeStorage: Store = {
  getItem: (k) => { try { return localStorage.getItem(k) } catch { return null } },
  setItem: (k, v) => { try { localStorage.setItem(k, v) } catch { /* ignore */ } },
}
export const settings = createSettings(safeStorage)
export const useSettings = () => useSyncExternalStore(settings.subscribe, settings.get)
