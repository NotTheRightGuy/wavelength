import { Link, useParams } from 'react-router'
import { useRoom } from '@/lib/use-room'
import { normalizeCode } from '@/lib/room-code'
import { btnCream } from '@/lib/ui-classes'
import { cn } from '@/lib/utils'
import { Game } from './Game'
import Lobby from './Lobby'

export default function Room() {
  const code = normalizeCode(useParams().code ?? '')
  const { state, error, refresh } = useRoom(code)

  if (!state && error) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-5 p-6 text-center">
        <h1 className="text-3xl font-black text-[#f7ecd0]">Room not found</h1>
        <p className="text-teal-100/80">We could not find a room with code {code || '(none)'}. Check the letters and try again.</p>
        <Link to="/" className={cn(btnCream, 'flex items-center justify-center')}>Back home</Link>
      </main>
    )
  }
  if (!state) {
    return <main className="flex min-h-dvh items-center justify-center text-lg font-bold text-[#f7ecd0]">Loading room…</main>
  }
  return state.room.status === 'lobby' ? <Lobby state={state} refresh={refresh} /> : <Game state={state} refresh={refresh} />
}
