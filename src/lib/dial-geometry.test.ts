import { describe, expect, it } from 'vitest'
import { pointToValue, valueToAngle, valueToPoint, wedgePath } from './dial-geometry'

describe('dial geometry', () => {
  it('maps values to angles', () => {
    expect(valueToAngle(0)).toBe(180)
    expect(valueToAngle(50)).toBe(90)
    expect(valueToAngle(100)).toBe(0)
  })
  it('maps the middle value straight above the centre', () => {
    const p = valueToPoint(200, 200, 100, 50)
    expect(p.x).toBeCloseTo(200)
    expect(p.y).toBeCloseTo(100)
  })
  it('round-trips value -> point -> value', () => {
    for (const v of [0, 13, 50, 77.5, 100]) {
      const p = valueToPoint(200, 200, 150, v)
      expect(pointToValue(200, 200, p.x, p.y)).toBeCloseTo(v, 3)
    }
  })
  it('clamps points below the horizon to the nearest end', () => {
    expect(pointToValue(200, 200, 50, 260)).toBe(0)
    expect(pointToValue(200, 200, 350, 260)).toBe(100)
  })
  it('builds a closed wedge path', () => {
    const d = wedgePath(200, 200, 100, 150, 40, 60)
    expect(d.startsWith('M')).toBe(true)
    expect(d.endsWith('Z')).toBe(true)
  })
})
