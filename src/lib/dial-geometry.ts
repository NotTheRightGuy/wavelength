const RAD = Math.PI / 180

export function valueToAngle(v: number): number {
  return 180 - v * 1.8
}

export function valueToPoint(cx: number, cy: number, r: number, v: number) {
  const a = valueToAngle(v) * RAD
  return { x: cx + r * Math.cos(a), y: cy - r * Math.sin(a) }
}

export function pointToValue(cx: number, cy: number, px: number, py: number): number {
  const angle = Math.atan2(cy - py, px - cx) / RAD // (-180, 180]
  if (angle < 0) return px < cx ? 0 : 100
  return Math.min(100, Math.max(0, (180 - angle) / 1.8))
}

export function wedgePath(cx: number, cy: number, rInner: number, rOuter: number, from: number, to: number): string {
  const a = valueToPoint(cx, cy, rOuter, from)
  const b = valueToPoint(cx, cy, rOuter, to)
  const c = valueToPoint(cx, cy, rInner, to)
  const d = valueToPoint(cx, cy, rInner, from)
  return `M${a.x} ${a.y} A${rOuter} ${rOuter} 0 0 1 ${b.x} ${b.y} L${c.x} ${c.y} A${rInner} ${rInner} 0 0 0 ${d.x} ${d.y} Z`
}
