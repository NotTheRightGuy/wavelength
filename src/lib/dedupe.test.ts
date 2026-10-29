import { describe, expect, it, vi } from 'vitest'
import { dedupe } from './dedupe'

describe('dedupe', () => {
  it('shares one in-flight call between concurrent callers', async () => {
    const fn = vi.fn(async () => 'id')
    const d = dedupe(fn)
    const [a, b] = await Promise.all([d(), d()])
    expect(a).toBe('id')
    expect(b).toBe('id')
    expect(fn).toHaveBeenCalledTimes(1)
  })
  it('clears after settle, including failures, so a retry runs again', async () => {
    const fn = vi.fn<() => Promise<string>>().mockRejectedValueOnce(new Error('x')).mockResolvedValueOnce('ok')
    const d = dedupe(fn)
    await expect(d()).rejects.toThrow('x')
    await expect(d()).resolves.toBe('ok')
    expect(fn).toHaveBeenCalledTimes(2)
  })
})
