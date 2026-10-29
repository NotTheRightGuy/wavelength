import { useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Cardstock, DialEmblem, GameHeading, PlasticButton, RoomCodeTiles } from '@/components/game'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import { normalizeCode } from '@/lib/room-code'

export default function Home() {
  const navigate = useNavigate()
  const [pending, setPending] = useState(false)
  const [code, setCode] = useState('')
  const [focused, setFocused] = useState(false)

  async function create(mode: 'teams' | 'free') {
    setPending(true)
    try {
      const c = await api.createRoom(mode, 10, 2, null)
      navigate(`/r/${c}`)
    } catch (e) {
      toast.error((e as Error).message)
      setPending(false)
    }
  }

  async function join() {
    setPending(true)
    try {
      const s = await api.getRoomState(code)
      if (!s) throw new Error('Room not found')
      navigate(`/r/${code}`)
    } catch (e) {
      toast.error((e as Error).message)
      setPending(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-4 pt-14 pb-8">
      <header className="flex flex-col items-center text-center">
        <DialEmblem className="w-44 sm:w-52" title="" />
        <h1 className="-mt-1 font-display text-display text-on-table [text-shadow:0_3px_2px_rgb(2_38_36/0.45),0_10px_24px_rgb(2_38_36/0.4)]">
          Dialed
        </h1>
        <p className="mt-3 text-label font-semibold text-on-table-soft">Read minds. Turn the dial. Land the needle.</p>
      </header>

      <div className="mt-auto flex flex-col gap-6">
        <Cardstock
          as="form"
          pattern
          className="flex flex-col gap-4"
          aria-labelledby="join-heading"
          onSubmit={(e) => {
            e.preventDefault()
            if (code.length === 4 && !pending) join()
          }}
        >
          <GameHeading id="join-heading" level={2} size="subheading" tone="card" className="text-center">
            Join with a code
          </GameHeading>
          <div className="relative mx-auto">
            <RoomCodeTiles code={code} size="md" caret={focused && code.length < 4 ? code.length : undefined} aria-hidden="true" className={focused ? '[&>span]:outline-3 [&>span]:outline-offset-2 [&>span]:outline-plastic-cobalt/40' : undefined} />
            <Input
              data-testid="join-code"
              aria-label="Room code"
              value={code}
              onChange={(e) => setCode(normalizeCode(e.target.value))}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              maxLength={4}
              placeholder="CODE"
              autoCapitalize="characters"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
              className="absolute inset-0 h-full cursor-text border-0 bg-transparent text-transparent caret-transparent opacity-0 shadow-none selection:bg-transparent focus-visible:outline-none"
            />
          </div>
          <PlasticButton data-testid="join-btn" type="submit" variant="tertiary" size="lg" block loading={pending && code.length === 4} disabled={pending || code.length !== 4}>
            Join game
          </PlasticButton>
        </Cardstock>

        <section aria-labelledby="host-heading" className="flex flex-col gap-3">
          <GameHeading id="host-heading" level={2} size="subheading" className="text-center">
            Host a game
          </GameHeading>
          <div className="grid grid-cols-2 gap-3">
            <PlasticButton data-testid="create-teams" disabled={pending} onClick={() => create('teams')} className="h-auto flex-col gap-0 px-3 pt-3 pb-[calc(var(--lip)+0.75rem)] whitespace-normal">
              <span className="font-display text-heading font-normal">Teams</span>
              <span className="text-[1.1875rem] leading-tight font-extrabold">2 to 6 teams, a phone each</span>
            </PlasticButton>
            <PlasticButton data-testid="create-free" variant="secondary" disabled={pending} onClick={() => create('free')} className="h-auto flex-col gap-0 px-3 pt-3 pb-[calc(var(--lip)+0.75rem)] whitespace-normal">
              <span className="font-display text-heading font-normal">Free play</span>
              <span className="text-[1.1875rem] leading-tight font-extrabold">3 to 12 players, own phones</span>
            </PlasticButton>
          </div>
        </section>
      </div>
    </main>
  )
}
