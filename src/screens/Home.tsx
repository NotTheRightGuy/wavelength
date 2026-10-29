import { useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import { normalizeCode } from '@/lib/room-code'
import { btnCream, btnPrimary, fieldInput, plate } from '@/lib/ui-classes'
import { cn } from '@/lib/utils'

export default function Home() {
  const navigate = useNavigate()
  const [pending, setPending] = useState(false)
  const [code, setCode] = useState('')

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
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-7 px-5 py-12">
      <header className="text-center">
        <h1 className="text-7xl font-black tracking-tight text-[#f7ecd0] drop-shadow-[0_4px_0_#042f2e]">Dialed</h1>
        <p className="mt-2 text-base font-semibold text-teal-100/80">Read minds. Turn the dial. Land the needle.</p>
      </header>

      <section className={plate}>
        <h2 className="mb-3 text-sm font-extrabold tracking-widest text-teal-800 uppercase">Host a game</h2>
        <div className="flex flex-col gap-4">
          <div>
            <Button data-testid="create-teams" disabled={pending} onClick={() => create('teams')} className={btnPrimary}>
              Teams
            </Button>
            <p className="mt-2 text-center text-sm text-teal-900/70">2 to 6 teams, one device per team</p>
          </div>
          <div>
            <Button data-testid="create-free" disabled={pending} onClick={() => create('free')} className={cn(btnPrimary, 'bg-teal-700 shadow-[0_5px_0_0_#042f2e] hover:bg-teal-700 active:shadow-[0_2px_0_0_#042f2e]')}>
              Free play
            </Button>
            <p className="mt-2 text-center text-sm text-teal-900/70">3 to 12 players, everyone on their own phone</p>
          </div>
        </div>
      </section>

      <form
        className={plate}
        onSubmit={(e) => {
          e.preventDefault()
          if (code.length === 4 && !pending) join()
        }}
      >
        <h2 className="mb-3 text-sm font-extrabold tracking-widest text-teal-800 uppercase">Join a game</h2>
        <Input
          data-testid="join-code"
          aria-label="Room code"
          value={code}
          onChange={(e) => setCode(normalizeCode(e.target.value))}
          maxLength={4}
          placeholder="CODE"
          autoCapitalize="characters"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          className={cn(fieldInput, 'h-16 text-center text-3xl font-black tracking-[0.4em] uppercase md:text-3xl')}
        />
        <Button data-testid="join-btn" type="submit" disabled={pending || code.length !== 4} className={cn(btnCream, 'mt-4 bg-teal-800 text-[#f7ecd0] shadow-[0_5px_0_0_#042f2e] hover:bg-teal-800 active:shadow-[0_2px_0_0_#042f2e]')}>
          Join
        </Button>
      </form>
    </main>
  )
}
