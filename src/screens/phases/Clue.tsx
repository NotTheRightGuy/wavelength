import { SendIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Cardstock, GameHeading, PlasticButton } from '@/components/game'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import type { RoomState } from '@/lib/types'
import { Peek } from './Peek'

export function Clue({ state, refresh }: { state: RoomState; refresh: () => void }) {
  const round = state.round!
  const [clue, setClue] = useState('')
  const [pending, setPending] = useState(false)

  const submit = async () => {
    setPending(true)
    try {
      await api.submitClue(round.id, clue.trim())
      refresh()
    } catch (e) {
      toast.error((e as Error).message)
      setPending(false)
    }
  }

  return (
    <>
      <GameHeading level={1} size="heading" className="text-center">Hold to peek, then give a clue</GameHeading>
      <Peek roundId={round.id} />
      <Cardstock as="form" padding="md" className="flex flex-col gap-3" onSubmit={(e: React.FormEvent) => { e.preventDefault(); void submit() }}>
        <label htmlFor="clue-input" className="text-lg font-extrabold">Your clue</label>
        <Input
          id="clue-input"
          data-testid="clue-input"
          value={clue}
          maxLength={80}
          autoComplete="off"
          placeholder="One word or a short phrase"
          onChange={(e) => setClue(e.target.value)}
        />
        <p className="text-base text-ink-soft">Leave it empty if you will say it out loud.</p>
        <PlasticButton data-testid="clue-submit" type="submit" size="lg" block loading={pending}>
          <SendIcon />
          Send clue
        </PlasticButton>
      </Cardstock>
    </>
  )
}
