import { Link, useParams } from 'react-router'
import { HouseIcon } from 'lucide-react'
import { Cardstock, DialEmblem, GameHeading, RoomCodeTiles } from '@/components/game'
import { buttonVariants } from '@/components/ui/button'
import { useRoom } from '@/lib/use-room'
import { normalizeCode } from '@/lib/room-code'
import { cn } from '@/lib/utils'
import { Game } from './Game'
import Lobby from './Lobby'

export default function Room() {
  const code = normalizeCode(useParams().code ?? '')
  const { state, error, refresh } = useRoom(code)

  if (!state && error) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-6 px-4 py-16 text-center">
        <RoomCodeTiles code={code} size="md" aria-hidden="true" className="-rotate-2 opacity-90" />
        <Cardstock pattern padding="lg" className="flex w-full flex-col items-center gap-3">
          <GameHeading level={1} size="heading" tone="card">Room not found</GameHeading>
          <p className="text-label text-ink-soft">We could not find a room with code {code || '(none)'}. Check the letters and try again.</p>
          <Link to="/" className={cn(buttonVariants({ variant: 'default', size: 'lg' }), 'mt-3 w-full')}>
            <HouseIcon />
            Back home
          </Link>
        </Cardstock>
      </main>
    )
  }
  if (!state) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4">
        <DialEmblem className="w-36" title="" />
        <p role="status" className="font-display text-subheading text-on-table">Loading room…</p>
      </main>
    )
  }
  return state.room.status === 'lobby' ? <Lobby state={state} refresh={refresh} /> : <Game state={state} refresh={refresh} />
}
