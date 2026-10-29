export function throttle<T extends unknown[]>(fn: (...a: T) => void, ms: number) {
  let last = 0
  let timer: ReturnType<typeof setTimeout> | undefined
  let pending: T | undefined
  return (...args: T) => {
    const now = Date.now()
    if (now - last >= ms) {
      last = now
      fn(...args)
      return
    }
    pending = args
    if (!timer) {
      timer = setTimeout(() => {
        timer = undefined
        last = Date.now()
        if (pending) fn(...pending)
        pending = undefined
      }, ms - (now - last))
    }
  }
}
