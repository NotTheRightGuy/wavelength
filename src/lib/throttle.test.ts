import { describe, expect, it, vi } from 'vitest'
import { throttle } from './throttle'

describe('throttle', () => {
  it('fires immediately then at most once per interval, keeping the latest args', () => {
    vi.useFakeTimers()
    const fn = vi.fn()
    const t = throttle(fn, 50)
    t(1); t(2); t(3)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenLastCalledWith(1)
    vi.advanceTimersByTime(50)
    expect(fn).toHaveBeenCalledTimes(2)
    expect(fn).toHaveBeenLastCalledWith(3)
    vi.useRealTimers()
  })
})
