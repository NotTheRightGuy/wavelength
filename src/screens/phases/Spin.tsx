import { toast } from 'sonner'
import { Board } from '@/components/board/Board'
import { Crank } from '@/components/Crank'
import { Shutter } from '@/components/Shutter'
import { GameHeading } from '@/components/game'
import { api } from '@/lib/api'
import type { RoomState } from '@/lib/types'

/** Active device: the shutter is closed over a face-down board; crank to scramble the target. */
export function Spin({ state, refresh }: { state: RoomState; refresh: () => void }) {
  const round = state.round!
  return (
    <>
      <GameHeading level={1} size="heading" className="text-center">Spin for the secret target</GameHeading>
      <Shutter closed>
        <Board dial={50} />
      </Shutter>
      <Crank
        onDone={async () => {
          try {
            await api.finishSpin(round.id)
            refresh()
          } catch (e) {
            toast.error((e as Error).message)
          }
        }}
      />
    </>
  )
}
