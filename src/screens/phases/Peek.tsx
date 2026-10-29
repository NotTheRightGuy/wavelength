import { EyeIcon } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Board } from '@/components/board/Board'
import { Shutter } from '@/components/Shutter'
import { Cardstock } from '@/components/game'
import { api } from '@/lib/api'
import { haptics } from '@/lib/haptics'

/** Press-and-hold to see the target. The value lives in state only while the pointer is down. */
export function Peek({ roundId }: { roundId: string }) {
  const [target, setTarget] = useState<number | null>(null)
  const token = useRef(0)

  const hide = useCallback(() => {
    token.current++
    setTarget(null)
  }, [])

  const show = async () => {
    const mine = ++token.current
    haptics.tick()
    try {
      const t = await api.getTarget(roundId)
      if (token.current === mine) setTarget(t)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  useEffect(() => {
    const onVis = () => { if (document.hidden) hide() }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('blur', hide)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('blur', hide)
      token.current++
    }
  }, [hide])

  return (
    <div className="flex flex-col gap-4">
      <Shutter closed={target === null}>
        <Board dial={50} target={target} showTarget={target !== null} />
      </Shutter>
      <Cardstock padding="none" className="overflow-hidden">
        <button
          type="button"
          data-testid="peek-target"
          aria-label="Hold to peek at the secret target"
          onPointerDown={(e) => { e.currentTarget.setPointerCapture?.(e.pointerId); void show() }}
          onPointerUp={hide}
          onPointerCancel={hide}
          onPointerLeave={hide}
          onLostPointerCapture={hide}
          onContextMenu={(e) => e.preventDefault()}
          onKeyDown={(e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) void show() }}
          onKeyUp={hide}
          onBlur={hide}
          className="flex min-h-20 w-full touch-none select-none items-center justify-center gap-3 p-4 font-display text-heading [-webkit-touch-callout:none] active:bg-plastic-yellow/30 focus-visible:outline-4 focus-visible:-outline-offset-4 focus-visible:outline-plastic-cobalt"
        >
          <EyeIcon aria-hidden="true" className="size-8" />
          Hold to peek
        </button>
      </Cardstock>
    </div>
  )
}
